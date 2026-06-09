import { For, Show, type JSX } from "solid-js";
import { I } from "../../ui/icons";
import type { GitFile } from "../../ipc/git";

// ── Diff parsing ──────────────────────────────────────────────────────────

export interface HunkLine {
  type: "ctx" | "add" | "del";
  lineNo: string;
  text: string;
}
export interface Hunk {
  header: string;
  lines: HunkLine[];
}

export function parseUnifiedDiff(raw: string): Hunk[] {
  const hunks: Hunk[] = [];
  let current: Hunk | null = null;
  let lineNo = 0;

  for (const line of raw.split("\n")) {
    const hunkMatch = line.match(/^@@\s.*\+(\d+)/);
    if (hunkMatch) {
      current = { header: line, lines: [] };
      hunks.push(current);
      lineNo = parseInt(hunkMatch[1] ?? "1", 10) - 1;
      continue;
    }
    if (!current) continue;
    if (line.startsWith("+") && !line.startsWith("+++")) {
      lineNo++;
      current.lines.push({ type: "add", lineNo: String(lineNo), text: line.slice(1) });
    } else if (line.startsWith("-") && !line.startsWith("---")) {
      current.lines.push({ type: "del", lineNo: "", text: line.slice(1) });
    } else if (!line.startsWith("---") && !line.startsWith("+++") && !line.startsWith("\\")) {
      lineNo++;
      current.lines.push({ type: "ctx", lineNo: String(lineNo), text: line.slice(1) });
    }
  }
  return hunks;
}

// ── DiffView ──────────────────────────────────────────────────────────────

export function DiffView(props: {
  gitFiles: GitFile[];
  selectedFileIdx: number;
  onSelectFile: (idx: number) => void;
  diffLoading: boolean;
  selectedFile: GitFile | undefined;
  parsedHunks: Hunk[];
}): JSX.Element {
  return (
    <Show
      when={props.gitFiles.length > 0}
      fallback={
        <div class="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <span class="flex h-11 w-11 items-center justify-center rounded-card border border-ink-800 bg-ink-900/60 text-ink-500">
            <I.file class="h-5 w-5" />
          </span>
          <div>
            <div class="text-sm font-medium text-ink-300">No changes yet</div>
            <p class="mx-auto mt-1 max-w-[220px] text-xs leading-relaxed text-ink-600">
              The agent's edits will show up here as a reviewable diff.
            </p>
          </div>
        </div>
      }
    >
      <div class="flex min-h-0 flex-1 flex-col">
        <div class="border-b border-ink-800 px-2 py-2">
          <For each={props.gitFiles}>
            {(ff, i) => (
              <button
                type="button"
                onClick={() => props.onSelectFile(i())}
                class={`flex w-full items-center gap-2 rounded-field px-2 py-1.5 text-left transition-colors ${props.selectedFileIdx === i() ? "bg-ink-800" : "hover:bg-ink-800/50"}`}
              >
                <I.file
                  class={`h-3.5 w-3.5 shrink-0 ${props.selectedFileIdx === i() ? "text-brand-300" : "text-ink-500"}`}
                />
                <span
                  class={`min-w-0 flex-1 truncate font-mono text-[11px] ${props.selectedFileIdx === i() ? "text-ink-100" : "text-ink-400"}`}
                >
                  {ff.path.split("/").pop() ?? ff.path}
                </span>
                <span class="font-mono text-[10px]">
                  <span class="text-success-300">+{ff.adds}</span>{" "}
                  <span class="text-danger-300">−{ff.dels}</span>
                </span>
              </button>
            )}
          </For>
        </div>
        <div class="min-h-0 flex-1 overflow-y-auto">
          <Show when={props.diffLoading}>
            <div class="flex items-center justify-center py-8 text-xs text-ink-500">
              Loading diff…
            </div>
          </Show>
          <Show when={!props.diffLoading && props.selectedFile}>
            <div class="break-all px-3 py-2 font-mono text-[10px] text-ink-500">
              {props.selectedFile?.path}
            </div>
            <Show
              when={props.parsedHunks.length > 0}
              fallback={
                <div class="px-3 py-2 font-mono text-[11px] text-ink-500">
                  (binary or empty diff)
                </div>
              }
            >
              <For each={props.parsedHunks}>
                {(hk) => (
                  <div>
                    <div class="whitespace-pre-wrap break-all bg-ink-900/60 px-3 py-1 font-mono text-[11px] text-accent-300">
                      {hk.header}
                    </div>
                    <For each={hk.lines}>
                      {(ln) => (
                        <div
                          class={`flex gap-3 px-3 font-mono text-[11.5px] leading-relaxed ${ln.type === "add" ? "bg-success-500/10 text-success-300" : ln.type === "del" ? "bg-danger-500/10 text-danger-300" : "text-ink-300"}`}
                        >
                          <span class="w-6 shrink-0 select-none text-right text-ink-600">
                            {ln.lineNo}
                          </span>
                          <span class="w-3 shrink-0 select-none text-ink-600">
                            {ln.type === "add" ? "+" : ln.type === "del" ? "−" : ""}
                          </span>
                          <span class="min-w-0 flex-1 whitespace-pre-wrap break-all">
                            {ln.text}
                          </span>
                        </div>
                      )}
                    </For>
                  </div>
                )}
              </For>
            </Show>
          </Show>
        </div>
      </div>
    </Show>
  );
}
