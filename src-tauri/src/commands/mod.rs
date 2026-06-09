//! Tauri command handlers. Lean fork — only the surface PlanFlow's UI
//! drives: agent (Claude stream-json), pty (terminal), git (review rail),
//! cli (detection), picker (folder dialog).

pub mod agent;
pub mod cli;
pub mod git;
pub mod picker;
pub mod pty;
