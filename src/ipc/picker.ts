// Typed wrapper around the `pick_project_folder` Tauri command.
//
// Resolves to the canonicalized absolute path the user selected, or `null`
// if they cancelled the dialog. The Rust side rejects non-folders and
// symlink loops with a typed error.

import { invoke } from "@tauri-apps/api/core";

export async function pickProjectFolder(): Promise<string | null> {
  return invoke<string | null>("pick_project_folder");
}
