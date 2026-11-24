import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { parseDraft } from "../src/parser.js";
import { compile, packRows, FONT_BYTES } from "../src/render.js";
import { draftToMarkdown } from "../src/export/markdown.js";
import { parseMermaidFlowchart, parseSequence } from "../src/diagram/mermaid.js";

const examples = fs.readdirSync(new URL("../examples/", import.meta.url)).filter(f => f.endsWith(".md"));
const read = (f) => fs.readFileSync(new URL(`../examples/${f}`, import.meta.url), "utf8");

test("every example compiles without warnings and within the size budget", () => {
  for (const f of examples) {
    const { html, warnings, stats } = compile(parseDraft(read(f)));
    assert.deepEqual(warnings, [], f);
    // 450 KB with a lesson; 164 KB without (160 KB before the course look, whose own CSS adds about
    // 3 KB); 40 KB for each free section (the most one may weigh); plus the embedded font, exactly.
    const lesson = /class="c-lesson"/.test(html);
    const sections = (html.match(/<div class="fx fx-/g) || []).length;
    const budget = (lesson ? 450 : 164) * 1024 + 40 * 1024 * sections + FONT_BYTES;
    assert.ok(stats.bytes < budget, `${f}: ${stats.bytes} bytes`);
    assert.match(html, /^<!DOCTYPE html>/);
    // Scripts and the font's base64 (which can spell "NaN" by chance) are not template text.
    const text = html.replace(/<script(?:\s+id="c-(?:isokit|lesson)-js")?>[\s\S]*?<\/script>/g, "").replace(/<style id="c-font">[\s\S]*?<\/style>/, "");
    assert.ok(!/\{\{|undefined|NaN/.test(text), `${f}: template leak`);
  }
});

test("the wireless example is seven free sections and no lesson", () => {
  const { html, warnings } = compile(parseDraft(read("wireless-mouse.md")));
  assert.equal((html.match(/<div class="fx fx-/g) || []).length, 7);
  assert.ok(!html.includes('class="c-lesson"'));
  assert.deepEqual(warnings, []);
  assert.ok(html.includes('id="c-fx-css"'));
  assert.ok(html.includes("Content-Security-Policy"));
});

test("the embedded font is one small Latin face that every page carries", () => {
  // The budgets above add FONT_BYTES whatever it is, so its own size is pinned here (the variable
  // Latin subset is about 54 KB as base64; a full or second face would not fit).
  assert.ok(FONT_BYTES < 60 * 1024, `FONT_BYTES is ${FONT_BYTES}`);
  const { html } = compile(parseDraft(read(examples[0])));
  const faces = html.match(/@font-face\{[^}]*\}/g) || [];
  assert.equal(faces.length, 1);
  assert.match(faces[0], /font-family:"JetBrains Mono";font-style:normal;font-weight:100 800;/);
  assert.match(faces[0], /src:url\(data:font\/woff2;base64,d09GMg/); // "wOF2", the woff2 signature
});

test("brand icons render via a deduplicated sprite", () => {
  const { html } = compile(parseDraft("```arch\n[A:node] -> [B:node]\n[B] -> [C:redis]\n```"));
  assert.equal((html.match(/<symbol id="b-node-js"/g) || []).length, 1);
  assert.equal((html.match(/<use href="#b-node-js"/g) || []).length, 2);
  assert.match(html, /<symbol id="b-redis"/);
});

test("user text is escaped everywhere (titles, nodes, edges, tables, asks)", () => {
  const evil = "<img src=x onerror=alert(1)>";
  const { html } = compile(parseDraft(`---
title: ${evil}
---
Lead: ${evil}

## A ${evil}
\`\`\`arch
[${evil}] -> [B]: ${evil}
\`\`\`

| h |
| --- |
| ${evil} |

\`\`\`ask
${evil}?
* ${evil} | ${evil}
\`\`\``));
  assert.ok(!html.includes("<img src=x"), "raw tag must not appear");
  assert.ok(html.includes("&lt;img src=x onerror=alert(1)&gt;"));
});

test("embedded JSON cannot terminate its script element", () => {
  const { html } = compile(parseDraft("```arch\n[</script><b>x] -> [B]\n```"));
  const scripts = html.match(/<script type="application\/json"[^>]*>[\s\S]*?<\/script>/g);
  for (const s of scripts) assert.ok(!s.slice(0, -9).includes("</script"), s.slice(0, 80));
});

test("mermaid inside arch fences and raw mermaid fences are both accepted", () => {
  const a = compile(parseDraft("```arch\nflowchart LR\n  A[One] --> B[Two]\n```")).html;
  const b = compile(parseDraft("```mermaid\nsequenceDiagram\n  A->>B: hi\n```")).html;
  assert.match(a, /data-kind="graph"/);
  assert.match(b, /data-kind="sequence"/);
});

test("asks: multiple questions, radios vs checkboxes, suggested marks", () => {
  const { html } = compile(parseDraft("```ask\nPick a DB?\n* Postgres | default\n- MySQL\nWhich regions?\n[x] us-east\n[ ] eu-west\n```"));
  assert.equal((html.match(/<fieldset class="c-ask"/g) || []).length, 2);
  assert.match(html, /type="radio" name="ask-A-0" value="Postgres" checked data-suggested/);
  assert.match(html, /type="checkbox" name="ask-A-1" value="us-east" checked data-suggested/);
  assert.match(html, /type="checkbox" name="ask-A-1" value="eu-west">/);
});

test("wide diagrams claim the full row and rows are packed flush", () => {
  const cards = [{ span: 3 }, { span: 1, roomy: true }, { span: 1 }];
  packRows(cards, 3);
  assert.deepEqual(cards.map(c => c.span), [3, 2, 1]);
});

test("markdown export: mermaid diagrams, alerts, emoji badges, task lists", () => {
  const md = draftToMarkdown(parseDraft(read("ecommerce-architecture.md")));
  assert.match(md, /^# E-Commerce Checkout Architecture/);
  assert.match(md, /\*\*Route: Checkout\*\*\n\n1\. Web Client → Edge CDN: The browser posts the cart over HTTPS\./);
  assert.match(md, /```mermaid\nflowchart LR/);
  assert.match(md, /subgraph sg\d+\["VPC · us-east-1"\]/);
  assert.match(md, /> \[!WARNING\]\n> \*\*Kafka is the scaling risk\*\*/);
  assert.match(md, /\| ✅ Active \|/);
  assert.match(md, /- \[x\] Multi-region read replicas/);
  // The exported mermaid parses back into the same shape.
  const block = md.match(/```mermaid\n([\s\S]*?)```/)[1];
  const g = parseMermaidFlowchart(block);
  assert.equal(g.nodes.length, 10);
  assert.equal(g.groups.length, 2);
});

test("sequence example exports a valid mermaid sequence", () => {
  const md = draftToMarkdown(parseDraft(read("checkout-sequence.md")));
  const block = md.match(/```mermaid\n([\s\S]*?)```/)[1];
  const seq = parseSequence(block);
  assert.equal(seq.participants.length, 5);
  assert.deepEqual(seq.warnings, []);
  assert.ok(seq.items.some(i => i.type === "frameStart" && i.kind === "alt"));
});

test("hero index, map key legend and routes reflect what the page actually contains", () => {
  const { html } = compile(parseDraft(read("ecommerce-architecture.md")));
  assert.match(html, /<nav class="c-index" aria-label="On this page">/);
  assert.match(html, /href="#panel-D"><span class="c-key">D<\/span>/);
  assert.match(html, /1 question needs your answer/);
  assert.match(html, /class="c-diagram is-hero"/);
  assert.match(html, /class="c-route-btn tc-0" data-trace="0">.*Checkout<span class="c-route-stops">8 stops<\/span>/);
  const legend = html.match(/<ul class="c-legend"[^>]*>([\s\S]*?)<\/ul>/)[1];
  for (const word of ["call", "async", "boundary", "ok", "warn", "has details"]) assert.ok(legend.includes(`<span>${word}</span>`), word);
  assert.ok(!legend.includes("<span>main flow</span>"), "no thick edges, so no thick-line legend entry");
  const model = JSON.parse(html.match(/<script type="application\/json" class="c-model">([\s\S]*?)<\/script>/)[1]);
  const steps = model.traces[0].steps;
  assert.equal(steps.length, 8);
  const back = steps.find(s => model.nodes[s.from].label === "Auth Worker");
  assert.equal(back.reverse, true, "Auth Worker → API Gateway plays along the existing edge, backwards");
});

test("short drafts skip the index; small pages stay simple", () => {
  const { html } = compile(parseDraft("## A One\nx\n## B Two\ny"));
  assert.ok(!html.includes('class="c-index"'));
});
