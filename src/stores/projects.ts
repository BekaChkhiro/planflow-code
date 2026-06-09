/**
 * Projects store — localStorage-backed, reactive via Solid signals.
 *
 * Keys:
 *   planflow.projects        JSON array of Project
 *   planflow.activeProjectId string | null
 *   planflow.onboardingDone  "1" | absent
 */

import { createSignal } from "solid-js";

export interface Project {
  id: string;
  name: string;
  path: string;
  defaultCli: "claude" | "codex";
  createdAt: number;
  lastOpenedAt: number;
}

// ---------------------------------------------------------------------------
// FNV-1a 32-bit hash — deterministic id from the path string
// ---------------------------------------------------------------------------
function fnv1a(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

// ---------------------------------------------------------------------------
// Persistence helpers
// ---------------------------------------------------------------------------
const KEYS = {
  projects: "planflow.projects",
  activeId: "planflow.activeProjectId",
  onboarding: "planflow.onboardingDone",
} as const;

function loadProjects(): Project[] {
  try {
    const raw = localStorage.getItem(KEYS.projects);
    if (!raw) return [];
    return JSON.parse(raw) as Project[];
  } catch {
    return [];
  }
}

function saveProjects(list: Project[]): void {
  localStorage.setItem(KEYS.projects, JSON.stringify(list));
}

// ---------------------------------------------------------------------------
// Signals
// ---------------------------------------------------------------------------
const [projects, setProjectsSignal] = createSignal<Project[]>(loadProjects());

const [activeProjectId, setActiveProjectIdSignal] = createSignal<string | null>(
  localStorage.getItem(KEYS.activeId) ?? null
);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Reactive list of all projects. */
export { projects };

/** Currently active project id. */
export { activeProjectId };

/** Set the active project and persist. */
export function setActiveProjectId(id: string | null): void {
  setActiveProjectIdSignal(id);
  if (id === null) {
    localStorage.removeItem(KEYS.activeId);
  } else {
    localStorage.setItem(KEYS.activeId, id);
  }
}

/**
 * Add a new project. Deduplicates by path — if a project with the same path
 * already exists, updates its lastOpenedAt and returns the existing id.
 */
export function addProject(opts: {
  path: string;
  name: string;
  defaultCli: "claude" | "codex";
}): string {
  const id = fnv1a(opts.path);
  const now = Date.now();

  setProjectsSignal((prev) => {
    const existing = prev.find((p) => p.path === opts.path);
    let next: Project[];
    if (existing) {
      next = prev.map((p) =>
        p.path === opts.path ? { ...p, name: opts.name, defaultCli: opts.defaultCli, lastOpenedAt: now } : p
      );
    } else {
      const project: Project = {
        id,
        name: opts.name,
        path: opts.path,
        defaultCli: opts.defaultCli,
        createdAt: now,
        lastOpenedAt: now,
      };
      next = [...prev, project];
    }
    saveProjects(next);
    return next;
  });

  return id;
}

/** Remove a project by id. */
export function removeProject(id: string): void {
  setProjectsSignal((prev) => {
    const next = prev.filter((p) => p.id !== id);
    saveProjects(next);
    return next;
  });
  if (activeProjectId() === id) {
    setActiveProjectId(null);
  }
}

/** Update lastOpenedAt for a project — call when the user opens it. */
export function touchProject(id: string): void {
  const now = Date.now();
  setProjectsSignal((prev) => {
    const next = prev.map((p) => (p.id === id ? { ...p, lastOpenedAt: now } : p));
    saveProjects(next);
    return next;
  });
}

/** Whether the user has completed initial onboarding. */
export function isOnboardingDone(): boolean {
  return localStorage.getItem(KEYS.onboarding) === "1";
}

/** Mark onboarding as complete and persist. */
export function markOnboardingDone(): void {
  localStorage.setItem(KEYS.onboarding, "1");
}
