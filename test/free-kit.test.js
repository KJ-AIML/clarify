import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { parseDraft } from "../src/parser.js";
import { compile } from "../src/render.js";
import { SVG_DEFS } from "../src/diagram/svg.js";
import { FX_DEFS } from "../src/free/kit.js";

const read = (rel) => fs.readFileSync(new URL(rel, import.meta.url), "utf8");
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const KIT = stripComments(read("../src/runtime/fx.css"));
const THEMES = read("../src/runtime/themes.css");
const SPIKE_KIT = stripComments(read("../docs/superpowers/specs/content-driven-spike/fx-base.css"));
const GALLERY = new URL("./fixtures/free-kit.md", import.meta.url);
const examples = fs.readdirSync(new URL("../examples/", import.meta.url)).filter((f) => f.endsWith(".md"));

// The colour roles: hot moves, good answers, bad fails, slow waits, cool is other traffic.
const ROLES = ["hot", "good", "bad", "slow", "cool"];
// What two or more spike sections built by hand (docs/superpowers/specs/content-driven-spike/README.md).
const NEW_PIECES = [
  ".fx-chip.is-cool",
  ".fx-wide", ".fx-phone",
  ...ROLES.map((r) => `.fx-${r}-solid`), ...ROLES.map((r) => `.fx-bar.is-${r}`),
  ".fx-bar.is-varies",
  ".fx-dot", ".fx-dot.is-on",
  ".fx-legend", ...ROLES.map((r) => `.fx-swatch.is-${r}`), ".fx-swatch.is-varies",
  ".fx-hit", ".fx-hit:focus-visible",
  ".fx [hidden]"
];
/** A selector written in the kit: the text, not followed by more of a class name (`.fx-wide` is not `.fx-wider`). */
const inKit = (sel) => new RegExp(`${escape(sel)}(?![\\w-])`).test(KIT);

test("the kit defines every shared piece", () => {
  const missing = NEW_PIECES.filter((sel) => !inKit(sel));
  assert.deepEqual(missing, []);
  assert.ok(KIT.includes("@container (width < 560px)"), "the wide and phone drawings swap at 560px");
  const spikeClasses = [...new Set(SPIKE_KIT.match(/\.fx-[a-z0-9-]+/g))];
  assert.ok(spikeClasses.length > 20);
  assert.deepEqual(spikeClasses.filter((c) => !inKit(c)), [], "every class of the spike's fx-base.css stays");
});

test("every token the kit uses exists in themes.css", () => {
  const text = `${KIT}\n${FX_DEFS}`;
  const used = [...new Set([...text.matchAll(/var\(\s*--([\w-]+)/g)].map((m) => m[1]))];
  assert.ok(used.length > 15);
  // `--fx-…` are the kit's own knobs, not theme tokens: each is set in the kit or read with a fallback.
  const knobs = used.filter((n) => n.startsWith("fx-"));
  assert.deepEqual(knobs.filter((n) => !new RegExp(`--${n}\\s*:|var\\(\\s*--${n}\\s*,`).test(KIT)), []);
  const missing = used.filter((n) => !n.startsWith("fx-") && !new RegExp(`--${escape(n)}\\s*:`).test(THEMES));
  assert.deepEqual(missing, []);
});

test("the kit has no raw colours", () => {
  const RAW = /#[0-9a-fA-F]{3,8}\b|(?<![\w-])(?:rgba?|hsla?)\(/g;
  assert.deepEqual(KIT.match(RAW), null, "fx.css");
  assert.deepEqual(FX_DEFS.match(RAW), null, "FX_DEFS");
});

test("the hatch patterns ship only with free sections", () => {
  const { html } = compile(parseDraft(["## A One", "```free one", "<p>one</p>", "```"].join("\n")));
  assert.ok(html.includes(`${SVG_DEFS}\n${FX_DEFS}`), "FX_DEFS comes right after SVG_DEFS");
  assert.match(html, /<svg id="fx-defs" width="0" height="0" aria-hidden="true" style="position:absolute"><defs>/);
  for (const role of ROLES) assert.match(html, new RegExp(`<pattern id="fx-hatch-${role}"`), role);
  assert.ok(html.includes('id="fx-hatch-cool"'));
  // Examples that hold a free section (from Task 9 on) ship the kit too, so only the others are checked.
  const plain = examples.filter((f) => !/^\s*```free\b/m.test(read(`../examples/${f}`)));
  assert.ok(plain.length > 0);
  for (const f of plain) assert.doesNotMatch(compile(parseDraft(read(`../examples/${f}`))).html, /id="fx-defs"|id="fx-hatch-/, f);
});

test("the gallery uses the kit without warnings", () => {
  const { html, warnings } = compile(parseDraft(fs.readFileSync(GALLERY, "utf8")), { source: fileURLToPath(GALLERY) });
  assert.deepEqual(warnings, []);
  const uses = {
    "blue chip": /class="fx-chip is-cool"/,
    "wide drawing": /class="[^"]*\bfx-wide\b/,
    "phone drawing": /class="[^"]*\bfx-phone\b/,
    "solid fill": /class="[^"]*\bfx-(?:hot|good|bad|slow|cool)-solid\b/,
    "bar": /class="fx-bar is-(?:hot|good|bad|slow|cool)"/,
    "hatched bar": /class="fx-bar[^"]*\bis-varies\b/,
    "svg hatch": /fill="url\(#fx-hatch-(?:hot|good|bad|slow|cool)\)"/,
    "numbered dot": /<g class="fx-dot[^"]*"[^>]*><circle r="9"\/><text>1<\/text><\/g>/,
    "lit dot": /class="fx-dot is-on"/,
    "leader": /class="fx-leader"/,
    "legend": /class="fx-legend"/,
    "hatched swatch": /class="fx-swatch[^"]*\bis-varies\b/,
    "hit button": /<button[^>]*class="fx-hit"/,
    "hidden": /<[^>]*class="fx-[^"]*"[^>]* hidden[ >]/
  };
  assert.deepEqual(Object.keys(uses).filter((k) => !uses[k].test(html)), []);
});
