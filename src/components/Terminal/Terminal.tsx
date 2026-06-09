// Lean standalone terminal component for PlanFlow.
//
// Accepts a `cwd` prop, spawns a PTY shell on mount, subscribes to output,
// forwards input, and auto-fits on resize. No work-station store dependencies —
// only `src/ipc/pty.ts`.

import { createEffect, onCleanup, onMount } from "solid-js";
import { Terminal as Xterm, type IDisposable } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { WebglAddon } from "@xterm/addon-webgl";
import { Unicode11Addon } from "@xterm/addon-unicode11";
import "@xterm/xterm/css/xterm.css";
import { ptySpawn, ptyWrite, ptyResize, ptySubscribe, ptyGetScrollback, type PtySubscription } from "../../ipc/pty";

export interface TerminalProps {
  /** Working directory for the spawned shell. */
  cwd: string;
  /** Optional session id to reuse — if omitted a new PTY is spawned. */
  sessionId?: string;
}

const DEFAULT_FONT_SIZE = 13;
const DEFAULT_LINE_HEIGHT = 1.4;

const readCssVar = (host: HTMLElement, name: string): string =>
  getComputedStyle(host).getPropertyValue(name).trim();

export function Terminal(props: TerminalProps) {
  let hostEl!: HTMLDivElement;
  let term: Xterm | null = null;
  let fitAddon: FitAddon | null = null;
  let webglAddon: WebglAddon | null = null;
  let unicodeAddon: Unicode11Addon | null = null;
  let webLinksAddon: WebLinksAddon | null = null;
  let subscription: PtySubscription | null = null;
  let subscriptionToken = 0;
  let decoder: TextDecoder | null = null;
  let currentSessionId = "";
  const encoder = new TextEncoder();
  let inputDisposables: IDisposable[] = [];
  let resizeObserver: ResizeObserver | null = null;
  let resizeFrame = 0;
  let lastCols = 0;
  let lastRows = 0;

  const sendInput = (bytes: Uint8Array): void => {
    if (bytes.byteLength === 0) return;
    const sid = currentSessionId;
    if (!sid) return;
    void ptyWrite(sid, bytes).catch(() => undefined);
  };

  // Force a minimal prompt that shows just the current folder name (not the
  // full path or user@host), then clear so the override isn't visible.
  const applyMinimalPrompt = (sid: string, shell: "zsh" | "sh"): void => {
    const cmd =
      shell === "zsh" ? "PROMPT='%1~ %# '; clear\n" : "PS1='\\W \\$ '; clear\n";
    void ptyWrite(sid, encoder.encode(cmd)).catch(() => undefined);
  };

  const binaryToBytes = (data: string): Uint8Array => {
    const bytes = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) bytes[i] = data.charCodeAt(i) & 0xff;
    return bytes;
  };

  const applyFit = (): void => {
    if (!term || !fitAddon || !hostEl) return;
    if (hostEl.clientWidth === 0 || hostEl.clientHeight === 0) return;
    const dims = fitAddon.proposeDimensions();
    if (!dims) return;
    const { cols, rows } = dims;
    if (cols <= 0 || rows <= 0) return;
    if (cols === lastCols && rows === lastRows) return;
    fitAddon.fit();
    lastCols = cols;
    lastRows = rows;
    if (!currentSessionId) return;
    void ptyResize(currentSessionId, cols, rows).catch(() => undefined);
  };

  const scheduleFit = (): void => {
    if (resizeFrame !== 0) return;
    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = 0;
      applyFit();
    });
  };

  const stopSubscription = (): void => {
    subscriptionToken += 1;
    subscription?.unsubscribe();
    subscription = null;
    if (decoder) {
      decoder.decode();
      decoder = null;
    }
  };

  const startSubscription = (sessionId: string): void => {
    if (!term) return;
    const t = term;
    decoder = new TextDecoder("utf-8", { fatal: false });
    const token = ++subscriptionToken;

    const attach = async (): Promise<void> => {
      const snapshot = await ptyGetScrollback(sessionId);
      if (token !== subscriptionToken || !decoder) return;
      if (snapshot.data.byteLength > 0) {
        const text = decoder.decode(snapshot.data, { stream: true });
        if (text.length > 0) t.write(text);
      }
      const sub = await ptySubscribe(sessionId, (chunk) => {
        if (token !== subscriptionToken || !decoder) return;
        const text = decoder.decode(chunk, { stream: true });
        if (text.length > 0) t.write(text);
      });
      if (token !== subscriptionToken) {
        sub.unsubscribe();
        return;
      }
      subscription = sub;
    };
    void attach().catch(() => undefined);
  };

  onMount(() => {
    const bgColor = readCssVar(hostEl, "--color-bg-terminal") ||
      readCssVar(hostEl, "--bg-terminal") || "#0b0c0e";
    const fgColor = readCssVar(hostEl, "--color-text-terminal") ||
      readCssVar(hostEl, "--text-terminal") || "#d6d3c9";
    const accent = readCssVar(hostEl, "--color-accent") ||
      readCssVar(hostEl, "--accent") || "#a0d8d8";
    const fontFamily = readCssVar(hostEl, "--font-mono") || "ui-monospace, monospace";

    term = new Xterm({
      allowProposedApi: true,
      fontFamily,
      fontSize: DEFAULT_FONT_SIZE,
      lineHeight: DEFAULT_LINE_HEIGHT,
      cursorBlink: true,
      theme: {
        background: bgColor,
        foreground: fgColor,
        cursor: accent,
        cursorAccent: bgColor,
      },
      scrollback: 10_000,
      convertEol: false,
    });

    unicodeAddon = new Unicode11Addon();
    term.loadAddon(unicodeAddon);
    term.unicode.activeVersion = "11";

    fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    webLinksAddon = new WebLinksAddon();
    term.loadAddon(webLinksAddon);

    term.open(hostEl);

    try {
      const wgl = new WebglAddon();
      term.loadAddon(wgl);
      webglAddon = wgl;
    } catch {
      /* fall back to DOM renderer */
    }

    // Forward keystrokes to PTY
    inputDisposables.push(term.onData((data) => sendInput(encoder.encode(data))));
    inputDisposables.push(term.onBinary((data) => sendInput(binaryToBytes(data))));

    // Copy on Cmd/Ctrl+C when selection exists; paste on Cmd/Ctrl+V
    term.attachCustomKeyEventHandler((event) => {
      if (event.type !== "keydown") return true;
      const mod = event.metaKey || event.ctrlKey;
      if (!mod) return true;
      const key = event.key.toLowerCase();
      if (key === "c" && term?.hasSelection()) {
        const text = term.getSelection();
        if (text) void navigator.clipboard.writeText(text).catch(() => undefined);
        return false;
      }
      if (key === "v") {
        void navigator.clipboard.readText().then((text) => {
          term?.paste(text);
        }).catch(() => undefined);
        return false;
      }
      return true;
    });

    applyFit();
    resizeObserver = new ResizeObserver(() => scheduleFit());
    resizeObserver.observe(hostEl);

    // Spawn the PTY if no sessionId is provided via props
    if (props.sessionId) {
      currentSessionId = props.sessionId;
      startSubscription(currentSessionId);
    } else {
      // Spawn a new shell in cwd
      const dims = fitAddon.proposeDimensions() ?? { cols: 80, rows: 24 };
      void ptySpawn({
        command: "zsh",
        args: [],
        cwd: props.cwd,
        cols: dims.cols ?? 80,
        rows: dims.rows ?? 24,
      })
        .then((resp) => {
          currentSessionId = resp.sessionId;
          startSubscription(currentSessionId);
          applyMinimalPrompt(currentSessionId, "zsh");
        })
        .catch((err: unknown) => {
          // Fall back to sh if zsh unavailable
          const dims2 = fitAddon?.proposeDimensions() ?? { cols: 80, rows: 24 };
          void ptySpawn({
            command: "sh",
            args: [],
            cwd: props.cwd,
            cols: dims2.cols ?? 80,
            rows: dims2.rows ?? 24,
          })
            .then((resp) => {
              currentSessionId = resp.sessionId;
              startSubscription(currentSessionId);
              applyMinimalPrompt(currentSessionId, "sh");
            })
            .catch((err2: unknown) => {
              term?.write(`\r\nFailed to spawn PTY: ${String(err ?? err2)}\r\n`);
            });
        });
    }
  });

  // If the cwd prop changes (new project selected), restart. Not triggered on
  // mount because `prev` will be undefined on the first run.
  createEffect((prev: string | undefined) => {
    const cwd = props.cwd;
    if (prev !== undefined && prev !== cwd && term && fitAddon) {
      stopSubscription();
      term.reset();
      lastCols = 0;
      lastRows = 0;
      applyFit();
      const dims = fitAddon.proposeDimensions() ?? { cols: 80, rows: 24 };
      void ptySpawn({
        command: "zsh",
        args: [],
        cwd,
        cols: dims.cols ?? 80,
        rows: dims.rows ?? 24,
      })
        .then((resp) => {
          currentSessionId = resp.sessionId;
          startSubscription(currentSessionId);
          applyMinimalPrompt(currentSessionId, "zsh");
        })
        .catch(() => undefined);
    }
    return cwd;
  });

  onCleanup(() => {
    if (resizeFrame !== 0) {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = 0;
    }
    for (const d of inputDisposables) d.dispose();
    inputDisposables = [];
    stopSubscription();
    resizeObserver?.disconnect();
    resizeObserver = null;
    fitAddon?.dispose();
    fitAddon = null;
    webLinksAddon?.dispose();
    webLinksAddon = null;
    webglAddon?.dispose();
    webglAddon = null;
    unicodeAddon?.dispose();
    unicodeAddon = null;
    term?.dispose();
    term = null;
    lastCols = 0;
    lastRows = 0;
  });

  return (
    <div
      ref={hostEl}
      class="h-full w-full bg-[#0b0c0e] font-mono"
      data-terminal
    />
  );
}

export default Terminal;
