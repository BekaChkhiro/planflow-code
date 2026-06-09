import { createResource, createSignal, Show, For, Suspense, type JSX } from "solid-js";
import { I } from "../ui/icons";
import { cliListAvailable, type CliInfo } from "../ipc/cli";
import { AddProjectModal } from "../components/AddProjectModal";
import { projects } from "../stores/projects";
import { setActiveProjectId, touchProject } from "../stores/projects";

/* ------------------------------------------------------------------ *
 * PlanFlow — Welcome / first-run
 * ------------------------------------------------------------------ */

const CLI_META: Record<string, { mark: string; name: string }> = {
  claude: { mark: "CC", name: "Claude Code" },
  codex: { mark: "CX", name: "Codex CLI" },
};

export default function Welcome(props: { onOpen?: () => void }): JSX.Element {
  const [cliData] = createResource<CliInfo[]>(cliListAvailable);
  const [addOpen, setAddOpen] = createSignal(false);

  // True when at least one CLI was detected (found)
  const cliConnected = () => (cliData() ?? []).length > 0;
  // True once any project exists in the store
  const projectAdded = () => projects().length > 0;

  const stepDone = () => [cliConnected(), projectAdded()];
  const doneCount = () => stepDone().filter(Boolean).length;

  const lastAddedProject = () => {
    const list = projects();
    return list[list.length - 1] ?? null;
  };

  const handleAdded = (id: string) => {
    setAddOpen(false);
    touchProject(id);
    setActiveProjectId(id);
    if (doneCount() === 2 && props.onOpen) props.onOpen();
  };

  return (
    <div class="flex h-screen flex-col bg-ink-950 font-sans text-ink-200 antialiased">
      {/* title bar — draggable, clears macOS traffic lights with pl-20 */}
      <div
        data-tauri-drag-region
        class="flex shrink-0 items-center border-b border-ink-800 bg-ink-900/70 pl-20 pr-3 py-2"
      >
        <span class="whitespace-nowrap font-mono text-xs text-ink-500">planflow</span>
        <span class="ml-auto rounded-pill bg-ink-800 px-2 py-0.5 font-mono text-[10px] text-ink-400">
          v0.1.0
        </span>
      </div>

      {/* body */}
      <div class="flex-1 min-h-0 overflow-y-auto">
        <div class="mx-auto max-w-[1180px] grid grid-cols-1 gap-10 px-7 py-10 sm:px-12 sm:py-14 lg:grid-cols-[1fr_minmax(0,420px)] lg:gap-16">
          {/* left — welcome */}
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
              Welcome
            </div>
            <h1 class="max-w-[14ch] text-[40px] font-semibold leading-[1.05] tracking-tight text-ink-50">
              One window for every coding agent.
            </h1>
            <p class="mt-5 max-w-md text-[15px] leading-relaxed text-ink-400">
              Run Claude Code and Codex across all your repositories — in parallel, side by side.
              Watch them work, review their diffs, and switch projects without losing a thread.
            </p>

            <div class="mt-8 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                class="inline-flex items-center gap-2 whitespace-nowrap rounded-btn bg-brand-100 px-4 py-2.5 text-sm font-medium text-ink-950 transition-colors hover:bg-brand-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950"
              >
                <I.plus class="h-4 w-4" />
                Add your first project
              </button>
              <button
                type="button"
                class="inline-flex items-center gap-2 whitespace-nowrap rounded-btn border border-ink-700 px-4 py-2.5 text-sm font-medium text-ink-200 transition-colors hover:bg-ink-800"
              >
                Read the docs
                <I.ext class="h-4 w-4 text-ink-500" />
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

          {/* right — get set up */}
          <div class="rounded-card border border-ink-800 bg-ink-900/50 p-6">
            <div class="mb-5 flex items-center justify-between">
              <span class="whitespace-nowrap text-sm font-medium text-ink-100">Get set up</span>
              <span class="font-mono text-[11px] text-ink-500">
                <span class="text-ink-200">{doneCount()}</span> / 2
              </span>
            </div>
            <div class="mb-6 flex gap-1.5">
              <For each={stepDone()}>
                {(d) => (
                  <span
                    class={`h-1 flex-1 rounded-full transition-colors ${d ? "bg-brand-300" : "bg-ink-800"}`}
                  />
                )}
              </For>
            </div>

            {/* step 1 — CLIs */}
            <Step n={1} done={stepDone()[0] ?? false} title="Connect a coding agent" desc="We scan your PATH for installed CLIs.">
              <div class="mt-3 space-y-1.5">
                <Suspense
                  fallback={
                    <div class="flex items-center gap-2 rounded-field border border-ink-800 bg-ink-950 px-3 py-2 text-xs text-ink-500">
                      <svg viewBox="0 0 24 24" class="h-3.5 w-3.5 animate-spin" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 3a9 9 0 1 0 9 9" stroke-linecap="round" />
                      </svg>
                      Scanning PATH…
                    </div>
                  }
                >
                  <Show
                    when={(cliData() ?? []).length > 0}
                    fallback={
                      <CliRow mark="?" name="No CLIs found" detail="Install Claude Code or Codex CLI and relaunch." found={false} />
                    }
                  >
                    <For each={cliData() ?? []}>
                      {(c) => {
                        const meta = CLI_META[c.name] ?? { mark: c.name.slice(0, 2).toUpperCase(), name: c.name };
                        const detail = [c.version, c.path].filter(Boolean).join(" · ");
                        return (
                          <CliRow
                            mark={meta.mark}
                            name={meta.name}
                            detail={detail || c.path}
                            found={true}
                          />
                        );
                      }}
                    </For>
                  </Show>
                </Suspense>
              </div>
            </Step>

            {/* step 2 */}
            <Step
              n={2}
              done={stepDone()[1] ?? false}
              title="Add your first project"
              desc="Point PlanFlow at a local repository."
              last
            >
              <Show
                when={projectAdded()}
                fallback={
                  <button
                    type="button"
                    onClick={() => setAddOpen(true)}
                    class="mt-3 inline-flex items-center gap-2 whitespace-nowrap rounded-btn bg-brand-100 px-3 py-1.5 text-xs font-medium text-ink-950 transition-colors hover:bg-brand-200"
                  >
                    <I.plus class="h-3.5 w-3.5" />
                    Add project
                  </button>
                }
              >
                <Show when={lastAddedProject()}>
                  {(p) => (
                    <div class="mt-3 flex items-center gap-2.5 rounded-field border border-ink-800 bg-ink-950 px-3 py-2">
                      <span class="grid h-7 w-7 shrink-0 place-items-center rounded-btn bg-ink-800 font-mono text-[10px] font-semibold text-ink-200">
                        {p().name.slice(0, 2).toUpperCase()}
                      </span>
                      <span class="min-w-0 flex-1">
                        <span class="block truncate text-[13px] text-ink-100">{p().name}</span>
                        <span class="block truncate font-mono text-[10px] text-ink-500">{p().path}</span>
                      </span>
                      <span class="inline-flex shrink-0 items-center gap-1 rounded-pill bg-success-500/12 px-2 py-0.5 text-[10px] font-medium text-success-300 ring-1 ring-inset ring-success-500/25">
                        <I.check class="h-3 w-3" />
                        Added
                      </span>
                    </div>
                  )}
                </Show>
              </Show>
            </Step>

            <Show when={doneCount() === 2}>
              <div class="mt-6 flex items-center gap-3 rounded-field bg-brand-100/5 px-3 py-2.5 ring-1 ring-inset ring-brand-400/20">
                <span class="grid h-7 w-7 shrink-0 place-items-center rounded-pill bg-brand-100 text-ink-950">
                  <I.spark class="h-4 w-4" />
                </span>
                <span class="flex-1 text-xs text-ink-200">
                  All set — your workspace is ready.
                </span>
                <button
                  type="button"
                  onClick={() => props.onOpen?.()}
                  class="inline-flex items-center gap-1.5 text-xs font-medium text-brand-200 hover:text-brand-100"
                >
                  Open workspace
                  <I.arrow class="h-3.5 w-3.5" />
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

// ---------------------------------------------------------------------------
// Local sub-components
// ---------------------------------------------------------------------------

function CliRow(props: {
  mark: string;
  name: string;
  detail: string;
  found: boolean;
}): JSX.Element {
  return (
    <div class="flex items-center gap-3 rounded-field border border-ink-800 bg-ink-950 px-3 py-2">
      <span class="grid h-7 w-7 shrink-0 place-items-center rounded-btn bg-ink-800 font-mono text-[10px] font-semibold text-ink-200">
        {props.mark}
      </span>
      <span class="min-w-0 flex-1">
        <span class="block truncate text-[13px] text-ink-100">{props.name}</span>
        <span
          class={`block truncate font-mono text-[10px] ${props.found ? "text-ink-500" : "text-warning-300"}`}
        >
          {props.detail}
        </span>
      </span>
      <Show
        when={props.found}
        fallback={
          <button
            type="button"
            class="shrink-0 rounded-pill px-2.5 py-1 text-[11px] font-medium text-accent-300 hover:text-accent-200"
          >
            Install
          </button>
        }
      >
        <span class="shrink-0 inline-flex items-center gap-1 rounded-pill bg-success-500/12 px-2.5 py-1 text-[11px] font-medium text-success-300 ring-1 ring-inset ring-success-500/25">
          <I.check class="h-3 w-3" />
          Connected
        </span>
      </Show>
    </div>
  );
}

function Step(
  props: {
    n: number;
    done: boolean;
    title: string;
    desc: string;
    last?: boolean;
    children?: JSX.Element;
  }
): JSX.Element {
  return (
    <div class="relative flex gap-3.5 pb-6">
      <Show when={!props.last}>
        <span class="absolute left-[14px] top-8 h-[calc(100%-1.5rem)] w-px bg-ink-800" />
      </Show>
      <span
        class={`relative z-10 grid h-7 w-7 shrink-0 place-items-center rounded-pill text-[11px] font-semibold transition-colors ${props.done ? "bg-brand-100 text-ink-950" : "border border-ink-700 bg-ink-950 text-ink-400"}`}
      >
        <Show when={props.done} fallback={<>{props.n}</>}>
          <I.check class="h-4 w-4" />
        </Show>
      </span>
      <div class="min-w-0 flex-1">
        <div class="text-[13px] font-medium text-ink-100">{props.title}</div>
        <div class="text-xs text-ink-500">{props.desc}</div>
        {props.children}
      </div>
    </div>
  );
}
