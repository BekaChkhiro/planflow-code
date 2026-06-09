import { createEffect, type JSX } from "solid-js";
import { I } from "../../ui/icons";
import { renderAgentMarkdown } from "./markdown";
import { AgentAvatar } from "./AgentBubble";
import type { ToolItem } from "./agentSession";

// ── ExitPlanMode / plan card ──────────────────────────────────────────────

/** Renders the agent's final plan as a markdown card. */
export function PlanCard(props: { tool: ToolItem }): JSX.Element {
  const planText = () =>
    typeof props.tool.input["plan"] === "string" ? (props.tool.input["plan"] as string) : "";
  let el!: HTMLDivElement;
  createEffect(() => {
    if (el) el.innerHTML = renderAgentMarkdown(planText());
  });
  return (
    <div class="flex gap-3">
      <AgentAvatar />
      <div class="min-w-0 flex-1 overflow-hidden rounded-card border border-accent-700/40 bg-accent-950/30">
        <div class="flex items-center gap-2 border-b border-accent-700/30 px-3.5 py-2">
          <I.plan class="h-3.5 w-3.5 shrink-0 text-accent-300" />
          <span class="text-[11px] font-medium uppercase tracking-wider text-accent-400">Plan</span>
        </div>
        <div ref={el} class="agent-md px-3.5 py-3 text-sm leading-relaxed text-ink-300" />
      </div>
    </div>
  );
}

// ── EnterPlanMode note ────────────────────────────────────────────────────

export function EnterPlanModeNote(): JSX.Element {
  return (
    <div class="pl-10">
      <div class="flex items-center gap-1.5 py-[3px] text-[11px] text-ink-600 italic">
        <I.plan class="h-3 w-3 shrink-0 text-ink-600" />
        Entered plan mode
      </div>
    </div>
  );
}
