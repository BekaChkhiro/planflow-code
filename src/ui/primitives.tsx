/** Shared design-system primitives extracted from DesignSystem artboard.
 *  Pure Tailwind utilities — no per-component CSS.
 */
import type { JSX, ParentProps } from "solid-js";

/* ------------------------------------------------------------------ *
 * Dot — animated status indicator
 * ------------------------------------------------------------------ */
export function Dot(props: { tone: "live" | "idle" | "done" | "fail" }): JSX.Element {
  const map = {
    live: "bg-success-400",
    idle: "bg-ink-500",
    done: "bg-accent-300",
    fail: "bg-danger-400",
  } as const;
  return (
    <span class="relative flex h-2 w-2">
      {props.tone === "live" && (
        <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-success-400/60" />
      )}
      <span class={`relative inline-flex h-2 w-2 rounded-full ${map[props.tone]}`} />
    </span>
  );
}

/* ------------------------------------------------------------------ *
 * Pill — semantic badge
 * ------------------------------------------------------------------ */
export function Pill(
  props: ParentProps<{
    tone: "success" | "warning" | "danger" | "info" | "neutral" | "brand";
  }>
): JSX.Element {
  const map: Record<string, string> = {
    success: "bg-success-500/12 text-success-300 ring-success-500/25",
    warning: "bg-warning-500/12 text-warning-300 ring-warning-500/25",
    danger: "bg-danger-500/12 text-danger-300 ring-danger-500/25",
    info: "bg-info-500/12 text-info-300 ring-info-500/25",
    neutral: "bg-ink-800 text-ink-300 ring-ink-700",
    brand: "bg-brand-400/12 text-brand-200 ring-brand-400/25",
  };
  return (
    <span
      class={`inline-flex items-center gap-1.5 rounded-pill px-2.5 py-0.5 text-[11px] font-medium ring-1 ${map[props.tone] ?? ""}`}
    >
      {props.children}
    </span>
  );
}

/* ------------------------------------------------------------------ *
 * Btn — button variants
 * ------------------------------------------------------------------ */
export function Btn(
  props: ParentProps<{
    kind?: "primary" | "secondary" | "ghost" | "danger";
    disabled?: boolean;
    onClick?: () => void;
    type?: "button" | "submit" | "reset";
  }>
): JSX.Element {
  const base =
    "inline-flex items-center gap-2 rounded-btn px-3.5 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950 disabled:opacity-40 disabled:pointer-events-none";
  const styles: Record<string, string> = {
    primary: "bg-brand-100 text-ink-950 hover:bg-brand-200 active:bg-brand-300",
    secondary: "border border-ink-700 text-ink-100 hover:bg-ink-800 active:bg-ink-700",
    ghost: "text-ink-300 hover:bg-ink-800 hover:text-ink-100",
    danger:
      "bg-danger-500/12 text-danger-300 ring-1 ring-inset ring-danger-500/25 hover:bg-danger-500/20 hover:text-danger-200",
  };
  const kind = props.kind ?? "primary";
  return (
    <button
      type={props.type ?? "button"}
      disabled={props.disabled}
      onClick={props.onClick}
      class={`${base} ${styles[kind] ?? ""}`}
    >
      {props.children}
    </button>
  );
}

/* ------------------------------------------------------------------ *
 * Toggle — accessible on/off switch
 * ------------------------------------------------------------------ */
export function Toggle(props: { on: boolean; onClick: () => void }): JSX.Element {
  return (
    <button
      type="button"
      onClick={props.onClick}
      aria-pressed={props.on}
      class={`relative h-6 w-11 shrink-0 rounded-pill transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950 ${props.on ? "bg-brand-300" : "bg-ink-700"}`}
    >
      <span
        class={`absolute top-0.5 h-5 w-5 rounded-full bg-ink-950 transition-all ${props.on ? "left-[22px]" : "left-0.5"}`}
      />
    </button>
  );
}

/* ------------------------------------------------------------------ *
 * Field — settings row with label + control
 * ------------------------------------------------------------------ */
export function Field(
  props: ParentProps<{
    title: string;
    desc?: string;
    last?: boolean;
  }>
): JSX.Element {
  return (
    <div
      class={`flex items-center justify-between gap-4 py-3.5 ${props.last ? "" : "border-b border-ink-800"}`}
    >
      <div class="min-w-0 flex-1 pr-4">
        <div class="text-sm text-ink-100">{props.title}</div>
        {props.desc && <div class="mt-0.5 text-xs text-ink-500">{props.desc}</div>}
      </div>
      <div class="shrink-0">{props.children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Card — settings section container
 * ------------------------------------------------------------------ */
export function Card(props: ParentProps): JSX.Element {
  return (
    <div class="rounded-card border border-ink-800 bg-ink-900/40 px-4">{props.children}</div>
  );
}
