// Typed wrappers for the PTY IPC surface.
//
// `pty_subscribe` is backed by a `tauri::ipc::Channel<InvokeResponseBody>` on
// the Rust side that pushes raw frames as `InvokeResponseBody::Raw(Vec<u8>)`.
// On the JS side those arrive as `ArrayBuffer` payloads delivered to the
// Channel's `onmessage` callback.
//
// Subscriptions are short-circuited when the Tauri runtime is unavailable
// (vite preview, isolated component harnesses) so consumers can mount the
// Terminal component without a real backend.

import { Channel, invoke } from "@tauri-apps/api/core";

const isTauriRuntime = (): boolean =>
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export interface PtySpawnArgs {
  command: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  /**
   * Commands written to the freshly-spawned shell after subscribers are
   * attached. Each entry is treated like user input (terminating `\n`
   * appended on the Rust side); empty/whitespace lines are skipped.
   */
  startupCommands?: string[];
  cols: number;
  rows: number;
}

export interface PtySpawnResponse {
  sessionId: string;
}

export async function ptySpawn(args: PtySpawnArgs): Promise<PtySpawnResponse> {
  return invoke<PtySpawnResponse>("pty_spawn", { args });
}

export interface PtyWriteArgs {
  sessionId: string;
  data: Uint8Array;
}

/**
 * Send raw bytes to a PTY's stdin. No-op when the local backend is
 * unavailable (vite preview / isolated harnesses) or when `data` is empty.
 */
export async function ptyWrite(sessionId: string, data: Uint8Array): Promise<void> {
  if (data.byteLength === 0) return;
  if (!isTauriRuntime()) return;
  await invoke("pty_write", {
    args: { sessionId, data: Array.from(data) },
  });
}

/**
 * Best-effort graceful shutdown of a PTY session. Safe to call outside the
 * local Tauri runtime — it short-circuits there.
 */
export async function ptyKill(sessionId: string): Promise<void> {
  if (!isTauriRuntime()) return;
  await invoke("pty_kill", { args: { sessionId } });
}

export interface PtyResizeArgs {
  sessionId: string;
  cols: number;
  rows: number;
}

/**
 * Inform the backend that the PTY's window dimensions changed so the child
 * process receives SIGWINCH and re-renders to the new viewport. No-op
 * outside the Tauri runtime.
 */
export async function ptyResize(sessionId: string, cols: number, rows: number): Promise<void> {
  if (!isTauriRuntime()) return;
  await invoke("pty_resize", {
    args: { sessionId, cols, rows },
  });
}

export interface PtyScrollbackSnapshot {
  /** Snapshot bytes [0, totalBytes) at read time. Empty when the session has
   *  produced no output yet, or when called outside the Tauri runtime. */
  data: Uint8Array;
  /** Size of the scrollback at read time — the full snapshot length. */
  totalBytes: number;
}

interface RawScrollbackResponse {
  data: number[];
  totalBytes: number;
  nextOffset: number;
}

/**
 * Read the full scrollback snapshot for `sessionId`. Used at mount / tab
 * switch to replay prior session output before attaching a live subscription.
 * Returns an empty snapshot in non-Tauri contexts so callers don't branch.
 */
export async function ptyGetScrollback(sessionId: string): Promise<PtyScrollbackSnapshot> {
  if (!isTauriRuntime()) {
    return { data: new Uint8Array(), totalBytes: 0 };
  }
  const raw = await invoke<RawScrollbackResponse>("pty_get_scrollback", {
    args: { sessionId, offsetBytes: 0, limitBytes: Number.MAX_SAFE_INTEGER },
  });
  return {
    data: Uint8Array.from(raw.data),
    totalBytes: raw.totalBytes,
  };
}

export type PtyChunkHandler = (chunk: Uint8Array) => void;

export interface PtySubscription {
  /** Stop forwarding frames to the handler. The backend forwarder also
   *  exits the next time it tries to send (channel send fails). */
  unsubscribe: () => void;
}

// Used to detach a Channel from its original closure on unsubscribe.
const noopChannelHandler = (): void => undefined;

const toUint8Array = (payload: unknown): Uint8Array | null => {
  if (payload instanceof ArrayBuffer) return new Uint8Array(payload);
  if (payload instanceof Uint8Array) return payload;
  if (
    payload !== null &&
    typeof payload === "object" &&
    "byteLength" in (payload as object) &&
    "buffer" in (payload as object)
  ) {
    const view = payload as ArrayBufferView;
    return new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
  }
  return null;
};

/**
 * Subscribe to raw PTY output for `sessionId`.
 *
 * The handler is invoked once per backend frame with a fresh `Uint8Array`
 * view. Call `unsubscribe()` to drop the handler and let the Rust forwarder
 * exit on its next send failure.
 */
export async function ptySubscribe(
  sessionId: string,
  onChunk: PtyChunkHandler,
): Promise<PtySubscription> {
  if (!isTauriRuntime()) {
    return { unsubscribe: () => undefined };
  }

  let active = true;
  let handler: PtyChunkHandler | null = onChunk;
  const channel = new Channel<unknown>((payload) => {
    if (!active || !handler) return;
    const bytes = toUint8Array(payload);
    if (bytes && bytes.byteLength > 0) handler(bytes);
  });

  await invoke("pty_subscribe", {
    args: { sessionId },
    onData: channel,
  });

  return {
    unsubscribe: () => {
      active = false;
      handler = null;
      try {
        channel.onmessage = noopChannelHandler;
      } catch {
        /* older @tauri-apps/api shapes may not expose the setter */
      }
    },
  };
}
