import { For, Show, type JSX } from "solid-js";
import { I } from "../../ui/icons";
import { Spinner } from "../../ui/Spinner";
import { AgentAvatar } from "./AgentBubble";
import type { ToolItem } from "./agentSession";

// ── TodoList card ─────────────────────────────────────────────────────────

interface TodoItem {
  content: string;
  status: "pending" | "in_progress" | "completed";
  priority?: string;
}

/** Live checklist rendered from the most recent TodoWrite call's input. */
export function TodoListCard(props: { tool: ToolItem }): JSX.Element {
  const todos = (): TodoItem[] => {
    const raw = props.tool.input["todos"];
    if (!Array.isArray(raw)) return [];
    return (raw as unknown[]).map((r) => {
      const item = r as Record<string, unknown>;
      return {
        content: typeof item["content"] === "string" ? (item["content"] as string) : "",
        status: (item["status"] as TodoItem["status"]) ?? "pending",
        priority: typeof item["priority"] === "string" ? (item["priority"] as string) : undefined,
      };
    });
  };
  const total = () => todos().length;
  const done = () => todos().filter((t) => t.status === "completed").length;

  return (
    <div class="flex gap-3">
      <AgentAvatar />
      <div class="min-w-0 flex-1 overflow-hidden rounded-card border border-ink-800 bg-ink-900/50">
        {/* header */}
        <div class="flex items-center gap-2 border-b border-ink-800 px-3.5 py-2">
          <I.listCheck class="h-3.5 w-3.5 shrink-0 text-brand-300" />
          <span class="text-[11px] font-medium uppercase tracking-wider text-ink-400">Plan</span>
          <Show when={total() > 0}>
            <span class="ml-auto font-mono text-[11px] text-ink-500">
              {done()}/{total()}
            </span>
          </Show>
          <Show when={props.tool.status === "pending"}>
            <Spinner class="h-3 w-3 text-ink-500" />
          </Show>
        </div>
        {/* list */}
        <div class="flex flex-col gap-0.5 px-2 py-2">
          <For each={todos()}>
            {(item) => {
              const isDone = () => item.status === "completed";
              const isActive = () => item.status === "in_progress";
              return (
                <div
                  class={`flex items-start gap-2.5 rounded-field px-2 py-1.5 ${isActive() ? "bg-brand-900/30 ring-1 ring-inset ring-brand-800/30" : ""}`}
                >
                  {/* status icon */}
                  <span
                    class={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                      isDone()
                        ? "border-success-600 bg-success-500/15 text-success-300"
                        : isActive()
                          ? "border-brand-600/60 bg-brand-800/20 text-brand-300"
                          : "border-ink-700"
                    }`}
                    aria-label={item.status}
                  >
                    <Show when={isDone()}>
                      <svg viewBox="0 0 16 16" class="h-2.5 w-2.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M3.5 8.5l3 3 6-7" />
                      </svg>
                    </Show>
                    <Show when={isActive()}>
                      <Spinner class="h-2.5 w-2.5 text-brand-300" />
                    </Show>
                  </span>
                  <span
                    class={`min-w-0 flex-1 text-[12.5px] leading-snug ${
                      isDone()
                        ? "text-ink-600 line-through decoration-ink-700"
                        : isActive()
                          ? "font-medium text-ink-100"
                          : "text-ink-300"
                    }`}
                  >
                    {item.content}
                  </span>
                  <Show when={item.priority && item.priority !== "medium"}>
                    <span
                      class={`shrink-0 rounded-pill px-1.5 py-0 text-[9px] font-medium ring-1 ring-inset ${
                        item.priority === "high"
                          ? "bg-warning-500/10 text-warning-300 ring-warning-700/30"
                          : "bg-ink-800 text-ink-500 ring-ink-700/40"
                      }`}
                    >
                      {item.priority}
                    </span>
                  </Show>
                </div>
              );
            }}
          </For>
          <Show when={todos().length === 0}>
            <div class="px-2 py-2 text-[12px] text-ink-600">No tasks yet.</div>
          </Show>
        </div>
        {/* error */}
        <Show when={props.tool.status === "error" && props.tool.result}>
          <div class="border-t border-danger-500/20 px-3.5 py-2 font-mono text-[11px] text-danger-300">
            {props.tool.result.slice(0, 200)}
          </div>
        </Show>
      </div>
    </div>
  );
}
