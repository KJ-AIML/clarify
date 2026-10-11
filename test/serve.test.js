import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { serve } from "../src/serve.js";

const statusWithHost = (url, host) => new Promise((resolve, reject) => {
  const u = new URL(url);
  http.get({ hostname: u.hostname, port: u.port, path: "/", headers: { Host: host } }, res => { res.resume(); resolve(res.statusCode); }).on("error", reject);
});

test("serve: renders the draft, pushes reload on save, rejects foreign hosts", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "clarify-serve-"));
  const file = path.join(dir, "draft.md");
  fs.writeFileSync(file, "---\ntitle: Live One\n---\n## A First\nhello");
  const server = await serve({ file, port: 0 });
  try {
    const page = await (await fetch(server.url)).text();
    assert.match(page, /<title>Live One<\/title>/);
    assert.match(page, /"live":true/);

    assert.equal(await statusWithHost(server.url, "evil.example"), 403, "DNS-rebinding guard");
    assert.equal(await statusWithHost(server.url, `localhost:${server.port}`), 200);

    const ctrl = new AbortController();
    const res = await fetch(new URL("/__clarify/events", server.url), { signal: ctrl.signal });
    const reader = res.body.getReader();
    const events = (async () => {
      let text = "";
      while (!text.includes("event: reload")) {
        const { value, done } = await reader.read();
        if (done) break;
        text += new TextDecoder().decode(value);
      }
      return text;
    })();
    await new Promise(r => setTimeout(r, 100));
    fs.writeFileSync(file, "---\ntitle: Live Two\n---\n## A First\nchanged");
    const text = await Promise.race([events, new Promise((_, rej) => setTimeout(() => rej(new Error("no reload event")), 4000))]);
    assert.match(text, /event: reload/);
    ctrl.abort();
    const updated = await (await fetch(server.url)).text();
    assert.match(updated, /<title>Live Two<\/title>/);
  } finally {
    await server.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
