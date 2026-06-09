import { Show, onCleanup, type JSX } from "solid-js";
import { I } from "./icons";

// ── Composer dropdown ─────────────────────────────────────────────────────

/** Pill-shaped dropdown anchored above the composer (bottom-full). Closes on
 *  outside pointerdown / Escape. Children are the menu items. */
export function ComposerDropdown(props: {
  icon: JSX.Element;
  label: string;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  children: JSX.Element;
}): JSX.Element {
  let root: HTMLDivElement | undefined;

  const onPointerDown = (e: PointerEvent): void => {
    const t = e.target;
    if (t instanceof Node && root?.contains(t)) return;
    props.onClose();
  };
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === "Escape") props.onClose();
  };
  window.addEventListener("pointerdown", onPointerDown, true);
  window.addEventListener("keydown", onKey, true);
  onCleanup(() => {
    window.removeEventListener("pointerdown", onPointerDown, true);
    window.removeEventListener("keydown", onKey, true);
  });

  return (
    <div ref={root} class="relative">
      <button
        type="button"
        onClick={() => props.onToggle()}
        class="inline-flex items-center gap-1.5 rounded-pill bg-ink-800 px-2.5 py-1 text-[11px] font-medium text-ink-300 transition-colors hover:bg-ink-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/70"
        aria-haspopup="listbox"
        aria-expanded={props.open}
      >
        {props.icon}
        <span class="max-w-[96px] truncate">{props.label}</span>
        <I.chevron class={`h-3 w-3 shrink-0 text-ink-500 transition-transform ${props.open ? "rotate-180" : ""}`} />
      </button>
      <Show when={props.open}>
        <div
          role="listbox"
          class="absolute bottom-full left-0 z-20 mb-1.5 min-w-[160px] overflow-hidden rounded-card border border-ink-700 bg-ink-900 py-1 shadow-pop"
        >
          {props.children}
        </div>
      </Show>
    </div>
  );
}
