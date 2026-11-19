import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { serve } from "../src/serve.js";
import { findChrome, launchBrowser } from "../src/check/cdp.js";

// The browser test needs Chrome or Edge; without one it is skipped, not failed.
const inBrowser = { skip: !findChrome() && "no Chrome or Edge", timeout: 60000 };

const statusWithHost = (url, host) => new Promise((resolve, reject) => {
  const u = new URL(url);
  http.get({ hostname: u.hostname, port: u.port, path: "/", headers: { Host: host } }, res => { res.resume(); resolve(res.statusCode); }).on("error", reject);
});

/**
 * Opens the server's event stream. `reload()` resolves with the stream text at the next `event: reload`
 * it has not returned yet, and rejects when none comes within `ms`.
 */
async function openEvents(server) {
  const ctrl = new AbortController();
  const res = await fetch(new URL("/__clarify/events", server.url), { signal: ctrl.signal });
  const reader = res.body.getReader();
  let text = "";
  let taken = 0;
  (async () => {
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        text += new TextDecoder().decode(value);
      }
    } catch { /* the stream was closed */ }
  })();
  await new Promise(r => setTimeout(r, 100));
  return {
    async reload(ms = 4000) {
      const deadline = Date.now() + ms;
      while (text.split("event: reload").length - 1 <= taken) {
        if (Date.now() > deadline) throw new Error("no reload event");
        await new Promise(r => setTimeout(r, 25));
      }
      taken++;
      return text;
    },
    close: () => ctrl.abort()
  };
}

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

    const events = await openEvents(server);
    fs.writeFileSync(file, "---\ntitle: Live Two\n---\n## A First\nchanged");
    const text = await events.reload();
    assert.match(text, /event: reload/);
    events.close();
    const updated = await (await fetch(server.url)).text();
    assert.match(updated, /<title>Live Two<\/title>/);
  } finally {
    await server.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("serve: reloads when a file= section changes", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "clarify-serve-"));
  const file = path.join(dir, "draft.md");
  fs.mkdirSync(path.join(dir, "sections"));
  fs.writeFileSync(path.join(dir, "sections", "part.html"), "<p>first</p>");
  fs.writeFileSync(path.join(dir, "near.html"), "<p>near</p>");
  fs.writeFileSync(file, "---\ntitle: Files\n---\n## A Parts\n```free part file=sections/part.html\n```\n\n```free near file=near.html\n```\n");
  const server = await serve({ file, port: 0 });
  let events;
  try {
    assert.match(await (await fetch(server.url)).text(), /<p>first<\/p>/);
    events = await openEvents(server);

    fs.writeFileSync(path.join(dir, "sections", "part.html"), "<p>second</p>");
    await events.reload();
    assert.match(await (await fetch(server.url)).text(), /<p>second<\/p>/, "a file in a sub-folder");

    fs.writeFileSync(path.join(dir, "near.html"), "<p>third</p>");
    await events.reload();
    assert.match(await (await fetch(server.url)).text(), /<p>third<\/p>/, "a file next to the draft");
  } finally {
    events?.close();
    await server.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("serve: a file= folder that is deleted and made again is watched again", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "clarify-serve-"));
  const file = path.join(dir, "draft.md");
  const draft = (note) => `---\ntitle: Folder\n---\n## A Parts\n${note}\n\n\`\`\`free part file=sections/part.html\n\`\`\`\n`;
  const page = async () => (await fetch(server.url)).text();
  fs.mkdirSync(path.join(dir, "sections"));
  fs.writeFileSync(path.join(dir, "sections", "part.html"), "<p>first</p>");
  fs.writeFileSync(file, draft("one"));
  const server = await serve({ file, port: 0 });
  let events;
  try {
    events = await openEvents(server);
    fs.rmSync(path.join(dir, "sections"), { recursive: true, force: true });
    await events.reload();
    assert.match(await page(), /Missing section/, "the folder is gone, so the section is missing");

    fs.mkdirSync(path.join(dir, "sections"));
    fs.writeFileSync(path.join(dir, "sections", "part.html"), "<p>again</p>");
    fs.writeFileSync(file, draft("two"));
    await events.reload();
    assert.match(await page(), /<p>again<\/p>/, "saving the draft finds the folder again");

    fs.writeFileSync(path.join(dir, "sections", "part.html"), "<p>later</p>");
    await events.reload();
    assert.match(await page(), /<p>later<\/p>/, "and the folder is watched again");
  } finally {
    events?.close();
    await server.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

const watcherCount = () => process.getActiveResourcesInfo().filter(r => r === "FSEventWrap").length;

test("serve: close() leaves no watcher behind, even with a rebuild pending", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "clarify-serve-"));
  const file = path.join(dir, "draft.md");
  const draft = (extra) => `---\ntitle: Close\n---\n## A Parts\nhello\n\n${extra}`;
  fs.mkdirSync(path.join(dir, "sections"));
  fs.writeFileSync(path.join(dir, "sections", "part.html"), "<p>part</p>");
  fs.writeFileSync(file, draft(""));
  await new Promise(r => setTimeout(r, 100)); // a watcher closed by an earlier test still counts for a moment
  const before = watcherCount();
  const server = await serve({ file, port: 0 });
  try {
    // A save adds a file= in a folder that is not watched yet; close() comes before the 60 ms debounce ends.
    fs.writeFileSync(file, draft("```free part file=sections/part.html\n```\n"));
    await new Promise(r => setTimeout(r, 15));
    await server.close();
    // A rebuild after close() (the public one, or the pending debounce) must not open a watcher.
    server.rebuild();
    await new Promise(r => setTimeout(r, 300));
    assert.equal(watcherCount(), before, "every watcher is closed and none was opened after close()");
  } finally {
    await server.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// Windows and default macOS file systems ignore case in a path; a draft can still write it differently from the disk.
const caseBlind = (() => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "clarify-case-"));
  try {
    fs.writeFileSync(path.join(dir, "a"), "");
    return fs.existsSync(path.join(dir, "A"));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
})();

test("serve: a file= written in another case than the disk name still reloads", { skip: !caseBlind && "the file system is case-sensitive" }, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "clarify-serve-"));
  const file = path.join(dir, "draft.md");
  fs.mkdirSync(path.join(dir, "sections"));
  fs.writeFileSync(path.join(dir, "sections", "part.html"), "<p>first</p>");
  fs.writeFileSync(file, "---\ntitle: Case\n---\n## A Parts\n```free part file=Sections/Part.html\n```\n");
  const server = await serve({ file, port: 0 });
  let events;
  try {
    assert.match(await (await fetch(server.url)).text(), /<p>first<\/p>/, "the page finds the file in spite of the case");
    events = await openEvents(server);
    fs.writeFileSync(path.join(dir, "sections", "part.html"), "<p>second</p>");
    await events.reload();
    assert.match(await (await fetch(server.url)).text(), /<p>second<\/p>/);
  } finally {
    events?.close();
    await server.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("serve: a free page keeps live reload under its policy", inBrowser, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "clarify-serve-"));
  const file = path.join(dir, "draft.md");
  const draft = (word) => `---\ntitle: Policy\n---\n## A Words\nalpha ${word}\n\n\`\`\`free demo\n<p>inline</p>\n\`\`\`\n`;
  fs.writeFileSync(file, draft("bravo"));
  const server = await serve({ file, port: 0 });
  let browser;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();
    // Polls the page until `expression` is true; a page that is mid-reload counts as "not yet".
    const until = async (expression, ms, what) => {
      const deadline = Date.now() + ms;
      for (;;) {
        if (await page.eval(expression).catch(() => false)) return;
        if (Date.now() > deadline) throw new Error(`still waiting for ${what} after ${ms} ms`);
        await page.sleep(50);
      }
    };
    const live = `document.querySelector(".c-live")?.textContent === "Live"`;
    const hasWord = `document.body.innerText.includes("charlie")`;

    await page.goto(server.url);
    const policy = await page.eval(`document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.content`);
    assert.ok(policy?.endsWith("; connect-src 'self'"), `the policy ends with connect-src 'self': ${policy}`);
    await until(live, 5000, "the live indicator");
    assert.equal(await page.eval(hasWord), false);

    await page.eval("window.__beforeReload = true");
    fs.writeFileSync(file, draft("charlie"));
    await until(hasWord, 5000, "the new word on the open page");
    assert.equal(await page.eval("window.__beforeReload"), undefined, "the page reloaded itself; the test did not navigate again");

    await until(live, 5000, "the live indicator after the reload");
    assert.deepEqual(page.errors, [], "no policy violation or other error");
  } finally {
    await browser?.close();
    await server.close();
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});
