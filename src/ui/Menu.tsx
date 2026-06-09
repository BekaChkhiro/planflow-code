import { onCleanup, type JSX } from "solid-js";

// ── Task header menu ──────────────────────────────────────────────────────

/** Absolute popover anchored to the ⋯ button. Closes on outside click / Esc. */
export function TaskMenu(props: {
  onClose: () => void;
  children: JSX.Element;
  wide?: boolean;
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
    <div
      ref={root}
      class={`absolute right-0 top-full z-20 mt-1 overflow-hidden rounded-card border border-ink-700 bg-ink-900 py-1 shadow-pop ${props.wide ? "w-72" : "w-52"}`}
    >
      {props.children}
    </div>
  );
}
