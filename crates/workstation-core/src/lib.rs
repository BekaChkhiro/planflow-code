//! PlanFlow core — Tauri-independent runtime modules.
//!
//! Lean fork of Work Station's `workstation-core`: only the modules the
//! PlanFlow desktop app actually links. Anything that needs `tauri`
//! (AppHandle / State / webview) lives in `src-tauri` instead.
//!
//!   * [`cli`] — PATH scan + version probe for known CLI agents (claude / codex).
//!   * [`logging`] — tracing subscriber routed to the platform log directory.
//!   * [`pty`] — PTY orchestration (spawn / read / scrollback / backpressure).
//!   * [`shell_path`] — login-shell PATH hydration for macOS GUI launches.

pub mod cli;
pub mod logging;
pub mod pty;
pub mod shell_path;
