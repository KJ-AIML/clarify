import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const BIN = fileURLToPath(new URL("../bin/clarify.mjs", import.meta.url));
const run = (...args) => execFileSync(process.execPath, [BIN, ...args], { encoding: "utf8" });

test("the CLI reports version 0.3.0 and lists check", () => {
  assert.equal(run("--version"), "clarify v0.3.0\n");
  assert.match(run("help"), /clarify check/);
});
