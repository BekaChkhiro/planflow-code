// In-app auto-update — checks the GitHub Releases manifest (latest.json),
// downloads + installs the new version, then relaunches. Safe no-ops in
// dev / when offline / when there's no release yet.

import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

/** Returns an available Update (newer than the running version) or null. */
export async function checkForUpdate(): Promise<Update | null> {
  try {
    return await check();
  } catch {
    return null;
  }
}

/** Download + install `update`, reporting 0–100% progress, then relaunch. */
export async function installUpdate(
  update: Update,
  onProgress?: (pct: number) => void,
): Promise<void> {
  let total = 0;
  let downloaded = 0;
  await update.downloadAndInstall((ev) => {
    switch (ev.event) {
      case "Started":
        total = ev.data.contentLength ?? 0;
        onProgress?.(0);
        break;
      case "Progress":
        downloaded += ev.data.chunkLength;
        if (total > 0) onProgress?.(Math.min(99, Math.round((100 * downloaded) / total)));
        break;
      case "Finished":
        onProgress?.(100);
        break;
    }
  });
  await relaunch();
}
