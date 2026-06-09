import { createEffect, createSignal, For, Show, type JSX } from "solid-js";
import { I } from "../../ui/icons";
import { ComposerDropdown } from "../../ui/Dropdown";
import type { AgentController, PendingImage, SlashCommand } from "../AgentView/agentSession";

// ── Composer constants ────────────────────────────────────────────────────

const PERMISSION_OPTIONS: { value: string; label: string }[] = [
  { value: "acceptEdits", label: "Accept edits" },
  { value: "default", label: "Ask each time" },
  { value: "plan", label: "Plan mode" },
  { value: "bypassPermissions", label: "Bypass all" },
];

const MODEL_OPTIONS: { value: string; label: string }[] = [
  { value: "default", label: "Opus (default)" },
  { value: "sonnet", label: "Sonnet" },
  { value: "haiku", label: "Haiku" },
];

// ── readImageFile ─────────────────────────────────────────────────────────

let imgCounter = 0;
/** Read an image File into a PendingImage (data-URL preview + raw base64). */
function readImageFile(file: File, onReady: (img: PendingImage) => void): void {
  if (!file.type.startsWith("image/")) return;
  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = typeof reader.result === "string" ? reader.result : "";
    const comma = dataUrl.indexOf(",");
    if (comma < 0) return;
    imgCounter += 1;
    onReady({
      id: `img${imgCounter}`,
      dataUrl,
      mediaType: file.type,
      base64: dataUrl.slice(comma + 1),
    });
  };
  reader.readAsDataURL(file);
}

// ── Composer ──────────────────────────────────────────────────────────────

export function Composer(props: {
  controller: AgentController | null;
  sessionId: string;
  composerRef?: (el: HTMLTextAreaElement) => void;
}): JSX.Element {
  const [dragOver, setDragOver] = createSignal(false);
  const [slashSel, setSlashSel] = createSignal(0);
  const [modelOpen, setModelOpen] = createSignal(false);
  const [permOpen, setPermOpen] = createSignal(false);

  let composerEl: HTMLTextAreaElement | undefined;
  let fileInputEl: HTMLInputElement | undefined;

  // Expose ref to parent for focus management (inline in JSX below)

  // Stage image files (from picker / paste / drop) onto the active controller.
  const attachFiles = (files: FileList | File[] | null | undefined): void => {
    const ctrl = props.controller;
    if (!ctrl || !files) return;
    for (const file of Array.from(files)) {
      if (file.type.startsWith("image/")) readImageFile(file, ctrl.addImage);
    }
  };

  // ── Slash autocomplete ─────────────────────────────────────────────
  const slashMatches = (): SlashCommand[] => {
    const ctrl = props.controller;
    if (!ctrl) return [];
    const d = ctrl.draft();
    if (!d.startsWith("/") || d.includes(" ") || d.includes("\n")) return [];
    const q = d.slice(1).toLowerCase();
    return ctrl.slashCommands().filter((c) => c.name.toLowerCase().startsWith(q));
  };
  const slashOpen = (): boolean => slashMatches().length > 0;

  createEffect(() => {
    if (slashSel() >= slashMatches().length) setSlashSel(0);
  });

  const pickSlash = (cmd: SlashCommand): void => {
    const ctrl = props.controller;
    if (!ctrl) return;
    ctrl.setDraft(`/${cmd.name} `);
    setSlashSel(0);
    composerEl?.focus();
  };

  // ── Model/permission label helpers ─────────────────────────────────
  const permissionLabel = (): string => {
    const ctrl = props.controller;
    if (!ctrl) return "Accept edits";
    return PERMISSION_OPTIONS.find((o) => o.value === ctrl.chosenPermission())?.label ?? ctrl.chosenPermission();
  };
  const modelLabel = (): string => {
    const ctrl = props.controller;
    if (!ctrl) return "Opus (default)";
    return MODEL_OPTIONS.find((o) => o.value === ctrl.chosenModel())?.label ?? ctrl.chosenModel();
  };

  return (
    <div class="border-t border-ink-800 p-3">
      <div class="relative">
        {/* Slash-command autocomplete — floats above the composer */}
        <Show when={slashOpen()}>
          <div class="absolute bottom-full left-0 z-20 mb-2 max-h-72 w-80 overflow-auto rounded-card border border-ink-700 bg-ink-900 py-1 shadow-pop">
            <For each={slashMatches()}>
              {(cmd, i) => (
                <button
                  type="button"
                  class={`flex w-full items-baseline gap-2 px-3 py-2 text-left transition-colors ${i() === slashSel() ? "bg-ink-800" : "hover:bg-ink-800/60"}`}
                  onMouseEnter={() => setSlashSel(i())}
                  onClick={() => pickSlash(cmd)}
                >
                  <span class="shrink-0 font-mono text-[12px] text-brand-300">
                    /{cmd.name}
                    <Show when={cmd.argumentHint}>
                      <span class="text-ink-500"> {cmd.argumentHint}</span>
                    </Show>
                  </span>
                  <Show when={cmd.description}>
                    <span class="truncate text-[11px] text-ink-500">{cmd.description}</span>
                  </Show>
                </button>
              )}
            </For>
          </div>
        </Show>

        <div
          class={`rounded-card border bg-ink-900 transition-colors ${
            dragOver()
              ? "border-brand-400 ring-2 ring-brand-400/30"
              : "border-ink-700 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-400/20"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            attachFiles(e.dataTransfer?.files);
          }}
        >
          {/* staged image thumbnails */}
          <Show when={(props.controller?.pendingImages().length ?? 0) > 0}>
            <div class="flex flex-wrap gap-2 px-3 pt-3">
              <For each={props.controller?.pendingImages() ?? []}>
                {(img) => (
                  <div class="group relative h-16 w-16 overflow-hidden rounded-field border border-ink-700">
                    <img src={img.dataUrl} alt="" class="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => props.controller?.removeImage(img.id)}
                      class="absolute right-0.5 top-0.5 grid h-4 w-4 place-items-center rounded-full bg-ink-950/80 text-ink-300 opacity-0 transition-opacity hover:text-ink-100 group-hover:opacity-100"
                      aria-label="Remove image"
                    >
                      <I.x class="h-3 w-3" />
                    </button>
                  </div>
                )}
              </For>
            </div>
          </Show>

          <textarea
            ref={(el) => { composerEl = el; props.composerRef?.(el); }}
            value={props.controller?.draft() ?? ""}
            onInput={(e) => props.controller?.setDraft(e.currentTarget.value)}
            rows={2}
            onKeyDown={(e) => {
              // slash autocomplete intercepts ↑ ↓ ↵ Tab while open
              if (slashOpen()) {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setSlashSel((i) => Math.min(i + 1, slashMatches().length - 1));
                  return;
                }
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setSlashSel((i) => Math.max(i - 1, 0));
                  return;
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  props.controller?.setDraft("");
                  return;
                }
                if (e.key === "Enter" || e.key === "Tab") {
                  e.preventDefault();
                  const cmd = slashMatches()[slashSel()];
                  if (cmd) pickSlash(cmd);
                  return;
                }
              }
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                // Don't queue a new turn while the agent is mid-response —
                // stop it first (the primary button shows Stop while busy).
                if (props.controller?.busy()) return;
                props.controller?.send();
              }
            }}
            onPaste={(e) => {
              const imgs = Array.from(e.clipboardData?.items ?? []).filter((it) =>
                it.type.startsWith("image/"),
              );
              if (imgs.length === 0) return;
              e.preventDefault();
              for (const it of imgs) {
                const f = it.getAsFile();
                if (f) attachFiles([f]);
              }
            }}
            placeholder={`Reply to ${props.sessionId}… (/ for commands, ⌘↵ to send)`}
            class="w-full resize-none bg-transparent px-3.5 py-3 text-sm text-ink-100 outline-none placeholder:text-ink-600"
          />
          <div class="flex flex-wrap items-center gap-1.5 px-3 pb-2.5">
            {/* Model selector */}
            <ComposerDropdown
              icon={<I.bolt class="h-3 w-3 text-brand-300" />}
              label={modelLabel()}
              open={modelOpen()}
              onToggle={() => { setModelOpen((v) => !v); setPermOpen(false); }}
              onClose={() => setModelOpen(false)}
            >
              <For each={MODEL_OPTIONS}>
                {(opt) => (
                  <button
                    type="button"
                    class="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-ink-200 hover:bg-ink-800"
                    onClick={() => {
                      props.controller?.setModel(opt.value);
                      setModelOpen(false);
                    }}
                  >
                    <Show
                      when={props.controller?.chosenModel() === opt.value}
                      fallback={<span class="h-3.5 w-3.5 shrink-0" />}
                    >
                      <I.check class="h-3.5 w-3.5 shrink-0 text-brand-300" />
                    </Show>
                    {opt.label}
                  </button>
                )}
              </For>
            </ComposerDropdown>

            {/* Permission mode selector */}
            <ComposerDropdown
              icon={<I.shield class="h-3 w-3 text-ink-400" />}
              label={permissionLabel()}
              open={permOpen()}
              onToggle={() => { setPermOpen((v) => !v); setModelOpen(false); }}
              onClose={() => setPermOpen(false)}
            >
              <For each={PERMISSION_OPTIONS}>
                {(opt) => (
                  <button
                    type="button"
                    class="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-ink-200 hover:bg-ink-800"
                    onClick={() => {
                      props.controller?.setPermissionMode(opt.value);
                      setPermOpen(false);
                    }}
                  >
                    <Show
                      when={props.controller?.chosenPermission() === opt.value}
                      fallback={<span class="h-3.5 w-3.5 shrink-0" />}
                    >
                      <I.check class="h-3.5 w-3.5 shrink-0 text-brand-300" />
                    </Show>
                    {opt.label}
                  </button>
                )}
              </For>
            </ComposerDropdown>

            {/* Attach image */}
            <button
              type="button"
              onClick={() => fileInputEl?.click()}
              class="grid h-7 w-7 place-items-center rounded-pill bg-ink-800 text-ink-400 transition-colors hover:bg-ink-700 hover:text-ink-200"
              title="Attach image"
              aria-label="Attach image"
            >
              <I.image class="h-3.5 w-3.5" />
            </button>
            <input
              ref={fileInputEl}
              type="file"
              accept="image/*"
              multiple
              class="hidden"
              onChange={(e) => {
                attachFiles(e.currentTarget.files);
                e.currentTarget.value = "";
              }}
            />

            <Show
              when={props.controller?.busy()}
              fallback={
                <button
                  type="button"
                  onClick={() => props.controller?.send()}
                  disabled={
                    !(props.controller?.draft() ?? "").trim() &&
                    (props.controller?.pendingImages().length ?? 0) === 0
                  }
                  class="ml-auto inline-flex items-center gap-1.5 rounded-btn bg-brand-100 px-3 py-1.5 text-xs font-medium text-ink-950 transition-colors hover:bg-brand-200 disabled:pointer-events-none disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/70"
                >
                  Send
                  <I.send class="h-3.5 w-3.5" />
                </button>
              }
            >
              <button
                type="button"
                onClick={() => props.controller?.interrupt()}
                class="ml-auto inline-flex items-center gap-1.5 rounded-btn bg-danger-500/12 px-3 py-1.5 text-xs font-medium text-danger-300 ring-1 ring-inset ring-danger-500/25 transition-colors hover:bg-danger-500/20 hover:text-danger-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-danger-400/70"
              >
                <I.square class="h-3 w-3" />
                Stop
              </button>
            </Show>
          </div>
        </div>
      </div>
    </div>
  );
}
