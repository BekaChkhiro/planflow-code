// Typed wrapper around the `cli_list_available` Tauri command.
//
// Returns the boot-detected CLI registry with best-effort `--version`
// metadata. Entries with a missing version surface `version: null`; the
// UI renders those as blank labels.

import { invoke } from "@tauri-apps/api/core";

export interface CliInfo {
  name: string;
  path: string;
  version: string | null;
}

export async function cliListAvailable(): Promise<CliInfo[]> {
  return invoke<CliInfo[]>("cli_list_available");
}
