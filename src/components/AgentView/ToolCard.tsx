import { Show, type JSX } from "solid-js";
import { I } from "../../ui/icons";
import { mcpParts, toolVerb, toolLabel } from "./toolMeta";
import type { ToolItem } from "./agentSession";

/** One compact tool-call line (Cursor-style). No avatar, no result body —
 *  except a short excerpt when the call failed, so errors stay visible. */
export function ToolCard(props: { tool: ToolItem }): JSX.Element {
  const t = () => props.tool;
  const isBash = () => t().name === "Bash";
  const desc = () =>
    isBash() && typeof t().input["description"] === "string"
      ? (t().input["description"] as string)
      : "";
  const cmd = () =>
    isBash() ? (typeof t().input["command"] === "string" ? (t().input["command"] as string) : "") : "";
  const isBg = () => isBash() && t().input["run_in_background"] === true;
  const mcp = () => mcpParts(t().name);
  const verb = () => toolVerb(t().name);
  const label = () => {
    // For Bash, the description is the primary label, command secondary
    if (isBash() && desc().length > 0) return desc();
    return toolLabel(t());
  };
  const secondary = () => {
    // For Bash with a description, show the command truncated as secondary
    if (isBash() && desc().length > 0 && cmd().length > 0) return cmd();
    return "";
  };

  return (
    <div>
      <div class="flex items-center gap-2 py-[3px] text-xs leading-snug">
        <Show when={t().status === "pending"}>
          <svg
            viewBox="0 0 24 24"
            class="h-3 w-3 shrink-0 animate-spin text-ink-500"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M12 3a9 9 0 1 0 9 9" stroke-linecap="round" />
          </svg>
        </Show>
        <Show when={mcp()}>
          <I.plug class="h-3 w-3 shrink-0 text-accent-400" />
        </Show>
        <span class="shrink-0 font-medium text-ink-300">{verb()}</span>
        <Show when={mcp()}>
          {(m) => (
            <span class="shrink-0 rounded-pill bg-accent-900/60 px-1.5 py-0 text-[9px] font-medium text-accent-400 ring-1 ring-inset ring-accent-700/40">
              {m().server}
            </span>
          )}
        </Show>
        <Show when={label().length > 0}>
          <span class="min-w-0 flex-1 truncate font-mono text-ink-500">{label()}</span>
        </Show>
        <Show when={secondary().length > 0}>
          <span class="min-w-0 max-w-[160px] truncate font-mono text-[10px] text-ink-600">{secondary()}</span>
        </Show>
        <Show when={isBg()}>
          <span class="shrink-0 rounded-pill bg-ink-800 px-1 text-[9px] text-ink-500">bg</span>
        </Show>
        <Show when={t().status === "error"}>
          <span class="shrink-0 text-[10px] font-medium text-danger-300">failed</span>
        </Show>
      </div>
      <Show when={t().status === "error" && t().result}>
        <div class="ml-1 mt-0.5 border-l-2 border-danger-500/30 pl-2 font-mono text-[11px] leading-relaxed text-danger-300/80">
          <span class="line-clamp-3 whitespace-pre-wrap">{t().result.slice(0, 300)}</span>
        </div>
      </Show>
    </div>
  );
}
