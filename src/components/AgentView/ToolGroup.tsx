import { For, Show, type JSX } from "solid-js";
import { I } from "../../ui/icons";
import { ToolCard } from "./ToolCard";
import type { ToolItem } from "./agentSession";

/** A run of consecutive tool calls, rendered as compact lines aligned with
 *  the assistant prose. Up to 3 list flat; beyond that they collapse into a
 *  single scrollable box so a long sequence stays compact. */
export function ToolGroup(props: { tools: ToolItem[] }): JSX.Element {
  const many = () => props.tools.length > 3;
  return (
    <div class="pl-10">
      <Show
        when={many()}
        fallback={
          <div>
            <For each={props.tools}>{(t) => <ToolCard tool={t} />}</For>
          </div>
        }
      >
        <div class="overflow-hidden rounded-field border border-ink-800 bg-ink-950/40">
          <div class="flex items-center gap-1.5 border-b border-ink-800 px-2.5 py-1.5 text-[10px] uppercase tracking-wider text-ink-500">
            <I.term class="h-3 w-3" />
            <span class="font-medium text-ink-400">{props.tools.length}</span> steps
          </div>
          <div class="max-h-[240px] overflow-y-auto px-2.5 py-1">
            <For each={props.tools}>{(t) => <ToolCard tool={t} />}</For>
          </div>
        </div>
      </Show>
    </div>
  );
}
