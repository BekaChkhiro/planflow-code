import { createEffect, For, Match, Show, Switch, type JSX } from "solid-js";
import { renderAgentMarkdown } from "./markdown";
import { TodoListCard } from "./TodoListCard";
import { SubagentCard } from "./SubagentCard";
import { PlanCard } from "./PlanCard";
import { EnterPlanModeNote } from "./PlanCard";
import { ToolCard } from "./ToolCard";
import type { Item, ToolItem } from "./agentSession";

// ── Agent bubble ──────────────────────────────────────────────────────────

export function AgentAvatar(): JSX.Element {
  return (
    <span class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-pill bg-brand-100 text-[10px] font-semibold text-ink-950">
      CC
    </span>
  );
}

export function AgentBubble(props: { item: Item }): JSX.Element {
  return (
    <Switch>
      <Match when={props.item.kind === "user-msg" && props.item}>
        {(item) => {
          const msg = () => item() as { kind: "user-msg"; text: string; images?: string[] };
          return (
            <div class="flex flex-col items-end gap-1.5">
              <Show when={(msg().images?.length ?? 0) > 0}>
                <div class="flex max-w-[80%] flex-wrap justify-end gap-1.5">
                  <For each={msg().images ?? []}>
                    {(src) => (
                      <img
                        src={src}
                        alt=""
                        class="h-28 w-28 rounded-card rounded-tr-sm border border-ink-700 object-cover"
                      />
                    )}
                  </For>
                </div>
              </Show>
              <Show when={msg().text.length > 0}>
                <div class="max-w-[80%] rounded-card rounded-tr-sm bg-ink-800 px-3.5 py-2.5 text-sm text-ink-100">
                  {msg().text}
                </div>
              </Show>
            </div>
          );
        }}
      </Match>
      <Match when={props.item.kind === "assistant" && props.item}>
        {(item) => {
          let el!: HTMLDivElement;
          createEffect(() => {
            const html = renderAgentMarkdown((item() as { kind: "assistant"; text: string }).text);
            if (el) el.innerHTML = html;
          });
          return (
            <div class="flex gap-3">
              <AgentAvatar />
              <div
                ref={el}
                class="agent-md min-w-0 flex-1 pt-0.5 text-sm leading-relaxed text-ink-300"
              />
            </div>
          );
        }}
      </Match>
      <Match when={props.item.kind === "tool" && props.item}>
        {(item) => {
          const t = item() as ToolItem;
          if (t.name === "TodoWrite") return <TodoListCard tool={t} />;
          if (t.name === "Task" || t.name === "Agent") return <SubagentCard tool={t} />;
          if (t.name === "ExitPlanMode") return <PlanCard tool={t} />;
          if (t.name === "EnterPlanMode") return <EnterPlanModeNote />;
          return (
            <div class="pl-10">
              <ToolCard tool={t} />
            </div>
          );
        }}
      </Match>
      <Match when={props.item.kind === "note" && props.item}>
        {(item) => {
          const n = () => item() as { kind: "note"; tone: "system" | "stderr" | "info"; text: string };
          const cls = () =>
            n().tone === "stderr"
              ? "text-danger-300"
              : n().tone === "system"
                ? "text-accent-300"
                : "text-ink-500";
          return (
            <div class={`pl-9 text-[11px] italic ${cls()}`}>
              {n().text}
            </div>
          );
        }}
      </Match>
    </Switch>
  );
}
