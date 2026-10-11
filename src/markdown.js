// clarify/src/markdown.js
// Small, safe Markdown subset: a block tokenizer (fences, tables, headings, lists,
// quotes, rules, paragraphs) with draft line numbers, plus an inline formatter that
// escapes first and only then re-introduces a fixed set of tags.

/** @typedef {import("./types").Block} Block */
/** @typedef {import("./types").ListItem} ListItem */

const FENCE_OPEN = /^(\s*)(`{3,}|~{3,})\s*([\w.+-]*)\s*(.*)$/;
const HEADING = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
const HR = /^(?:-{3,}|\*{3,}|_{3,})$/;
const LIST_ITEM = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
const TABLE_SEP = /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?$/;

/**
 * Split Markdown into blocks. Unclosed fences run to the end of input so partially
 * streamed drafts still render.
 * @param {string} text
 * @param {number} [lineOffset] 1-based draft line of `text`'s first line, minus one
 * @returns {Block[]}
 */
export function tokenizeBlocks(text, lineOffset = 0) {
  const lines = String(text).replace(/\r\n?/g, "\n").split("\n");
  /** @type {Block[]} */
  const blocks = [];
  let i = 0;

  const startsBlock = (line, next) =>
    FENCE_OPEN.test(line) || HEADING.test(line.trim()) || HR.test(line.trim()) ||
    LIST_ITEM.test(line) || line.trim().startsWith(">") ||
    (line.trim().startsWith("|") && next !== undefined && TABLE_SEP.test(next.trim()));

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    const lineNo = lineOffset + i + 1;
    if (!trimmed) { i++; continue; }

    const fence = line.match(FENCE_OPEN);
    if (fence) {
      const marker = fence[2];
      const body = [];
      i++;
      while (i < lines.length) {
        const t = lines[i].trim();
        if (t.startsWith(marker[0].repeat(marker.length)) && /^[`~]+$/.test(t)) { i++; break; }
        body.push(lines[i]);
        i++;
      }
      blocks.push({ type: "fence", lang: fence[3].toLowerCase(), info: fence[4].trim(), body: dedent(body).join("\n"), line: lineNo });
      continue;
    }

    if (trimmed.startsWith("|") && i + 1 < lines.length && TABLE_SEP.test(lines[i + 1].trim())) {
      const header = splitRow(trimmed);
      const align = splitRow(lines[i + 1].trim()).map(c => {
        const left = c.startsWith(":");
        const right = c.endsWith(":");
        return left && right ? "center" : right ? "right" : left ? "left" : null;
      });
      const rows = [header];
      i += 2;
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        rows.push(splitRow(lines[i].trim()));
        i++;
      }
      blocks.push({ type: "table", rows, align, line: lineNo });
      continue;
    }

    const heading = trimmed.match(HEADING);
    if (heading) {
      blocks.push({ type: "heading", level: heading[1].length, text: heading[2], line: lineNo });
      i++;
      continue;
    }

    if (HR.test(trimmed)) {
      blocks.push({ type: "hr", line: lineNo });
      i++;
      continue;
    }

    if (trimmed.startsWith(">")) {
      const quote = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quote.push(lines[i].trim().replace(/^>\s?/, ""));
        i++;
      }
      blocks.push({ type: "quote", text: quote.join("\n"), line: lineNo });
      continue;
    }

    const first = line.match(LIST_ITEM);
    if (first) {
      const ordered = /\d/.test(first[2]);
      const baseIndent = first[1].length;
      /** @type {ListItem[]} */
      const items = [];
      while (i < lines.length) {
        const m = lines[i].match(LIST_ITEM);
        if (m) {
          let body = m[3];
          let checked = null;
          const task = body.match(/^\[([ xX])\]\s+(.*)$/);
          if (task) { checked = task[1] !== " "; body = task[2]; }
          items.push({ text: body, checked, depth: Math.max(0, Math.floor((m[1].length - baseIndent) / 2)) });
          i++;
        } else if (lines[i].trim() && /^\s{2,}/.test(lines[i]) && items.length) {
          items.at(-1).text += ` ${lines[i].trim()}`;
          i++;
        } else break;
      }
      blocks.push({ type: "list", ordered, items, line: lineNo });
      continue;
    }

    const para = [];
    while (i < lines.length && lines[i].trim() && !(para.length && startsBlock(lines[i], lines[i + 1]))) {
      para.push(lines[i].trim());
      i++;
    }
    blocks.push({ type: "paragraph", text: para.join("\n"), line: lineNo });
  }
  return blocks;
}

/** Split a table row on unescaped pipes, ignoring pipes inside `code`. */
export function splitRow(row) {
  const cells = [];
  let cur = "";
  let inCode = false;
  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (ch === "\\" && row[i + 1] === "|") { cur += "|"; i++; continue; }
    if (ch === "`") inCode = !inCode;
    if (ch === "|" && !inCode) { cells.push(cur); cur = ""; continue; }
    cur += ch;
  }
  cells.push(cur);
  if (row.startsWith("|")) cells.shift();
  if (row.endsWith("|") && !row.endsWith("\\|")) cells.pop();
  return cells.map(c => c.trim());
}

function dedent(lines) {
  const indents = lines.filter(l => l.trim()).map(l => l.match(/^\s*/)[0].length);
  const min = indents.length ? Math.min(...indents) : 0;
  return lines.map(l => l.slice(min));
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const SAFE_URL = /^(?:https?:|mailto:|#|\/|\.{1,2}\/|[\w-]+(?:\.[\w-]+)*\.[a-z]{2,}(?:[/?#]|$))/i;

/** Inline Markdown → HTML. Input is untrusted text; output is escaped. */
export function renderInline(text) {
  const codes = [];
  let s = String(text ?? "").replace(/`([^`]+)`/g, (_, code) => {
    codes.push(`<code>${escapeHtml(code)}</code>`);
    return `\u0000${codes.length - 1}\u0000`;
  });
  s = escapeHtml(s);
  s = s.replace(/\[([^\]]+)\]\(((?:[^()\s]|\([^()\s]*\))+)\)/g, (m, label, url) => {
    const raw = url.replace(/&amp;/g, "&");
    if (!SAFE_URL.test(raw)) return label;
    const external = /^https?:/i.test(raw);
    return `<a href="${url}"${external ? ' target="_blank" rel="noopener noreferrer"' : ""}>${label}</a>`;
  });
  s = s
    .replace(/\*\*(?=\S)([\s\S]*?\S)\*\*/g, "<strong>$1</strong>")
    .replace(/__(?=\S)([\s\S]*?\S)__/g, "<strong>$1</strong>")
    .replace(/(^|[^*\w])\*(?=\S)([^*]*?\S)\*(?!\*)/g, "$1<em>$2</em>")
    .replace(/(^|[^\w])_(?=\S)([^_]*?\S)_(?!\w)/g, "$1<em>$2</em>")
    .replace(/~~(?=\S)([\s\S]*?\S)~~/g, "<del>$1</del>")
    .replace(/\n/g, "<br>");
  return s.replace(/\u0000(\d+)\u0000/g, (_, n) => codes[Number(n)]);
}

/** Strip inline Markdown to plain text (for titles, aria labels, exports). */
export function plainInline(text) {
  return String(text ?? "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/(\*\*|__|~~)(.*?)\1/g, "$2")
    .replace(/(^|\W)[*_](\S.*?\S|\S)[*_](?=\W|$)/g, "$1$2");
}
