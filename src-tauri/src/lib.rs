use tauri::Manager;

// Tauri-free runtime modules live in `workstation-core`. Re-export under
// their old paths so command handlers use `crate::cli::…`, `crate::pty::…`.
pub use workstation_core::{cli, logging, pty, shell_path};

mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    logging::init();
    tracing::info!(version = env!("CARGO_PKG_VERSION"), "planflow starting");

    // macOS GUI launches inherit launchd's minimal PATH, so user-installed
    // CLIs (claude / codex via npm, brew, nvm) are invisible to detection
    // and PTY spawns. Hydrate from the interactive login shell before any
    // thread reads PATH. No-op on Windows.
    shell_path::hydrate_from_login_shell();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        // PTY registry — app-scoped so sessions survive webview reloads.
        .manage(pty::PtyManager::new())
        // Detected-CLI registry, populated once at boot below.
        .manage(cli::CliRegistry::new())
        .setup(|app| {
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                let result = tokio::task::spawn_blocking(move || {
                    let registry = handle.state::<cli::CliRegistry>();
                    registry.populate_default().to_vec()
                })
                .await;
                match result {
                    Ok(detected) => tracing::info!(
                        target: "cli",
                        count = detected.len(),
                        ids = ?detected.iter().map(|c| c.id.as_str()).collect::<Vec<_>>(),
                        "cli registry populated"
                    ),
                    Err(error) => tracing::error!(target: "cli", %error, "cli registry scan panicked"),
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::agent::agent_spawn,
            commands::agent::agent_write,
            commands::agent::agent_tool_result,
            commands::agent::agent_interrupt,
            commands::agent::agent_kill,
            commands::pty::pty_spawn,
            commands::pty::pty_write,
            commands::pty::pty_resize,
            commands::pty::pty_kill,
            commands::pty::pty_get_scrollback,
            commands::pty::pty_subscribe,
            commands::git::git_status,
            commands::git::git_diff_file,
            commands::git::git_stage_all,
            commands::git::git_commit,
            commands::cli::cli_list_available,
            commands::picker::pick_project_folder,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
