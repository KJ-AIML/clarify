// clarify/src/parser.js
// Draft parser: frontmatter → meta, `Lead:` paragraph, and `## [A] Title {span=2}` panels.
// Every panel remembers the draft line its body starts on, so diagram nodes and review
// comments can point back to exact source lines.

/** @typedef {import("./types").Draft} Draft */
/** @typedef {import("./types").DraftMeta} DraftMeta */
/** @typedef {import("./types").Panel} Panel */

const THEMES = new Set(["auto", "light", "dark", "tokyo-night", "nord", "catppuccin", "paper", "blueprint"]);
const THEME_ALIASES = { modern: "auto", shadcn: "auto", system: "auto", tokyo: "tokyo-night", "tokyonight": "tokyo-night", mocha: "catppuccin", eink: "paper", "e-ink": "paper" };
const LAYOUTS = new Set(["hybrid", "sheet", "canvas"]);
const PANEL = /^##\s+(?:([A-Z])\s+)?(.+?)(?:\s+\{([^}]*)\})?\s*$/;

/**
 * @param {string} content
 * @returns {Draft}
 */
export function parseDraft(content) {
  const lines = String(content).replace(/\r\n?/g, "\n").split("\n");
  /** @type {DraftMeta} */
  const meta = { title: "Clarify Board", subtitle: "", theme: "auto", layout: "hybrid", cols: 3 };
  let i = 0;
  while (i < lines.length && !lines[i].trim()) i++;

  // Frontmatter: a `---` line, `key: value` pairs, a closing `---` line.
  if (lines[i]?.trim() === "---") {
    const close = lines.findIndex((l, j) => j > i && l.trim() === "---");
    if (close !== -1) {
      for (const raw of lines.slice(i + 1, close)) {
        const m = raw.match(/^\s*([\w-]+)\s*:\s*(.*)$/);
        if (!m) continue;
        const k = m[1].toLowerCase();
        const value = stripYamlValue(m[2]);
        if (k === "cols") meta.cols = clampInt(value, 1, 4, 3);
        else if (k === "theme") meta.theme = normalizeTheme(value);
        else if (k === "layout") meta.layout = LAYOUTS.has(value) ? /** @type {DraftMeta["layout"]} */ (value) : "hybrid";
        else meta[k] = value;
      }
      i = close + 1;
    }
  }

  // Body before the first panel: an optional `Lead:` paragraph, then free text.
  const firstPanel = lines.findIndex((l, j) => j >= i && PANEL.test(l));
  const preEnd = firstPanel === -1 ? lines.length : firstPanel;
  let lead = "";
  let pre = lines.slice(i, preEnd);
  let preStart = i;
  const leadAt = pre.findIndex(l => l.trim());
  if (leadAt !== -1 && /^Lead:/i.test(pre[leadAt].trim())) {
    let end = leadAt;
    while (end < pre.length && pre[end].trim()) end++;
    lead = pre.slice(leadAt, end).join(" ").trim().replace(/^Lead:\s*/i, "");
    preStart += end;
    pre = pre.slice(end);
  }

  /** @type {Panel[]} */
  const panels = [];
  const used = new Set();
  const nextLetter = () => {
    for (let c = 65; c < 91; c++) {
      const l = String.fromCharCode(c);
      if (!used.has(l)) return l;
    }
    return "Z";
  };

  // Content without any `##` section still renders, as one full-width panel.
  if (firstPanel === -1 || pre.some(l => l.trim())) {
    const body = pre.join("\n").trim();
    if (body) {
      const letter = nextLetter();
      used.add(letter);
      panels.push({ id: letter, title: "Overview", span: meta.cols, body, line: preStart + leadingBlankCount(pre) + 1 });
    }
  }

  if (firstPanel !== -1) {
    const starts = [];
    for (let j = firstPanel; j < lines.length; j++) if (PANEL.test(lines[j])) starts.push(j);
    starts.forEach((start, k) => {
      const m = lines[start].match(PANEL);
      const end = k + 1 < starts.length ? starts[k + 1] : lines.length;
      const bodyLines = lines.slice(start + 1, end);
      const letter = m[1] && !used.has(m[1]) ? m[1] : nextLetter();
      used.add(letter);
      panels.push({
        id: letter,
        title: m[2].trim(),
        span: parseSpan(m[3], meta.cols),
        body: bodyLines.join("\n").trim(),
        line: start + 2 + leadingBlankCount(bodyLines)
      });
    });
  }

  return { meta, lead, panels, raw: content };
}

function parseSpan(attrs, cols) {
  if (!attrs) return 1;
  const m = attrs.match(/span\s*=\s*(\w+)/);
  if (!m) return 1;
  if (m[1] === "full" || m[1] === "all") return cols;
  return clampInt(m[1], 1, cols, 1);
}

function stripYamlValue(raw) {
  let v = raw.trim();
  if (/^["']/.test(v)) {
    const q = v[0];
    const end = v.indexOf(q, 1);
    return end === -1 ? v.slice(1) : v.slice(1, end);
  }
  // A comment is " # text". "PR #11" or "issue #42" stays part of the value.
  const hash = v.search(/\s#(?=\s|$)/);
  if (hash !== -1) v = v.slice(0, hash);
  return v.trim();
}

function normalizeTheme(value) {
  const v = String(value).toLowerCase().trim();
  if (THEMES.has(v)) return /** @type {DraftMeta["theme"]} */ (v);
  return /** @type {DraftMeta["theme"]} */ (THEME_ALIASES[v] || "auto");
}

function clampInt(value, lo, hi, fallback) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback;
}

function leadingBlankCount(lines) {
  let n = 0;
  while (n < lines.length && !lines[n].trim()) n++;
  return n;
}
