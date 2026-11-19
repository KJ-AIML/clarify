import test from "node:test";
import assert from "node:assert/strict";
import { chromeCandidates, launchBrowser, browserArgs } from "../src/check/cdp.js";

test("a browser that exits at once rejects with the reason", { timeout: 20000 }, async () => {
  // Node is no browser: it exits at once on the browser's flags, and nothing may wait on it forever.
  await assert.rejects(launchBrowser(process.execPath), /the browser exited \(code \d+\)/);
});

test("the browser runs without its sandbox only as root", () => {
  // Chrome refuses to start as root with its sandbox on, which is common in agent containers.
  assert.ok(browserArgs("/tmp/u", { platform: "linux", root: true }).includes("--no-sandbox"));
  const user = browserArgs("/tmp/u", { platform: "linux", root: false });
  assert.ok(!user.includes("--no-sandbox"));
  assert.ok(user.includes("--user-data-dir=/tmp/u") && user.includes("--remote-debugging-pipe"), user.join(" "));
  assert.ok(browserArgs("C:\\u", { platform: "win32", root: false }).includes("--do-not-de-elevate"));
});

test("Windows Chrome, Edge and Playwright builds are candidates", () => {
  const env = { PROGRAMFILES: "C:\\Program Files", "PROGRAMFILES(X86)": "C:\\Program Files (x86)", LOCALAPPDATA: "C:\\Users\\u\\AppData\\Local" };
  const list = (dir) => (dir.endsWith("ms-playwright") ? ["chromium-1140"] : []);
  const c = chromeCandidates({ platform: "win32", env, home: "C:\\Users\\u", list });
  assert.ok(c.includes("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"));
  assert.ok(c.includes("C:\\Users\\u\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe"));
  assert.ok(c.includes("C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"));
  assert.ok(c.some(p => p.endsWith("chromium-1140\\chrome-win\\chrome.exe")));
});

test("macOS candidates are unchanged", () => {
  const c = chromeCandidates({ platform: "darwin", env: {}, home: "/Users/u", list: () => [] });
  assert.ok(c.includes("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"));
});

test("macOS candidates include Edge", () => {
  const c = chromeCandidates({ platform: "darwin", env: {}, home: "/Users/u", list: () => [] });
  const edge = c.indexOf("/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge");
  assert.ok(edge > c.indexOf("/Applications/Chromium.app/Contents/MacOS/Chromium"), "after Chromium");
  assert.ok(edge < c.indexOf("/usr/bin/google-chrome"), "before the Linux paths");
});
