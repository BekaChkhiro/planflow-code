// Typed wrappers for the Agent (Claude Code `stream-json`) IPC surface.
//
// Drives `claude` in bidirectional `stream-json` mode. The backend forwards
// each newline-delimited JSON event as a string over a `tauri::ipc::Channel`.
// The AgentView component parses those strings into chat / tool-call / diff
// items.

import { Channel, invoke } from "@tauri-apps/api/core";

const isTauriRuntime = (): boolean =>
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export interface AgentSpawnArgs {
  /** Binary to launch. Defaults to `claude` on the Rust side when omitted. */
  command?: string;
  /** Working directory for the agent. */
  cwd?: string;
  /** `--permission-mode`: `default` | `acceptEdits` | `bypassPermissions` | `plan` | `dontAsk`. */
  permissionMode?: string;
  /** Optional `--model` override. */
  model?: string;
  /** First user turn, written to stdin right after spawn. */
  initialPrompt?: string;
  /** Claude session id to resume (`--resume`). */
  resume?: string;
}

export interface AgentSpawnResponse {
  sessionId: string;
}

/** Handler for one raw stream-json event line (already a JSON string). */
export type AgentEventHandler = (line: string) => void;

export interface AgentHandle extends AgentSpawnResponse {
  /** Detach the event channel. The backend reader exits on next send. */
  dispose: () => void;
}

/**
 * Spawn a Claude Code stream-json session. `onEvent` fires once per stdout
 * line (plus the synthetic `_stderr` / `_closed` envelopes the backend adds).
 */
export async function agentSpawn(
  args: AgentSpawnArgs,
  onEvent: AgentEventHandler,
): Promise<AgentHandle> {
  if (!isTauriRuntime()) {
    throw new Error(
      "Agent commands need the Tauri window (the one `pnpm tauri dev` launches), not a plain browser tab.",
    );
  }

  let handler: AgentEventHandler | null = onEvent;
  const channel = new Channel<string>((line) => {
    if (handler) handler(line);
  });

  const resp = await invoke<AgentSpawnResponse>("agent_spawn", {
    args,
    onEvent: channel,
  });

  return {
    sessionId: resp.sessionId,
    dispose: () => {
      handler = null;
      channel.onmessage = () => undefined;
    },
  };
}

/** A base64 image attached to a user turn (no `data:` prefix on `data`). */
export interface AgentImageInput {
  mediaType: string;
  data: string;
}

/** Send a follow-up user turn to a running session, optionally with images. */
export async function agentWrite(
  sessionId: string,
  text: string,
  images: AgentImageInput[] = [],
): Promise<void> {
  if (!isTauriRuntime()) return;
  await invoke("agent_write", { args: { sessionId, text, images } });
}

/**
 * Answer an interactive tool (e.g. AskUserQuestion) by sending a `tool_result`
 * back to the agent. `content` is the structured answer payload — for
 * AskUserQuestion: `{ questions, answers: { [question]: label | label[] } }`.
 */
export async function agentToolResult(
  sessionId: string,
  toolUseId: string,
  content: unknown,
): Promise<void> {
  if (!isTauriRuntime()) return;
  await invoke("agent_tool_result", { args: { sessionId, toolUseId, content } });
}

/** Interrupt the current turn without ending the session. */
export async function agentInterrupt(sessionId: string): Promise<void> {
  if (!isTauriRuntime()) return;
  await invoke("agent_interrupt", { args: { sessionId } });
}

/** Terminate a running session. Safe to call repeatedly. */
export async function agentKill(sessionId: string): Promise<void> {
  if (!isTauriRuntime()) return;
  await invoke("agent_kill", { args: { sessionId } });
}
