import { createSignal, For, type JSX, type ParentProps } from "solid-js";
import { I } from "../ui/icons";
import { Dot, Pill, Btn } from "../ui/primitives";

/* ------------------------------------------------------------------ *
 * PlanFlow — Design System (token smoke-test / reference)
 * ------------------------------------------------------------------ */

function Group(props: ParentProps<{ title: string; hint: string }>): JSX.Element {
  return (
    <section class="border-t border-ink-800 pt-10">
      <div class="mb-6 flex items-baseline gap-3">
        <h2 class="text-xs font-medium uppercase tracking-[0.22em] text-ink-400">
          {props.title}
        </h2>
        <span class="text-xs text-ink-600">{props.hint}</span>
      </div>
      <div class="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {props.children}
      </div>
    </section>
  );
}

function Panel(props: ParentProps<{ label: string; span?: boolean }>): JSX.Element {
  return (
    <div
      class={`rounded-card border border-ink-800 bg-ink-900/60 p-5 ${props.span ? "md:col-span-2" : ""}`}
    >
      <div class="mb-4 font-mono text-[11px] uppercase tracking-wider text-ink-500">
        {props.label}
      </div>
      {props.children}
    </div>
  );
}

export default function DesignSystem(): JSX.Element {
  const [tab, setTab] = createSignal("chat");
  const [auto, setAuto] = createSignal(true);
  const [menu, setMenu] = createSignal(false);
  const [active, setActive] = createSignal("atlas");

  const swatch = (name: string, scale: string[]) => (
    <div>
      <div class="mb-1.5 font-mono text-[11px] text-ink-400">{name}</div>
      <div class="flex overflow-hidden rounded-field ring-1 ring-ink-800">
        <For each={scale}>
          {(c) => <div class={`h-9 flex-1 ${c}`} />}
        </For>
      </div>
    </div>
  );

  return (
    <div class="flex h-screen flex-col bg-ink-950 font-sans text-ink-200 antialiased">
      <div class="flex-1 min-h-0 overflow-y-auto">
      <div class="mx-auto max-w-[1180px] px-6 py-12 md:px-10">
        {/* masthead */}
        <header class="mb-12 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div class="mb-5 flex items-center gap-3">
              <span class="flex h-9 w-9 items-center justify-center rounded-btn bg-brand-100 text-ink-950">
                <I.term class="h-5 w-5" />
              </span>
              <span class="font-mono text-sm font-medium tracking-tight text-ink-100">
                planflow
              </span>
            </div>
            <h1 class="text-[34px] font-semibold leading-none tracking-tight text-ink-50">
              Design System
            </h1>
            <p class="mt-3 max-w-md text-sm leading-relaxed text-ink-400">
              The command center for parallel coding agents. A monochrome, terminal-grade surface
              where color means something — a passing diff, a failing run, a live agent.
            </p>
          </div>
          <div class="flex items-center gap-2">
            <Pill tone="neutral">v0.5.0</Pill>
            <Pill tone="brand">Codex&#8202;direction</Pill>
          </div>
        </header>

        <div class="space-y-12">
          {/* FOUNDATIONS */}
          <Group title="Foundations" hint="palette · type · radius · elevation">
            <Panel label="Color — semantic tokens">
              <div class="space-y-3">
                {swatch("ink — neutral canvas", ["bg-ink-100", "bg-ink-300", "bg-ink-500", "bg-ink-700", "bg-ink-900"])}
                {swatch("brand — warm primary", ["bg-brand-100", "bg-brand-300", "bg-brand-500", "bg-brand-700", "bg-brand-900"])}
                {swatch("accent — cool steel", ["bg-accent-200", "bg-accent-400", "bg-accent-500", "bg-accent-700", "bg-accent-900"])}
                <div class="grid grid-cols-4 gap-2 pt-1">
                  <div class="rounded-field bg-success-500 py-2 text-center text-[10px] font-medium text-white">added</div>
                  <div class="rounded-field bg-danger-500 py-2 text-center text-[10px] font-medium text-white">removed</div>
                  <div class="rounded-field bg-warning-500 py-2 text-center text-[10px] font-medium text-ink-950">review</div>
                  <div class="rounded-field bg-info-500 py-2 text-center text-[10px] font-medium text-white">running</div>
                </div>
              </div>
            </Panel>

            <Panel label="Type scale — Geist / Geist Mono">
              <div class="space-y-3">
                <div class="text-[34px] font-semibold leading-none tracking-tight text-ink-50">
                  Display 34
                </div>
                <div class="text-xl font-medium tracking-tight text-ink-100">
                  Title 20 — section heading
                </div>
                <div class="text-sm text-ink-300">
                  Body 14 — the default reading size for chat, descriptions and dense lists across the app.
                </div>
                <div class="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-500">
                  Label 11 · uppercase
                </div>
                <div class="rounded-field border border-ink-800 bg-ink-950 p-3 font-mono text-[13px] tabular-nums text-accent-200">
                  $ pf run --agent atlas{" "}
                  <span class="text-ink-500">·</span> 2.84s{" "}
                  <span class="text-success-300">ok</span>
                </div>
              </div>
            </Panel>

            <Panel label="Radius & elevation">
              <div class="space-y-4">
                <div class="grid grid-cols-4 gap-2 text-center text-[10px] text-ink-400">
                  <div><div class="mb-1.5 h-10 rounded-field bg-ink-800" />field</div>
                  <div><div class="mb-1.5 h-10 rounded-btn bg-ink-800" />btn</div>
                  <div><div class="mb-1.5 h-10 rounded-card bg-ink-800" />card</div>
                  <div><div class="mb-1.5 h-10 rounded-pill bg-ink-800" />pill</div>
                </div>
                <div class="grid grid-cols-4 gap-3 pt-1 text-center text-[10px] text-ink-400">
                  <div><div class="mb-1.5 h-12 rounded-card bg-ink-800 shadow-xs" />xs</div>
                  <div><div class="mb-1.5 h-12 rounded-card bg-ink-800 shadow-card" />card</div>
                  <div><div class="mb-1.5 h-12 rounded-card bg-ink-800 shadow-pop" />pop</div>
                  <div><div class="mb-1.5 h-12 rounded-card bg-ink-800 shadow-float" />float</div>
                </div>
              </div>
            </Panel>
          </Group>

          {/* COMPONENTS */}
          <Group title="Components" hint="the parts every screen is built from">
            <Panel label="Buttons">
              <div class="flex flex-wrap items-center gap-2.5">
                <Btn kind="primary">
                  <I.plus class="h-4 w-4" />
                  New session
                </Btn>
                <Btn kind="secondary">Review</Btn>
                <Btn kind="ghost">Discard</Btn>
                <Btn kind="danger">Stop agent</Btn>
              </div>
              <div class="mt-3 flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  disabled
                  class="inline-flex items-center gap-2 rounded-btn bg-brand-100 px-3.5 py-2 text-sm font-medium text-ink-950 opacity-40"
                >
                  Disabled
                </button>
                <button
                  type="button"
                  class="inline-flex items-center gap-2 rounded-btn border border-ink-700 px-3.5 py-2 text-sm font-medium text-ink-100"
                >
                  <svg
                    viewBox="0 0 24 24"
                    class="h-4 w-4 animate-spin text-ink-400"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="M12 3a9 9 0 1 0 9 9" stroke-linecap="round" />
                  </svg>
                  Working
                </button>
              </div>
            </Panel>

            <Panel label="Inputs & search">
              <div class="space-y-3">
                <label class="block">
                  <span class="mb-1.5 block text-xs text-ink-400">Repository path</span>
                  <input
                    value="~/dev/planflow"
                    class="w-full rounded-field border border-ink-700 bg-ink-950 px-3 py-2 font-mono text-[13px] text-ink-100 outline-none transition-colors placeholder:text-ink-600 focus:border-brand-400 focus:ring-2 focus:ring-brand-400/25"
                  />
                </label>
                <div class="flex items-center gap-2 rounded-field border border-ink-700 bg-ink-950 px-3 py-2 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-400/25">
                  <I.search class="h-4 w-4 text-ink-500" />
                  <input
                    placeholder="Search sessions, files, diffs…"
                    class="w-full bg-transparent text-sm text-ink-100 outline-none placeholder:text-ink-600"
                  />
                  <kbd class="rounded bg-ink-800 px-1.5 py-0.5 font-mono text-[10px] text-ink-400">
                    ⌘K
                  </kbd>
                </div>
              </div>
            </Panel>

            <Panel label="Status pills">
              <div class="flex flex-wrap gap-2">
                <Pill tone="success">
                  <I.check class="h-3 w-3" />
                  passed
                </Pill>
                <Pill tone="info">running</Pill>
                <Pill tone="warning">needs review</Pill>
                <Pill tone="danger">
                  <I.warn class="h-3 w-3" />
                  failed
                </Pill>
                <Pill tone="neutral">idle</Pill>
                <Pill tone="brand">claude · opus</Pill>
              </div>
              <div class="mt-4 flex items-center gap-5 text-xs text-ink-400">
                <span class="flex items-center gap-2">
                  <Dot tone="live" />
                  live
                </span>
                <span class="flex items-center gap-2">
                  <Dot tone="done" />
                  done
                </span>
                <span class="flex items-center gap-2">
                  <Dot tone="idle" />
                  idle
                </span>
                <span class="flex items-center gap-2">
                  <Dot tone="fail" />
                  failed
                </span>
              </div>
            </Panel>

            <Panel label="Tabs (live)">
              <div class="flex gap-1 border-b border-ink-800">
                <For each={[["chat", "Chat"], ["diff", "Diff"], ["term", "Terminal"], ["log", "Log"]] as const}>
                  {([k, l]) => (
                    <button
                      type="button"
                      onClick={() => setTab(k)}
                      class={`relative px-3 py-2 text-sm transition-colors ${tab() === k ? "text-ink-50" : "text-ink-500 hover:text-ink-200"}`}
                    >
                      {l}
                      {tab() === k && (
                        <span class="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-200" />
                      )}
                    </button>
                  )}
                </For>
              </div>
              <p class="mt-3 text-sm text-ink-400">
                Showing <span class="text-ink-100">{tab()}</span> — tabs hold state in the same
                artboard.
              </p>
            </Panel>

            <Panel label="Toggle (live)">
              <div class="flex items-center justify-between">
                <div>
                  <div class="text-sm text-ink-100">Auto-run queued tasks</div>
                  <div class="text-xs text-ink-500">Start the next agent when one finishes</div>
                </div>
                <button
                  type="button"
                  onClick={() => setAuto(!auto())}
                  aria-pressed={auto()}
                  class={`relative h-6 w-11 rounded-pill transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/70 ${auto() ? "bg-brand-300" : "bg-ink-700"}`}
                >
                  <span
                    class={`absolute top-0.5 h-5 w-5 rounded-full bg-ink-950 transition-all ${auto() ? "left-[22px]" : "left-0.5"}`}
                  />
                </button>
              </div>
            </Panel>

            <Panel label="Dropdown menu (live)">
              <div class="relative inline-block">
                <button
                  type="button"
                  onClick={() => setMenu(!menu())}
                  class="inline-flex items-center gap-2 rounded-btn border border-ink-700 px-3 py-2 text-sm text-ink-100 hover:bg-ink-800"
                >
                  Session actions{" "}
                  <I.chevron
                    class={`h-4 w-4 transition-transform ${menu() ? "rotate-180" : ""}`}
                  />
                </button>
                {menu() && (
                  <div class="absolute z-10 mt-2 w-52 overflow-hidden rounded-card border border-ink-700 bg-ink-900 py-1 shadow-pop">
                    <For each={["Rename session", "Duplicate", "Open worktree", "Export diff"]}>
                      {(m) => (
                        <button
                          type="button"
                          onClick={() => setMenu(false)}
                          class="block w-full px-3.5 py-2 text-left text-sm text-ink-200 hover:bg-ink-800"
                        >
                          {m}
                        </button>
                      )}
                    </For>
                    <div class="my-1 border-t border-ink-800" />
                    <button
                      type="button"
                      onClick={() => setMenu(false)}
                      class="block w-full px-3.5 py-2 text-left text-sm text-danger-300 hover:bg-ink-800"
                    >
                      Delete session
                    </button>
                  </div>
                )}
              </div>
            </Panel>
          </Group>

          {/* PATTERNS */}
          <Group title="Patterns" hint="domain components — the heart of the product">
            <Panel label="Session row" span>
              <div class="divide-y divide-ink-800 overflow-hidden rounded-field border border-ink-800">
                <For
                  each={[
                    { n: "atlas", t: "Refactor PTY bridge to async reads", r: "planflow", dot: "live" as const, stTone: "info" as const, stLabel: "running", time: "0:42", add: 124, rem: 38, check: false },
                    { n: "maya", t: "Fix duplicate reply rendering in AgentView", r: "planflow", dot: "done" as const, stTone: "warning" as const, stLabel: "needs review", time: "3m", add: 47, rem: 12, check: false },
                    { n: "nova", t: "Cloud queue rehydrate on reopen", r: "cloud-agent", dot: "idle" as const, stTone: "success" as const, stLabel: "merged", time: "1h", add: 0, rem: 0, check: true },
                  ]}
                >
                  {(s) => (
                    <div class="flex items-center gap-3 px-4 py-3 hover:bg-ink-900/70">
                      <Dot tone={s.dot} />
                      <span class="h-7 w-7 rounded-pill ring-1 ring-ink-700 grid place-items-center bg-ink-800 font-mono text-[10px] font-semibold text-ink-300">
                        {s.n.slice(0, 2).toUpperCase()}
                      </span>
                      <div class="min-w-0 flex-1">
                        <div class="truncate text-sm text-ink-100">{s.t}</div>
                        <div class="flex items-center gap-2 text-xs text-ink-500">
                          <I.branch class="h-3.5 w-3.5" />
                          {s.r}
                          {(s.add > 0 || s.rem > 0) && (
                            <span class="font-mono">
                              <span class="text-success-300">+{s.add}</span>{" "}
                              <span class="text-danger-300">−{s.rem}</span>
                            </span>
                          )}
                        </div>
                      </div>
                      <Pill tone={s.stTone}>
                        {s.check && <I.check class="h-3 w-3" />}
                        {s.stLabel}
                      </Pill>
                      <span class="w-10 text-right font-mono text-xs tabular-nums text-ink-500">
                        {s.time}
                      </span>
                    </div>
                  )}
                </For>
              </div>
            </Panel>

            <Panel label="Stat / KPI">
              <div class="grid grid-cols-3 gap-3">
                <For each={[["Active", "3", "+1"], ["Queued", "7", null], ["Merged", "128", "+12"]] as const}>
                  {([l, v, d]) => (
                    <div class="rounded-field border border-ink-800 bg-ink-950 p-3">
                      <div class="text-[11px] uppercase tracking-wider text-ink-500">{l}</div>
                      <div class="mt-1 flex items-baseline gap-1.5">
                        <span class="font-mono text-2xl tabular-nums text-ink-50">{v}</span>
                        {d && (
                          <span class="font-mono text-[11px] text-success-300">{d}</span>
                        )}
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </Panel>

            <Panel label="Diff view">
              <div class="overflow-hidden rounded-field border border-ink-800 bg-ink-950 font-mono text-[12px] leading-relaxed">
                <div class="flex items-center gap-2 border-b border-ink-800 px-3 py-1.5 text-ink-400">
                  <I.file class="h-3.5 w-3.5" /> ws/pty_bridge.rs{" "}
                  <span class="ml-auto text-success-300">+4</span>
                  <span class="text-danger-300">−2</span>
                </div>
                <div class="px-3 py-2">
                  <div class="text-ink-600">@@ -18,6 +18,8 @@ async fn read_loop</div>
                  <div class="-mx-3 bg-danger-500/10 px-3 text-danger-300">
                    <span class="mr-3 select-none text-ink-600">18</span>− let n =
                    reader.read(&amp;buf)?;
                  </div>
                  <div class="-mx-3 bg-success-500/10 px-3 text-success-300">
                    <span class="mr-3 select-none text-ink-600">18</span>+ let n =
                    reader.read(&amp;buf).await?;
                  </div>
                  <div class="-mx-3 bg-success-500/10 px-3 text-success-300">
                    <span class="mr-3 select-none text-ink-600">19</span>+ if n == 0 {"{ break }"}
                  </div>
                  <div class="text-ink-300">
                    <span class="mr-3 select-none text-ink-600">20</span>&nbsp;
                    tx.send(buf[..n].to_vec())?;
                  </div>
                </div>
              </div>
            </Panel>

            <Panel label="Empty state">
              <div class="flex flex-col items-center rounded-field border border-dashed border-ink-700 px-4 py-8 text-center">
                <span class="mb-3 flex h-10 w-10 items-center justify-center rounded-btn bg-ink-800 text-ink-400">
                  <I.spark class="h-5 w-5" />
                </span>
                <div class="text-sm text-ink-100">No sessions yet</div>
                <div class="mt-1 max-w-[220px] text-xs text-ink-500">
                  Point an agent at a repo and give it a task to get started.
                </div>
                <div class="mt-4">
                  <Btn kind="primary">
                    <I.plus class="h-4 w-4" />
                    New session
                  </Btn>
                </div>
              </div>
            </Panel>

            <Panel label="Command palette item">
              <div class="overflow-hidden rounded-field border border-ink-700 bg-ink-900 shadow-pop">
                <div class="flex items-center gap-2 border-b border-ink-800 px-3 py-2">
                  <I.search class="h-4 w-4 text-ink-500" />
                  <span class="text-sm text-ink-300">refactor</span>
                </div>
                <For
                  each={[
                    ["Run agent on current repo", "↵"],
                    ["Open diff review", "⌘D"],
                    ["Switch project…", "⌘P"],
                  ] as const}
                >
                  {([l, k], i) => (
                    <div
                      class={`flex items-center gap-3 px-3 py-2 text-sm ${i() === 0 ? "bg-ink-800 text-ink-50" : "text-ink-300"}`}
                    >
                      <I.term class="h-4 w-4 text-ink-500" />
                      <span class="flex-1">{l}</span>
                      <kbd class="rounded bg-ink-950 px-1.5 py-0.5 font-mono text-[10px] text-ink-400">
                        {k}
                      </kbd>
                    </div>
                  )}
                </For>
              </div>
            </Panel>

            <Panel label="Terminal pane">
              <div class="overflow-hidden rounded-field border border-ink-800 bg-ink-950 ring-1 ring-inset ring-accent-400/40">
                <div class="flex items-center gap-2 border-b border-ink-700 bg-ink-900/80 px-3 py-1.5">
                  <span class="h-2 w-2 rounded-full bg-success-400" />
                  <span class="font-mono text-[11px] text-ink-100">claude</span>
                  <span class="min-w-0 truncate font-mono text-[10px] text-ink-600">
                    claude-code · planflow
                  </span>
                  <I.dots class="ml-auto h-3.5 w-3.5 shrink-0 text-ink-500" />
                </div>
                <div class="space-y-0.5 px-3 py-2.5 font-mono text-[11.5px] leading-relaxed">
                  <div class="flex gap-2">
                    <span class="text-accent-300">❯</span>
                    <span class="text-ink-100">cargo test -p planflow</span>
                  </div>
                  <div class="text-ink-500">Compiling planflow v0.5.0</div>
                  <div class="text-warning-300">warning: unused variable: `n`</div>
                  <div class="text-success-300">
                    test result: ok. 24 passed; 0 failed
                  </div>
                  <div class="flex items-center gap-2 pt-0.5">
                    <span class="text-accent-300">❯</span>
                    <span class="inline-block h-3.5 w-[7px] animate-pulse bg-ink-300" />
                  </div>
                </div>
              </div>
              <div class="mt-2 flex items-center gap-2 rounded-field bg-ink-900/60 px-2.5 py-1 font-mono text-[10px] text-ink-500">
                <span class="text-ink-400">atlas/async-pty</span>
                <span class="text-success-300">↑2</span>
                <span class="ml-auto rounded bg-ink-800 px-1.5 py-0.5 text-brand-200">
                  claude · opus
                </span>
                <span>UTF-8</span>
                <span class="tabular-nums">80×24</span>
              </div>
            </Panel>
          </Group>

          {/* APP SHELL */}
          <Group title="App shell" hint="sidebar · tab strip · panes">
            <div class="md:col-span-2 xl:col-span-3">
              <div class="overflow-hidden rounded-card border border-ink-800 bg-ink-950 shadow-card">
                <div class="flex items-center gap-2 border-b border-ink-800 bg-ink-900/70 px-3 py-2">
                  <div class="flex gap-1.5">
                    <span class="h-3 w-3 rounded-full bg-ink-700" />
                    <span class="h-3 w-3 rounded-full bg-ink-700" />
                    <span class="h-3 w-3 rounded-full bg-ink-700" />
                  </div>
                  <span class="ml-2 font-mono text-xs text-ink-500">planflow — atlas</span>
                  <div class="ml-auto flex items-center gap-2 text-ink-500">
                    <I.search class="h-4 w-4" />
                    <I.dots class="h-4 w-4" />
                  </div>
                </div>
                <div class="flex min-h-[320px]">
                  <aside class="hidden w-52 shrink-0 border-r border-ink-800 bg-ink-900/40 p-3 sm:block">
                    <div class="mb-2 px-1 text-[11px] uppercase tracking-wider text-ink-500">
                      Projects
                    </div>
                    <For each={[["atlas", "planflow", 3], ["nova", "cloud-agent", 1], ["orbit", "design-canvas", 0]] as const}>
                      {([id, repo, n]) => (
                        <button
                          type="button"
                          onClick={() => setActive(id)}
                          class={`mb-1 flex w-full items-center gap-2 rounded-field px-2.5 py-2 text-left text-sm transition-colors ${active() === id ? "bg-ink-800 text-ink-50" : "text-ink-400 hover:bg-ink-800/60 hover:text-ink-200"}`}
                        >
                          <I.branch class="h-4 w-4 shrink-0 text-ink-500" />
                          <span class="min-w-0 flex-1 truncate font-mono text-[13px]">
                            {repo}
                          </span>
                          {n > 0 && (
                            <span class="rounded-pill bg-success-500/15 px-1.5 text-[10px] text-success-300">
                              {n}
                            </span>
                          )}
                        </button>
                      )}
                    </For>
                    <button
                      type="button"
                      class="mt-2 flex w-full items-center gap-2 rounded-field px-2.5 py-2 text-sm text-ink-500 hover:bg-ink-800/60 hover:text-ink-200"
                    >
                      <I.plus class="h-4 w-4" />
                      Add project
                    </button>
                  </aside>
                  <div class="flex min-w-0 flex-1 flex-col">
                    <div class="flex items-center gap-1 border-b border-ink-800 bg-ink-900/30 px-2 py-1.5">
                      <For each={["atlas ·", "maya", "nova"] as const}>
                        {(t, i) => (
                          <span
                            class={`flex items-center gap-2 rounded-field px-3 py-1.5 text-xs ${i() === 0 ? "bg-ink-800 text-ink-100" : "text-ink-500"}`}
                          >
                            {i() === 0 && <Dot tone="live" />}
                            {t}
                            {i() === 0 && <I.dots class="h-3 w-3 text-ink-600" />}
                          </span>
                        )}
                      </For>
                    </div>
                    <div class="grid flex-1 grid-cols-1 lg:grid-cols-2">
                      <div class="border-ink-800 p-4 lg:border-r">
                        <div class="mb-3 text-[11px] uppercase tracking-wider text-ink-500">
                          Agent
                        </div>
                        <div class="space-y-3 text-sm">
                          <div class="rounded-field bg-ink-900 px-3 py-2 text-ink-300">
                            Refactor the PTY bridge to use async reads and break on EOF.
                          </div>
                          <div class="flex items-start gap-2">
                            <span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-pill bg-brand-100 text-[10px] font-medium text-ink-950">
                              CC
                            </span>
                            <div class="text-ink-300">
                              Updated{" "}
                              <span class="font-mono text-ink-100">pty_bridge.rs</span>. The
                              read loop is now non-blocking — see the diff on the right.
                            </div>
                          </div>
                          <div class="flex items-center gap-2 text-xs text-ink-500">
                            <Dot tone="live" />
                            running tests…
                          </div>
                        </div>
                      </div>
                      <div class="p-4">
                        <div class="mb-3 flex items-center justify-between text-[11px] uppercase tracking-wider text-ink-500">
                          Diff{" "}
                          <span class="font-mono">
                            <span class="text-success-300">+4</span>{" "}
                            <span class="text-danger-300">−2</span>
                          </span>
                        </div>
                        <div class="overflow-hidden rounded-field border border-ink-800 bg-ink-900/50 px-3 py-2 font-mono text-[11px] leading-relaxed">
                          <div class="text-danger-300">− reader.read(&amp;buf)?;</div>
                          <div class="text-success-300">+ reader.read(&amp;buf).await?;</div>
                          <div class="text-success-300">+ if n == 0 {"{ break }"}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Group>

          {/* NAV & FEEDBACK */}
          <Group title="Navigation & feedback" hint="toasts · banners · tooltip">
            <Panel label="Toast">
              <div class="flex items-start gap-3 rounded-card border border-ink-700 bg-ink-900 p-3 shadow-pop">
                <span class="mt-0.5 flex h-6 w-6 items-center justify-center rounded-pill bg-success-500/15 text-success-300">
                  <I.check class="h-3.5 w-3.5" />
                </span>
                <div class="flex-1">
                  <div class="text-sm text-ink-100">Session merged</div>
                  <div class="text-xs text-ink-500">atlas → master · 2 files changed</div>
                </div>
                <button
                  type="button"
                  aria-label="Dismiss"
                  class="text-ink-600 hover:text-ink-300"
                >
                  ✕
                </button>
              </div>
            </Panel>

            <Panel label="Banner">
              <div class="flex items-center gap-3 rounded-card border border-warning-500/30 bg-warning-500/10 px-3 py-2.5">
                <I.warn class="h-4 w-4 shrink-0 text-warning-300" />
                <div class="flex-1 text-sm text-warning-200">
                  Cloud connection lost — reconnecting…
                </div>
                <button
                  type="button"
                  class="text-xs font-medium text-warning-200 underline-offset-2 hover:underline"
                >
                  Retry
                </button>
              </div>
            </Panel>

            <Panel label="Tooltip (hover)">
              <div class="group relative inline-flex">
                <button
                  type="button"
                  class="rounded-btn border border-ink-700 px-3 py-2 text-sm text-ink-100 hover:bg-ink-800"
                >
                  Hover me
                </button>
                <span class="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-field bg-ink-100 px-2 py-1 text-[11px] text-ink-950 opacity-0 shadow-float transition-opacity group-hover:opacity-100">
                  Opens worktree · ⌘W
                </span>
              </div>
            </Panel>
          </Group>
        </div>

        <footer class="mt-14 border-t border-ink-800 pt-6 font-mono text-[11px] text-ink-600">
          planflow · design system · tokens are the single source of truth — edit globals.css
          to retheme everything.
        </footer>
      </div>
      </div>
    </div>
  );
}
