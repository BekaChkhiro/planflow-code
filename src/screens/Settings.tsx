import { createResource, createSignal, For, Show, Suspense, type JSX } from "solid-js";
import { I } from "../ui/icons";
import { Toggle, Field, Card } from "../ui/primitives";
import { cliListAvailable, type CliInfo } from "../ipc/cli";

/* ------------------------------------------------------------------ *
 * PlanFlow — Settings
 * ------------------------------------------------------------------ */

type SectionId = "general" | "clis" | "keys" | "about";

const SECTIONS: { id: SectionId; label: string; icon: (p: { class?: string }) => JSX.Element }[] =
  [
    { id: "general", label: "General", icon: I.sliders },
    { id: "clis", label: "CLIs", icon: I.term },
    { id: "keys", label: "Keybindings", icon: I.key },
    { id: "about", label: "About", icon: I.info },
  ];

const KEYBINDINGS: [string, string][] = [
  ["New session", "⌘N"],
  ["Quick switcher", "⌘P"],
  ["Global search", "⌘K"],
  ["Split right", "⌘D"],
  ["Next session", "⌃Tab"],
  ["Close session", "⌘W"],
  ["Stop agent", "⌘."],
  ["Toggle terminal", "⌘J"],
  ["Open settings", "⌘,"],
  ["Commit changes", "⌘↵"],
];

const CLI_META: Record<string, { mark: string; friendlyName: string }> = {
  claude: { mark: "CC", friendlyName: "Claude Code" },
  codex: { mark: "CX", friendlyName: "Codex CLI" },
};

function Head(props: { title: string; desc: string }): JSX.Element {
  return (
    <div class="mb-5">
      <h2 class="text-lg font-semibold tracking-tight text-ink-50">{props.title}</h2>
      <p class="mt-1 text-sm text-ink-500">{props.desc}</p>
    </div>
  );
}

export default function Settings(props: { onBack?: () => void }): JSX.Element {
  const [section, setSection] = createSignal<SectionId>("general");
  const [on, setOn] = createSignal<string[]>(["reopen", "restore", "confirmStop"]);
  const [kbQuery, setKbQuery] = createSignal("");

  const [cliData] = createResource<CliInfo[]>(cliListAvailable);

  const toggle = (k: string) =>
    setOn((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));
  const isOn = (k: string) => on().includes(k);

  const kb = () =>
    KEYBINDINGS.filter(([cmd]) =>
      cmd.toLowerCase().includes(kbQuery().toLowerCase())
    );

  return (
    <div class="flex h-screen flex-col bg-ink-950 font-sans text-ink-200 antialiased">
      {/* title bar — draggable, clears macOS traffic lights with pl-20 */}
      <div
        data-tauri-drag-region
        class="flex shrink-0 items-center border-b border-ink-800 bg-ink-900/70 pl-20 pr-2 py-2"
      >
        <span class="whitespace-nowrap font-mono text-xs text-ink-500">
          planflow — settings
        </span>
        <button
          type="button"
          onClick={() => props.onBack?.()}
          aria-label="Close settings"
          class="ml-auto rounded-field p-1.5 text-ink-500 hover:bg-ink-800 hover:text-ink-200"
        >
          <I.x class="h-4 w-4" />
        </button>
      </div>

      <div class="flex flex-1 min-h-0">
        {/* nav */}
        <aside class="hidden w-56 shrink-0 flex-col border-r border-ink-800 bg-ink-900/30 py-3 sm:flex">
          <div class="px-5 pb-2 pt-1 text-[11px] uppercase tracking-wider text-ink-500">
            Settings
          </div>
          <nav aria-label="Settings sections" class="px-2">
            <For each={SECTIONS}>
              {(s) => {
                const active = () => section() === s.id;
                return (
                  <button
                    type="button"
                    onClick={() => setSection(s.id)}
                    class={`relative mb-0.5 flex w-full items-center gap-2.5 rounded-field px-3 py-2 text-left text-sm transition-colors ${active() ? "bg-ink-800 text-ink-50" : "text-ink-400 hover:bg-ink-800/50 hover:text-ink-200"}`}
                  >
                    <Show when={active()}>
                      <span class="absolute -left-2 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-brand-200" />
                    </Show>
                    <s.icon
                      class={`h-4 w-4 ${active() ? "text-ink-200" : "text-ink-500"}`}
                    />
                    {s.label}
                  </button>
                );
              }}
            </For>
          </nav>
          <div class="mt-auto px-5 pb-1 font-mono text-[10px] text-ink-600">
            v0.1.0 · personal
          </div>
        </aside>

        {/* content */}
        <div class="min-w-0 flex-1 overflow-y-auto px-6 py-7 sm:px-9">
          <div class="mx-auto max-w-[640px]">
            <Show when={section() === "general"}>
              <div>
                <Head
                  title="General"
                  desc="How PlanFlow behaves on launch and while you work."
                />
                <Card>
                  <Field
                    title="Reopen last workspace on launch"
                    desc="Restore your projects, tabs and splits."
                  >
                    <Toggle on={isOn("reopen")} onClick={() => toggle("reopen")} />
                  </Field>
                  <Field
                    title="Resume running sessions"
                    desc="Reattach to agents that were active when you quit."
                  >
                    <Toggle on={isOn("restore")} onClick={() => toggle("restore")} />
                  </Field>
                  <Field title="Confirm before stopping an agent">
                    <Toggle
                      on={isOn("confirmStop")}
                      onClick={() => toggle("confirmStop")}
                    />
                  </Field>
                  <Field title="Default model for new sessions" last>
                    <span class="whitespace-nowrap rounded-field border border-ink-700 bg-ink-950 px-3 py-1.5 font-mono text-xs text-ink-200">
                      claude · opus
                    </span>
                  </Field>
                </Card>
                <div class="mt-4 flex items-start gap-3 rounded-card border border-info-500/25 bg-info-500/10 px-4 py-3">
                  <I.info class="mt-0.5 h-4 w-4 shrink-0 text-info-300" />
                  <p class="text-xs leading-relaxed text-info-200">
                    PlanFlow is a personal, offline-first tool. No telemetry is collected and
                    nothing leaves your machine.
                  </p>
                </div>
              </div>
            </Show>

            <Show when={section() === "clis"}>
              <div>
                <Head title="Coding agents" desc="The CLIs PlanFlow can launch in a session." />
                <div class="space-y-3">
                  <Suspense
                    fallback={
                      <div class="flex items-center gap-2 rounded-card border border-ink-800 bg-ink-900/40 p-4 text-xs text-ink-500">
                        <svg viewBox="0 0 24 24" class="h-4 w-4 animate-spin" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M12 3a9 9 0 1 0 9 9" stroke-linecap="round" />
                        </svg>
                        Scanning for installed CLIs…
                      </div>
                    }
                  >
                    <Show
                      when={(cliData() ?? []).length > 0}
                      fallback={
                        <div class="rounded-card border border-warning-500/25 bg-warning-500/10 p-4">
                          <div class="flex items-center gap-3">
                            <I.warn class="h-5 w-5 shrink-0 text-warning-300" />
                            <div>
                              <div class="text-sm font-medium text-ink-100">No CLIs detected</div>
                              <div class="mt-0.5 text-xs text-ink-500">
                                Install Claude Code or Codex CLI and restart PlanFlow.
                              </div>
                            </div>
                          </div>
                        </div>
                      }
                    >
                      <For each={cliData() ?? []}>
                        {(c, i) => {
                          const meta = CLI_META[c.name] ?? {
                            mark: c.name.slice(0, 2).toUpperCase(),
                            friendlyName: c.name,
                          };
                          const detail = [c.version, c.path].filter(Boolean).join(" · ");
                          return (
                            <div class="rounded-card border border-ink-800 bg-ink-900/40 p-4">
                              <div class="flex items-center gap-3">
                                <span class="grid h-8 w-8 shrink-0 place-items-center rounded-btn bg-ink-800 font-mono text-[11px] font-semibold text-ink-200">
                                  {meta.mark}
                                </span>
                                <div class="min-w-0 flex-1">
                                  <div class="flex items-center gap-2">
                                    <span class="text-sm text-ink-100">{meta.friendlyName}</span>
                                    <Show when={i() === 0}>
                                      <span class="rounded-pill bg-brand-400/12 px-2 py-0.5 text-[10px] font-medium text-brand-200 ring-1 ring-inset ring-brand-400/25">
                                        default
                                      </span>
                                    </Show>
                                  </div>
                                  <div class="font-mono text-[11px] text-ink-500">
                                    {detail || "path not detected"}
                                  </div>
                                </div>
                                <span class="shrink-0 rounded-pill bg-success-500/12 px-2.5 py-1 text-[11px] font-medium text-success-300 ring-1 ring-inset ring-success-500/25">
                                  ready
                                </span>
                              </div>
                            </div>
                          );
                        }}
                      </For>
                    </Show>

                    {/* Show stub rows for un-detected CLIs */}
                    <For
                      each={
                        ["claude", "codex"].filter(
                          (id) => !(cliData() ?? []).some((c) => c.name === id)
                        )
                      }
                    >
                      {(id) => {
                        const meta = CLI_META[id] ?? { mark: "?", friendlyName: id };
                        return (
                          <div class="rounded-card border border-ink-800 bg-ink-900/40 p-4">
                            <div class="flex items-center gap-3">
                              <span class="grid h-8 w-8 shrink-0 place-items-center rounded-btn bg-ink-800 font-mono text-[11px] font-semibold text-ink-200">
                                {meta.mark}
                              </span>
                              <div class="min-w-0 flex-1">
                                <div class="text-sm text-ink-100">{meta.friendlyName}</div>
                                <div class="font-mono text-[11px] text-warning-300">
                                  install to enable
                                </div>
                              </div>
                              <button
                                type="button"
                                class="shrink-0 rounded-pill border border-ink-700 px-2.5 py-1 text-[11px] font-medium text-ink-200 hover:bg-ink-800"
                              >
                                Locate…
                              </button>
                            </div>
                          </div>
                        );
                      }}
                    </For>
                  </Suspense>
                </div>
              </div>
            </Show>

            <Show when={section() === "keys"}>
              <div>
                <Head
                  title="Keybindings"
                  desc="Every command and its shortcut. Click a key to rebind."
                />
                <div class="mb-3 flex items-center gap-2 rounded-field border border-ink-800 bg-ink-950 px-3 py-2">
                  <I.search class="h-4 w-4 text-ink-500" />
                  <input
                    value={kbQuery()}
                    onInput={(e) => setKbQuery(e.currentTarget.value)}
                    placeholder="Filter keybindings…"
                    aria-label="Filter keybindings"
                    class="w-full bg-transparent text-sm text-ink-100 outline-none placeholder:text-ink-600"
                  />
                </div>
                <Card>
                  <Show when={kb().length === 0}>
                    <div class="py-6 text-center text-sm text-ink-500">
                      No commands match "{kbQuery()}".
                    </div>
                  </Show>
                  <For each={kb()}>
                    {([cmd, keys], i) => (
                      <div
                        class={`flex items-center justify-between gap-4 py-2.5 ${i() === kb().length - 1 ? "" : "border-b border-ink-800"}`}
                      >
                        <span class="text-sm text-ink-200">{cmd}</span>
                        <kbd class="rounded-field border border-ink-700 bg-ink-950 px-2 py-1 font-mono text-[11px] text-ink-300">
                          {keys}
                        </kbd>
                      </div>
                    )}
                  </For>
                </Card>
              </div>
            </Show>

            <Show when={section() === "about"}>
              <div>
                <Head title="About" desc="Version and project information." />
                <div class="flex items-center gap-4 rounded-card border border-ink-800 bg-ink-900/40 p-5">
                  <span class="flex h-12 w-12 items-center justify-center rounded-card bg-brand-100 text-ink-950">
                    <I.term class="h-6 w-6" />
                  </span>
                  <div class="flex-1">
                    <div class="text-base font-semibold tracking-tight text-ink-50">
                      PlanFlow
                    </div>
                    <div class="font-mono text-xs text-ink-500">
                      v0.1.0 · build 2026.06 · Tauri 2.11
                    </div>
                  </div>
                  <button
                    type="button"
                    class="rounded-btn border border-ink-700 px-3 py-1.5 text-xs font-medium text-ink-200 hover:bg-ink-800"
                  >
                    Check for updates
                  </button>
                </div>
                <div class="mt-4">
                  <Card>
                    <Field title="Changelog">
                      <span class="font-mono text-xs text-accent-300">View →</span>
                    </Field>
                    <Field title="Source repository">
                      <span class="font-mono text-xs text-accent-300">github →</span>
                    </Field>
                    <Field title="License" last>
                      <span class="font-mono text-xs text-ink-400">MIT</span>
                    </Field>
                  </Card>
                </div>
              </div>
            </Show>
          </div>
        </div>
      </div>
    </div>
  );
}
