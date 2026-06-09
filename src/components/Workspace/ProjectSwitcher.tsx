import { createMemo, createSignal, For, Show, type JSX } from "solid-js";
import { I } from "../../ui/icons";
import { Dot } from "../../ui/primitives";
import { projects } from "../../stores/projects";
import { sessionsForProject } from "../../stores/sessions";
import { initials, liveCountForProject } from "./helpers";

export function ProjectSwitcher(props: {
  activeProjectId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}): JSX.Element {
  const [query, setQuery] = createSignal("");

  const filteredProjects = createMemo(() => {
    const q = query().toLowerCase();
    if (!q) return projects();
    return projects().filter((p) => p.name.toLowerCase().includes(q));
  });

  const handleSelect = (id: string): void => {
    props.onSelect(id);
    setQuery("");
  };

  return (
    <div
      class="fixed inset-0 z-50 flex items-start justify-center bg-ink-950/70 px-4 pt-[110px] backdrop-blur-sm"
      onClick={() => { props.onClose(); setQuery(""); }}
    >
      <div
        class="w-full max-w-[520px] overflow-hidden rounded-card border border-ink-700 bg-ink-900 shadow-float"
        onClick={(e) => e.stopPropagation()}
      >
        <div class="flex items-center gap-2.5 border-b border-ink-800 px-4 py-3">
          <I.search class="h-4 w-4 text-ink-500" />
          <input
            autofocus
            value={query()}
            onInput={(e) => setQuery(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") { props.onClose(); setQuery(""); }
            }}
            placeholder="Jump to a project or session…"
            aria-label="Jump to project or session"
            class="w-full bg-transparent text-sm text-ink-100 outline-none placeholder:text-ink-600"
          />
          <kbd class="rounded bg-ink-800 px-1.5 py-0.5 font-mono text-[10px] text-ink-500">
            esc
          </kbd>
        </div>
        <div class="max-h-[360px] overflow-y-auto py-1.5">
          <div class="px-3 pb-1 pt-2 text-[10px] uppercase tracking-wider text-ink-500">
            Projects
          </div>
          <For each={filteredProjects()}>
            {(p) => {
              const on = () => p.id === props.activeProjectId;
              const sessCount = () => sessionsForProject(p.id).length;
              const live = () => liveCountForProject(p.id);
              return (
                <button
                  type="button"
                  onClick={() => handleSelect(p.id)}
                  class={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors ${on() ? "bg-ink-800" : "hover:bg-ink-800/60"}`}
                >
                  <span class="grid h-8 w-8 shrink-0 place-items-center rounded-btn bg-ink-800 font-mono text-[11px] font-semibold text-ink-200">
                    {initials(p.name)}
                  </span>
                  <span class="min-w-0 flex-1">
                    <span class="block truncate text-sm text-ink-100">{p.name}</span>
                    <span class="block truncate font-mono text-[11px] text-ink-500">
                      {p.path.split("/").pop() ?? p.path} · {sessCount()} session{sessCount() !== 1 ? "s" : ""}
                    </span>
                  </span>
                  <Show when={live() > 0}>
                    <span class="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-pill bg-success-500/12 px-2 py-0.5 text-[10px] text-success-300 ring-1 ring-inset ring-success-500/25">
                      <Dot tone="live" />
                      {live()} running
                    </span>
                  </Show>
                  <Show when={on()}>
                    <I.check class="h-4 w-4 shrink-0 text-brand-300" />
                  </Show>
                </button>
              );
            }}
          </For>
        </div>
        <div class="flex items-center gap-3 whitespace-nowrap border-t border-ink-800 px-4 py-2 font-mono text-[10px] text-ink-600">
          <span><span class="text-ink-400">↑↓</span> navigate</span>
          <span><span class="text-ink-400">↵</span> open</span>
          <span class="ml-auto">
            {projects().reduce((n, p) => n + liveCountForProject(p.id), 0)} agents running
          </span>
        </div>
      </div>
    </div>
  );
}
