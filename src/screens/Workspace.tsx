import {
  createSignal,
  createEffect,
  createMemo,
  For,
  Show,
  onMount,
  onCleanup,
  type JSX,
} from "solid-js";
import { I } from "../ui/icons";
import { Dot } from "../ui/primitives";
import { TaskMenu } from "../ui/Menu";
import type { Project } from "../stores/projects";
import {
  setActiveProjectId,
  touchProject,
} from "../stores/projects";
import {
  sessionsForProject,
  createSession,
  updateSession,
  removeSession,
  type Session,
} from "../stores/sessions";
import { cliListAvailable } from "../ipc/cli";
import { gitStatus, gitDiffFile, gitStageAll, gitCommit, type GitFile } from "../ipc/git";
import {
  acquireAgentSession,
  releaseAgentSession,
  type AgentController,
} from "../components/AgentView/agentSession";
import { AddProjectModal } from "../components/AddProjectModal";
import { ProjectRail } from "../components/Workspace/ProjectRail";
import { SessionColumn } from "../components/Workspace/SessionColumn";
import { ProjectSwitcher } from "../components/Workspace/ProjectSwitcher";
import { ReviewRail } from "../components/Workspace/ReviewRail";
import { Thread } from "../components/Workspace/Thread";
import { Composer } from "../components/Workspace/Composer";

export interface WorkspaceProps {
  project: Project;
  onSettings: () => void;
  onExit?: () => void;
}

const toneOf = (s: Session["status"]): "live" | "done" | "idle" =>
  s === "running" ? "live" : s === "review" ? "done" : "idle";

export default function Workspace(props: WorkspaceProps): JSX.Element {
  // ── Local state ────────────────────────────────────────────────────
  const [activeSessionId, setActiveSessionId] = createSignal<string | null>(null);
  const [menu, setMenu] = createSignal(false);
  const [switcher, setSwitcher] = createSignal(false);
  const [showAddProject, setShowAddProject] = createSignal(false);
  const [showNewSession, setShowNewSession] = createSignal(false);
  const [newTaskInput, setNewTaskInput] = createSignal("");
  const [gitFiles, setGitFiles] = createSignal<GitFile[]>([]);
  const [gitBranch, setGitBranch] = createSignal("—");
  const [selectedFileIdx, setSelectedFileIdx] = createSignal(0);
  const [fileDiff, setFileDiff] = createSignal<string>("");
  const [diffLoading, setDiffLoading] = createSignal(false);
  const [committing, setCommitting] = createSignal(false);
  const [claudeCommand, setClaudeCommand] = createSignal<string | undefined>(undefined);

  // ── Derived ────────────────────────────────────────────────────────
  const sessions = createMemo(() => sessionsForProject(props.project.id));

  // Auto-select first session when sessions change and active is gone
  createEffect(() => {
    const list = sessions();
    const aid = activeSessionId();
    if (aid && list.some((s) => s.id === aid)) return;
    setActiveSessionId(list[0]?.id ?? null);
  });

  const activeSession = createMemo<Session | undefined>(() => {
    const id = activeSessionId();
    return sessions().find((s) => s.id === id);
  });

  // ── Resolve claude command on mount ───────────────────────────────
  onMount(() => {
    void cliListAvailable()
      .then((clis) => {
        const found = clis.find((c) => c.name === "claude" || c.path.includes("claude"));
        setClaudeCommand(found?.path ?? "claude");
      })
      .catch(() => setClaudeCommand("claude"));
  });

  // ── Agent controller ───────────────────────────────────────────────
  // Acquired per session id; survives remounts (registry is module-level).
  const controller = createMemo<AgentController | null>(() => {
    const sess = activeSession();
    const cmd = claudeCommand();
    if (!sess || cmd === undefined) return null;
    return acquireAgentSession(sess.id, {
      command: cmd,
      cwd: props.project.path,
      permissionMode: "bypassPermissions",
      projectName: props.project.name,
      // Resume a prior Claude session so re-entering shows the transcript
      // and continues with full context.
      resume: sess.agentSessionId,
      onSessionId: (claudeId) => updateSession(sess.id, { agentSessionId: claudeId }),
    });
  });

  // Sync session status from controller busy/closed state
  createEffect(() => {
    const ctrl = controller();
    const sess = activeSession();
    if (!ctrl || !sess) return;
    const busy = ctrl.busy();
    const closed = ctrl.closed();
    if (busy && sess.status !== "running") {
      updateSession(sess.id, { status: "running" });
    } else if (!busy && !closed && sess.status === "running") {
      updateSession(sess.id, { status: "review" });
    }
  });


  // ── Git status ─────────────────────────────────────────────────────
  const refreshGitStatus = async (): Promise<void> => {
    try {
      const status = await gitStatus(props.project.path);
      setGitBranch(status.branch || "—");
      setGitFiles(status.files);
      setSelectedFileIdx(0);
      setFileDiff("");
    } catch {
      /* git unavailable — leave current state */
    }
  };

  onMount(() => {
    void refreshGitStatus();
  });

  // Re-fetch git status when project changes
  createEffect((prev: string | undefined) => {
    const path = props.project.path;
    if (prev !== undefined && prev !== path) void refreshGitStatus();
    return path;
  });

  // Re-fetch when the agent edits a file
  createEffect(() => {
    const ctrl = controller();
    if (!ctrl) return;
    ctrl.editTick(); // track
    void refreshGitStatus();
  });

  // ── Diff for selected file ─────────────────────────────────────────
  const selectedFile = createMemo<GitFile | undefined>(() => gitFiles()[selectedFileIdx()]);

  createEffect(() => {
    const f = selectedFile();
    if (!f) {
      setFileDiff("");
      return;
    }
    setDiffLoading(true);
    void gitDiffFile(props.project.path, f.path, false)
      .then((diff) => {
        setFileDiff(diff);
        setDiffLoading(false);
      })
      .catch(() => {
        setFileDiff("");
        setDiffLoading(false);
      });
  });

  // ── Git totals ──────────────────────────────────────────────────────
  const totalAdd = createMemo(() => gitFiles().reduce((s, f) => s + f.adds, 0));
  const totalDel = createMemo(() => gitFiles().reduce((s, f) => s + f.dels, 0));

  // ── Commit ─────────────────────────────────────────────────────────
  const handleCommit = async (): Promise<void> => {
    if (committing() || gitFiles().length === 0) return;
    setCommitting(true);
    try {
      const sess = activeSession();
      const msg = sess?.task ?? `chore: update from planflow session`;
      await gitStageAll(props.project.path);
      await gitCommit(props.project.path, msg);
      await refreshGitStatus();
      if (sess) updateSession(sess.id, { status: "idle", add: 0, rem: 0 });
    } catch {
      /* show nothing — git error is surfaced in terminal */
    } finally {
      setCommitting(false);
    }
  };

  // ── New session ─────────────────────────────────────────────────────
  const handleCreateSession = (): void => {
    const task = newTaskInput().trim() || "New task";
    const sess = createSession(props.project.id, task);
    setActiveSessionId(sess.id);
    setNewTaskInput("");
    setShowNewSession(false);
  };

  // ── Delete session ──────────────────────────────────────────────────
  const deleteSession = (id: string): void => {
    releaseAgentSession(id);
    removeSession(id);
    if (activeSessionId() === id) {
      const remaining = sessionsForProject(props.project.id);
      setActiveSessionId(remaining[0]?.id ?? null);
    }
  };
  const handleDeleteSession = (): void => {
    const sess = activeSession();
    if (!sess) return;
    deleteSession(sess.id);
    setMenu(false);
  };

  // ── Open a past (history) session ───────────────────────────────────
  // Past Claude transcripts live in localStorage keyed by claudeId. Opening
  // one creates (or re-selects) a session linked to that claudeId; the
  // controller memo then resumes it (preload transcript + --resume).
  const openHistorySession = (claudeId: string, title: string): void => {
    const existing = sessionsForProject(props.project.id).find(
      (s) => s.agentSessionId === claudeId,
    );
    if (existing) {
      setActiveSessionId(existing.id);
      return;
    }
    const sess = createSession(props.project.id, title || "Resumed session");
    updateSession(sess.id, { agentSessionId: claudeId, status: "idle" });
    setActiveSessionId(sess.id);
  };

  // ── Restart session ─────────────────────────────────────────────────
  const restartSession = (id: string): void => {
    const cmd = claudeCommand();
    if (cmd === undefined) return;
    acquireAgentSession(id, {
      command: cmd,
      cwd: props.project.path,
      permissionMode: "bypassPermissions",
      projectName: props.project.name,
      onSessionId: (claudeId) => updateSession(id, { agentSessionId: claudeId }),
    }).restart();
    updateSession(id, { status: "idle", add: 0, rem: 0 });
  };

  // ── Project switcher (⌘P) ───────────────────────────────────────────
  const selectProject = (id: string): void => {
    touchProject(id);
    setActiveProjectId(id);
    setSwitcher(false);
  };

  // ── Keyboard shortcuts ──────────────────────────────────────────────
  onMount(() => {
    const handleKey = (e: KeyboardEvent): void => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (e.key === "p" || e.key === "P") {
        e.preventDefault();
        setSwitcher((v) => !v);
        return;
      }
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        setShowNewSession(true);
        return;
      }
      if (e.key === ".") {
        e.preventDefault();
        controller()?.interrupt();
        return;
      }
      if (e.key === ",") {
        e.preventDefault();
        props.onSettings();
        return;
      }
    };
    window.addEventListener("keydown", handleKey);
    onCleanup(() => window.removeEventListener("keydown", handleKey));
  });

  // ── Sticky scroll-to-bottom ───────────────────────────────────────
  // Follow streaming output, but don't yank the user down if they've
  // scrolled up to read history.
  let threadEl: HTMLDivElement | undefined;
  let composerEl: HTMLTextAreaElement | undefined;
  let stick = true;

  const onThreadScroll = (): void => {
    if (!threadEl) return;
    stick = threadEl.scrollHeight - threadEl.scrollTop - threadEl.clientHeight < 120;
  };
  const setThreadEl = (el: HTMLDivElement): void => {
    threadEl = el;
    el.addEventListener("scroll", onThreadScroll, { passive: true });
  };

  createEffect(() => {
    const ctrl = controller();
    if (!ctrl) return;
    const items = ctrl.items();
    const last = items[items.length - 1];
    // Subscribe to the last item's streaming content so token deltas (which
    // mutate in place, not the array) also trigger a follow-scroll.
    if (last) {
      if (last.kind === "assistant" || last.kind === "user-msg") void last.text;
      else if (last.kind === "tool") void last.result;
    }
    void ctrl.busy();
    requestAnimationFrame(() => {
      if (threadEl && stick) threadEl.scrollTop = threadEl.scrollHeight;
    });
  });

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <div class="flex h-screen flex-col bg-ink-950 font-sans text-ink-200 antialiased">
      {/* title bar */}
      <div
        data-tauri-drag-region
        class="flex shrink-0 items-center border-b border-ink-800 bg-ink-900/70 pl-20 pr-2 py-2"
      >
        <span class="font-mono text-xs text-ink-500">
          {props.project.name}{" "}
          <span class="text-ink-700">/</span>{" "}
          <span class="text-ink-400">{activeSession()?.id ?? "—"}</span>
        </span>
        <div class="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => setSwitcher(true)}
            class="hidden items-center gap-1.5 rounded-field border border-ink-800 px-2 py-1 text-[11px] text-ink-500 hover:bg-ink-800 hover:text-ink-200 sm:flex"
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

      <div class="flex flex-1 min-h-0">
        {/* project rail */}
        <ProjectRail
          activeProjectId={props.project.id}
          onSelectProject={selectProject}
          onAddProject={() => setShowAddProject(true)}
          onSettings={() => props.onSettings()}
        />

        {/* session column */}
        <SessionColumn
          project={props.project}
          sessions={sessions()}
          activeSessionId={activeSessionId()}
          onSelectSession={setActiveSessionId}
          onNewSession={() => setShowNewSession(true)}
          onSwitchProject={() => setSwitcher(true)}
          onRestartSession={restartSession}
          onDeleteSession={deleteSession}
          onOpenHistory={openHistorySession}
        />

        {/* main column */}
        <div class="flex min-w-0 flex-1 flex-col">
          {/* tab strip */}
          <div class="flex items-center gap-1 border-b border-ink-800 bg-ink-900/30 px-2 py-1.5">
            <div class="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
              <For each={sessions()}>
                {(s) => {
                  const on = () => s.id === activeSessionId();
                  return (
                    <button
                      type="button"
                      onClick={() => setActiveSessionId(s.id)}
                      class={`group flex shrink-0 items-center gap-2 rounded-field px-3 py-1.5 text-xs transition-colors ${on() ? "bg-ink-800 text-ink-100" : "text-ink-500 hover:bg-ink-800/50 hover:text-ink-300"}`}
                    >
                      <Dot tone={toneOf(s.status)} />
                      <span class="max-w-[120px] truncate font-mono">{s.id}</span>
                      <span
                        class={`text-ink-600 ${on() ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                      >
                        ✕
                      </span>
                    </button>
                  );
                }}
              </For>
            </div>
            <button
              type="button"
              onClick={() => setShowNewSession(true)}
              aria-label="New tab"
              class="shrink-0 rounded-field p-1.5 text-ink-500 hover:bg-ink-800 hover:text-ink-200"
            >
              <I.plus class="h-4 w-4" />
            </button>
          </div>

          {/* task header */}
          <Show
            when={activeSession()}
            fallback={
              <div class="flex flex-col items-center justify-center flex-1 text-ink-500 text-sm gap-3">
                <span>No session selected.</span>
                <button
                  type="button"
                  onClick={() => setShowNewSession(true)}
                  class="inline-flex items-center gap-1.5 rounded-btn bg-brand-100 px-3 py-1.5 text-xs font-medium text-ink-950 hover:bg-brand-200"
                >
                  <I.plus class="h-4 w-4" />
                  New session
                </button>
              </div>
            }
          >
            {(sess) => (
              <>
                <div class="flex items-center gap-3 border-b border-ink-800 px-5 py-3">
                  <span class="mt-0.5">
                    <Dot tone={toneOf(sess().status)} />
                  </span>
                  <div class="min-w-0 flex-1">
                    <div class="truncate text-sm font-medium text-ink-50">{sess().task}</div>
                    <div class="flex items-center gap-2 text-xs text-ink-500">
                      <span class="flex items-center gap-1">
                        <I.branch class="h-3.5 w-3.5" />
                        <span class="font-mono">{gitBranch()}</span>
                      </span>
                      <Show when={totalAdd() > 0 || totalDel() > 0}>
                        <span class="font-mono">
                          <span class="text-success-300">+{totalAdd()}</span>{" "}
                          <span class="text-danger-300">−{totalDel()}</span>
                        </span>
                      </Show>
                    </div>
                  </div>
                  <Show
                    when={controller()?.busy()}
                    fallback={
                      <Show when={gitFiles().length > 0}>
                        <button
                          type="button"
                          disabled={committing()}
                          onClick={() => void handleCommit()}
                          class="inline-flex items-center gap-1.5 rounded-btn bg-brand-100 px-3 py-1.5 text-xs font-medium text-ink-950 transition-colors hover:bg-brand-200 disabled:pointer-events-none disabled:opacity-40"
                        >
                          <I.check class="h-3.5 w-3.5" />
                          {committing() ? "Committing…" : "Commit"}
                        </button>
                      </Show>
                    }
                  >
                    <button
                      type="button"
                      onClick={() => controller()?.interrupt()}
                      class="inline-flex items-center gap-1.5 rounded-btn bg-danger-500/12 px-3 py-1.5 text-xs font-medium text-danger-300 ring-1 ring-inset ring-danger-500/25 transition-colors hover:bg-danger-500/20 hover:text-danger-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-danger-400/70"
                    >
                      <I.square class="h-3 w-3" />
                      Stop
                    </button>
                  </Show>
                  <div class="relative">
                    <button
                      type="button"
                      onClick={() => setMenu(!menu())}
                      aria-label="Session actions"
                      class="rounded-field p-1.5 text-ink-500 hover:bg-ink-800 hover:text-ink-200"
                    >
                      <I.dots class="h-4 w-4" />
                    </button>
                    <Show when={menu()}>
                      <TaskMenu onClose={() => setMenu(false)}>
                        <button
                          type="button"
                          onClick={() => { controller()?.restart(); setMenu(false); }}
                          class="block w-full px-3.5 py-2 text-left text-sm text-ink-200 hover:bg-ink-800"
                        >
                          Restart session
                        </button>
                        <div class="my-1 border-t border-ink-800" />
                        <button
                          type="button"
                          onClick={handleDeleteSession}
                          class="block w-full px-3.5 py-2 text-left text-sm text-danger-300 hover:bg-ink-800"
                        >
                          Delete session
                        </button>
                      </TaskMenu>
                    </Show>
                  </div>
                </div>

                {/* split: thread + review */}
                <div class="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)]">
                  {/* thread */}
                  <div class="flex min-h-0 flex-col border-ink-800 lg:border-r">
                    <Thread
                      controller={controller()}
                      session={sess()}
                      threadRef={setThreadEl}
                      onSetDraft={(text) => controller()?.setDraft(text)}
                      onFocusComposer={() => composerEl?.focus()}
                    />

                    {/* result / usage line — shown after each completed turn */}
                    <Show when={controller()?.result()}>
                      {(r) => (
                        <div class="flex flex-wrap items-center gap-x-2 gap-y-1 px-4 pb-3 pt-1 font-mono text-[11px] text-ink-500">
                          <Show when={r().turns !== null}>
                            <span>{r().turns} turns</span>
                          </Show>
                          <Show when={r().durationMs !== null}>
                            <span>· {Math.round((r().durationMs ?? 0) / 100) / 10}s</span>
                          </Show>
                          <Show when={r().denials > 0}>
                            <span class="text-warning-300">· {r().denials} permission denial{r().denials !== 1 ? "s" : ""}</span>
                          </Show>
                        </div>
                      )}
                    </Show>

                    {/* composer */}
                    <Composer
                      controller={controller()}
                      sessionId={sess().id}
                      composerRef={(el) => { composerEl = el; }}
                    />
                  </div>

                  {/* review rail */}
                  <ReviewRail
                    projectPath={props.project.path}
                    gitFiles={gitFiles()}
                    totalAdd={totalAdd()}
                    totalDel={totalDel()}
                    diffLoading={diffLoading()}
                    fileDiff={fileDiff()}
                    selectedFileIdx={selectedFileIdx()}
                    onSelectFile={setSelectedFileIdx}
                    selectedFile={selectedFile()}
                  />
                </div>
              </>
            )}
          </Show>
        </div>
      </div>

      {/* ⌘P project switcher */}
      <Show when={switcher()}>
        <ProjectSwitcher
          activeProjectId={props.project.id}
          onSelect={selectProject}
          onClose={() => setSwitcher(false)}
        />
      </Show>

      {/* new session modal */}
      <Show when={showNewSession()}>
        <div
          class="fixed inset-0 z-50 flex items-start justify-center bg-ink-950/70 px-4 pt-[110px] backdrop-blur-sm"
          onClick={() => setShowNewSession(false)}
        >
          <div
            class="w-full max-w-[420px] overflow-hidden rounded-card border border-ink-700 bg-ink-900 shadow-float"
            onClick={(e) => e.stopPropagation()}
          >
            <div class="flex items-center justify-between border-b border-ink-800 px-5 py-3.5">
              <span class="text-sm font-medium text-ink-100">New session</span>
              <button
                type="button"
                onClick={() => setShowNewSession(false)}
                class="rounded-field p-1 text-ink-500 hover:bg-ink-800 hover:text-ink-200"
                aria-label="Close"
              >
                <I.x class="h-4 w-4" />
              </button>
            </div>
            <div class="px-5 py-4">
              <label for="new-task-input" class="mb-1.5 block text-xs font-medium text-ink-300">
                Task description
              </label>
              <input
                id="new-task-input"
                autofocus
                value={newTaskInput()}
                onInput={(e) => setNewTaskInput(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateSession();
                  if (e.key === "Escape") setShowNewSession(false);
                }}
                placeholder="Describe what this session should do…"
                class="w-full rounded-field border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-100 outline-none placeholder:text-ink-600 focus:border-brand-400 focus:ring-2 focus:ring-brand-400/25"
              />
            </div>
            <div class="flex items-center justify-end gap-2 border-t border-ink-800 px-5 py-3">
              <button
                type="button"
                onClick={() => setShowNewSession(false)}
                class="rounded-btn px-3 py-2 text-sm text-ink-300 hover:bg-ink-800 hover:text-ink-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateSession}
                class="inline-flex items-center gap-1.5 rounded-btn bg-brand-100 px-3.5 py-2 text-sm font-medium text-ink-950 hover:bg-brand-200"
              >
                <I.plus class="h-4 w-4" />
                Create
              </button>
            </div>
          </div>
        </div>
      </Show>

      {/* add project modal */}
      <Show when={showAddProject()}>
        <AddProjectModal
          onClose={() => setShowAddProject(false)}
          onAdded={(id) => {
            setShowAddProject(false);
            selectProject(id);
          }}
        />
      </Show>
    </div>
  );
}
