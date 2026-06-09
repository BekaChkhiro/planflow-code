import type { JSX } from "solid-js";

// ── Spinner helper ────────────────────────────────────────────────────────

export function Spinner(props: { class?: string }): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      class={`animate-spin ${props.class ?? "h-3.5 w-3.5"}`}
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      aria-hidden="true"
    >
      <path d="M12 3a9 9 0 1 0 9 9" stroke-linecap="round" />
    </svg>
  );
}
