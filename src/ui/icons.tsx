/** Shared inline SVG icon set — union of all icons used across artboards.
 *  Each icon takes { class?: string } (Solid convention, not className).
 */
import type { JSX } from "solid-js";

interface P { class?: string }

export const I = {
  refresh: (p: P): JSX.Element => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.6"
      stroke-linecap="round"
      stroke-linejoin="round"
      class={p.class}
    >
      <path d="M21 12a9 9 0 1 1-2.64-6.36M21 4v4h-4" />
    </svg>
  ),
  image: (p: P): JSX.Element => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.6"
      stroke-linecap="round"
      stroke-linejoin="round"
      class={p.class}
    >
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.5" />
      <path d="m4 17 4.5-4.5a2 2 0 0 1 2.8 0L17 18M14 14l1.5-1.5a2 2 0 0 1 2.8 0L21 15" />
    </svg>
  ),
  term: (p: P): JSX.Element => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.6"
      stroke-linecap="round"
      stroke-linejoin="round"
      class={p.class}
    >
      <path d="m7 9 3 3-3 3" />
      <path d="M13 15h4" />
    </svg>
  ),
  branch: (p: P): JSX.Element => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.6"
      stroke-linecap="round"
      stroke-linejoin="round"
      class={p.class}
    >
      <circle cx="6" cy="6" r="2.4" />
      <circle cx="6" cy="18" r="2.4" />
      <circle cx="18" cy="8" r="2.4" />
      <path d="M6 8.4v7.2M18 10.4c0 4-4 3.6-5.5 5.6" />
    </svg>
  ),
  search: (p: P): JSX.Element => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.6"
      stroke-linecap="round"
      stroke-linejoin="round"
      class={p.class}
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </svg>
  ),
  plus: (p: P): JSX.Element => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.7"
      stroke-linecap="round"
      stroke-linejoin="round"
      class={p.class}
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  check: (p: P): JSX.Element => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class={p.class}
    >
      <path d="m5 12.5 4.2 4.5L19 7" />
    </svg>
  ),
  chevron: (p: P): JSX.Element => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.6"
      stroke-linecap="round"
      stroke-linejoin="round"
      class={p.class}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  ),
  dots: (p: P): JSX.Element => (
    <svg viewBox="0 0 24 24" fill="currentColor" class={p.class}>
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
    </svg>
  ),
  file: (p: P): JSX.Element => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.6"
      stroke-linecap="round"
      stroke-linejoin="round"
      class={p.class}
    >
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
    </svg>
  ),
  bolt: (p: P): JSX.Element => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.6"
      stroke-linecap="round"
      stroke-linejoin="round"
      class={p.class}
    >
      <path d="M13 2 4 14h7l-1 8 9-12h-7z" />
    </svg>
  ),
  send: (p: P): JSX.Element => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.7"
      stroke-linecap="round"
      stroke-linejoin="round"
      class={p.class}
    >
      <path d="M5 12h13M12 5l7 7-7 7" />
    </svg>
  ),
  square: (p: P): JSX.Element => (
    <svg viewBox="0 0 24 24" fill="currentColor" class={p.class}>
      <rect x="7" y="7" width="10" height="10" rx="2" />
    </svg>
  ),
  bell: (p: P): JSX.Element => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.6"
      stroke-linecap="round"
      stroke-linejoin="round"
      class={p.class}
    >
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 8h18s-3-1-3-8M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  ),
  settings: (p: P): JSX.Element => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.6"
      stroke-linecap="round"
      stroke-linejoin="round"
      class={p.class}
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8M4.6 9a1.6 1.6 0 0 0-.3-1.8M9 4.6A1.6 1.6 0 0 0 10.5 3M15 19.4a1.6 1.6 0 0 0-1.5 1.5M3 13.5A1.6 1.6 0 0 0 4.6 15M21 10.5A1.6 1.6 0 0 0 19.4 9M9 19.4A1.6 1.6 0 0 1 7.2 19.7M15 4.6a1.6 1.6 0 0 1 1.8-.3" />
    </svg>
  ),
  arrow: (p: P): JSX.Element => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.7"
      stroke-linecap="round"
      stroke-linejoin="round"
      class={p.class}
    >
      <path d="M5 12h13M12 5l7 7-7 7" />
    </svg>
  ),
  ext: (p: P): JSX.Element => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.6"
      stroke-linecap="round"
      stroke-linejoin="round"
      class={p.class}
    >
      <path d="M14 4h6v6M20 4l-9 9M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />
    </svg>
  ),
  spark: (p: P): JSX.Element => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      class={p.class}
    >
      <path d="M12 3v5M12 16v5M3 12h5M16 12h5M6.5 6.5l3 3M14.5 14.5l3 3M17.5 6.5l-3 3M9.5 14.5l-3 3" />
    </svg>
  ),
  folder: (p: P): JSX.Element => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.6"
      stroke-linecap="round"
      stroke-linejoin="round"
      class={p.class}
    >
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  ),
  x: (p: P): JSX.Element => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.7"
      stroke-linecap="round"
      stroke-linejoin="round"
      class={p.class}
    >
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  ),
  sliders: (p: P): JSX.Element => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.6"
      stroke-linecap="round"
      stroke-linejoin="round"
      class={p.class}
    >
      <path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h7M15 18h5" />
      <circle cx="16" cy="6" r="2" />
      <circle cx="8" cy="12" r="2" />
      <circle cx="13" cy="18" r="2" />
    </svg>
  ),
  key: (p: P): JSX.Element => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.6"
      stroke-linecap="round"
      stroke-linejoin="round"
      class={p.class}
    >
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M7 10h.01M11 10h.01M15 10h.01M7 14h10" />
    </svg>
  ),
  info: (p: P): JSX.Element => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.6"
      stroke-linecap="round"
      stroke-linejoin="round"
      class={p.class}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </svg>
  ),
  warn: (p: P): JSX.Element => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.6"
      stroke-linecap="round"
      stroke-linejoin="round"
      class={p.class}
    >
      <path d="M12 9v4M12 17h.01M10.3 3.9 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    </svg>
  ),
  shield: (p: P): JSX.Element => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.6"
      stroke-linecap="round"
      stroke-linejoin="round"
      class={p.class}
    >
      <path d="M12 3l7 2.5v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V5.5L12 3z" />
    </svg>
  ),
  clock: (p: P): JSX.Element => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.6"
      stroke-linecap="round"
      stroke-linejoin="round"
      class={p.class}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 3.5" />
    </svg>
  ),
  arrowUp: (p: P): JSX.Element => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.7"
      stroke-linecap="round"
      stroke-linejoin="round"
      class={p.class}
    >
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  ),
  bot: (p: P): JSX.Element => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.6"
      stroke-linecap="round"
      stroke-linejoin="round"
      class={p.class}
    >
      <rect x="3" y="9" width="18" height="12" rx="2" />
      <path d="M9 13h.01M15 13h.01M9 17h6M12 9V5M8 5h8" />
    </svg>
  ),
  globe: (p: P): JSX.Element => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.6"
      stroke-linecap="round"
      stroke-linejoin="round"
      class={p.class}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M2 12h20M12 2c-2.5 2.5-4 6-4 10s1.5 7.5 4 10M12 2c2.5 2.5 4 6 4 10s-1.5 7.5-4 10" />
    </svg>
  ),
  plug: (p: P): JSX.Element => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.6"
      stroke-linecap="round"
      stroke-linejoin="round"
      class={p.class}
    >
      <path d="M12 22v-3M7 19l5-5 5 5M7 3v4M17 3v4M5 7h14M8 7v4a4 4 0 0 0 8 0V7" />
    </svg>
  ),
  listCheck: (p: P): JSX.Element => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.6"
      stroke-linecap="round"
      stroke-linejoin="round"
      class={p.class}
    >
      <path d="M3 7h4M3 12h4M3 17h4" />
      <path d="m9 7 2.5 2.5L17 4" />
      <path d="m9 12 2.5 2.5L17 9" />
      <path d="m9 17 2.5 2.5L17 14" />
    </svg>
  ),
  mapPin: (p: P): JSX.Element => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.6"
      stroke-linecap="round"
      stroke-linejoin="round"
      class={p.class}
    >
      <path d="M12 2a7 7 0 0 1 7 7c0 5-7 13-7 13S5 14 5 9a7 7 0 0 1 7-7z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  ),
  workflow: (p: P): JSX.Element => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.6"
      stroke-linecap="round"
      stroke-linejoin="round"
      class={p.class}
    >
      <rect x="3" y="3" width="5" height="5" rx="1" />
      <rect x="16" y="3" width="5" height="5" rx="1" />
      <rect x="16" y="16" width="5" height="5" rx="1" />
      <path d="M5.5 8v3a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V8M18.5 13v3" />
    </svg>
  ),
  plan: (p: P): JSX.Element => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.6"
      stroke-linecap="round"
      stroke-linejoin="round"
      class={p.class}
    >
      <path d="M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8l-5-5H9z" />
      <path d="M9 3v5h6M7 13h10M7 17h6" />
    </svg>
  ),
};
