import { For, Show, type JSX } from "solid-js";
import { I } from "../../ui/icons";
import { projects } from "../../stores/projects";
import { initials, liveCountForProject } from "./helpers";
import type { Project } from "../../stores/projects";

export function ProjectRail(props: {
  activeProjectId: string;
  onSelectProject: (id: string) => void;
  onAddProject: () => void;
  onSettings: () => void;
}): JSX.Element {
  // Find active project for avatar initials
  const activeProject = () => projects().find((p) => p.id === props.activeProjectId) as Project | undefined;

  return (
    <nav
      class="hidden w-[60px] shrink-0 flex-col items-center border-r border-ink-800 bg-ink-950 py-3 sm:flex"
      aria-label="Projects"
    >
      <span class="flex h-9 w-9 items-center justify-center rounded-btn bg-brand-100 text-ink-950">
        <I.term class="h-5 w-5" />
      </span>
      <span class="my-3 h-px w-7 bg-ink-800" />
      <div class="flex flex-1 flex-col items-center gap-2 overflow-y-auto overflow-x-hidden">
        <For each={projects()}>
          {(p) => {
            const on = () => p.id === props.activeProjectId;
            const live = () => liveCountForProject(p.id);
            return (
              <button
                type="button"
                onClick={() => props.onSelectProject(p.id)}
                aria-label={p.name}
                title={p.name}
                class="group relative flex items-center justify-center"
              >
                <Show when={on()}>
                  <span class="absolute -left-3 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-brand-200" />
                </Show>
                <span
                  class={`grid h-9 w-9 place-items-center rounded-btn font-mono text-[11px] font-semibold transition-colors ${on() ? "bg-brand-100 text-ink-950" : "bg-ink-800 text-ink-300 group-hover:bg-ink-700 group-hover:text-ink-100"}`}
                >
                  {initials(p.name)}
                </span>
                <Show when={live() > 0}>
                  <span class="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
                    <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-success-400/60" />
                    <span class="relative inline-flex h-2.5 w-2.5 rounded-full border-2 border-ink-950 bg-success-400" />
                  </span>
                </Show>
              </button>
            );
          }}
        </For>
        <button
          type="button"
          onClick={() => props.onAddProject()}
          aria-label="Add project"
          class="grid h-9 w-9 place-items-center rounded-btn border border-dashed border-ink-700 text-ink-500 transition-colors hover:border-ink-600 hover:text-ink-200"
        >
          <I.plus class="h-4 w-4" />
        </button>
      </div>
      <div class="mt-auto flex flex-col items-center gap-2.5">
        <button
          type="button"
          onClick={() => props.onSettings()}
          aria-label="Settings"
          class="text-ink-500 hover:text-ink-200"
        >
          <I.settings class="h-[18px] w-[18px]" />
        </button>
        <span class="h-7 w-7 rounded-pill ring-1 ring-ink-700 grid place-items-center bg-ink-800 font-mono text-[10px] font-semibold text-ink-300">
          {initials(activeProject()?.name ?? "")}
        </span>
      </div>
    </nav>
  );
}
