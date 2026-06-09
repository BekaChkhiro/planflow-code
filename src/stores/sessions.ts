/**
 * Sessions store — localStorage-backed, reactive via Solid signals.
 *
 * Key: planflow.sessions  JSON array of Session
 */

import { createSignal } from "solid-js";

export type SessionStatus = "running" | "review" | "idle";

export interface Session {
  id: string;
  projectId: string;
  task: string;
  status: SessionStatus;
  branch: string;
  add: number;
  rem: number;
  agentSessionId?: string;
}

// ---------------------------------------------------------------------------
// Short codename generator
// ---------------------------------------------------------------------------
const NAMES = [
  "atlas", "nova", "echo", "maya", "orbit", "jet", "sol", "reef",
  "arc", "dusk", "vega", "zion", "cleo", "tide", "fern", "bram",
  "opal", "rune", "lux", "hex", "wren", "pico", "cyan", "mira",
];

function randomSlug(): string {
  const base = NAMES[Math.floor(Math.random() * NAMES.length)] ?? "task";
  const suffix = Math.floor(Math.random() * 100)
    .toString()
    .padStart(2, "0");
  return `${base}-${suffix}`;
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------
const KEY = "planflow.sessions";

function loadSessions(): Session[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Session[];
  } catch {
    return [];
  }
}

function saveSessions(list: Session[]): void {
  localStorage.setItem(KEY, JSON.stringify(list));
}

// ---------------------------------------------------------------------------
// Signals
// ---------------------------------------------------------------------------
const [sessions, setSessionsSignal] = createSignal<Session[]>(loadSessions());

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** All sessions for a given project, most-recently created first. */
export function sessionsForProject(projectId: string): Session[] {
  return sessions()
    .filter((s) => s.projectId === projectId)
    .slice()
    .reverse();
}

/**
 * All sessions across all projects, sorted most-recent first.
 * Used by Home to render the "recent" panel.
 */
export function allSessionsRecent(): Session[] {
  return sessions().slice().reverse();
}

/** Create a new session for the given project. Returns the new session. */
export function createSession(
  projectId: string,
  task: string
): Session {
  const session: Session = {
    id: randomSlug(),
    projectId,
    task,
    status: "idle",
    branch: "",
    add: 0,
    rem: 0,
  };
  setSessionsSignal((prev) => {
    const next = [...prev, session];
    saveSessions(next);
    return next;
  });
  return session;
}

/** Update fields on an existing session. */
export function updateSession(id: string, patch: Partial<Omit<Session, "id">>): void {
  setSessionsSignal((prev) => {
    const next = prev.map((s) => (s.id === id ? { ...s, ...patch } : s));
    saveSessions(next);
    return next;
  });
}

/** Remove a session by id. */
export function removeSession(id: string): void {
  setSessionsSignal((prev) => {
    const next = prev.filter((s) => s.id !== id);
    saveSessions(next);
    return next;
  });
}
