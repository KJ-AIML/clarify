import test from "node:test";
import assert from "node:assert/strict";
import { chromeCandidates } from "./visual/cdp.mjs";

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
