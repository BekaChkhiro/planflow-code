/** Pure-TS helpers for tool names, labels, grouping, and MCP parsing.
 *  No JSX — safe to import from both .ts and .tsx files.
 */
import type { Item, ToolItem } from "./agentSession";

// ── Standalone tools ──────────────────────────────────────────────────────

/** Tools that are promoted to standalone rich cards and are NEVER folded into
 *  the compact ToolGroup. */
export const STANDALONE_TOOLS = new Set(["TodoWrite", "Task", "Agent", "ExitPlanMode"]);

// ── Thread block grouping ─────────────────────────────────────────────────

/** A rendered thread block: a standalone item, or a run of consecutive tool
 *  calls grouped together (so a long tool sequence collapses into one box). */
export type ThreadBlock =
  | { kind: "item"; item: Item }
  | { kind: "tools"; tools: ToolItem[] };

/** Collapse consecutive `tool` items into a single group block. Item proxies
 *  are referenced (not copied) so their streaming reactivity is preserved. */
export function groupBlocks(items: readonly Item[]): ThreadBlock[] {
  const blocks: ThreadBlock[] = [];
  for (const item of items) {
    if (item.kind === "tool" && !STANDALONE_TOOLS.has(item.name)) {
      const last = blocks[blocks.length - 1];
      if (last && last.kind === "tools") last.tools.push(item);
      else blocks.push({ kind: "tools", tools: [item] });
    } else {
      blocks.push({ kind: "item", item });
    }
  }
  return blocks;
}

// ── MCP tool name parsing ─────────────────────────────────────────────────

/** Parse an MCP tool name of the form `mcp__<server>__<tool>`.
 *  Returns null when the name doesn't match that pattern. */
export function mcpParts(name: string): { server: string; tool: string } | null {
  const m = name.match(/^mcp__([^_].+?)__(.+)$/);
  if (!m) return null;
  return { server: m[1] ?? "", tool: m[2] ?? "" };
}

/** Humanise a snake_case or camelCase tool name → "Title Case" label. */
export function humanizeName(name: string): string {
  return name
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** First meaningful string value from an input bag (for MCP / fallback). */
export function firstStringValue(input: Record<string, unknown>): string {
  // Prefer common semantic keys first
  for (const key of [
    "query",
    "intent",
    "taskId",
    "command",
    "path",
    "url",
    "name",
    "script",
  ]) {
    const v = input[key];
    if (typeof v === "string" && v.length > 0) return v;
  }
  // Fallback: first string-typed value
  for (const v of Object.values(input)) {
    if (typeof v === "string" && v.length > 0) return v;
  }
  return "";
}

// ── Tool verb / label ─────────────────────────────────────────────────────

/** Human verb for a tool call, Cursor-style ("Ran" / "Read" / "Edited"…). */
export function toolVerb(name: string): string {
  switch (name) {
    case "Bash":
      return "Ran";
    case "BashOutput":
      return "Checked output";
    case "Monitor":
      return "Monitored";
    case "KillShell":
      return "Stopped shell";
    case "Read":
      return "Read";
    case "Edit":
      return "Edited";
    case "Write":
      return "Wrote";
    case "MultiEdit":
      return "Edited";
    case "NotebookEdit":
      return "Edited";
    case "Grep":
      return "Searched";
    case "Glob":
      return "Globbed";
    case "WebSearch":
      return "Web search";
    case "WebFetch":
      return "Fetched";
    case "Task":
    case "Agent":
      return "Ran agent";
    case "TodoWrite":
      return "Updated plan";
    case "Workflow":
      return "Workflow";
    case "TaskCreate":
      return "Created task";
    case "TaskUpdate":
      return "Updated task";
    case "TaskList":
      return "Listed tasks";
    case "TaskStop":
      return "Stopped task";
    case "Skill":
      return "Skill";
    case "EnterPlanMode":
      return "Entered plan mode";
    case "ExitPlanMode":
      return "Exited plan mode";
    case "ScheduleWakeup":
      return "Scheduled wakeup";
    default: {
      const mcp = mcpParts(name);
      if (mcp) return humanizeName(mcp.tool);
      return humanizeName(name);
    }
  }
}

/** Compact secondary label for a tool: basename, pattern, command, etc. */
export function toolLabel(tool: ToolItem): string {
  const inp = tool.input;
  const s = (k: string): string => (typeof inp[k] === "string" ? (inp[k] as string) : "");
  const basename = (p: string): string => p.split("/").pop() ?? p;

  switch (tool.name) {
    case "Bash": {
      const desc = s("description");
      const cmd = s("command");
      return desc.length > 0 ? desc : cmd;
    }
    case "BashOutput":
    case "Monitor":
    case "KillShell":
      return s("shell_id") || s("id") || "";
    case "Read": {
      const base = basename(s("file_path") || s("path"));
      const offset = inp["offset"];
      const limit = inp["limit"];
      const pages = s("pages");
      if (pages) return `${base} :pp${pages}`;
      if (typeof offset === "number" && typeof limit === "number")
        return `${base} :${offset}-${offset + limit}`;
      return base;
    }
    case "Edit":
    case "Write":
      return basename(s("file_path") || s("path"));
    case "MultiEdit": {
      const edits = Array.isArray(inp["edits"]) ? (inp["edits"] as unknown[]) : [];
      const n = edits.length;
      return `${basename(s("file_path") || s("path"))}${n > 0 ? ` (${n} edits)` : ""}`;
    }
    case "NotebookEdit":
      return basename(s("notebook_path") || s("path"));
    case "Grep": {
      const pat = s("pattern");
      const inPath = s("path") || s("glob");
      return inPath ? `${pat} in ${inPath}` : pat;
    }
    case "Glob": {
      const pat = s("pattern");
      const inPath = s("path");
      return inPath ? `${pat} in ${inPath}` : pat;
    }
    case "WebFetch": {
      try {
        return new URL(s("url")).host;
      } catch {
        return s("url");
      }
    }
    case "WebSearch":
      return s("query");
    case "Workflow":
      return s("name") || s("script") || "";
    case "TaskCreate":
      return s("subject") || s("title") || "";
    case "TaskUpdate": {
      const id = s("taskId");
      const status = s("status");
      return id && status ? `#${id} → ${status}` : id || status || "";
    }
    case "TaskList":
    case "TaskStop":
      return s("taskId") || "";
    case "Skill":
      return s("command") || s("skill") || s("name") || "";
    case "EnterPlanMode":
      return "";
    default: {
      const mcp = mcpParts(tool.name);
      if (mcp) return firstStringValue(inp);
      return firstStringValue(inp);
    }
  }
}
