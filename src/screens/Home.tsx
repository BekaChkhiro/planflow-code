import { createSignal, For, Show, type JSX } from "solid-js";
import { I } from "../ui/icons";
import { Dot } from "../ui/primitives";
import { projects, activeProjectId, setActiveProjectId, touchProject } from "../stores/projects";
import { allSessionsRecent, type Session } from "../stores/sessions";
import { AddProjectModal } from "../components/AddProjectModal";

/* ------------------------------------------------------------------ *
 * PlanFlow — Home (returning user)
 * ------------------------------------------------------------------ */

const toneOf = (s: Session["status"]): "live" | "done" | "idle" =>
  s === "running" ? "live" : s === "review" ? "done" : "idle";

export default function Home(props: {
  onOpenWorkspace?: () => void;
}): JSX.Element {
  const [filter, setFilter] = createSignal<"all" | "active">("all");
  const [addOpen, setAddOpen] = createSignal(false);

  // Derive running count reactively from the sessions store
  const runningCount = () =>
    allSessionsRecent().filter((s) => s.status === "running").length;

  const shown = () => {
    const list = projects().slice().sort((a, b) => b.lastOpenedAt - a.lastOpenedAt);
    if (filter() === "active") {
      const activeIds = new Set(
        allSessionsRecent()
          .filter((s) => s.status === "running")
          .map((s) => s.projectId)
      );
      return list.filter((p) => activeIds.has(p.id));
    }
    return list;
  };

  const recentSessions = () => allSessionsRecent().slice(0, 8);

  const openProject = (projectId: string) => {
    touchProject(projectId);
    setActiveProjectId(projectId);
    props.onOpenWorkspace?.();
  };

  const openSession = (session: Session) => {
    touchProject(session.projectId);
    setActiveProjectId(session.projectId);
    props.onOpenWorkspace?.();
  };

  const handleAdded = (id: string) => {
    setAddOpen(false);
    touchProject(id);
    setActiveProjectId(id);
    props.onOpenWorkspace?.();
  };

  const projectForSession = (s: Session) =>
    projects().find((p) => p.id === s.projectId);

  const sessionsForProject = (projectId: string) =>
    allSessionsRecent().filter((s) => s.projectId === projectId);

  return (
    <div class="flex h-screen flex-col bg-ink-950 font-sans text-ink-200 antialiased">
      {/* title bar */}
      <div
        data-tauri-drag-region
        class="flex shrink-0 items-center border-b border-ink-800 bg-ink-900/70 pl-20 pr-2 py-2"
      >
        <span class="whitespace-nowrap font-mono text-xs text-ink-500">planflow</span>
        <div class="ml-auto flex items-center gap-1">
          <button
            type="button"
            class="hidden items-center gap-1.5 whitespace-nowrap rounded-field border border-ink-800 px-2 py-1 text-[11px] text-ink-500 hover:bg-ink-800 hover:text-ink-200 sm:flex"
          >
            Jump to… <kbd class="rounded bg-ink-800 px-1 font-mono text-[9px]">⌘P</kbd>
          </button>
          <button
            type="button"
            class="relative rounded-field p-1.5 text-ink-500 hover:bg-ink-800 hover:text-ink-200"
            aria-label="Notifications"
          >
            <I.bell class="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* body */}
      <div class="flex-1 min-h-0 overflow-y-auto">
        <div class="mx-auto max-w-[1180px] px-7 py-10 sm:px-12 sm:py-14">
          <div class="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_minmax(0,420px)] lg:gap-16">
            {/* left — greeting */}
            <div class="flex flex-col">
              <div class="mb-9 flex items-center gap-3">
                <span class="flex h-9 w-9 items-center justify-center rounded-btn bg-brand-100 text-ink-950">
                  <I.term class="h-5 w-5" />
                </span>
                <span class="whitespace-nowrap font-mono text-sm font-medium tracking-tight text-ink-100">
                  planflow
                </span>
              </div>

              <div class="mb-3 font-mono text-[11px] uppercase tracking-[0.28em] text-accent-300">
                Welcome back
              </div>
              <h1 class="max-w-[15ch] text-[40px] font-semibold leading-[1.05] tracking-tight text-ink-50">
                Pick up where you left off.
              </h1>

              <Show
                when={projects().length > 0}
                fallback={
                  <p class="mt-5 text-[15px] leading-relaxed text-ink-400">
                    No projects yet. Add one to get started.
                  </p>
                }
              >
                <p class="mt-5 flex items-center gap-2 text-[15px] leading-relaxed text-ink-400">
                  <Show
                    when={runningCount() > 0}
                    fallback={<span class="whitespace-nowrap text-ink-600">No agents running.</span>}
                  >
                    <span class="inline-flex items-center gap-1.5 whitespace-nowrap font-medium text-ink-200">
                      <Dot tone="live" />
                      {runningCount()} agents running
                    </span>
                  </Show>
                  <span class="whitespace-nowrap text-ink-600">
                    across {projects().length} {projects().length === 1 ? "project" : "projects"}.
                  </span>
                </p>
              </Show>

              <div class="mt-8 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const first = projects()[0];
                    if (first) openProject(first.id);
                  }}
                  disabled={projects().length === 0}
                  class="inline-flex items-center gap-2 whitespace-nowrap rounded-btn bg-brand-100 px-4 py-2.5 text-sm font-medium text-ink-950 transition-colors hover:bg-brand-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950 disabled:pointer-events-none disabled:opacity-40"
                >
                  <I.plus class="h-4 w-4" />
                  New session
                </button>
                <button
                  type="button"
                  onClick={() => setAddOpen(true)}
                  class="inline-flex items-center gap-2 whitespace-nowrap rounded-btn border border-ink-700 px-4 py-2.5 text-sm font-medium text-ink-200 transition-colors hover:bg-ink-800"
                >
                  <I.plus class="h-4 w-4 text-ink-500" />
                  Add project
                </button>
              </div>

              <div class="mt-auto pt-10">
                <div class="mb-3 h-px w-full bg-ink-800" />
                <div class="flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[11px] text-ink-500">
                  <span class="flex items-center gap-1.5 whitespace-nowrap">
                    <kbd class="rounded bg-ink-800 px-1.5 py-0.5 text-ink-300">⌘K</kbd> search
                  </span>
                  <span class="flex items-center gap-1.5 whitespace-nowrap">
                    <kbd class="rounded bg-ink-800 px-1.5 py-0.5 text-ink-300">⌘P</kbd> switch
                    project
                  </span>
                  <span class="flex items-center gap-1.5 whitespace-nowrap">
                    <kbd class="rounded bg-ink-800 px-1.5 py-0.5 text-ink-300">⌘N</kbd> new session
                  </span>
                </div>
              </div>
            </div>

            {/* right — resume */}
            <div class="rounded-card border border-ink-800 bg-ink-900/50 p-2.5">
              <div class="flex items-center justify-between px-2.5 py-2">
                <span class="whitespace-nowrap text-sm font-medium text-ink-100">
                  Jump back in
                </span>
                <span class="font-mono text-[11px] text-ink-500">
                  {recentSessions().length} recent
                </span>
              </div>

              <Show
                when={recentSessions().length > 0}
                fallback={
                  <div class="px-2.5 py-6 text-center text-xs text-ink-600">
                    No sessions yet. Open a project and start one.
                  </div>
                }
              >
                <div class="space-y-1">
                  <For each={recentSessions()}>
                    {(s) => {
                      const proj = () => projectForSession(s);
                      const projInitials = () =>
                        (proj()?.name ?? "?").slice(0, 2).toUpperCase();
                      const on = () => activeProjectId() === s.projectId;
                      return (
                        <button
                          type="button"
                          onClick={() => openSession(s)}
                          class={`group flex w-full items-center gap-3 rounded-field px-2.5 py-2.5 text-left transition-colors ${on() ? "bg-ink-800" : "hover:bg-ink-800/60"}`}
                        >
                          <span class="grid h-8 w-8 shrink-0 place-items-center rounded-btn bg-ink-800 font-mono text-[10px] font-semibold text-ink-200 ring-1 ring-ink-700">
                            {projInitials()}
                          </span>
                          <span class="min-w-0 flex-1">
                            <span
                              class={`block truncate text-[13px] ${on() ? "text-ink-50" : "text-ink-200"}`}
                            >
                              {s.task || s.id}
                            </span>
                            <span class="flex items-center gap-1.5 text-[11px] text-ink-500">
                              <span class="truncate">{proj()?.name ?? s.projectId}</span>
                              <Show when={s.add > 0 || s.rem > 0}>
                                <span class="text-ink-700">·</span>
                                <span class="font-mono">
                                  <span class="text-success-300">+{s.add}</span>{" "}
                                  <span class="text-danger-300">−{s.rem}</span>
                                </span>
                              </Show>
                            </span>
                          </span>
                          <span class="flex shrink-0 items-center gap-2">
                            <Dot tone={toneOf(s.status)} />
                            <I.arrow class="h-4 w-4 text-ink-600 opacity-0 transition-opacity group-hover:opacity-100" />
                          </span>
                        </button>
                      );
                    }}
                  </For>
                </div>
              </Show>
            </div>
          </div>

          {/* projects */}
          <div class="mt-14">
            <div class="mb-4 flex items-center justify-between">
              <div class="flex items-baseline gap-3">
                <h2 class="whitespace-nowrap text-sm font-medium uppercase tracking-[0.18em] text-ink-400">
                  Projects
                </h2>
                <span class="font-mono text-xs text-ink-600">{shown().length}</span>
              </div>
              <div class="inline-flex rounded-field border border-ink-800 bg-ink-950 p-0.5">
                <For each={[["all", "All"], ["active", "Active"]] as const}>
                  {([v, l]) => (
                    <button
                      type="button"
                      onClick={() => setFilter(v)}
                      class={`whitespace-nowrap rounded-[7px] px-3 py-1 text-xs font-medium transition-colors ${filter() === v ? "bg-ink-800 text-ink-50" : "text-ink-400 hover:text-ink-200"}`}
                    >
                      {l}
                    </button>
                  )}
                </For>
              </div>
            </div>

            <Show
              when={projects().length > 0 || filter() !== "all"}
              fallback={
                <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => setAddOpen(true)}
                    class="flex min-h-[112px] flex-col items-center justify-center gap-2 rounded-card border border-dashed border-ink-700 text-ink-500 transition-colors hover:border-ink-600 hover:text-ink-200"
                  >
                    <I.plus class="h-5 w-5" />
                    <span class="whitespace-nowrap text-xs font-medium">Add your first project</span>
                  </button>
                </div>
              }
            >
              <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <For each={shown()}>
                  {(p) => {
                    const initials = p.name.slice(0, 2).toUpperCase();
                    const projectSessions = () => sessionsForProject(p.id);
                    const running = () =>
                      projectSessions().filter((s) => s.status === "running").length;
                    const lastOpened = () => {
                      const diff = Date.now() - p.lastOpenedAt;
                      if (diff < 60_000) return "just now";
                      if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
                      if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
                      return "yesterday";
                    };
                    return (
                      <button
                        type="button"
                        onClick={() => openProject(p.id)}
                        class="group rounded-card border border-ink-800 bg-ink-900/40 p-4 text-left transition-colors hover:border-ink-700 hover:bg-ink-900/70"
                      >
                        <div class="flex items-start gap-3">
                          <span class="grid h-9 w-9 shrink-0 place-items-center rounded-btn bg-ink-800 font-mono text-[11px] font-semibold text-ink-100">
                            {initials}
                          </span>
                          <span class="min-w-0 flex-1">
                            <span class="flex items-center justify-between gap-2">
                              <span class="truncate text-sm font-medium text-ink-100">{p.name}</span>
                              <I.arrow class="h-4 w-4 shrink-0 text-ink-600 opacity-0 transition-opacity group-hover:opacity-100" />
                            </span>
                            <span class="block truncate font-mono text-[11px] text-ink-500">
                              {p.path.split("/").pop() ?? p.path}
                            </span>
                          </span>
                        </div>
                        <div class="mt-4 flex items-center justify-between border-t border-ink-800 pt-3 text-[11px]">
                          <span class="whitespace-nowrap text-ink-500">
                            {projectSessions().length}{" "}
                            {projectSessions().length === 1 ? "session" : "sessions"}
                          </span>
                          <Show
                            when={running() > 0}
                            fallback={
                              <span class="whitespace-nowrap font-mono text-ink-600">
                                opened {lastOpened()}
                              </span>
                            }
                          >
                            <span class="inline-flex items-center gap-1.5 whitespace-nowrap font-medium text-success-300">
                              <Dot tone="live" />
                              {running()} running
                            </span>
                          </Show>
                        </div>
                      </button>
                    );
                  }}
                </For>
                <button
                  type="button"
                  onClick={() => setAddOpen(true)}
                  class="flex min-h-[112px] flex-col items-center justify-center gap-2 rounded-card border border-dashed border-ink-700 text-ink-500 transition-colors hover:border-ink-600 hover:text-ink-200"
                >
                  <I.plus class="h-5 w-5" />
                  <span class="whitespace-nowrap text-xs font-medium">Add project</span>
                </button>
              </div>
            </Show>
          </div>
        </div>
      </div>

      {/* add project modal */}
      <Show when={addOpen()}>
        <AddProjectModal onClose={() => setAddOpen(false)} onAdded={handleAdded} />
      </Show>
    </div>
  );
}
