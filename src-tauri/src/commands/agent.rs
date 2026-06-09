//! Agent (Claude Code `stream-json`) commands.
//!
//! Drives `claude` as a *piped* child process in bidirectional
//! `stream-json` mode:
//!
//! ```text
//! claude -p --input-format stream-json --output-format stream-json --verbose
//! ```
//!
//! stdout is newline-delimited JSON (one event per line); we forward each
//! line verbatim to the frontend over a `tauri::ipc::Channel<String>` and
//! let the Solid `AgentView` parse the event shapes (`system`/init,
//! `assistant` with nested `message.content`, `user`/`tool_result`,
//! `result`). User turns are written back as JSON lines on stdin.

use std::collections::HashMap;
use std::io::{BufRead, BufReader, Write};
use std::process::{Child, ChildStdin, Command, Stdio};
use std::sync::{Mutex, OnceLock};

use serde::{Deserialize, Serialize};
use serde_json::json;
use tauri::ipc::Channel;
use uuid::Uuid;

/// A live `claude` child plus the stdin handle used to push follow-up turns.
struct AgentSession {
    child: Child,
    stdin: ChildStdin,
}

/// Process-wide registry of running agent sessions, keyed by the session id
/// we hand back to the frontend.
fn registry() -> &'static Mutex<HashMap<Uuid, AgentSession>> {
    static REGISTRY: OnceLock<Mutex<HashMap<Uuid, AgentSession>>> = OnceLock::new();
    REGISTRY.get_or_init(|| Mutex::new(HashMap::new()))
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentSpawnArgs {
    /// Binary to launch. Defaults to `claude` (resolved on PATH) when absent.
    #[serde(default)]
    pub command: Option<String>,
    /// Working directory for the agent. Inherits the app's cwd when absent.
    #[serde(default)]
    pub cwd: Option<String>,
    /// `--permission-mode` value: `default` | `acceptEdits` |
    /// `bypassPermissions` | `plan` | `dontAsk`. Omitted → CLI default.
    #[serde(default)]
    pub permission_mode: Option<String>,
    /// Optional `--model` override (e.g. `sonnet`).
    #[serde(default)]
    pub model: Option<String>,
    /// First user turn, written to stdin immediately after spawn.
    #[serde(default)]
    pub initial_prompt: Option<String>,
    /// Claude session id to resume (`--resume <id>`) so the child reloads a
    /// prior conversation's full context.
    #[serde(default)]
    pub resume: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentSpawnResponse {
    pub session_id: Uuid,
}

/// Suppress the flashing console window when spawning a child on Windows.
#[cfg(windows)]
fn suppress_window(cmd: &mut Command) {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x0800_0000;
    cmd.creation_flags(CREATE_NO_WINDOW);
}
#[cfg(not(windows))]
fn suppress_window(_cmd: &mut Command) {}

/// A base64 image attached to a user turn.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageInput {
    /// MIME type, e.g. `image/png`, `image/jpeg`.
    pub media_type: String,
    /// Raw base64 (no `data:` prefix).
    pub data: String,
}

/// Build the NDJSON user-turn line the CLI expects on stdin. With no images
/// the content is a bare string (the common case); with images it becomes a
/// content-block array (`text` + one `image` block per attachment).
fn user_message_line(text: &str, images: &[ImageInput]) -> String {
    if images.is_empty() {
        return json!({
            "type": "user",
            "message": { "role": "user", "content": text },
        })
        .to_string();
    }
    let mut content: Vec<serde_json::Value> = Vec::new();
    if !text.is_empty() {
        content.push(json!({ "type": "text", "text": text }));
    }
    for img in images {
        content.push(json!({
            "type": "image",
            "source": { "type": "base64", "media_type": img.media_type, "data": img.data },
        }));
    }
    json!({
        "type": "user",
        "message": { "role": "user", "content": content },
    })
    .to_string()
}

/// Spawn a `claude` stream-json session and forward its event lines to
/// `on_event`. Each forwarded message is one raw JSON line from stdout; the
/// reader also emits two synthetic envelopes the CLI never sends:
/// `{"type":"_stderr","text":...}` for stderr lines and `{"type":"_closed"}`
/// once the process exits, so the UI can render launch failures and mark the
/// session idle.
#[tauri::command]
pub async fn agent_spawn(
    args: AgentSpawnArgs,
    on_event: Channel<String>,
) -> Result<AgentSpawnResponse, String> {
    tokio::task::spawn_blocking(move || spawn_inner(args, on_event))
        .await
        .map_err(|e| format!("agent spawn task join failed: {e}"))?
}

// Spawn wiring is inherently linear — flag assembly, three reader threads,
// the init handshake — and reads best top-to-bottom in one function.
#[allow(clippy::too_many_lines)]
fn spawn_inner(
    args: AgentSpawnArgs,
    on_event: Channel<String>,
) -> Result<AgentSpawnResponse, String> {
    let command = args.command.unwrap_or_else(|| "claude".to_string());
    let mut cmd = Command::new(&command);
    cmd.arg("-p")
        .arg("--input-format")
        .arg("stream-json")
        .arg("--output-format")
        .arg("stream-json")
        .arg("--verbose")
        // Emit per-token `stream_event` deltas so the UI can render the
        // assistant reply progressively instead of in one batch at the end.
        .arg("--include-partial-messages")
        // AskUserQuestion is a TTY-interactive tool the headless `claude -p`
        // CLI auto-resolves with empty answers (it can't be answered over
        // stdin — claude-code issue #50728). Disallow it and steer the model
        // to ask clarifying questions as plain text instead, which renders as
        // a normal chat message the user can reply to in the composer.
        .arg("--disallowedTools")
        .arg("AskUserQuestion")
        .arg("--append-system-prompt")
        .arg(
            "When you need a decision or clarification from the user, ask the \
             question directly in your reply as plain text and stop. Do NOT use \
             the AskUserQuestion tool — it is unavailable here. The user will \
             reply in the chat.",
        );
    if let Some(mode) = &args.permission_mode {
        cmd.arg("--permission-mode").arg(mode);
    }
    if let Some(model) = &args.model {
        cmd.arg("--model").arg(model);
    }
    if let Some(resume) = &args.resume {
        if !resume.is_empty() {
            cmd.arg("--resume").arg(resume);
        }
    }
    if let Some(cwd) = &args.cwd {
        cmd.current_dir(cwd);
    }
    cmd.stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    suppress_window(&mut cmd);

    let mut child = cmd
        .spawn()
        .map_err(|e| format!("failed to launch '{command}': {e}"))?;

    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| "child stdout was not captured".to_string())?;
    let stderr = child
        .stderr
        .take()
        .ok_or_else(|| "child stderr was not captured".to_string())?;
    let stdin = child
        .stdin
        .take()
        .ok_or_else(|| "child stdin was not captured".to_string())?;

    // stdout reader: forward each JSON line verbatim, then a `_closed`
    // sentinel on EOF.
    let out_channel = on_event.clone();
    std::thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines() {
            match line {
                Ok(text) if !text.is_empty() => {
                    if out_channel.send(text).is_err() {
                        break;
                    }
                }
                Ok(_) => {}
                Err(_) => break,
            }
        }
        let _ = out_channel.send(json!({ "type": "_closed" }).to_string());
    });

    // stderr reader: wrap lines so the UI can surface launch/runtime errors
    // (e.g. "command not found", auth prompts) without crashing the stream.
    let err_channel = on_event.clone();
    std::thread::spawn(move || {
        let reader = BufReader::new(stderr);
        for line in reader.lines().map_while(Result::ok) {
            if line.is_empty() {
                continue;
            }
            let envelope = json!({ "type": "_stderr", "text": line }).to_string();
            if err_channel.send(envelope).is_err() {
                break;
            }
        }
    });

    let session_id = Uuid::new_v4();
    let mut session = AgentSession { child, stdin };

    // Initialize handshake — prompts the CLI to emit a `control_response`
    // listing every available slash command (name + description) up front,
    // so the composer's "/" menu is fully populated before the first turn.
    let init_line = json!({
        "type": "control_request",
        "request_id": "ws-init",
        "request": { "subtype": "initialize" },
    })
    .to_string();
    if let Err(error) = (|| -> std::io::Result<()> {
        session.stdin.write_all(init_line.as_bytes())?;
        session.stdin.write_all(b"\n")?;
        session.stdin.flush()
    })() {
        tracing::warn!(%error, "agent initialize handshake write failed");
    }

    // Fire the first user turn before the session is published so the
    // reader is already draining stdout when the model starts streaming.
    if let Some(prompt) = args.initial_prompt.as_deref() {
        let trimmed = prompt.trim();
        if !trimmed.is_empty() {
            write_turn(&mut session.stdin, trimmed, &[])
                .map_err(|e| format!("failed to write initial prompt: {e}"))?;
        }
    }

    registry()
        .lock()
        .map_err(|_| "agent registry poisoned".to_string())?
        .insert(session_id, session);

    Ok(AgentSpawnResponse { session_id })
}

/// Write one user turn (NDJSON line + newline) to the child's stdin.
fn write_turn(stdin: &mut ChildStdin, text: &str, images: &[ImageInput]) -> std::io::Result<()> {
    let mut line = user_message_line(text, images);
    line.push('\n');
    stdin.write_all(line.as_bytes())?;
    stdin.flush()
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentWriteArgs {
    pub session_id: Uuid,
    pub text: String,
    /// Optional base64 images attached to this turn.
    #[serde(default)]
    pub images: Vec<ImageInput>,
}

/// Send a follow-up user turn to a running session.
#[tauri::command]
pub async fn agent_write(args: AgentWriteArgs) -> Result<(), String> {
    tokio::task::spawn_blocking(move || {
        let mut guard = registry()
            .lock()
            .map_err(|_| "agent registry poisoned".to_string())?;
        let session = guard
            .get_mut(&args.session_id)
            .ok_or_else(|| format!("agent session not found: {}", args.session_id))?;
        write_turn(&mut session.stdin, args.text.trim(), &args.images)
            .map_err(|e| format!("agent write failed: {e}"))
    })
    .await
    .map_err(|e| format!("agent write task join failed: {e}"))?
}

/// Build a `tool_result` user line — used to answer interactive tools like
/// `AskUserQuestion` (the `content` is the structured answer payload).
fn tool_result_line(tool_use_id: &str, content: &serde_json::Value) -> String {
    json!({
        "type": "user",
        "message": {
            "role": "user",
            "content": [
                { "type": "tool_result", "tool_use_id": tool_use_id, "content": content }
            ],
        },
    })
    .to_string()
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentToolResultArgs {
    pub session_id: Uuid,
    pub tool_use_id: String,
    /// Arbitrary JSON answer payload (for AskUserQuestion: `{questions, answers}`).
    pub content: serde_json::Value,
}

/// Answer an interactive tool (e.g. AskUserQuestion) by writing a `tool_result`
/// line back to the child's stdin, so the agent can continue.
#[tauri::command]
pub async fn agent_tool_result(args: AgentToolResultArgs) -> Result<(), String> {
    tokio::task::spawn_blocking(move || {
        let mut guard = registry()
            .lock()
            .map_err(|_| "agent registry poisoned".to_string())?;
        let session = guard
            .get_mut(&args.session_id)
            .ok_or_else(|| format!("agent session not found: {}", args.session_id))?;
        let mut line = tool_result_line(&args.tool_use_id, &args.content);
        line.push('\n');
        session
            .stdin
            .write_all(line.as_bytes())
            .and_then(|()| session.stdin.flush())
            .map_err(|e| format!("agent tool_result write failed: {e}"))
    })
    .await
    .map_err(|e| format!("agent tool_result task join failed: {e}"))?
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentInterruptArgs {
    pub session_id: Uuid,
}

/// Interrupt the current turn without ending the session — writes a
/// `control_request`/`interrupt` line to the child's stdin.
#[tauri::command]
pub async fn agent_interrupt(args: AgentInterruptArgs) -> Result<(), String> {
    tokio::task::spawn_blocking(move || {
        let mut guard = registry()
            .lock()
            .map_err(|_| "agent registry poisoned".to_string())?;
        let session = guard
            .get_mut(&args.session_id)
            .ok_or_else(|| format!("agent session not found: {}", args.session_id))?;
        let mut line = json!({
            "type": "control_request",
            "request_id": Uuid::new_v4().to_string(),
            "request": { "subtype": "interrupt" },
        })
        .to_string();
        line.push('\n');
        session
            .stdin
            .write_all(line.as_bytes())
            .map_err(|e| format!("agent interrupt write failed: {e}"))?;
        session
            .stdin
            .flush()
            .map_err(|e| format!("agent interrupt flush failed: {e}"))
    })
    .await
    .map_err(|e| format!("agent interrupt task join failed: {e}"))?
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentKillArgs {
    pub session_id: Uuid,
}

/// Terminate a running session and drop it from the registry. Idempotent —
/// killing an already-removed session is a no-op success.
#[tauri::command]
pub async fn agent_kill(args: AgentKillArgs) -> Result<(), String> {
    tokio::task::spawn_blocking(move || {
        let removed = {
            let mut guard = registry()
                .lock()
                .map_err(|_| "agent registry poisoned".to_string())?;
            guard.remove(&args.session_id)
        };
        if let Some(mut session) = removed {
            let _ = session.child.kill();
            let _ = session.child.wait();
        }
        Ok(())
    })
    .await
    .map_err(|e| format!("agent kill task join failed: {e}"))?
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn user_message_line_escapes_content() {
        let line = user_message_line("hello \"world\"\nsecond");
        let parsed: serde_json::Value = serde_json::from_str(&line).expect("valid json");
        assert_eq!(parsed["type"], "user");
        assert_eq!(parsed["message"]["role"], "user");
        assert_eq!(parsed["message"]["content"], "hello \"world\"\nsecond");
    }

    #[test]
    fn kill_unknown_session_is_ok() {
        let removed = registry().lock().expect("lock").remove(&Uuid::new_v4());
        assert!(removed.is_none());
    }
}
