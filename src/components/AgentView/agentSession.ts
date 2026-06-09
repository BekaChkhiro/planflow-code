// Persistent agent-session registry — keyed by the layout sessionId.
//
// Ported from work-station's AgentView/agentSession.ts with cloud fields
// removed: no `artifactFile`, no `projectId` in options or spawn args
// (planflow uses local-only IPC with no cloud routing).
//
// The full public API is preserved so Workspace.tsx can consume it verbatim.

import { createRoot, createSignal, type Accessor } from "solid-js";
import { createStore, produce } from "solid-js/store";
import {
  agentInterrupt,
  agentKill,
  agentSpawn,
  agentToolResult,
  agentWrite,
  type AgentHandle,
} from "../../ipc/agent";

export type ToolStatus = "pending" | "ok" | "error";

export interface AssistantItem {
  kind: "assistant";
  id: string;
  text: string;
}
export interface ToolItem {
  kind: "tool";
  id: string;
  name: string;
  input: Record<string, unknown>;
  status: ToolStatus;
  result: string;
}
export interface UserMsgItem {
  kind: "user-msg";
  id: string;
  text: string;
  /** Data-URL thumbnails of any images attached to this turn (for display). */
  images?: string[];
}

/** An image staged in the composer, not yet sent. */
export interface PendingImage {
  id: string;
  /** `data:<mime>;base64,...` for the thumbnail preview. */
  dataUrl: string;
  mediaType: string;
  /** Raw base64 (no prefix) for the IPC payload. */
  base64: string;
}
export interface NoteItem {
  kind: "note";
  id: string;
  tone: "system" | "stderr" | "info";
  text: string;
}
export type Item = AssistantItem | ToolItem | UserMsgItem | NoteItem;

export interface ResultInfo {
  costUsd: number | null;
  turns: number | null;
  durationMs: number | null;
  denials: number;
}

export interface SlashCommand {
  name: string;
  description?: string;
  argumentHint?: string;
}

export interface AgentSessionOptions {
  /** Absolute path to the `claude` binary (resolved via cliListAvailable). */
  command?: string;
  cwd?: string;
  permissionMode?: string;
  model?: string;
  /** Project label stored with the session for the history list. */
  projectName?: string;
  /** Claude's own session id from a previous run. When set, the stored
   *  transcript is preloaded into the view AND the `claude` process is
   *  resumed (`--resume`) so the conversation continues with full context. */
  resume?: string;
  /** Called when Claude's session id is first learned (or changes), so the
   *  caller can persist it (e.g. to the sessions store) for later resume. */
  onSessionId?: (claudeId: string) => void;
}

// ── Session history (localStorage) ──────────────────────────────────────

const HISTORY_KEY = "planflow.agent.history";
const HISTORY_LIMIT = 60;

export interface SessionMeta {
  claudeId: string;
  title: string;
  projectName?: string;
  cwd?: string;
  updatedAt: number;
}

interface StoredSession extends SessionMeta {
  items: Item[];
}

function loadHistory(): StoredSession[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const arr: unknown = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as StoredSession[]) : [];
  } catch {
    return [];
  }
}

function saveHistory(list: StoredSession[]): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, HISTORY_LIMIT)));
  } catch {
    /* quota / unavailable — history is best-effort */
  }
}

/** Past sessions, most-recently-updated first (transcripts omitted). */
export function listSessions(): SessionMeta[] {
  return loadHistory()
    .map((s) => ({
      claudeId: s.claudeId,
      title: s.title,
      projectName: s.projectName,
      cwd: s.cwd,
      updatedAt: s.updatedAt,
    }))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

/** The stored transcript for a Claude session id, or `[]`. */
export function loadSessionTranscript(claudeId: string): Item[] {
  return loadHistory().find((s) => s.claudeId === claudeId)?.items ?? [];
}

function upsertSession(session: StoredSession): void {
  const list = loadHistory().filter((s) => s.claudeId !== session.claudeId);
  list.unshift(session);
  saveHistory(list);
}

/** Reactive read surface + actions exposed to the view. */
export interface AgentController {
  items: Accessor<Item[]>;
  model: Accessor<string | null>;
  permission: Accessor<string | null>;
  busy: Accessor<boolean>;
  closed: Accessor<boolean>;
  fatal: Accessor<string | null>;
  result: Accessor<ResultInfo | null>;
  draft: Accessor<string>;
  setDraft: (value: string) => void;
  send: () => void;
  /** Currently selected `--permission-mode`. */
  chosenPermission: Accessor<string>;
  /** Currently selected `--model` ("default" = no override). */
  chosenModel: Accessor<string>;
  /** Change the permission mode — restarts the session. */
  setPermissionMode: (mode: string) => void;
  /** Change the model — restarts the session. */
  setModel: (model: string) => void;
  /** Kill the current child and start a fresh session. */
  restart: () => void;
  /** Load a past session's transcript and resume it. */
  resumeSession: (claudeId: string) => void;
  /** Interrupt the in-flight turn without ending the session. */
  interrupt: () => void;
  /** Answer an interactive AskUserQuestion tool call. `answers` maps each
   *  question text → the chosen option label(s); `questions` is the original
   *  tool input echoed back. Sends a `tool_result` so the agent continues. */
  answerQuestion: (
    toolUseId: string,
    answers: Record<string, string | string[]>,
    questions: unknown,
  ) => void;
  /** Slash commands the session advertises. */
  slashCommands: Accessor<SlashCommand[]>;
  /** Increments whenever a file-editing tool finishes. */
  editTick: Accessor<number>;
  /** Images staged in the composer for the next turn. */
  pendingImages: Accessor<PendingImage[]>;
  /** Stage an image for the next turn. */
  addImage: (img: PendingImage) => void;
  /** Remove a staged image by id. */
  removeImage: (id: string) => void;
}

interface Entry {
  controller: AgentController;
  dispose: () => void;
}

let idCounter = 0;
const nextId = (): string => {
  idCounter += 1;
  return `a${idCounter}`;
};

const asRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" ? (value as Record<string, unknown>) : {};

export const asString = (value: unknown): string => (typeof value === "string" ? value : "");

const normalizeResult = (content: unknown): string => {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((block) => asString(asRecord(block).text))
      .filter((t) => t.length > 0)
      .join("\n");
  }
  return "";
};

const DEFAULT_SLASH_COMMANDS: SlashCommand[] = [
  { name: "clear", description: "Start a new session with empty context" },
  { name: "compact", description: "Summarize the conversation to free up context" },
  { name: "context", description: "Show current context usage" },
  { name: "review", description: "Review a pull request" },
  { name: "init", description: "Initialize a CLAUDE.md for the project" },
  { name: "usage", description: "Show session cost and duration" },
  { name: "model", description: "Switch the model" },
  { name: "help", description: "Show help" },
];

const registry = new Map<string, Entry>();

/**
 * Return the controller for `sessionId`, spawning the `claude` child on first
 * call. Safe to call from a component body on every (re)mount.
 */
export function acquireAgentSession(sessionId: string, opts: AgentSessionOptions): AgentController {
  const existing = registry.get(sessionId);
  if (existing) return existing.controller;

  const entry = createRoot<Entry>((disposeRoot) => {
    const [store, setStore] = createStore<{ items: Item[] }>({ items: [] });
    const [model, setModel] = createSignal<string | null>(null);
    const [permission, setPermission] = createSignal<string | null>(null);
    const [busy, setBusy] = createSignal(false);
    const [closed, setClosed] = createSignal(false);
    const [fatal, setFatal] = createSignal<string | null>(null);
    const [result, setResult] = createSignal<ResultInfo | null>(null);
    const [draft, setDraft] = createSignal("");
    const [pendingImages, setPendingImages] = createSignal<PendingImage[]>([]);
    const addImage = (img: PendingImage): void => {
      setPendingImages((list) => [...list, img]);
    };
    const removeImage = (id: string): void => {
      setPendingImages((list) => list.filter((i) => i.id !== id));
    };
    const [slashCommands, setSlashCommands] = createSignal<SlashCommand[]>(DEFAULT_SLASH_COMMANDS);
    const [editTick, setEditTick] = createSignal(0);
    const FILE_EDIT_TOOLS = new Set(["Edit", "Write", "MultiEdit", "NotebookEdit", "Bash"]);
    let gotRichCommands = false;

    let handle: AgentHandle | null = null;

    const pushItem = (item: Item): void => {
      setStore(produce((s) => void s.items.push(item)));
    };
    const note = (tone: NoteItem["tone"], text: string): void =>
      pushItem({ kind: "note", id: nextId(), tone, text });

    const keyToItem = new Map<string, { itemId: string; kind: "text" | "tool"; json: string }>();
    const indexToKey = new Map<number, string>();
    // Monotonic block counter — guarantees every streamed content block gets a
    // globally-unique slot key, so a repeated/stale message id can never make a
    // new assistant turn overwrite an earlier one's text (the "writes at the
    // top" bug). `indexToKey` (cleared per message_start) dedupes re-fired
    // content_block_start events within the same message.
    let blockSeq = 0;

    const mutateItem = <K extends Item["kind"]>(
      itemId: string,
      kind: K,
      fn: (item: Extract<Item, { kind: K }>) => void,
    ): void => {
      setStore(
        produce((s) => {
          const it = s.items.find((x) => x.id === itemId);
          if (it && it.kind === kind) fn(it as Extract<Item, { kind: K }>);
        }),
      );
    };

    // AskUserQuestion pauses generation until the user answers — stop the
    // "thinking" spinner so the question card becomes the focus.
    const pauseIfQuestion = (name: string): void => {
      if (name === "AskUserQuestion") setBusy(false);
    };

    const handleStreamEvent = (ev: Record<string, unknown>): void => {
      const etype = asString(ev.type);
      const index = typeof ev.index === "number" ? ev.index : -1;

      if (etype === "message_start") {
        // New message → its block indices start fresh; force new slots so a
        // continuation never reuses the previous message's text item.
        indexToKey.clear();
        setBusy(true);
        return;
      }
      if (etype === "content_block_start") {
        const block = asRecord(ev.content_block);
        const blockType = asString(block.type);
        if (blockType === "text") {
          // Reuse the slot only if this same block index was already started
          // in the CURRENT message (re-fired event); otherwise mint a fresh,
          // globally-unique slot so a new message always appends a new item.
          const existing = indexToKey.get(index);
          if (existing === undefined || !keyToItem.has(existing)) {
            blockSeq += 1;
            const key = `b${blockSeq}`;
            const id = nextId();
            pushItem({ kind: "assistant", id, text: "" });
            keyToItem.set(key, { itemId: id, kind: "text", json: "" });
            indexToKey.set(index, key);
          }
        } else if (blockType === "tool_use") {
          const tid = asString(block.id);
          const key = tid || `b${(blockSeq += 1)}`;
          if (!keyToItem.has(key)) {
            const id = tid || nextId();
            pushItem({
              kind: "tool",
              id,
              name: asString(block.name) || "tool",
              input: asRecord(block.input),
              status: "pending",
              result: "",
            });
            keyToItem.set(key, { itemId: id, kind: "tool", json: "" });
            pauseIfQuestion(asString(block.name));
          }
          indexToKey.set(index, key);
        }
        return;
      }
      if (etype === "content_block_delta") {
        const key = indexToKey.get(index);
        const slot = key ? keyToItem.get(key) : undefined;
        if (!slot) return;
        const delta = asRecord(ev.delta);
        const dtype = asString(delta.type);
        if (dtype === "text_delta" && slot.kind === "text") {
          const piece = asString(delta.text);
          if (piece.length > 0) mutateItem(slot.itemId, "assistant", (it) => (it.text += piece));
        } else if (dtype === "input_json_delta" && slot.kind === "tool") {
          slot.json += asString(delta.partial_json);
        }
        return;
      }
      if (etype === "content_block_stop") {
        const key = indexToKey.get(index);
        const slot = key ? keyToItem.get(key) : undefined;
        if (slot && slot.kind === "tool" && slot.json.length > 0) {
          try {
            const parsed = asRecord(JSON.parse(slot.json));
            mutateItem(slot.itemId, "tool", (it) => (it.input = parsed));
          } catch {
            /* partial/invalid JSON — keep input from start */
          }
        }
      }
    };

    const handleEvent = (line: string): void => {
      let event: Record<string, unknown>;
      try {
        event = asRecord(JSON.parse(line));
      } catch {
        return;
      }
      const type = asString(event.type);
      const sid = asString(event.session_id);
      if (sid.length > 0 && sid !== claudeSessionId) {
        claudeSessionId = sid;
        opts.onSessionId?.(sid);
      }

      if (type === "_closed") {
        setClosed(true);
        setBusy(false);
        note("info", "Session ended.");
        persist();
        return;
      }
      if (type === "_stderr") {
        note("stderr", asString(event.text));
        return;
      }
      if (type === "system") {
        if (asString(event.subtype) === "init") {
          setModel(asString(event.model) || null);
          setPermission(asString(event.permissionMode) || null);
          if (!gotRichCommands && Array.isArray(event.slash_commands)) {
            const cmds = event.slash_commands
              .filter((c): c is string => typeof c === "string")
              .map((name) => ({ name }));
            if (cmds.length > 0) setSlashCommands(cmds);
          }
        }
        return;
      }
      if (type === "control_response") {
        const inner = asRecord(asRecord(event.response).response);
        if (Array.isArray(inner.commands)) {
          const list = inner.commands
            .map((c) => {
              const r = asRecord(c);
              const name = asString(r.name);
              const description = asString(r.description);
              const argumentHint = asString(r.argumentHint);
              return {
                name,
                description: description.length > 0 ? description : undefined,
                argumentHint: argumentHint.length > 0 ? argumentHint : undefined,
              };
            })
            .filter((c) => c.name.length > 0);
          if (list.length > 0) {
            gotRichCommands = true;
            setSlashCommands(list);
          }
        }
        return;
      }
      if (type === "stream_event") {
        handleStreamEvent(asRecord(event.event));
        return;
      }
      if (type === "assistant") {
        const content = asRecord(event.message).content;
        if (!Array.isArray(content)) return;
        setBusy(true);
        for (const raw of content) {
          const block = asRecord(raw);
          if (asString(block.type) !== "tool_use") continue;
          const tid = asString(block.id);
          if (!tid) continue;
          const input = asRecord(block.input);
          if (store.items.some((x) => x.kind === "tool" && x.id === tid)) {
            mutateItem(tid, "tool", (it) => (it.input = input));
          } else {
            pushItem({
              kind: "tool",
              id: tid,
              name: asString(block.name) || "tool",
              input,
              status: "pending",
              result: "",
            });
            pauseIfQuestion(asString(block.name));
          }
        }
        persist();
        return;
      }
      if (type === "user") {
        const content = asRecord(event.message).content;
        if (!Array.isArray(content)) return;
        for (const raw of content) {
          const block = asRecord(raw);
          if (asString(block.type) !== "tool_result") continue;
          const toolUseId = asString(block.tool_use_id);
          const isError = block.is_error === true;
          const text = normalizeResult(block.content);
          let editedFile = false;
          setStore(
            produce((s) => {
              const target = s.items.find((it) => it.kind === "tool" && it.id === toolUseId);
              if (target && target.kind === "tool") {
                target.status = isError ? "error" : "ok";
                target.result = text;
                if (!isError && FILE_EDIT_TOOLS.has(target.name)) editedFile = true;
              }
            }),
          );
          if (editedFile) setEditTick((n) => n + 1);
        }
        persist();
        return;
      }
      if (type === "result") {
        const denials = Array.isArray(event.permission_denials)
          ? event.permission_denials.length
          : 0;
        setResult({
          costUsd: typeof event.total_cost_usd === "number" ? event.total_cost_usd : null,
          turns: typeof event.num_turns === "number" ? event.num_turns : null,
          durationMs: typeof event.duration_ms === "number" ? event.duration_ms : null,
          denials,
        });
        setBusy(false);
        persist();
        return;
      }
    };

    const launch = {
      command: opts.command,
      cwd: opts.cwd,
      permissionMode: opts.permissionMode ?? "bypassPermissions",
      model: opts.model,
      resume: opts.resume as string | undefined,
    };

    let claudeSessionId: string | null = null;
    let title = "";
    const persist = (): void => {
      if (!claudeSessionId) return;
      upsertSession({
        claudeId: claudeSessionId,
        title: title.length > 0 ? title : "Untitled session",
        projectName: opts.projectName,
        cwd: opts.cwd,
        updatedAt: Date.now(),
        items: store.items.slice(),
      });
    };
    const [chosenPermission, setChosenPermission] = createSignal(launch.permissionMode);
    const [chosenModel, setChosenModel] = createSignal(launch.model ?? "default");

    const killChild = (): void => {
      const live = handle;
      if (live) {
        live.dispose();
        void agentKill(live.sessionId);
        handle = null;
      }
    };

    const spawn = (): void => {
      keyToItem.clear();
      indexToKey.clear();
      blockSeq = 0;
      setClosed(false);
      setBusy(false);
      setModel(null);
      setPermission(null);
      setResult(null);
      setFatal(null);
      void agentSpawn(
        {
          command: launch.command,
          cwd: launch.cwd,
          permissionMode: launch.permissionMode,
          model: launch.model,
          resume: launch.resume,
        },
        handleEvent,
      )
        .then((h) => {
          handle = h;
        })
        .catch((error: unknown) => {
          setFatal(error instanceof Error ? error.message : String(error));
        });
    };

    const restart = (): void => {
      killChild();
      setStore("items", []);
      title = "";
      claudeSessionId = null;
      launch.resume = undefined;
      spawn();
    };

    const resumeSession = (claudeId: string): void => {
      const transcript = loadSessionTranscript(claudeId);
      killChild();
      setStore("items", transcript);
      const firstUser = transcript.find((i): i is UserMsgItem => i.kind === "user-msg");
      title = firstUser?.text.slice(0, 80) ?? "";
      claudeSessionId = claudeId;
      launch.resume = claudeId;
      spawn();
    };

    // Resuming an existing session: preload its stored transcript so the
    // history is visible immediately, and let `launch.resume` (--resume)
    // continue the same Claude session with full context.
    if (opts.resume) {
      const transcript = loadSessionTranscript(opts.resume);
      if (transcript.length > 0) {
        setStore("items", transcript);
        const firstUser = transcript.find((i): i is UserMsgItem => i.kind === "user-msg");
        title = firstUser?.text.slice(0, 80) ?? "";
      }
      claudeSessionId = opts.resume;
    }
    // eslint-disable-next-line solid/reactivity
    spawn();

    const send = (): void => {
      const text = draft().trim();
      const images = pendingImages();
      // Allow sending with only images (no text), but never an empty turn,
      // and never queue a new turn while the agent is still responding (that
      // interleaves the next answer with the current one).
      if ((text.length === 0 && images.length === 0) || !handle || closed() || busy()) return;
      if (title.length === 0) title = text.slice(0, 80) || "Image";
      pushItem({
        kind: "user-msg",
        id: nextId(),
        text,
        ...(images.length > 0 ? { images: images.map((i) => i.dataUrl) } : {}),
      });
      setDraft("");
      setPendingImages([]);
      setBusy(true);
      const live = handle;
      const payload = images.map((i) => ({ mediaType: i.mediaType, data: i.base64 }));
      void agentWrite(live.sessionId, text, payload).catch((error: unknown) => {
        note("stderr", error instanceof Error ? error.message : String(error));
      });
    };

    const interrupt = (): void => {
      const live = handle;
      if (live) {
        void agentInterrupt(live.sessionId).catch(() => {
          /* best-effort */
        });
      }
      persist();
    };

    const answerQuestion = (
      toolUseId: string,
      answers: Record<string, string | string[]>,
      questions: unknown,
    ): void => {
      const live = handle;
      if (!live) return;
      // Mark the question tool as answered so its card collapses to a summary.
      setStore(
        produce((s) => {
          const it = s.items.find((x) => x.kind === "tool" && x.id === toolUseId);
          if (it && it.kind === "tool") {
            it.status = "ok";
            it.result = Object.entries(answers)
              .map(([q, a]) => `${q}: ${Array.isArray(a) ? a.join(", ") : a}`)
              .join("\n");
          }
        }),
      );
      setBusy(true);
      void agentToolResult(live.sessionId, toolUseId, { questions, answers }).catch(
        (error: unknown) => {
          note("stderr", error instanceof Error ? error.message : String(error));
        },
      );
      persist();
    };

    const setPermissionMode = (mode: string): void => {
      if (mode === launch.permissionMode) return;
      launch.permissionMode = mode;
      setChosenPermission(mode);
      restart();
    };
    const setModelChoice = (model: string): void => {
      if (model === chosenModel()) return;
      launch.model = model === "default" ? undefined : model;
      setChosenModel(model);
      restart();
    };

    const controller: AgentController = {
      items: () => store.items,
      model,
      permission,
      busy,
      closed,
      fatal,
      result,
      draft,
      setDraft,
      send,
      chosenPermission,
      chosenModel,
      setPermissionMode,
      setModel: setModelChoice,
      restart,
      resumeSession,
      interrupt,
      answerQuestion,
      slashCommands,
      editTick,
      pendingImages,
      addImage,
      removeImage,
    };

    const dispose = (): void => {
      killChild();
      disposeRoot();
      registry.delete(sessionId);
    };

    return { controller, dispose };
  });

  registry.set(sessionId, entry);
  return entry.controller;
}

/** Kill the `claude` child and tear down the reactive root for `sessionId`. */
export function releaseAgentSession(sessionId: string): void {
  registry.get(sessionId)?.dispose();
}
