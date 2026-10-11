#!/usr/bin/env node
// clarify/bin/clarify.mjs
// CLI for the Clarify agent skill: render · serve · md · view.

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFile } from "node:child_process";
import { parseDraft } from "../src/parser.js";
import { compile, slugify } from "../src/render.js";
import { draftToMarkdown } from "../src/export/markdown.js";

const VERSION = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8")).version;

const HELP = `Clarify v${VERSION}: interactive architecture & decision boards for AI coding agents

Usage:
  clarify render [draft.md | -] [--out page.html] [--no-open] [--quiet]
  clarify serve  <draft.md> [--port 4777] [--no-open]      live preview, reloads on save
  clarify md     [draft.md | -] [--out file.md]            GitHub Markdown (diagrams → mermaid)
  clarify view   <page.html>
  clarify --version

Pages are written to ~/.clarify/pages/ unless --out is given.
Diagram warnings (with draft line numbers) are printed to stderr.`;

const VALUE_FLAGS = new Set(["--out", "--port", "--host"]);

function parseArgs(argv) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const [k, inline] = a.split("=", 2);
      if (VALUE_FLAGS.has(k)) flags[k.slice(2)] = inline ?? argv[++i];
      else flags[k.slice(2)] = true;
    } else positional.push(a);
  }
  return { flags, positional };
}

function openTarget(target) {
  const [cmd, args] = process.platform === "darwin" ? ["open", [target]]
    : process.platform === "win32" ? ["cmd", ["/c", "start", "", target]]
    : ["xdg-open", [target]];
  execFile(cmd, args, () => {});
}

async function readInput(fileArg) {
  if (!fileArg || fileArg === "-") {
    if (process.stdin.isTTY) throw new Error("No input. Pass a draft file or pipe Markdown on stdin.");
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    return { text: Buffer.concat(chunks).toString("utf8"), source: "" };
  }
  const resolved = path.resolve(fileArg);
  if (!fs.existsSync(resolved)) throw new Error(`Input file not found: ${resolved}`);
  return { text: fs.readFileSync(resolved, "utf8"), source: resolved };
}

function defaultOutPath(title, ext) {
  const dir = path.join(os.homedir(), ".clarify", "pages");
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
  return path.join(dir, `${slugify(title)}-${stamp}.${ext}`);
}

async function cmdRender({ flags, positional }) {
  const { text, source } = await readInput(positional[0]);
  if (!text.trim()) throw new Error("Empty input.");
  const draft = parseDraft(text);
  if (source) draft.source = source;
  const { html, warnings, stats } = compile(draft, { source });
  const out = flags.out ? path.resolve(flags.out) : defaultOutPath(draft.meta.title, "html");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html, "utf8");
  console.log(`✓ ${out}`);
  if (!flags.quiet) {
    console.log(`  ${draft.meta.layout} · ${draft.meta.theme} · ${stats.panels} panels · diagrams×${stats.diagrams} ask×${stats.asks} callout×${stats.callouts} · ${(stats.bytes / 1024).toFixed(1)} KB`);
  }
  for (const w of warnings) console.error(`  ⚠ ${w}`);
  if (!flags["no-open"]) openTarget(out);
}

async function cmdMarkdown({ flags, positional }) {
  const { text } = await readInput(positional[0]);
  const md = draftToMarkdown(parseDraft(text));
  if (flags.out) {
    fs.writeFileSync(path.resolve(flags.out), md, "utf8");
    console.log(`✓ ${path.resolve(flags.out)}`);
  } else process.stdout.write(md);
}

async function cmdServe({ flags, positional }) {
  if (!positional[0]) throw new Error("Usage: clarify serve <draft.md>");
  const { serve } = await import("../src/serve.js");
  const port = flags.port ? Number(flags.port) : 4777;
  const server = await serve({ file: positional[0], port, host: flags.host || "127.0.0.1", log: (m) => console.log(m) });
  console.log(`✓ Live preview: ${server.url}`);
  console.log(`  watching ${path.resolve(positional[0])} · Ctrl+C to stop`);
  if (!flags["no-open"]) openTarget(server.url);
  const stop = () => server.close().then(() => process.exit(0));
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

async function main() {
  const [command = "help", ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);
  switch (command) {
    case "--version":
    case "-v":
      console.log(`clarify v${VERSION}`);
      return;
    case "render": return cmdRender(args);
    case "serve": return cmdServe(args);
    case "md":
    case "markdown": return cmdMarkdown(args);
    case "view":
      if (!args.positional[0]) throw new Error("Specify a page to open.");
      openTarget(path.resolve(args.positional[0]));
      return;
    default:
      console.log(HELP);
  }
}

main().catch(err => {
  console.error(`✗ ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
