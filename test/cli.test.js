import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const BIN = fileURLToPath(new URL("../bin/clarify.mjs", import.meta.url));
const run = (...args) => execFileSync(process.execPath, [BIN, ...args], { encoding: "utf8" });

test("the CLI reports version 0.3.0 and lists check", () => {
  assert.equal(run("--version"), "clarify v0.3.0\n");
  assert.match(run("help"), /clarify check/);
});

test("check says so when the browser does not start", { timeout: 30000 }, () => {
  // CHROME_PATH points at Node, which exits at once: the command must print why, never end in silence.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "clarify-cli-"));
  try {
    const draft = path.join(tmp, "plain.md");
    fs.writeFileSync(draft, "## A One\nText.\n");
    const r = spawnSync(process.execPath, [BIN, "check", draft, "--out", path.join(tmp, "out")], { encoding: "utf8", env: { ...process.env, CHROME_PATH: process.execPath } });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /^⚠ the browser did not start \(.*: the browser exited \(code \d+\); set CHROME_PATH to Chrome or Edge\): only the static lint ran\n$/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
