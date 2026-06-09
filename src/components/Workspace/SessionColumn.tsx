import { For, Show, createSignal, onCleanup, type JSX } from "solid-js";
import { I } from "../../ui/icons";
import { Dot } from "../../ui/primitives";
import type { Session, SessionStatus } from "../../stores/sessions";
import { initials, relTime } from "./helpers";
import { listSessions } from "../AgentView/agentSession";
import type { Project } from "../../stores/projects";

const GROUPS: [SessionStatus, string][] = [
  ["running", "Running"],
  ["review", "Needs review"],
  ["idle", "Idle"],
];

const toneOf = (s: SessionStatus): "live" | "done" | "idle" =>
  s === "running" ? "live" : s === "review" ? "done" : "idle";

export function SessionColumn(props: {
  project: Project;
  sessions: Session[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onSwitchProject: () => void;
  onRestartSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onOpenHistory: (claudeId: string, title: string) => void;
}): JSX.Element {
  // Past Claude transcripts for this project's folder that aren't currently
  // open as a live session.
  const history = () =>
    listSessions().filter(
      (m) =>
        (m.cwd === props.project.path || m.projectName === props.project.name) &&
        !props.sessions.some((s) => s.agentSessionId === m.claudeId),
    );

  const [menu, setMenu] = createSignal<{ id: string; x: number; y: number } | null>(null);
  const openMenu = (e: MouseEvent, id: string): void => {
    e.preventDefault();
    setMenu({ id, x: e.clientX, y: e.clientY });
  };
  const closeMenu = (): void => {
    setMenu(null);
  };
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === "Escape") closeMenu();
  };
  window.addEventListener("keydown", onKey);
  onCleanup(() => window.removeEventListener("keydown", onKey));

  return (
    <aside class="hidden w-60 shrink-0 flex-col border-r border-ink-800 bg-ink-900/20 lg:flex">
      <button
        type="button"
        onClick={() => props.onSwitchProject()}
        class="flex items-center gap-2.5 border-b border-ink-800 px-3.5 py-3 text-left transition-colors hover:bg-ink-800/40"
      >
        <span class="grid h-7 w-7 shrink-0 place-items-center rounded-btn bg-ink-800 font-mono text-[10px] font-semibold text-ink-200">
          {initials(props.project.name)}
        </span>
        <span class="min-w-0 flex-1">
          <span class="block truncate text-sm font-medium text-ink-50">{props.project.name}</span>
          <span class="block truncate font-mono text-[11px] text-ink-500">
            {props.project.path.split("/").pop() ?? props.project.path}
          </span>
        </span>
        <I.chevron class="h-4 w-4 shrink-0 text-ink-500" />
      </button>

      <div class="space-y-2 px-3 pb-1 pt-3">
        <button
          type="button"
          onClick={() => props.onNewSession()}
          class="flex w-full items-center justify-center gap-1.5 rounded-btn bg-brand-100 py-1.5 text-xs font-medium text-ink-950 transition-colors hover:bg-brand-200"
        >
          <I.plus class="h-4 w-4" />
          New session
        </button>
      </div>

      <div class="mt-1 flex-1 overflow-y-auto px-2 pb-3">
        <Show
          when={props.sessions.length > 0}
          fallback={
            <div class="px-3 py-6 text-center text-[12px] text-ink-500">
              No sessions yet.
              <br />
              <button
                type="button"
                onClick={() => props.onNewSession()}
                class="mt-2 text-brand-300 hover:underline"
              >
                Start one
              </button>
            </div>
          }
        >
          <For each={GROUPS}>
            {([st, label]) => {
              const items = () => props.sessions.filter((s) => s.status === st);
              return (
                <Show when={items().length > 0}>
                  <div class="mb-1">
                    <div class="flex items-center justify-between px-2 pb-1 pt-3 text-[10px] uppercase tracking-wider text-ink-500">
                      <span>{label}</span>
                      <span class="font-mono">{items().length}</span>
                    </div>
                    <For each={items()}>
                      {(s) => {
                        const on = () => s.id === props.activeSessionId;
                        return (
                          <button
                            type="button"
                            onClick={() => props.onSelectSession(s.id)}
                            onContextMenu={(e) => openMenu(e, s.id)}
                            class={`mb-0.5 flex w-full items-start gap-2.5 rounded-field px-2.5 py-2 text-left transition-colors ${on() ? "bg-ink-800" : "hover:bg-ink-800/50"}`}
                          >
                            <span class="mt-1.5">
                              <Dot tone={toneOf(s.status)} />
                            </span>
                            <span class="min-w-0 flex-1">
                              <span
                                class={`block truncate text-[13px] ${on() ? "text-ink-50" : "text-ink-300"}`}
                              >
                                {s.task}
                              </span>
                              <span class="flex items-center gap-1.5 text-[11px] text-ink-500">
                                <I.branch class="h-3 w-3 shrink-0" />
                                <span class="truncate whitespace-nowrap font-mono">
                                  {s.id}
                                </span>
                                <Show when={s.add > 0 || s.rem > 0}>
                                  <span class="shrink-0 font-mono">
                                    <span class="text-success-300">+{s.add}</span>{" "}
                                    <span class="text-danger-300">−{s.rem}</span>
                                  </span>
                                </Show>
                              </span>
                            </span>
                          </button>
                        );
                      }}
                    </For>
                  </div>
                </Show>
              );
            }}
          </For>
        </Show>

        {/* Past sessions (resume from transcript history) */}
        <Show when={history().length > 0}>
          <div class="mb-1">
            <div class="flex items-center justify-between px-2 pb-1 pt-3 text-[10px] uppercase tracking-wider text-ink-500">
              <span>History</span>
              <span class="font-mono">{history().length}</span>
            </div>
            <For each={history()}>
              {(m) => (
                <button
                  type="button"
                  onClick={() => props.onOpenHistory(m.claudeId, m.title)}
                  class="mb-0.5 flex w-full items-start gap-2.5 rounded-field px-2.5 py-2 text-left transition-colors hover:bg-ink-800/50"
                >
                  <span class="mt-1.5">
                    <Dot tone="idle" />
                  </span>
                  <span class="min-w-0 flex-1">
                    <span class="block truncate text-[13px] text-ink-400">{m.title}</span>
                    <span class="flex items-center gap-1.5 text-[11px] text-ink-600">
                      <I.refresh class="h-3 w-3 shrink-0" />
                      <span class="truncate font-mono">resume · {relTime(m.updatedAt)}</span>
                    </span>
                  </span>
                </button>
              )}
            </For>
          </div>
        </Show>
      </div>

      {/* right-click context menu */}
      <Show when={menu()}>
        {(m) => (
          <>
            <div class="fixed inset-0 z-40" onClick={closeMenu} onContextMenu={(e) => { e.preventDefault(); closeMenu(); }} />
            <div
              class="fixed z-50 w-44 overflow-hidden rounded-card border border-ink-700 bg-ink-900 py-1 shadow-pop"
              style={{ left: `${m().x}px`, top: `${m().y}px` }}
            >
              <button
                type="button"
                onClick={() => { props.onRestartSession(m().id); closeMenu(); }}
                class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink-200 hover:bg-ink-800"
              >
                <I.refresh class="h-3.5 w-3.5 text-ink-500" />
                Restart session
              </button>
              <div class="my-1 border-t border-ink-800" />
              <button
                type="button"
                onClick={() => { props.onDeleteSession(m().id); closeMenu(); }}
                class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-danger-300 hover:bg-ink-800"
              >
                <I.x class="h-3.5 w-3.5" />
                Delete session
              </button>
            </div>
          </>
        )}
      </Show>
    </aside>
  );
}
