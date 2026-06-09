//! PTY Tauri commands: pty_spawn, pty_write, pty_resize, pty_kill,
//! pty_get_scrollback, pty_subscribe.
//!
//! Validates input from the frontend, forwards to `PtyManager`, and maps
//! crate errors onto Serialize-able enums so the webview can branch on
//! `kind` rather than parse free-form strings.

use std::collections::HashMap;
use std::path::PathBuf;

use serde::{Deserialize, Serialize};
use tauri::ipc::{Channel, InvokeResponseBody};
use tauri::State;
use thiserror::Error;
use uuid::Uuid;

use crate::pty::{
    spawn_reader, PtyError, PtyManager, Recovery, ScrollbackChunk, SpawnConfig, UserShape,
};

// ---------------------------------------------------------------------------
// pty_spawn
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SpawnArgs {
    pub command: String,
    #[serde(default)]
    pub args: Vec<String>,
    #[serde(default)]
    pub cwd: Option<String>,
    #[serde(default)]
    pub env: HashMap<String, String>,
    /// Commands written to the freshly-spawned shell's stdin (one per line,
    /// in order). Empty/whitespace-only entries are skipped.
    #[serde(default)]
    pub startup_commands: Vec<String>,
    pub cols: u16,
    pub rows: u16,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SpawnResponse {
    pub session_id: Uuid,
}

#[derive(Debug, Error, Serialize)]
#[serde(
    tag = "kind",
    rename_all = "camelCase",
    rename_all_fields = "camelCase"
)]
pub enum SpawnError {
    #[error("{message}")]
    InvalidArgs {
        message: String,
        #[serde(flatten)]
        ui: UserShape,
    },
    #[error("{message}")]
    CwdMissing {
        path: String,
        message: String,
        #[serde(flatten)]
        ui: UserShape,
    },
    #[error("{message}")]
    CommandNotFound {
        command: String,
        message: String,
        #[serde(flatten)]
        ui: UserShape,
    },
    #[error("{message}")]
    SpawnFailed {
        message: String,
        #[serde(flatten)]
        ui: UserShape,
    },
    #[error("{message}")]
    ReaderPanic {
        session_id: String,
        message: String,
        #[serde(flatten)]
        ui: UserShape,
    },
    #[error("{message}")]
    Internal {
        message: String,
        #[serde(flatten)]
        ui: UserShape,
    },
}

impl SpawnError {
    fn invalid_args(message: impl Into<String>) -> Self {
        let m = message.into();
        Self::InvalidArgs {
            message: format!("invalid arguments: {m}"),
            ui: UserShape::new(
                "Terminal request was rejected. Check the command and dimensions.",
                Recovery::Dismiss,
            ),
        }
    }

    fn cwd_missing(path: impl Into<String>) -> Self {
        let p = path.into();
        Self::CwdMissing {
            message: format!("cwd does not exist: {p}"),
            ui: UserShape::new(
                format!("Working directory '{p}' was not found. Edit the project to point to a valid path."),
                Recovery::EditProject,
            ),
            path: p,
        }
    }

    fn command_not_found(command: impl Into<String>) -> Self {
        let cmd = command.into();
        Self::CommandNotFound {
            message: format!("command not found on PATH: {cmd}"),
            ui: UserShape::new(
                format!("Couldn't find '{cmd}' on this system. Edit the project to use a command that exists."),
                Recovery::EditProject,
            ),
            command: cmd,
        }
    }

    fn spawn_failed(message: impl Into<String>) -> Self {
        Self::SpawnFailed {
            message: message.into(),
            ui: UserShape::new("Couldn't start the terminal. Try again.", Recovery::Retry),
        }
    }

    fn reader_panic(session_id: Uuid) -> Self {
        let id = session_id.to_string();
        Self::ReaderPanic {
            message: format!("pty reader pipeline panicked (session {id})"),
            ui: UserShape::new(
                "The terminal reader stopped unexpectedly. Open a new session to continue.",
                Recovery::Dismiss,
            ),
            session_id: id,
        }
    }

    fn internal(message: impl Into<String>) -> Self {
        Self::Internal {
            message: message.into(),
            ui: UserShape::new("An internal error occurred. Try again.", Recovery::Retry),
        }
    }
}

impl From<PtyError> for SpawnError {
    fn from(error: PtyError) -> Self {
        match error {
            PtyError::CwdMissing(path) => Self::cwd_missing(path.display().to_string()),
            PtyError::CommandNotFound(cmd) => Self::command_not_found(cmd),
            PtyError::OpenPty(msg) | PtyError::Spawn(msg) | PtyError::Writer(msg) => {
                Self::spawn_failed(msg)
            }
            PtyError::ReaderPanic(id) => Self::reader_panic(id),
            PtyError::WriteIo(_)
            | PtyError::WriteToClosed(_)
            | PtyError::ResizeIo(_)
            | PtyError::NotFound(_)
            | PtyError::LockPoisoned => Self::internal(error.to_string()),
        }
    }
}

#[tauri::command]
pub async fn pty_spawn(
    args: SpawnArgs,
    manager: State<'_, PtyManager>,
) -> Result<SpawnResponse, SpawnError> {
    let manager = manager.inner().clone();
    tokio::task::spawn_blocking(move || spawn_inner(manager, args))
        .await
        .map_err(|e| SpawnError::internal(format!("blocking task join failed: {e}")))?
}

fn spawn_inner(manager: PtyManager, args: SpawnArgs) -> Result<SpawnResponse, SpawnError> {
    validate(&args)?;

    let startup_commands = args.startup_commands;
    let command_for_log = args.command.clone();
    let config = SpawnConfig {
        command: args.command,
        args: args.args,
        cwd: args.cwd.map(PathBuf::from),
        env: merge_env_defaults(args.env),
        cols: args.cols,
        rows: args.rows,
    };

    let spawn_start = std::time::Instant::now();
    let id = manager.spawn(config)?;
    let spawn_elapsed = spawn_start.elapsed();
    let session = manager
        .get(id)
        .ok_or_else(|| SpawnError::internal("spawned session missing from registry"))?;
    spawn_reader(manager.clone(), &session);
    tracing::info!(
        target: "pty_spawn",
        command = %command_for_log,
        session_id = %id,
        spawn_ms = u64::try_from(spawn_elapsed.as_millis()).unwrap_or(u64::MAX),
        "pty_spawn complete"
    );

    for line in startup_commands {
        let trimmed = line.trim_end_matches(['\r', '\n']);
        if trimmed.trim().is_empty() {
            continue;
        }
        let mut payload = Vec::with_capacity(trimmed.len() + 1);
        payload.extend_from_slice(trimmed.as_bytes());
        payload.push(b'\n');
        if let Err(error) = manager.write(id, &payload) {
            tracing::warn!(
                session_id = %id,
                %error,
                "pty spawn: startup command write failed",
            );
            break;
        }
    }

    Ok(SpawnResponse { session_id: id })
}

fn validate(args: &SpawnArgs) -> Result<(), SpawnError> {
    if args.command.trim().is_empty() {
        return Err(SpawnError::invalid_args("command must not be empty"));
    }
    if args.cols == 0 || args.rows == 0 {
        return Err(SpawnError::invalid_args(
            "cols and rows must be greater than zero",
        ));
    }
    Ok(())
}

/// Layer caller-supplied env on top of PTY-friendly defaults.
fn merge_env_defaults(env: HashMap<String, String>) -> HashMap<String, String> {
    let mut merged = HashMap::with_capacity(env.len() + 2);
    merged.insert("TERM".to_string(), "xterm-256color".to_string());
    merged.insert("COLORTERM".to_string(), "truecolor".to_string());
    merged.extend(env);
    merged
}

// ---------------------------------------------------------------------------
// pty_write
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WriteArgs {
    pub session_id: Uuid,
    pub data: Vec<u8>,
}

#[derive(Debug, Error, Serialize)]
#[serde(
    tag = "kind",
    rename_all = "camelCase",
    rename_all_fields = "camelCase"
)]
pub enum WriteError {
    #[error("{message}")]
    NotFound {
        session_id: String,
        message: String,
        #[serde(flatten)]
        ui: UserShape,
    },
    #[error("{message}")]
    WriteToClosed {
        session_id: String,
        message: String,
        #[serde(flatten)]
        ui: UserShape,
    },
    #[error("{message}")]
    WriteFailed {
        message: String,
        #[serde(flatten)]
        ui: UserShape,
    },
    #[error("{message}")]
    Internal {
        message: String,
        #[serde(flatten)]
        ui: UserShape,
    },
}

impl WriteError {
    fn not_found(session_id: Uuid) -> Self {
        let id = session_id.to_string();
        Self::NotFound {
            message: format!("session not found: {id}"),
            ui: UserShape::new(
                "This terminal session is no longer available.",
                Recovery::Dismiss,
            ),
            session_id: id,
        }
    }

    fn write_to_closed(session_id: Uuid) -> Self {
        let id = session_id.to_string();
        Self::WriteToClosed {
            message: format!("write to closed pty (session {id})"),
            ui: UserShape::new(
                "The terminal has exited. Open a new session to continue.",
                Recovery::Dismiss,
            ),
            session_id: id,
        }
    }

    fn write_failed(message: impl Into<String>) -> Self {
        Self::WriteFailed {
            message: message.into(),
            ui: UserShape::new(
                "Couldn't send input to the terminal. Try again.",
                Recovery::Retry,
            ),
        }
    }

    fn internal(message: impl Into<String>) -> Self {
        Self::Internal {
            message: message.into(),
            ui: UserShape::new("An internal error occurred. Try again.", Recovery::Retry),
        }
    }
}

impl From<PtyError> for WriteError {
    fn from(error: PtyError) -> Self {
        match error {
            PtyError::NotFound(id) => Self::not_found(id),
            PtyError::WriteToClosed(id) => Self::write_to_closed(id),
            PtyError::WriteIo(msg) => Self::write_failed(msg),
            other => Self::internal(other.to_string()),
        }
    }
}

#[tauri::command]
pub async fn pty_write(args: WriteArgs, manager: State<'_, PtyManager>) -> Result<(), WriteError> {
    let manager = manager.inner().clone();
    tokio::task::spawn_blocking(move || write_inner(&manager, args))
        .await
        .map_err(|e| WriteError::internal(format!("blocking task join failed: {e}")))?
}

fn write_inner(manager: &PtyManager, args: WriteArgs) -> Result<(), WriteError> {
    manager.write(args.session_id, &args.data)?;
    Ok(())
}

// ---------------------------------------------------------------------------
// pty_resize
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResizeArgs {
    pub session_id: Uuid,
    pub cols: u16,
    pub rows: u16,
}

#[derive(Debug, Error, Serialize)]
#[serde(
    tag = "kind",
    rename_all = "camelCase",
    rename_all_fields = "camelCase"
)]
pub enum ResizeError {
    #[error("{message}")]
    InvalidArgs {
        message: String,
        #[serde(flatten)]
        ui: UserShape,
    },
    #[error("{message}")]
    NotFound {
        session_id: String,
        message: String,
        #[serde(flatten)]
        ui: UserShape,
    },
    #[error("{message}")]
    ResizeFailed {
        message: String,
        #[serde(flatten)]
        ui: UserShape,
    },
    #[error("{message}")]
    Internal {
        message: String,
        #[serde(flatten)]
        ui: UserShape,
    },
}

impl ResizeError {
    fn invalid_args(message: impl Into<String>) -> Self {
        Self::InvalidArgs {
            message: format!("invalid arguments: {}", message.into()),
            ui: UserShape::new(
                "Resize request was invalid. Check the dimensions.",
                Recovery::Dismiss,
            ),
        }
    }

    fn not_found(session_id: Uuid) -> Self {
        let id = session_id.to_string();
        Self::NotFound {
            message: format!("session not found: {id}"),
            ui: UserShape::new(
                "This terminal session is no longer available.",
                Recovery::Dismiss,
            ),
            session_id: id,
        }
    }

    fn resize_failed(message: impl Into<String>) -> Self {
        Self::ResizeFailed {
            message: message.into(),
            ui: UserShape::new("Couldn't resize the terminal. Try again.", Recovery::Retry),
        }
    }

    fn internal(message: impl Into<String>) -> Self {
        Self::Internal {
            message: message.into(),
            ui: UserShape::new("An internal error occurred. Try again.", Recovery::Retry),
        }
    }
}

impl From<PtyError> for ResizeError {
    fn from(error: PtyError) -> Self {
        match error {
            PtyError::NotFound(id) => Self::not_found(id),
            PtyError::ResizeIo(msg) => Self::resize_failed(msg),
            other => Self::internal(other.to_string()),
        }
    }
}

#[tauri::command]
pub async fn pty_resize(
    args: ResizeArgs,
    manager: State<'_, PtyManager>,
) -> Result<(), ResizeError> {
    let manager = manager.inner().clone();
    tokio::task::spawn_blocking(move || resize_inner(&manager, args))
        .await
        .map_err(|e| ResizeError::internal(format!("blocking task join failed: {e}")))?
}

fn resize_inner(manager: &PtyManager, args: ResizeArgs) -> Result<(), ResizeError> {
    if args.cols == 0 || args.rows == 0 {
        return Err(ResizeError::invalid_args(
            "cols and rows must be greater than zero",
        ));
    }
    manager.resize(args.session_id, args.cols, args.rows)?;
    Ok(())
}

// ---------------------------------------------------------------------------
// pty_kill
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KillArgs {
    pub session_id: Uuid,
}

#[derive(Debug, Error, Serialize)]
#[serde(
    tag = "kind",
    rename_all = "camelCase",
    rename_all_fields = "camelCase"
)]
pub enum KillError {
    #[error("{message}")]
    NotFound {
        session_id: String,
        message: String,
        #[serde(flatten)]
        ui: UserShape,
    },
    #[error("{message}")]
    Internal {
        message: String,
        #[serde(flatten)]
        ui: UserShape,
    },
}

impl KillError {
    fn not_found(session_id: Uuid) -> Self {
        let id = session_id.to_string();
        Self::NotFound {
            message: format!("session not found: {id}"),
            ui: UserShape::new("Terminal already closed.", Recovery::Dismiss),
            session_id: id,
        }
    }

    fn internal(message: impl Into<String>) -> Self {
        Self::Internal {
            message: message.into(),
            ui: UserShape::new("An internal error occurred. Try again.", Recovery::Retry),
        }
    }
}

impl From<PtyError> for KillError {
    fn from(error: PtyError) -> Self {
        match error {
            PtyError::NotFound(id) => Self::not_found(id),
            other => Self::internal(other.to_string()),
        }
    }
}

/// Graceful PTY shutdown. Off-loaded to `spawn_blocking` because the
/// manager's graceful path can sleep waiting on the child to honour SIGTERM.
#[tauri::command]
pub async fn pty_kill(args: KillArgs, manager: State<'_, PtyManager>) -> Result<(), KillError> {
    let manager = manager.inner().clone();
    tokio::task::spawn_blocking(move || kill_inner(&manager, args))
        .await
        .map_err(|e| KillError::internal(format!("blocking task join failed: {e}")))?
}

fn kill_inner(manager: &PtyManager, args: KillArgs) -> Result<(), KillError> {
    manager.kill(args.session_id)?;
    Ok(())
}

// ---------------------------------------------------------------------------
// pty_get_scrollback
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetScrollbackArgs {
    pub session_id: Uuid,
    pub offset_bytes: usize,
    pub limit_bytes: usize,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GetScrollbackResponse {
    pub data: Vec<u8>,
    pub total_bytes: usize,
    pub next_offset: usize,
}

impl From<ScrollbackChunk> for GetScrollbackResponse {
    fn from(chunk: ScrollbackChunk) -> Self {
        Self {
            data: chunk.data,
            total_bytes: chunk.total_bytes,
            next_offset: chunk.next_offset,
        }
    }
}

#[derive(Debug, Error, Serialize)]
#[serde(
    tag = "kind",
    rename_all = "camelCase",
    rename_all_fields = "camelCase"
)]
pub enum GetScrollbackError {
    #[error("{message}")]
    NotFound {
        session_id: String,
        message: String,
        #[serde(flatten)]
        ui: UserShape,
    },
    #[error("{message}")]
    Internal {
        message: String,
        #[serde(flatten)]
        ui: UserShape,
    },
}

impl GetScrollbackError {
    fn not_found(session_id: Uuid) -> Self {
        let id = session_id.to_string();
        Self::NotFound {
            message: format!("session not found: {id}"),
            ui: UserShape::new(
                "This terminal session is no longer available.",
                Recovery::Dismiss,
            ),
            session_id: id,
        }
    }

    fn internal(message: impl Into<String>) -> Self {
        Self::Internal {
            message: message.into(),
            ui: UserShape::new("An internal error occurred. Try again.", Recovery::Retry),
        }
    }
}

impl From<PtyError> for GetScrollbackError {
    fn from(error: PtyError) -> Self {
        match error {
            PtyError::NotFound(id) => Self::not_found(id),
            other => Self::internal(other.to_string()),
        }
    }
}

/// Read a window of stored output from a session's scrollback.
#[tauri::command]
pub async fn pty_get_scrollback(
    args: GetScrollbackArgs,
    manager: State<'_, PtyManager>,
) -> Result<GetScrollbackResponse, GetScrollbackError> {
    let manager = manager.inner().clone();
    tokio::task::spawn_blocking(move || get_scrollback_inner(&manager, args))
        .await
        .map_err(|e| GetScrollbackError::internal(format!("blocking task join failed: {e}")))?
}

fn get_scrollback_inner(
    manager: &PtyManager,
    args: GetScrollbackArgs,
) -> Result<GetScrollbackResponse, GetScrollbackError> {
    let chunk = manager.read_scrollback(args.session_id, args.offset_bytes, args.limit_bytes)?;
    Ok(chunk.into())
}

// ---------------------------------------------------------------------------
// pty_subscribe
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubscribeArgs {
    pub session_id: Uuid,
}

#[derive(Debug, Error, Serialize)]
#[serde(
    tag = "kind",
    rename_all = "camelCase",
    rename_all_fields = "camelCase"
)]
pub enum SubscribeError {
    #[error("{message}")]
    NotFound {
        session_id: String,
        message: String,
        #[serde(flatten)]
        ui: UserShape,
    },
    #[error("{message}")]
    ReaderPanic {
        session_id: String,
        message: String,
        #[serde(flatten)]
        ui: UserShape,
    },
    #[error("{message}")]
    Internal {
        message: String,
        #[serde(flatten)]
        ui: UserShape,
    },
}

impl SubscribeError {
    fn not_found(session_id: Uuid) -> Self {
        let id = session_id.to_string();
        Self::NotFound {
            message: format!("session not found: {id}"),
            ui: UserShape::new(
                "This terminal session is no longer available.",
                Recovery::Dismiss,
            ),
            session_id: id,
        }
    }

    fn reader_panic(session_id: Uuid) -> Self {
        let id = session_id.to_string();
        Self::ReaderPanic {
            message: format!("pty reader pipeline panicked (session {id})"),
            ui: UserShape::new(
                "The terminal reader stopped unexpectedly. Open a new session to continue.",
                Recovery::Dismiss,
            ),
            session_id: id,
        }
    }

    fn internal(message: impl Into<String>) -> Self {
        Self::Internal {
            message: message.into(),
            ui: UserShape::new("An internal error occurred. Try again.", Recovery::Retry),
        }
    }
}

impl From<PtyError> for SubscribeError {
    fn from(error: PtyError) -> Self {
        match error {
            PtyError::NotFound(id) => Self::not_found(id),
            PtyError::ReaderPanic(id) => Self::reader_panic(id),
            other => Self::internal(other.to_string()),
        }
    }
}

/// Stream PTY output to the frontend as raw bytes.
///
/// Backed by `tauri::ipc::Channel<InvokeResponseBody>` so each frame
/// rides the IPC bus as `Raw(Vec<u8>)` — the JS side observes an
/// `ArrayBuffer`.
#[tauri::command]
pub async fn pty_subscribe(
    args: SubscribeArgs,
    on_data: Channel<InvokeResponseBody>,
    manager: State<'_, PtyManager>,
) -> Result<(), SubscribeError> {
    subscribe_inner(manager.inner(), args.session_id, on_data)
}

fn subscribe_inner(
    manager: &PtyManager,
    session_id: Uuid,
    on_data: Channel<InvokeResponseBody>,
) -> Result<(), SubscribeError> {
    let session = manager
        .get(session_id)
        .ok_or_else(|| SubscribeError::not_found(session_id))?;
    if session.reader_panicked() {
        return Err(SubscribeError::reader_panic(session_id));
    }
    let mut rx = session.output_tx.subscribe();
    let backpressure = std::sync::Arc::clone(&session.backpressure);

    tokio::spawn(async move {
        use tokio::sync::broadcast::error::RecvError;
        loop {
            match rx.recv().await {
                Ok(frame) => {
                    if on_data
                        .send(InvokeResponseBody::Raw(frame.to_vec()))
                        .is_err()
                    {
                        backpressure.record_subscriber_disconnect_on_lag();
                        tracing::debug!(
                            session_id = %session_id,
                            "pty_subscribe: channel closed; ending forwarder",
                        );
                        return;
                    }
                }
                Err(RecvError::Closed) => {
                    tracing::debug!(
                        session_id = %session_id,
                        "pty_subscribe: broadcast closed (session ended); ending forwarder",
                    );
                    return;
                }
                Err(RecvError::Lagged(n)) => {
                    backpressure.record_lag(n);
                    tracing::warn!(
                        session_id = %session_id,
                        skipped = n,
                        "pty_subscribe: subscriber lagged; frames dropped",
                    );
                }
            }
        }
    });

    Ok(())
}

#[cfg(all(test, unix))]
mod tests {
    use super::*;

    fn args(command: &str) -> SpawnArgs {
        SpawnArgs {
            command: command.to_string(),
            args: vec![],
            cwd: None,
            env: HashMap::new(),
            startup_commands: Vec::new(),
            cols: 80,
            rows: 24,
        }
    }

    #[test]
    fn rejects_empty_command() {
        let m = PtyManager::new();
        let err = spawn_inner(m, args("   ")).expect_err("empty command should fail");
        assert!(matches!(err, SpawnError::InvalidArgs { .. }));
    }

    #[test]
    fn rejects_zero_dimensions() {
        let m = PtyManager::new();
        let mut a = args("/bin/sleep");
        a.cols = 0;
        let err = spawn_inner(m, a).expect_err("zero cols should fail");
        assert!(matches!(err, SpawnError::InvalidArgs { .. }));
    }

    #[test]
    fn rejects_missing_cwd() {
        let m = PtyManager::new();
        let mut a = args("/bin/sleep");
        a.args = vec!["60".into()];
        a.cwd = Some("/this/path/does/not/exist/ever-xyz".into());
        match spawn_inner(m, a) {
            Err(SpawnError::CwdMissing { .. }) => {}
            other => panic!("expected CwdMissing, got {other:?}"),
        }
    }

    #[test]
    fn rejects_unknown_binary_as_command_not_found() {
        let m = PtyManager::new();
        let a = args("/this/binary/definitely/does/not/exist-xyz");
        match spawn_inner(m, a) {
            Err(SpawnError::CommandNotFound { command, ui, .. }) => {
                assert_eq!(command, "/this/binary/definitely/does/not/exist-xyz");
                assert_eq!(ui.recovery, Recovery::EditProject);
            }
            other => panic!("expected CommandNotFound, got {other:?}"),
        }
    }

    #[test]
    fn merge_env_provides_defaults() {
        let merged = merge_env_defaults(HashMap::new());
        assert_eq!(
            merged.get("TERM").map(String::as_str),
            Some("xterm-256color")
        );
        assert_eq!(
            merged.get("COLORTERM").map(String::as_str),
            Some("truecolor")
        );
    }
}
