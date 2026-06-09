// Lightweight Markdown → safe HTML for the Agent view's assistant messages.
//
// Hand-sanitised: the whole input is HTML-escaped first, then only trusted
// tags are re-introduced against the escaped text, so no regex ever sees raw
// user/model content. Output is meant for `innerHTML`; styled by the scoped
// `.agent-md` rules in globals.css.
//
// Subset: ATX headings (#…###), fenced + inline code, bold, italic, links,
// unordered/ordered lists, blockquotes, GFM tables, thematic breaks, and
// blank-line paragraphs.

const ESC: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(input: string): string {
  return input.replace(/[&<>"']/g, (ch) => ESC[ch] ?? ch);
}

function renderInline(input: string): string {
  return input
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
    .replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_\n]+)__/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>");
}

// ── GFM tables ──────────────────────────────────────────────────────────
// A row is any line containing a pipe; the table starts when a header row is
// immediately followed by a delimiter row (cells of only -, :, spaces).

function splitRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|")) s = s.slice(0, -1);
  return s.split("|").map((c) => c.trim());
}

function isDelimiterRow(line: string): boolean {
  if (!line.includes("-")) return false;
  return splitRow(line).every((c) => /^:?-+:?$/.test(c.replace(/\s+/g, "")));
}

function alignOf(cell: string): string {
  const c = cell.replace(/\s+/g, "");
  const left = c.startsWith(":");
  const right = c.endsWith(":");
  if (left && right) return "center";
  if (right) return "right";
  if (left) return "left";
  return "";
}

function renderTable(header: string, delim: string, rows: string[]): string {
  const heads = splitRow(header);
  const aligns = splitRow(delim).map(alignOf);
  const styleFor = (i: number): string => {
    const a = aligns[i] ?? "";
    return a ? ` style="text-align:${a}"` : "";
  };
  const thead = `<thead><tr>${heads
    .map((h, i) => `<th${styleFor(i)}>${renderInline(h)}</th>`)
    .join("")}</tr></thead>`;
  const tbody = `<tbody>${rows
    .map((r) => {
      const cells = splitRow(r);
      const tds = heads
        .map((_, i) => `<td${styleFor(i)}>${renderInline(cells[i] ?? "")}</td>`)
        .join("");
      return `<tr>${tds}</tr>`;
    })
    .join("")}</tbody>`;
  return `<div class="agent-table"><table>${thead}${tbody}</table></div>`;
}

function renderTextBlock(text: string): string {
  const lines = text.split("\n");
  const out: string[] = [];
  let para: string[] = [];
  let list: { type: "ul" | "ol"; items: string[] } | null = null;
  let quote: string[] = [];

  const flushPara = (): void => {
    if (para.length > 0) {
      out.push(`<p>${para.map(renderInline).join("<br>")}</p>`);
      para = [];
    }
  };
  const flushList = (): void => {
    if (list) {
      const items = list.items.map((i) => `<li>${renderInline(i)}</li>`).join("");
      out.push(`<${list.type}>${items}</${list.type}>`);
      list = null;
    }
  };
  const flushQuote = (): void => {
    if (quote.length > 0) {
      out.push(`<blockquote>${quote.map(renderInline).join("<br>")}</blockquote>`);
      quote = [];
    }
  };
  const flushAll = (): void => {
    flushPara();
    flushList();
    flushQuote();
  };

  for (let idx = 0; idx < lines.length; idx += 1) {
    const raw = lines[idx] ?? "";
    const line = raw.replace(/\s+$/, "");
    if (line.length === 0) {
      flushAll();
      continue;
    }

    // GFM table: header row + delimiter row on the next line.
    const next = lines[idx + 1] ?? "";
    if (line.includes("|") && isDelimiterRow(next)) {
      flushAll();
      const rows: string[] = [];
      let j = idx + 2;
      while (j < lines.length && (lines[j] ?? "").includes("|") && (lines[j] ?? "").trim().length > 0) {
        rows.push(lines[j] ?? "");
        j += 1;
      }
      out.push(renderTable(line, next, rows));
      idx = j - 1;
      continue;
    }

    // thematic break
    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
      flushAll();
      out.push("<hr>");
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flushAll();
      const level = Math.min((heading[1] ?? "").length, 3);
      out.push(`<h${level}>${renderInline(heading[2] ?? "")}</h${level}>`);
      continue;
    }
    const ul = line.match(/^\s*[-*]\s+(.*)$/);
    if (ul) {
      flushPara();
      flushQuote();
      if (list?.type !== "ul") {
        flushList();
        list = { type: "ul", items: [] };
      }
      list.items.push(ul[1] ?? "");
      continue;
    }
    const ol = line.match(/^\s*\d+\.\s+(.*)$/);
    if (ol) {
      flushPara();
      flushQuote();
      if (list?.type !== "ol") {
        flushList();
        list = { type: "ol", items: [] };
      }
      list.items.push(ol[1] ?? "");
      continue;
    }
    const bq = line.match(/^>\s?(.*)$/);
    if (bq) {
      flushPara();
      flushList();
      quote.push(bq[1] ?? "");
      continue;
    }
    flushList();
    flushQuote();
    para.push(line);
  }
  flushAll();
  return out.join("");
}

/** Translate Markdown-flavoured assistant text into sanitised HTML for `innerHTML`. */
export function renderAgentMarkdown(input: string): string {
  const escaped = escapeHtml(input);
  const blocks: string[] = [];
  const fence = /```([^`]*?)```/g;
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = fence.exec(escaped)) !== null) {
    if (match.index > cursor) {
      blocks.push(renderTextBlock(escaped.slice(cursor, match.index)));
    }
    const raw = match[1] ?? "";
    const lang = raw.match(/^([a-zA-Z0-9.+-]+)\n/)?.[1] ?? "";
    const inner = raw.replace(/^[a-zA-Z0-9.+-]*\n/, "").replace(/\n$/, "");
    const label = lang ? `<span class="agent-code-lang">${lang}</span>` : "";
    blocks.push(`<pre>${label}<code>${inner}</code></pre>`);
    cursor = match.index + match[0].length;
  }
  if (cursor < escaped.length) {
    blocks.push(renderTextBlock(escaped.slice(cursor)));
  }
  return blocks.join("");
}
