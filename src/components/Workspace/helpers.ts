import { sessionsForProject } from "../../stores/sessions";

// ── Workspace helpers ─────────────────────────────────────────────────────

/** Compact relative time for the history list (e.g. "3m", "2h", "5d"). */
export function relTime(ts: number): string {
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

/** Derive initials from a project name — first two words' first chars. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/);
  const a = words[0]?.[0] ?? "";
  const b = words[1]?.[0] ?? "";
  return (a + b).toUpperCase() || name.slice(0, 2).toUpperCase();
}

/** Count sessions with status==='running' for a project id. */
export function liveCountForProject(projectId: string): number {
  return sessionsForProject(projectId).filter((s) => s.status === "running").length;
}
