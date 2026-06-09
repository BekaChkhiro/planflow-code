import { Show, type JSX } from "solid-js";
import { I } from "../../ui/icons";
import { Spinner } from "../../ui/Spinner";
import { AgentAvatar } from "./AgentBubble";
import type { ToolItem } from "./agentSession";

// ── Subagent card ─────────────────────────────────────────────────────────

/** Full-width subagent launch card for Task / Agent tools. */
export function SubagentCard(props: { tool: ToolItem }): JSX.Element {
  const t = () => props.tool;
  const desc = () =>
    (typeof t().input["description"] === "string" ? (t().input["description"] as string) : "") ||
    (typeof t().input["subagent_type"] === "string" ? (t().input["subagent_type"] as string) : "");
  const agentType = () =>
    typeof t().input["subagent_type"] === "string" ? (t().input["subagent_type"] as string) : "";
  const promptSnippet = () => {
    const p = typeof t().input["prompt"] === "string" ? (t().input["prompt"] as string) : "";
    return p.slice(0, 160);
  };
  const isRunning = () => t().status === "pending";
  const isError = () => t().status === "error";

  return (
    <div class="flex gap-3">
      <AgentAvatar />
      <div
        class={`min-w-0 flex-1 overflow-hidden rounded-card border ${
          isError()
            ? "border-danger-500/30"
            : isRunning()
              ? "border-accent-700/50 shadow-[0_0_0_2px_rgb(75_107_177/0.08)]"
              : "border-ink-800"
        } bg-ink-900/50`}
      >
        {/* header row */}
        <div class="flex items-center gap-2.5 px-3.5 py-2.5">
          <span
            class={`flex h-7 w-7 shrink-0 items-center justify-center rounded-btn ${
              isRunning()
                ? "bg-accent-900/70 text-accent-300"
                : isError()
                  ? "bg-danger-500/10 text-danger-300"
                  : "bg-success-500/10 text-success-300"
            }`}
          >
            <Show
              when={isRunning()}
              fallback={
                <Show
                  when={isError()}
                  fallback={<I.check class="h-3.5 w-3.5" />}
                >
                  <I.x class="h-3.5 w-3.5" />
                </Show>
              }
            >
              <I.bot class="h-4 w-4" />
            </Show>
          </span>
          <div class="min-w-0 flex-1">
            <div class="truncate text-[13px] font-medium text-ink-100">
              {desc().length > 0 ? desc() : "Subagent"}
            </div>
            <Show when={agentType().length > 0}>
              <div class="mt-0.5 font-mono text-[10px] text-ink-500">{agentType()}</div>
            </Show>
          </div>
          {/* status badge */}
          <Show when={agentType().length > 0}>
            <span class="shrink-0 rounded-pill bg-brand-800/50 px-2 py-0.5 text-[10px] font-medium text-brand-300 ring-1 ring-inset ring-brand-700/40">
              {agentType()}
            </span>
          </Show>
          <Show
            when={isRunning()}
            fallback={
              <span
                class={`shrink-0 text-[11px] font-medium ${
                  isError() ? "text-danger-300" : "text-success-300"
                }`}
              >
                {isError() ? "failed" : "done"}
              </span>
            }
          >
            <span class="flex items-center gap-1.5 text-[11px] text-accent-300">
              <Spinner class="h-3 w-3 text-accent-400" />
              running
            </span>
          </Show>
        </div>
        {/* optional prompt snippet */}
        <Show when={promptSnippet().length > 0 && isRunning()}>
          <div class="border-t border-ink-800/60 px-3.5 py-2 font-mono text-[11px] leading-relaxed text-ink-500">
            <span class="line-clamp-2">{promptSnippet()}{t().input["prompt"] && (t().input["prompt"] as string).length > 160 ? "…" : ""}</span>
          </div>
        </Show>
        {/* error body */}
        <Show when={isError() && t().result}>
          <div class="border-t border-danger-500/20 px-3.5 py-2 font-mono text-[11px] text-danger-300">
            <span class="line-clamp-3">{t().result.slice(0, 300)}</span>
          </div>
        </Show>
      </div>
    </div>
  );
}
