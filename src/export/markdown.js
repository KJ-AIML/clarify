// clarify/src/export/markdown.js
// Draft → GitHub-flavored Markdown for PR descriptions, RFCs and issues. Diagrams become
// ```mermaid blocks (GitHub renders them), callouts become GitHub alerts, asks become
// task lists, and status badges become emoji.

import { tokenizeBlocks } from "../markdown.js";
import { diagramFromFence } from "../diagram/index.js";
import { graphToMermaid, sequenceToMermaid } from "../diagram/mermaid.js";

/** @typedef {import("../types").Draft} Draft */
/** @typedef {import("../types").Block} Block */

const ALERT = { ok: "TIP", warn: "WARNING", err: "CAUTION", info: "NOTE" };
const STATUS = [[/^ok\b\s*/, "✅ "], [/^warn\b\s*/, "⚠️ "], [/^no\b\s*/, "❌ "]];

/** @param {Draft} draft */
export function draftToMarkdown(draft) {
  const out = [`# ${draft.meta.title}`];
  if (draft.meta.subtitle) out.push("", `_${draft.meta.subtitle}_`);
  if (draft.lead) out.push("", `> ${draft.lead}`);
  for (const panel of draft.panels) {
    out.push("", `## ${panel.id} · ${panel.title}`, "");
    const blocks = tokenizeBlocks(panel.body, panel.line - 1);
    out.push(blocks.map(blockToMarkdown).filter(Boolean).join("\n\n"));
  }
  return `${out.join("\n").replace(/\n{3,}/g, "\n\n").trim()}\n`;
}

/** @param {Block} b */
export function blockToMarkdown(b) {
  switch (b.type) {
    case "paragraph": return b.text;
    case "heading": return `${"#".repeat(Math.max(3, b.level))} ${b.text}`;
    case "hr": return "---";
    case "quote": return b.text.split("\n").map(l => `> ${l}`).join("\n");
    case "list":
      return b.items.map((it, i) => {
        const indent = "  ".repeat(it.depth);
        const bullet = b.ordered ? `${i + 1}.` : "-";
        const box = it.checked === null ? "" : it.checked ? "[x] " : "[ ] ";
        return `${indent}${bullet} ${box}${it.text}`;
      }).join("\n");
    case "table": return tableToMarkdown(b.rows, b.align);
    case "fence": return fenceToMarkdown(b);
    default: return "";
  }
}

function tableToMarkdown(rows, align) {
  if (!rows.length) return "";
  const width = Math.max(...rows.map(r => r.length));
  const cell = (c) => String(c ?? "").replace(/\|/g, "\\|");
  const badge = (c) => STATUS.reduce((s, [re, emoji]) => s.replace(re, emoji), cell(c));
  const sep = Array.from({ length: width }, (_, i) => {
    const a = align[i];
    return a === "center" ? ":---:" : a === "right" ? "---:" : a === "left" ? ":---" : "---";
  });
  const line = (cells) => `| ${Array.from({ length: width }, (_, i) => cells[i] ?? "").join(" | ")} |`;
  return [line(rows[0].map(cell)), line(sep), ...rows.slice(1).map(r => line(r.map(badge)))].join("\n");
}

function fenceToMarkdown(b) {
  const diagram = diagramFromFence(b);
  if (diagram) {
    const text = diagram.kind === "sequence" ? sequenceToMermaid(diagram) : graphToMermaid(diagram);
    const out = ["```mermaid\n" + text.trim() + "\n```"];
    // Narrated routes keep their context in GitHub as numbered walkthroughs.
    for (const t of diagram.kind === "graph" ? diagram.traces : []) {
      if (!t.steps.some(st => st.text)) continue;
      const label = (id) => diagram.nodes.find(n => n.id === id)?.label ?? id;
      const steps = t.steps.map((st, i) => `${i + 1}. ${label(st.from)}${st.to ? ` → ${label(st.to)}` : ""}${st.text ? `: ${st.text}` : ""}`);
      out.push(`**Route: ${t.label}**\n\n${steps.join("\n")}`);
    }
    return out.join("\n\n");
  }
  if (b.lang === "callout") {
    const [type = "info", ...title] = b.info.split(/\s+/);
    const head = `> [!${ALERT[type] || "NOTE"}]`;
    const body = [title.join(" ") && `> **${title.join(" ")}**`, ...b.body.split("\n").filter(Boolean).map(l => `> ${l}`)];
    return [head, ...body.filter(Boolean)].join("\n");
  }
  if (b.lang === "ask") {
    const [question = "", ...options] = b.body.split("\n").map(l => l.trim()).filter(Boolean);
    const items = options.map(o => {
      const m = o.match(/^(\[[ xX]\]|[*+-])\s*(.*)$/);
      const picked = m ? (m[1] === "*" || /x/i.test(m[1])) : false;
      const [label, note] = (m ? m[2] : o).split("|").map(s => s.trim());
      return `- [${picked ? "x" : " "}] ${label}${note ? ` (${note})` : ""}`;
    });
    return [`**${question.replace(/^(\?|Q:)\s*/i, "")}**`, "", ...items].join("\n");
  }
  if (b.lang === "kv") {
    const rows = b.body.split("\n").map(l => l.match(/^\s*([^:]+?)\s*:\s*(.*)$/)).filter(Boolean).map(m => [m[1], m[2]]);
    return tableToMarkdown([["Key", "Value"], ...rows], []);
  }
  if (b.lang === "tree") return "```text\n" + b.body + "\n```";
  return "```" + b.lang + (b.info ? ` ${b.info}` : "") + "\n" + b.body + "\n```";
}
