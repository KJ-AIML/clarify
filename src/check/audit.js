// clarify/src/check/audit.js
// The in-page checks of `clarify check`. auditScript() returns one expression for page.eval. It runs in the
// page and measures what the reader sees in every panel (.c-card): a part that sticks out, text that is too
// small, on top of other text, cut off or too faint, and content that fills under half of its panel. It grew
// from check() in docs/superpowers/specs/content-driven-spike/shot.mjs, which checked one free section.
//
// What the checks leave out, and why. Add to this list only what the examples show to come from clarify's own
// blocks, where the page's author cannot fix it (working as designed, or a known fault in page.css):
// - Hidden elements (display: none, visibility: hidden, opacity: 0, [hidden]): the reader does not see them.
// - .c-sr: text for screen readers, a 1px box clipped on purpose.
// - .c-diagram .c-viewport: the diagram canvas pans and zooms, so it clips by design, and its labels are
//   9.5 to 10px (svg.css). The layout tests check what is inside it.
// - .c-suggested: the "Suggested" tag on an option of an ask is 9.5px by design (page.css).
// - .c-route-play, for small text and for contrast: the ▶ on a route button is an 8.5px icon made of one glyph,
//   hidden from screen readers, not words to read (page.css). On a route's own colour it measures 4.44:1.
// - .c-table th code, for small text only: page.css sets inline code in a table header to 0.92em of the
//   header's 10.5px, which is 9.7px. To be lifted in page.css together with the hero fix below.
// - figure.c-diagram.is-hero, for overflow by at most 4px, on a page under 560px wide: a known bug in
//   page.css. The rule for every width (margin-inline: -18px, near line 188) comes after the phone rule
//   (-14px, near line 119) and overrides it, so the first diagram on a full-row panel sticks out 3px on each
//   side at phone width. Remove this skip when page.css is fixed. More than 4px, or a wider page, is reported.
// - :disabled, for contrast only: WCAG 2 does not ask for contrast on a control that is turned off.
// - text-overflow: ellipsis, for clipped only: the "…" tells the reader that the text goes on.
// - position: sticky: a part that sticks to the window while the reader scrolls covers the text under it on
//   purpose (the lesson's Back and Next bar on a phone). The page is checked from its top, where such a part
//   would sit stuck over its panel, so it goes back to its place in the flow, for the checks and the pictures.
// - position: fixed, outside the panels: a part fixed to the window (the reply dock) would sit over whatever
//   panel is under it in a picture, so it is hidden for the pictures. It is in no panel, so no check sees it.

/** Left out of every check, with everything inside. */
const SKIP_ALL = [".c-sr", ".c-diagram .c-viewport"];
/** Left out of the small-text check only. */
const SKIP_SMALL = [".c-suggested", ".c-route-play", ".c-table th code"];
/** Left out of the contrast check only (a control that is turned off is left out too, see below). */
const SKIP_CONTRAST = [".c-route-play"];
/** The hero diagram sticks out of its panel by 3px at phone width (page.css); this much is left out there. */
const HERO_OVERFLOW = { selector: "figure.c-diagram.is-hero", maxPx: 4, belowWidth: 560 };
/** The smallest text allowed on screen, in CSS px. */
const MIN_TEXT = 10.5;

/**
 * A computed CSS colour as `[r, g, b, a]` (0–255, alpha 0–1): `rgb()`, `rgba()`, `color(srgb r g b [/ a])`
 * or `transparent`. Anything else (`oklch()`, a gradient, `none`) is `null`, an unknown colour.
 * Self-contained: auditScript() inlines it in the page with `.toString()`.
 * @param {string} css
 * @returns {[number, number, number, number] | null}
 */
export function parseColor(css) {
  const text = String(css ?? "").trim().toLowerCase();
  if (text === "transparent") return [0, 0, 0, 0];
  const rgb = text.match(/^rgba?\(([^()]*)\)$/);
  const srgb = text.match(/^color\(srgb\s+([^()]*)\)$/);
  if (!rgb && !srgb) return null;
  const parts = (rgb || srgb)[1].split(/[\s,/]+/).filter(Boolean).map(Number);
  if (parts.length < 3 || parts.length > 4 || parts.some((n) => Number.isNaN(n))) return null;
  const [r, g, b] = srgb ? parts.slice(0, 3).map((n) => Math.round(n * 255)) : parts;
  return [r, g, b, parts.length === 4 ? parts[3] : 1];
}

/**
 * The WCAG 2 contrast ratio of two opaque colours, from 1 (the same) to 21 (black on white).
 * Self-contained: auditScript() inlines it in the page with `.toString()`.
 * @param {[number, number, number]} fg
 * @param {[number, number, number]} bg
 * @returns {number}
 */
export function contrastRatio(fg, bg) {
  const luminance = ([r, g, b]) => {
    const linear = (c) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
  };
  const a = luminance(fg);
  const b = luminance(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/**
 * The expression page.eval runs in the page. It returns every panel with its rect in page CSS pixels and
 * its problems, which free section sits in which panel, and how many px the page is wider than the window.
 * @param {{ halfEmpty: boolean }} opts `halfEmpty`: run the half-empty check (the wide views only)
 * @returns {string}
 */
export function auditScript({ halfEmpty }) {
  const opts = { halfEmpty, skipAll: SKIP_ALL.join(", "), skipSmall: SKIP_SMALL.join(", "), skipContrast: SKIP_CONTRAST.join(", "), heroOverflow: HERO_OVERFLOW, minText: MIN_TEXT };
  return `(${audit.toString()})(${JSON.stringify(opts)}, ${parseColor.toString()}, ${contrastRatio.toString()})`;
}

/**
 * Runs in the page (stringified by auditScript), so it may use only its arguments and the page's globals.
 * @returns {{ panels: Array<{ id: string, rect: { x: number, y: number, width: number, height: number }, problems: Array<{ kind: string, msg: string }> }>, sections: Record<string, string>, overflow: number }}
 */
function audit(opts, parseColor, contrastRatio) {
  const styles = new Map();
  const style = (el) => {
    if (!styles.has(el)) styles.set(el, getComputedStyle(el));
    return styles.get(el);
  };
  const clean = (s) => s.replace(/\s+/g, " ").trim();
  const short = (s) => { s = clean(s); return s.length > 48 ? s.slice(0, 47) + "…" : s; };
  const label = (el) => el.tagName.toLowerCase() + (el.getAttribute("class") ? "." + el.getAttribute("class").trim().split(/\s+/).join(".") : "");
  const isSvg = (el) => el instanceof SVGElement;
  // SVG paints text only inside a <text> (and its tspans): words written straight into an <svg> or a <g> are
  // never drawn, so they are not text the reader sees.
  const ownText = (el) => (isSvg(el) && !el.closest("text") ? "" : [...el.childNodes].filter((n) => n.nodeType === 3 && n.nodeValue.trim()).map((n) => n.nodeValue).join(" "));
  const hasBox = (r) => r.width > 0 || r.height > 0;

  // Sticky parts back in the flow, and fixed parts outside the panels hidden; both stay so for the pictures.
  for (const el of document.body.querySelectorAll("*")) {
    const position = style(el).position;
    if (position === "sticky") {
      el.style.setProperty("position", "relative", "important");
      el.style.setProperty("inset", "auto", "important");
    } else if (position === "fixed" && !el.closest(".c-card")) el.style.setProperty("visibility", "hidden", "important");
  }

  // Seen by the reader: no hidden attribute, display, opacity or visibility on it or above it.
  const drawn = new Map();
  const isDrawn = (el) => {
    if (!el || el === document.documentElement) return true;
    if (!drawn.has(el)) {
      const cs = style(el);
      drawn.set(el, !el.hasAttribute("hidden") && cs.display !== "none" && parseFloat(cs.opacity) !== 0 && isDrawn(el.parentElement));
    }
    return drawn.get(el);
  };
  const shown = (el) => isDrawn(el) && style(el).visibility === "visible";

  // Text size on screen: an SVG's own scale (or its foreignObject's) multiplies the CSS font size.
  const scaleOf = (node) => { const m = node.getScreenCTM && node.getScreenCTM(); return m ? Math.hypot(m.a, m.b) : 1; };
  const screenSize = (el) => {
    const size = parseFloat(style(el).fontSize);
    if (isSvg(el)) return size * scaleOf(el);
    const fo = el.closest("foreignObject");
    return fo ? size * scaleOf(fo) : size;
  };

  // ── backgrounds, for contrast ──
  // `layers`, nearest first, end with an opaque colour; see-through ones are blended over the next.
  const flatten = (layers) => {
    let rgb = layers[layers.length - 1].slice(0, 3);
    for (let i = layers.length - 2; i >= 0; i--) rgb = rgb.map((c, k) => layers[i][k] * layers[i][3] + c * (1 - layers[i][3]));
    return rgb;
  };
  // HTML text: the first ancestor with a background colour. A gradient or an image is unknown (null).
  const htmlBackground = (el, from) => {
    const layers = [];
    for (let e = from; e; e = e.parentElement) {
      if (isSvg(e)) return svgBackground(el, layers);
      const cs = style(e);
      if (cs.backgroundImage !== "none") return null;
      const c = parseColor(cs.backgroundColor);
      if (!c) return null;
      if (c[3] === 0) continue;
      layers.push(c);
      if (c[3] >= 1) return flatten(layers);
    }
    return null;
  };
  // SVG text (or HTML text in a foreignObject): the top solid-filled shape under its centre, else the
  // HTML background of the drawing. elementsFromPoint sees only the viewport, so scroll there and back.
  const svgBackground = (el, layers) => {
    let svg = el.closest("svg");
    while (svg.parentElement && svg.parentElement.closest("svg")) svg = svg.parentElement.closest("svg");
    const x0 = scrollX;
    const y0 = scrollY;
    let r = el.getBoundingClientRect();
    if (r.top + r.height / 2 < 0 || r.top + r.height / 2 >= innerHeight) {
      window.scrollTo({ left: x0, top: y0 + r.top + r.height / 2 - innerHeight / 2, behavior: "instant" });
      r = el.getBoundingClientRect();
    }
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const hits = x >= 0 && x < innerWidth && y >= 0 && y < innerHeight ? document.elementsFromPoint(x, y) : null;
    window.scrollTo({ left: x0, top: y0, behavior: "instant" });
    if (!hits) return null;
    // Only what is painted under the text counts: the hits after the text itself (or its tspan, or its parent).
    const at = hits.findIndex((h) => h !== svg && svg.contains(h) && (h === el || el.contains(h) || h.contains(el)));
    for (const hit of at >= 0 ? hits.slice(at + 1) : hits) {
      if (hit === svg || !svg.contains(hit) || hit.contains(el) || !(hit instanceof SVGGeometryElement)) continue;
      const cs = style(hit);
      if (cs.fill === "none") continue;
      const c = parseColor(cs.fill);
      if (!c) return null; // a gradient or a pattern
      const a = c[3] * parseFloat(cs.fillOpacity) * parseFloat(cs.opacity);
      if (a <= 0) continue;
      layers.push([c[0], c[1], c[2], Math.min(1, a)]);
      if (a >= 1) return flatten(layers);
    }
    const under = htmlBackground(svg, svg.parentElement);
    if (!under) return null;
    layers.push([under[0], under[1], under[2], 1]);
    return flatten(layers);
  };
  // Every shape can be hit while the audit runs, so a background with pointer-events: none still counts.
  const hitAll = document.createElement("style");
  hitAll.textContent = "svg, svg * { pointer-events: visiblePainted !important; }";
  document.head.append(hitAll);

  const area = (r) => r.width * r.height;
  const inter = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));

  const panels = [];
  for (const card of document.querySelectorAll(".c-card[data-panel]")) {
    const problems = [];
    const add = (kind, msg) => problems.push({ kind, msg });
    const els = [...card.querySelectorAll("*")].filter((el) => !el.closest(opts.skipAll));
    const cr = card.getBoundingClientRect();
    const texts = els.filter((el) => ownText(el) && hasBox(el.getBoundingClientRect()) && shown(el));

    // overflow: a box sticks out of the card, with nothing inside the card that scrolls or clips it.
    const clips = new Map();
    const clippedInside = (el) => {
      const parent = el.parentElement;
      if (!parent || parent === card) return false;
      if (!clips.has(parent)) {
        const cs = style(parent);
        clips.set(parent, cs.overflowX !== "visible" || cs.overflowY !== "visible" || clippedInside(parent));
      }
      return clips.get(parent);
    };
    const out = [];
    for (const el of els) {
      if (out.some((o) => o.contains(el))) continue;
      const r = el.getBoundingClientRect();
      if (!hasBox(r)) continue;
      const sides = [["right", r.right - cr.right], ["left", cr.left - r.left], ["bottom", r.bottom - cr.bottom], ["top", cr.top - r.top]];
      const [side, px] = sides.reduce((a, b) => (b[1] > a[1] ? b : a));
      if (px <= 1 || clippedInside(el) || !shown(el)) continue;
      out.push(el);
      const hero = opts.heroOverflow;
      if (px <= hero.maxPx && innerWidth < hero.belowWidth && el.matches(hero.selector)) continue; // known, see the list at the top
      add("overflow", label(el) + " sticks out " + Math.round(px) + "px on the " + side + " of the panel");
    }

    // small text: visible own text under the minimum, on screen.
    for (const el of texts) {
      if (el.closest(opts.skipSmall)) continue;
      const size = screenSize(el);
      if (size < opts.minText - 0.005) add("small text", "text is " + size.toFixed(1) + "px (under " + opts.minText + "px): \"" + short(ownText(el)) + "\" in " + label(el));
    }

    // overlap: two text boxes, neither inside the other, overlapping by more than 15% of the smaller.
    const boxes = [];
    for (const el of texts) {
      let rects = [];
      if (isSvg(el)) rects = [el.getBoundingClientRect()];
      else {
        const range = document.createRange();
        for (const n of el.childNodes) if (n.nodeType === 3 && n.nodeValue.trim()) { range.selectNodeContents(n); rects.push(...range.getClientRects()); }
      }
      rects = rects.filter((r) => r.width > 0.5 && r.height > 0.5);
      if (rects.length) boxes.push({ el, text: short(ownText(el)), rects });
    }
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const A = boxes[i];
        const B = boxes[j];
        if (A.el.contains(B.el) || B.el.contains(A.el)) continue;
        let worst = 0;
        for (const ra of A.rects) for (const rb of B.rects) worst = Math.max(worst, inter(ra, rb) / Math.min(area(ra), area(rb)));
        if (worst > 0.15) add("overlap", "text overlaps (" + Math.round(worst * 100) + "% of the smaller box): \"" + A.text + "\" and \"" + B.text + "\"");
      }
    }

    // clipped: an element that hides its overflow holds text, and that text is bigger than its box.
    for (const el of [card, ...els]) {
      if (isSvg(el)) continue;
      const cs = style(el);
      if (cs.textOverflow === "ellipsis") continue;
      const cutX = /hidden|clip/.test(cs.overflowX) && el.scrollWidth > el.clientWidth + 1;
      const cutY = /hidden|clip/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 1;
      if (!(cutX || cutY) || !shown(el)) continue;
      const text = clean(el.innerText || "");
      if (!text) continue;
      add("clipped", "text is cut off in " + label(el) + " (" + (cutX ? "scrollWidth " + el.scrollWidth + " > clientWidth " + el.clientWidth : "scrollHeight " + el.scrollHeight + " > clientHeight " + el.clientHeight) + "): \"" + short(text) + "\"");
    }

    // half-empty: the body's content fills under half of its inner height and leaves over 120px empty.
    const body = card.querySelector(":scope > .c-card-body");
    if (opts.halfEmpty && body) {
      const cs = style(body);
      const inner = body.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      let top = Infinity;
      let bottom = -Infinity;
      for (const child of body.children) {
        const r = child.getBoundingClientRect();
        if (!hasBox(r)) continue;
        top = Math.min(top, r.top);
        bottom = Math.max(bottom, r.bottom);
      }
      const content = bottom > top ? bottom - top : 0;
      if (inner > 0 && content / inner < 0.5 && inner - content > 120) {
        const grid = card.closest(".c-grid");
        const cols = Number(((grid && grid.getAttribute("style")) || "").match(/--cols:\s*(\d+)/)?.[1] || 1);
        const span = Number(card.dataset.span || 1);
        add("half-empty", "its content fills " + Math.round((content / inner) * 100) + "% of the panel's height; try span=" + Math.min(cols, span + 1));
      }
    }

    // low contrast: under 4.5:1, or 3:1 for large text (24px, or 18.66px at weight 700).
    for (const el of texts) {
      if (el.closest(":disabled, " + opts.skipContrast)) continue;
      const cs = style(el);
      const fg = parseColor(isSvg(el) ? cs.fill : cs.color);
      if (!fg) continue;
      const alpha = fg[3] * (isSvg(el) ? parseFloat(cs.fillOpacity) : 1);
      if (alpha <= 0) continue;
      const bg = isSvg(el) ? svgBackground(el, []) : htmlBackground(el, el);
      if (!bg) continue;
      const ink = fg.slice(0, 3).map((c, k) => c * alpha + bg[k] * (1 - alpha));
      const size = screenSize(el);
      const need = size >= 24 || (size >= 18.66 && Number(cs.fontWeight) >= 700) ? 3 : 4.5;
      const ratio = contrastRatio(ink, bg);
      if (ratio < need) add("low contrast", "text is " + ratio.toFixed(2) + ":1 on its background (needs " + need + ":1): \"" + short(ownText(el)) + "\" in " + label(el));
    }

    panels.push({ id: card.dataset.panel, rect: { x: cr.left + scrollX, y: cr.top + scrollY, width: cr.width, height: cr.height }, problems });
  }
  hitAll.remove();

  const sections = {};
  for (const el of document.querySelectorAll("[data-fx]")) {
    const card = el.closest(".c-card[data-panel]");
    if (card) sections[el.dataset.fx] = card.dataset.panel;
  }
  return { panels, sections, overflow: Math.max(0, document.documentElement.scrollWidth - innerWidth) };
}
