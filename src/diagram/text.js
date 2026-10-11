// clarify/src/diagram/text.js
// Text measurement and escaping helpers shared by the diagram renderers.
// Widths are estimated per character class so layout stays deterministic in Node
// (no canvas, no font files) while tracking real system-UI fonts closely enough.

const NARROW = /[il|!.,:;'`ftjrI()[\]{} ]/;
const WIDE = /[mwMW@%&]/;
const CJK = /[ᄀ-ᇿ⺀-꓏가-힣豈-﫿︰-﹏＀-￯]/;

/** Estimated rendered width in px of `text` at `fontSize`, with optional bold factor. */
export function textWidth(text, fontSize = 13, bold = false) {
  let em = 0;
  for (const ch of String(text)) {
    if (CJK.test(ch)) em += 1;
    else if (NARROW.test(ch)) em += 0.3;
    else if (WIDE.test(ch)) em += 0.86;
    else if (ch >= "A" && ch <= "Z") em += 0.66;
    else if (ch >= "0" && ch <= "9") em += 0.57;
    else em += 0.54;
  }
  return em * fontSize * (bold ? 1.06 : 1);
}

/** Width of monospace text, with optional letter-spacing in px. */
export function monoWidth(text, fontSize = 11, tracking = 0) {
  let em = 0;
  let n = 0;
  for (const ch of String(text)) {
    em += CJK.test(ch) ? 1 : 0.6;
    n++;
  }
  return em * fontSize + n * tracking;
}

/** Measure function for `wrapText`/`truncate` that uses monospace metrics. */
export const mono = (tracking = 0) => (text, fontSize) => monoWidth(text, fontSize, tracking);

/**
 * Greedy word wrap into at most `maxLines` lines no wider than `maxWidth`.
 * The last line is truncated with an ellipsis when text remains.
 * `measure(text, fontSize, bold)` defaults to proportional UI-font metrics.
 */
export function wrapText(text, maxWidth, fontSize = 13, bold = false, maxLines = 2, measure = textWidth) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";
  for (let i = 0; i < words.length; i++) {
    const candidate = current ? `${current} ${words[i]}` : words[i];
    if (!current || measure(candidate, fontSize, bold) <= maxWidth) {
      current = candidate;
      continue;
    }
    lines.push(current);
    current = words[i];
    if (lines.length === maxLines - 1) {
      current = words.slice(i).join(" ");
      break;
    }
  }
  if (current) lines.push(current);
  const last = lines.length - 1;
  if (last >= 0 && measure(lines[last], fontSize, bold) > maxWidth) {
    lines[last] = truncate(lines[last], maxWidth, fontSize, bold, measure);
  }
  return lines.length ? lines : [""];
}

/** Truncate `text` with an ellipsis so it fits `maxWidth`. */
export function truncate(text, maxWidth, fontSize = 13, bold = false, measure = textWidth) {
  if (measure(text, fontSize, bold) <= maxWidth) return text;
  let out = String(text);
  while (out.length > 1 && measure(`${out}…`, fontSize, bold) > maxWidth) out = out.slice(0, -1);
  return `${out.trimEnd()}…`;
}

export function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Round to one decimal so generated SVG stays compact and diff-stable. */
export function r1(n) {
  return Math.round(n * 10) / 10;
}
