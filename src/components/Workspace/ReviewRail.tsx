import { createMemo, createSignal, For, Show, type JSX } from "solid-js";
import { Terminal } from "../Terminal/Terminal";
import { DiffView, parseUnifiedDiff } from "./DiffView";
import type { GitFile } from "../../ipc/git";

type ReviewView = "changes" | "terminal";

export function ReviewRail(props: {
  projectPath: string;
  gitFiles: GitFile[];
  totalAdd: number;
  totalDel: number;
  diffLoading: boolean;
  fileDiff: string;
  selectedFileIdx: number;
  onSelectFile: (idx: number) => void;
  selectedFile: GitFile | undefined;
}): JSX.Element {
  const [view, setView] = createSignal<ReviewView>("changes");
  const parsedHunks = createMemo(() => parseUnifiedDiff(props.fileDiff));

  return (
    <div class="hidden min-h-0 flex-col bg-ink-900/30 lg:flex">
      <div class="flex items-center gap-1 border-b border-ink-800 px-3 py-2">
        <For each={["changes", "terminal"] as ReviewView[]}>
          {(v) => (
            <button
              type="button"
              onClick={() => setView(v)}
              class={`rounded-field px-2.5 py-1 text-xs capitalize transition-colors ${view() === v ? "bg-ink-800 text-ink-100" : "text-ink-500 hover:text-ink-200"}`}
            >
              {v}
              <Show when={v === "changes" && props.gitFiles.length > 0}>
                <span class="ml-1 rounded-pill bg-ink-700 px-1.5 py-0.5 font-mono text-[9px] text-ink-300">
                  {props.gitFiles.length}
                </span>
              </Show>
            </button>
          )}
        </For>
        <span class="ml-auto font-mono text-[11px] text-ink-500">
          <Show when={props.totalAdd > 0 || props.totalDel > 0}>
            <span class="text-success-300">+{props.totalAdd}</span>{" "}
            <span class="text-danger-300">−{props.totalDel}</span>
          </Show>
        </span>
      </div>

      {/* changes tab */}
      <Show when={view() === "changes"}>
        <DiffView
          gitFiles={props.gitFiles}
          selectedFileIdx={props.selectedFileIdx}
          onSelectFile={props.onSelectFile}
          diffLoading={props.diffLoading}
          selectedFile={props.selectedFile}
          parsedHunks={parsedHunks()}
        />
      </Show>

      {/* terminal tab */}
      <Show when={view() === "terminal"}>
        <div class="min-h-0 flex-1">
          <Terminal cwd={props.projectPath} />
        </div>
      </Show>
    </div>
  );
}
