// clarify/src/check/cdp.js
// Minimal Chrome DevTools Protocol driver over --remote-debugging-pipe (no Playwright,
// no WebSocket, no npm packages), plus a tiny PNG codec for pixel diffs.
// `clarify check` drives the browser with it; the visual tests use it too, through test/visual/cdp.mjs.

import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";

/**
 * Every place a Chromium binary may live, best first: Playwright's cache, then system installs.
 * Pure: the file system is only reached through `list(dir)` (directory entries), so tests can
 * hand it a fake cache. Paths use the target platform's separators.
 */
export function chromeCandidates({ platform = process.platform, env = process.env, home = os.homedir(), list = safeList } = {}) {
  const win = platform === "win32";
  const p = win ? path.win32 : path.posix;
  const cache = platform === "darwin" ? p.join(home, "Library/Caches/ms-playwright")
    : win ? p.join(env.LOCALAPPDATA || p.join(home, "AppData", "Local"), "ms-playwright")
    : p.join(home, ".cache/ms-playwright");
  const candidates = [];
  for (const dir of list(cache).sort().reverse()) {
    if (win) {
      if (dir.startsWith("chromium_headless_shell-")) {
        candidates.push(
          p.join(cache, dir, "chrome-win", "headless_shell.exe"),
          p.join(cache, dir, "chrome-headless-shell-win64", "chrome-headless-shell.exe")
        );
      }
      if (dir.startsWith("chromium-")) {
        candidates.push(p.join(cache, dir, "chrome-win", "chrome.exe"), p.join(cache, dir, "chrome-win64", "chrome.exe"));
      }
      continue;
    }
    if (dir.startsWith("chromium_headless_shell-")) {
      for (const sub of list(p.join(cache, dir))) {
        candidates.push(p.join(cache, dir, sub, "chrome-headless-shell"), p.join(cache, dir, sub, "headless_shell"));
      }
    }
    if (dir.startsWith("chromium-")) {
      for (const sub of list(p.join(cache, dir))) {
        candidates.push(
          p.join(cache, dir, sub, "Chromium.app/Contents/MacOS/Chromium"),
          p.join(cache, dir, sub, "Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"),
          p.join(cache, dir, sub, "chrome")
        );
      }
    }
  }
  if (win) {
    const programFiles = env.PROGRAMFILES || "C:\\Program Files";
    const programFilesX86 = env["PROGRAMFILES(X86)"] || "C:\\Program Files (x86)";
    const localAppData = env.LOCALAPPDATA || p.join(home, "AppData", "Local");
    candidates.push(
      p.join(programFiles, "Google/Chrome/Application/chrome.exe"),
      p.join(localAppData, "Google/Chrome/Application/chrome.exe"),
      p.join(programFilesX86, "Google/Chrome/Application/chrome.exe"),
      p.join(programFilesX86, "Microsoft/Edge/Application/msedge.exe"),
      p.join(programFiles, "Microsoft/Edge/Application/msedge.exe")
    );
  } else {
    candidates.push(
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
      "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"
    );
  }
  return candidates;
}

/** Locate a Chromium binary: $CHROME_PATH first, then the first candidate that exists. */
export function findChrome() {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  return chromeCandidates().find(c => fs.existsSync(c)) || null;
}

function safeList(dir) {
  try { return fs.readdirSync(dir); } catch { return []; }
}

/**
 * `promise`, or a rejection "timeout waiting for <what>" when it takes longer than `ms`. The timer is cleared
 * either way. A page whose script never ends answers nothing, so every wait on it needs a limit.
 * @template T
 * @param {Promise<T>} promise
 * @param {number} ms
 * @param {string} what
 * @returns {Promise<T>}
 */
export function within(promise, ms, what) {
  let timer;
  const late = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`timeout waiting for ${what}`)), Math.max(0, ms)); });
  return Promise.race([promise, late]).finally(() => clearTimeout(timer));
}

/**
 * The browser's command line: headless, driven over a pipe, with its own profile in `userDir`. Chrome will not
 * start as root (common in agent containers) while its sandbox is on, so only then is the sandbox turned off.
 * @param {string} userDir
 * @param {{ platform?: string, root?: boolean }} [opts]
 * @returns {string[]}
 */
export function browserArgs(userDir, { platform = process.platform, root = process.getuid?.() === 0 } = {}) {
  return [
    "--headless=new", "--remote-debugging-pipe", "--no-first-run", "--no-default-browser-check",
    "--disable-gpu", "--hide-scrollbars", "--force-color-profile=srgb", "--font-render-hinting=none",
    "--disable-background-timer-throttling", "--disable-renderer-backgrounding",
    ...(platform === "win32" ? ["--do-not-de-elevate"] : []),
    ...(root ? ["--no-sandbox"] : []),
    `--user-data-dir=${userDir}`, "about:blank"
  ];
}

/**
 * Start a headless browser and wait until it answers. Rejects when it exits first, or does not answer in
 * `startTimeout` ms. Once the browser is gone (it exited, crashed or closed its pipe), every command and wait
 * still open, and every later command, rejects with the reason ("the browser exited (code N)"), so nothing
 * waits on it forever. `gone` holds that reason; it is null while the browser runs.
 * @param {string | null} [executable]
 * @param {{ startTimeout?: number }} [opts]
 */
export async function launchBrowser(executable = findChrome(), { startTimeout = 30000 } = {}) {
  if (!executable) throw new Error("No Chromium found. Set CHROME_PATH or run `npx playwright install chromium`.");
  const userDir = fs.mkdtempSync(path.join(os.tmpdir(), "clarify-chrome-"));
  const proc = spawn(executable, browserArgs(userDir), { stdio: ["ignore", "ignore", "ignore", "pipe", "pipe"] });

  const writer = /** @type {import("node:stream").Writable} */ (proc.stdio[3]);
  const reader = /** @type {import("node:stream").Readable} */ (proc.stdio[4]);
  let nextId = 1;
  const pending = new Map();
  const listeners = new Set();
  /** Why the browser is gone, or null while it runs. */
  let gone = null;
  /** Each is called once, with the reason, when the browser goes: it ends a wait that no command answers. */
  const onGone = new Set();
  /**
   * The pipe can close a moment before the process exits; this waits 1 s for the exit, and its code. When the
   * exit is slower (a busy machine, 3 s and more seen), the reason is the closed pipe instead: either one
   * means that the browser stopped, and no wait can promise which comes first.
   */
  let pipeTimer;
  const exited = new Promise((resolve) => { proc.once("exit", resolve); proc.once("error", resolve); });
  const fail = (reason) => {
    clearTimeout(pipeTimer);
    if (gone) return;
    gone = reason;
    for (const { reject } of pending.values()) reject(new Error(reason));
    pending.clear();
    for (const fn of [...onGone]) fn(reason);
  };
  proc.once("exit", (code, signal) => fail(code !== null ? `the browser exited (code ${code})` : `the browser exited (signal ${signal})`));
  // Kept on: a later "error" (a kill that fails) with no listener would throw.
  proc.on("error", (err) => fail(`the browser could not start (${err.message})`));
  reader.once("close", () => { if (!gone) pipeTimer = setTimeout(() => fail("the browser closed its pipe"), 1000); });
  // Writing to a browser that has gone fails too; fail() has already said why.
  writer.on("error", () => {});
  reader.on("error", () => {});
  let buffer = Buffer.alloc(0);
  reader.on("data", (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    let zero;
    while ((zero = buffer.indexOf(0)) !== -1) {
      const msg = JSON.parse(buffer.subarray(0, zero).toString("utf8"));
      buffer = buffer.subarray(zero + 1);
      if (msg.id && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id);
        pending.delete(msg.id);
        msg.error ? reject(new Error(`${msg.error.message} (${msg.error.code})`)) : resolve(msg.result);
      } else listeners.forEach(fn => fn(msg));
    }
  });

  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    if (gone) return reject(new Error(gone));
    const id = nextId++;
    pending.set(id, { resolve, reject });
    writer.write(`${JSON.stringify({ id, method, params, sessionId })}\0`);
  });

  /** Stops the process, gives it a moment to exit, and removes its profile folder if it can. */
  async function shutDown() {
    proc.kill();
    await within(exited, 3000, "the browser to exit").catch(() => {});
    try { fs.rmSync(userDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); } catch { /* left in the temp folder */ }
  }

  try {
    await within(send("Browser.getVersion"), startTimeout, "the browser to start");
  } catch {
    // Read before shutDown(): its kill makes the browser "exit", and that would set `gone` to "signal SIGTERM".
    const reason = gone;
    await shutDown();
    throw new Error(reason || `the browser did not answer in ${startTimeout / 1000} s`);
  }

  async function newPage({ width = 1280, height = 900, colorScheme = "light", reducedMotion = true } = {}) {
    const { targetId } = await send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
    const s = (method, params) => send(method, params, sessionId);
    const errors = [];
    const waiters = [];
    const onMsg = (msg) => {
      if (msg.sessionId !== sessionId) return;
      if (msg.method === "Runtime.exceptionThrown") errors.push(msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text);
      if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") errors.push(msg.params.args.map(a => a.value ?? a.description).join(" "));
      if (msg.method === "Log.entryAdded" && msg.params.entry.level === "error") errors.push(msg.params.entry.text);
      for (const w of [...waiters]) if (w.method === msg.method) { waiters.splice(waiters.indexOf(w), 1); w.resolve(msg.params); }
    };
    listeners.add(onMsg);
    await s("Page.enable");
    await s("Runtime.enable");
    await s("Log.enable");
    await s("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 600 });
    await s("Emulation.setEmulatedMedia", { features: [
      { name: "prefers-color-scheme", value: colorScheme },
      { name: "prefers-reduced-motion", value: reducedMotion ? "reduce" : "no-preference" }
    ] });
    // The timer is cleared once the event comes, so a finished wait never keeps Node running. A browser that
    // goes ends the wait at once, with its reason.
    const waitFor = (method, ms = 10000) => new Promise((resolve, reject) => {
      if (gone) return reject(new Error(gone));
      const done = () => {
        clearTimeout(timer);
        onGone.delete(end);
        if (waiters.includes(w)) waiters.splice(waiters.indexOf(w), 1);
      };
      const end = (reason) => { done(); reject(new Error(reason)); };
      const timer = setTimeout(() => end(`timeout waiting for ${method}`), ms);
      const w = { method, resolve: (params) => { done(); resolve(params); } };
      onGone.add(end);
      waiters.push(w);
    });
    const page = {
      errors,
      /** Open `url` and wait for its load event and its fonts; rejects when that takes longer than `timeout` ms. */
      async goto(url, { timeout = 10000 } = {}) {
        const deadline = Date.now() + timeout;
        const loaded = waitFor("Page.loadEventFired", timeout);
        loaded.catch(() => {}); // awaited below; this only stops a failed navigate from leaving it unhandled
        await s("Page.navigate", { url });
        await loaded;
        await within(page.eval("document.fonts ? document.fonts.ready.then(() => true) : true"), deadline - Date.now(), "the fonts");
        await page.sleep(120);
      },
      async eval(expression) {
        const r = await s("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
        if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
        return r.result.value;
      },
      sleep: (ms) => new Promise(r => setTimeout(r, ms)),
      async click(selector) {
        const box = await page.eval(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return null; el.scrollIntoView({ block: "center", inline: "nearest" }); const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
        if (!box) throw new Error(`click: no element for ${selector}`);
        for (const type of ["mousePressed", "mouseReleased"]) {
          await s("Input.dispatchMouseEvent", { type, x: box.x, y: box.y, button: "left", clickCount: 1, pointerType: "mouse" });
        }
        await page.sleep(80);
      },
      /** Move the mouse onto an element (scrolling it into view first). */
      async hover(selector) {
        const box = await page.eval(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return null; el.scrollIntoView({ block: "center", inline: "nearest" }); const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
        if (!box) throw new Error(`hover: no element for ${selector}`);
        await s("Input.dispatchMouseEvent", { type: "mouseMoved", x: box.x - 20, y: box.y, pointerType: "mouse" });
        await s("Input.dispatchMouseEvent", { type: "mouseMoved", x: box.x, y: box.y, pointerType: "mouse" });
        await page.sleep(80);
      },
      /**
       * A PNG of the whole page (cut at 8000px), of the viewport (`fullPage: false`), or of one region:
       * `clip` = { x, y, width, height } in page CSS pixels, below the fold too. A `clip` wins over `fullPage`.
       */
      async screenshot({ fullPage = true, clip } = {}) {
        let region;
        if (clip) region = { x: clip.x, y: clip.y, width: clip.width, height: clip.height, scale: 1 };
        else if (fullPage) {
          const m = await s("Page.getLayoutMetrics");
          const size = m.cssContentSize || m.contentSize;
          region = { x: 0, y: 0, width: Math.ceil(size.width), height: Math.min(Math.ceil(size.height), 8000), scale: 1 };
        }
        const { data } = await s("Page.captureScreenshot", { format: "png", captureBeyondViewport: Boolean(clip) || fullPage, ...(region ? { clip: region } : {}) });
        return Buffer.from(data, "base64");
      },
      /** Let downloads land in `dir` (for export checks). */
      async allowDownloads(dir) {
        await send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: dir, eventsEnabled: true });
      },
      async close() {
        listeners.delete(onMsg);
        await send("Target.closeTarget", { targetId });
      }
    };
    return page;
  }

  return {
    newPage,
    /** Why the browser is gone ("the browser exited (code N)"), or null while it runs. */
    get gone() { return gone; },
    /** Asks the browser to close, then stops it. Safe to call again, and on a browser that has gone. */
    async close() {
      if (!gone) await within(send("Browser.close"), 3000, "the browser to close").catch(() => {});
      await shutDown();
    }
  };
}

// ── PNG codec (8-bit RGB/RGBA, non-interlaced: what Chrome emits) ──────────────

export function decodePng(buf) {
  let pos = 8;
  let width = 0;
  let height = 0;
  let colorType = 6;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString("ascii", pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      colorType = data[9];
      if (data[8] !== 8 || data[12] !== 0) throw new Error("decodePng: only 8-bit non-interlaced PNGs are supported");
    } else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
    pos += 12 + len;
  }
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 0;
  if (!channels) throw new Error(`decodePng: unsupported color type ${colorType}`);
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = Buffer.alloc(width * height * 4);
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = Buffer.from(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)));
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? line[x - channels] : 0;
      const b = prev[x];
      const c = x >= channels ? prev[x - channels] : 0;
      let v = line[x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      line[x] = v & 255;
    }
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4;
      out[o] = line[x * channels];
      out[o + 1] = line[x * channels + 1];
      out[o + 2] = line[x * channels + 2];
      out[o + 3] = channels === 4 ? line[x * channels + 3] : 255;
    }
    prev = line;
  }
  return { width, height, data: out };
}

export function encodePng({ width, height, data }) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) data.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  const chunk = (type, body) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(body.length);
    const typed = Buffer.concat([Buffer.from(type, "ascii"), body]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(zlib.crc32(typed) >>> 0);
    return Buffer.concat([len, typed, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))
  ]);
}

/**
 * Compare two decoded images. Pixels whose max channel delta exceeds `threshold` count
 * as changed. Returns the changed ratio and a diff image (changes in red over a faded base).
 */
export function diffImages(a, b, threshold = 40) {
  if (a.width !== b.width || a.height !== b.height) {
    return { ratio: 1, changed: -1, sizeMismatch: `${a.width}×${a.height} vs ${b.width}×${b.height}`, diff: null };
  }
  const diff = Buffer.alloc(a.data.length);
  let changed = 0;
  for (let i = 0; i < a.data.length; i += 4) {
    const d = Math.max(Math.abs(a.data[i] - b.data[i]), Math.abs(a.data[i + 1] - b.data[i + 1]), Math.abs(a.data[i + 2] - b.data[i + 2]));
    if (d > threshold) {
      changed++;
      diff[i] = 255; diff[i + 1] = 0; diff[i + 2] = 64; diff[i + 3] = 255;
    } else {
      const g = 200 + ((a.data[i] + a.data[i + 1] + a.data[i + 2]) / 3) * 0.2;
      diff[i] = diff[i + 1] = diff[i + 2] = g; diff[i + 3] = 255;
    }
  }
  return { ratio: changed / (a.width * a.height), changed, diff: { width: a.width, height: a.height, data: diff } };
}
