/**
 * AddProjectModal — shared modal used by Welcome and Home.
 *
 * Props:
 *   onClose()              — dismiss without adding
 *   onAdded(projectId)     — called after addProject() succeeds; receives the new id
 */

import { createSignal, Show, For, type JSX } from "solid-js";
import { I } from "../ui/icons";
import { pickProjectFolder } from "../ipc/picker";
import { gitStatus } from "../ipc/git";
import { addProject, markOnboardingDone } from "../stores/projects";

export interface AddProjectModalProps {
  onClose: () => void;
  onAdded: (projectId: string) => void;
}

export function AddProjectModal(props: AddProjectModalProps): JSX.Element {
  const [folder, setFolder] = createSignal("");
  const [name, setName] = createSignal("");
  const [agent, setAgent] = createSignal<"claude" | "codex">("claude");
  const [gitBranch, setGitBranch] = createSignal<string | null>(null);
  const [picking, setPicking] = createSignal(false);

  const chooseFolder = async () => {
    setPicking(true);
    try {
      const path = await pickProjectFolder();
      if (!path) return;

      setFolder(path);
      // derive default name from last path segment
      const segment = path.replace(/\/$/, "").split("/").pop() ?? path;
      if (!name().trim()) setName(segment);

      // detect git repo — treat any error as non-repo
      try {
        const status = await gitStatus(path);
        setGitBranch(status.branch && status.branch !== "—" ? status.branch : null);
      } catch {
        setGitBranch(null);
      }
    } finally {
      setPicking(false);
    }
  };

  const handleAdd = () => {
    if (!name().trim() || !folder()) return;
    const id = addProject({ path: folder(), name: name().trim(), defaultCli: agent() });
    markOnboardingDone();
    props.onAdded(id);
  };

  const handleBackdropClick = () => props.onClose();

  return (
    <div
      class="fixed inset-0 z-50 flex items-start justify-center bg-ink-950/70 px-4 pt-[110px] backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label="Add a project"
    >
      <div
        class="w-full max-w-[480px] overflow-hidden rounded-card border border-ink-700 bg-ink-900 shadow-float"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div class="flex items-center justify-between border-b border-ink-800 px-5 py-3.5">
          <span class="whitespace-nowrap text-sm font-medium text-ink-100">Add a project</span>
          <button
            type="button"
            onClick={() => props.onClose()}
            class="rounded-field p-1 text-ink-500 hover:bg-ink-800 hover:text-ink-200"
            aria-label="Close"
          >
            <I.x class="h-4 w-4" />
          </button>
        </div>

        {/* body */}
        <div class="space-y-5 px-5 py-5">
          {/* local folder */}
          <div>
            <label class="mb-1.5 block text-xs font-medium text-ink-300">Local folder</label>
            <div class="flex items-center gap-2">
              <div class="flex min-w-0 flex-1 items-center gap-2 rounded-field border border-ink-700 bg-ink-950 px-3 py-2">
                <I.folder class="h-4 w-4 shrink-0 text-ink-500" />
                <span
                  class={`min-w-0 flex-1 truncate font-mono text-[13px] ${folder() ? "text-ink-100" : "text-ink-600"}`}
                >
                  {folder() || "No folder selected"}
                </span>
              </div>
              <button
                type="button"
                onClick={chooseFolder}
                disabled={picking()}
                class="shrink-0 whitespace-nowrap rounded-btn border border-ink-700 px-3 py-2 text-xs font-medium text-ink-200 transition-colors hover:bg-ink-800 disabled:pointer-events-none disabled:opacity-50"
              >
                {picking() ? "…" : "Choose…"}
              </button>
            </div>
            <Show when={gitBranch() !== null}>
              <div class="mt-2 flex items-center gap-2 text-[11px] text-ink-500">
                <I.branch class="h-3.5 w-3.5 text-success-300" />
                <span>
                  Git repository detected · branch{" "}
                  <span class="font-mono text-ink-300">{gitBranch()}</span>
                </span>
              </div>
            </Show>
          </div>

          {/* name */}
          <div>
            <label for="modal-proj-name" class="mb-1.5 block text-xs font-medium text-ink-300">
              Project name
            </label>
            <input
              id="modal-proj-name"
              value={name()}
              onInput={(e) => setName(e.currentTarget.value)}
              placeholder="e.g. PlanFlow"
              class="w-full rounded-field border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-100 outline-none transition-colors placeholder:text-ink-600 focus:border-brand-400 focus:ring-2 focus:ring-brand-400/25"
            />
            <p class="mt-1.5 text-[11px] text-ink-500">
              Shown in the project rail and the ⌘P switcher.
            </p>
          </div>

          {/* default agent */}
          <div>
            <label class="mb-1.5 block text-xs font-medium text-ink-300">Default agent</label>
            <div class="inline-flex rounded-field border border-ink-800 bg-ink-950 p-0.5">
              <For each={[["claude", "Claude Code"], ["codex", "Codex"]] as const}>
                {([v, l]) => (
                  <button
                    type="button"
                    onClick={() => setAgent(v)}
                    class={`whitespace-nowrap rounded-[7px] px-3 py-1.5 text-xs font-medium transition-colors ${agent() === v ? "bg-ink-800 text-ink-50" : "text-ink-400 hover:text-ink-200"}`}
                  >
                    {l}
                  </button>
                )}
              </For>
            </div>
          </div>
        </div>

        {/* footer */}
        <div class="flex items-center justify-end gap-2 border-t border-ink-800 px-5 py-3">
          <button
            type="button"
            onClick={() => props.onClose()}
            class="rounded-btn px-3 py-2 text-sm font-medium text-ink-300 transition-colors hover:bg-ink-800 hover:text-ink-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!name().trim() || !folder()}
            class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-btn bg-brand-100 px-3.5 py-2 text-sm font-medium text-ink-950 transition-colors hover:bg-brand-200 disabled:pointer-events-none disabled:opacity-40"
          >
            <I.plus class="h-4 w-4" />
            Add project
          </button>
        </div>
      </div>
    </div>
  );
}
