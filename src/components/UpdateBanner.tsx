// Bottom-right banner shown when a newer version is available. "Update now"
// downloads with a progress bar and relaunches. Styled with PlanFlow tokens.

import { Show, createSignal, onMount, type JSX } from "solid-js";
import type { Update } from "@tauri-apps/plugin-updater";
import { checkForUpdate, installUpdate } from "../ipc/updater";

export function UpdateBanner(): JSX.Element {
  const [update, setUpdate] = createSignal<Update | null>(null);
  const [busy, setBusy] = createSignal(false);
  const [pct, setPct] = createSignal(0);
  const [dismissed, setDismissed] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  onMount(async () => {
    const u = await checkForUpdate();
    if (u) setUpdate(u);
  });

  const run = async (): Promise<void> => {
    const u = update();
    if (!u) return;
    setBusy(true);
    setError(null);
    try {
      await installUpdate(u, setPct);
      // relaunch() replaces the process; nothing runs after this on success.
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
      setBusy(false);
    }
  };

  return (
    <Show when={update() && !dismissed()}>
      <div class="fixed bottom-4 right-4 z-[100] w-[320px] overflow-hidden rounded-card border border-ink-700 bg-ink-900 shadow-float">
        <div class="flex items-center gap-2.5 px-4 py-3">
          <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-btn bg-brand-100/10 text-brand-200">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M8 10.5V2.5M5 5.5l3-3 3 3M3 12.5h10"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </span>
          <div class="min-w-0 flex-1">
            <div class="text-[12.5px] font-medium text-ink-100">
              {busy() ? "Updating…" : "Update available"}
            </div>
            <div class="truncate text-[11px] text-ink-500">
              {error()
                ? error()
                : busy()
                  ? `Downloading… ${pct()}%`
                  : `Version ${update()?.version} is ready to install`}
            </div>
          </div>
          <Show when={!busy()}>
            <button
              type="button"
              class="shrink-0 rounded-btn bg-brand-100 px-3 py-1.5 text-[12px] font-medium text-ink-950 transition-colors hover:bg-brand-200"
              onClick={() => void run()}
            >
              Update now
            </button>
            <button
              type="button"
              aria-label="Dismiss"
              class="shrink-0 rounded-field p-1 text-ink-500 hover:bg-ink-800 hover:text-ink-200"
              onClick={() => setDismissed(true)}
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="M4 4l8 8M12 4l-8 8"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
              </svg>
            </button>
          </Show>
        </div>
        <Show when={busy()}>
          <div class="h-1 w-full bg-ink-800">
            <div class="h-full bg-brand-200 transition-all" style={{ width: `${pct()}%` }} />
          </div>
        </Show>
      </div>
    </Show>
  );
}

export default UpdateBanner;
