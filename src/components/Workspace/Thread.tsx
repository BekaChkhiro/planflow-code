import { For, Show, type JSX } from "solid-js";
import { I } from "../../ui/icons";
import { AgentBubble } from "../AgentView/AgentBubble";
import { ToolGroup } from "../AgentView/ToolGroup";
import { groupBlocks } from "../AgentView/toolMeta";
import type { AgentController } from "../AgentView/agentSession";
import type { Session } from "../../stores/sessions";

export function Thread(props: {
  controller: AgentController | null;
  session: Session;
  threadRef: (el: HTMLDivElement) => void;
  onSetDraft: (text: string) => void;
  onFocusComposer: () => void;
}): JSX.Element {
  return (
    <div
      ref={props.threadRef}
      class="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5"
    >
      <Show when={props.controller}>
        {(ctrl) => (
          <>
            <Show
              when={
                ctrl().items().length === 0 &&
                !ctrl().busy() &&
                !ctrl().fatal() &&
                !ctrl().closed()
              }
            >
              <div class="flex h-full min-h-[340px] flex-col items-center justify-center gap-5 px-6 text-center">
                <span class="flex h-12 w-12 items-center justify-center rounded-card bg-brand-100 text-ink-950 shadow-pop">
                  <I.spark class="h-6 w-6" />
                </span>
                <div>
                  <div class="text-sm font-medium text-ink-100">
                    Give{" "}
                    <span class="font-mono text-brand-200">{props.session.id}</span> its
                    first task
                  </div>
                  <p class="mx-auto mt-1.5 max-w-[340px] text-xs leading-relaxed text-ink-500">
                    Describe what you want done in{" "}
                    <span class="text-ink-300">{props.session.task}</span>. The agent
                    edits files and runs commands — you review the diff on the right.
                  </p>
                </div>
                <div class="flex flex-wrap items-center justify-center gap-2">
                  <For
                    each={[
                      "Explain this codebase",
                      "Find and fix a bug",
                      "Add a test for the changed code",
                    ]}
                  >
                    {(prompt) => (
                      <button
                        type="button"
                        onClick={() => {
                          props.onSetDraft(prompt);
                          props.onFocusComposer();
                        }}
                        class="rounded-pill border border-ink-800 bg-ink-900/60 px-3 py-1.5 text-[11px] text-ink-300 transition-colors hover:border-ink-700 hover:bg-ink-800 hover:text-ink-100"
                      >
                        {prompt}
                      </button>
                    )}
                  </For>
                </div>
              </div>
            </Show>
            <For each={groupBlocks(ctrl().items())}>
              {(block) =>
                block.kind === "tools" ? (
                  <ToolGroup tools={block.tools} />
                ) : (
                  <AgentBubble item={block.item} />
                )
              }
            </For>
            <Show when={ctrl().busy()}>
              <div class="flex items-center gap-2 pl-9 text-xs text-ink-500">
                <svg
                  viewBox="0 0 24 24"
                  class="h-3.5 w-3.5 animate-spin text-ink-400"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M12 3a9 9 0 1 0 9 9" stroke-linecap="round" />
                </svg>
                thinking
                <span class="animate-pulse">…</span>
              </div>
            </Show>
            <Show when={ctrl().fatal()}>
              {(err) => (
                <div class="rounded-field border border-danger-500/30 bg-danger-500/10 px-3 py-2 text-xs text-danger-300">
                  <span class="font-semibold">Agent error:</span> {err()}
                </div>
              )}
            </Show>
            <Show when={ctrl().closed() && ctrl().items().length === 0}>
              <div class="text-center text-xs text-ink-500 py-8">
                Session ended. Restart to begin a new conversation.
              </div>
            </Show>
          </>
        )}
      </Show>
      <Show when={!props.controller}>
        <div class="flex flex-col items-center justify-center py-16 text-ink-500 text-xs gap-2">
          <svg
            viewBox="0 0 24 24"
            class="h-4 w-4 animate-spin"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M12 3a9 9 0 1 0 9 9" stroke-linecap="round" />
          </svg>
          Initialising agent…
        </div>
      </Show>
    </div>
  );
}
