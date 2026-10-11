// clarify/src/serve.js
// `clarify serve draft.md`: local live-preview server. Recompiles on every save and
// pushes a reload over Server-Sent Events; the page restores pan/zoom and scroll.
// Binds to loopback only and rejects foreign Host headers (DNS-rebinding guard).

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { parseDraft } from "./parser.js";
import { compile } from "./render.js";

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

/**
 * @param {{ file: string, port?: number, host?: string, log?: (msg: string) => void }} opts
 * @returns {Promise<{ url: string, port: number, close: () => Promise<void>, rebuild: () => void }>}
 */
export function serve({ file, port = 4777, host = "127.0.0.1", log = () => {} }) {
  const abs = path.resolve(file);
  const clients = new Set();
  let html = "";
  let lastError = "";

  function build() {
    try {
      const draft = parseDraft(fs.readFileSync(abs, "utf8"));
      draft.source = abs;
      const result = compile(draft, { live: true, source: abs });
      const changed = result.html !== html;
      html = result.html;
      lastError = "";
      result.warnings.forEach(w => log(`  ⚠ ${w}`));
      return { ok: true, changed };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      return { ok: false, changed: true, error: lastError };
    }
  }

  function broadcast(event, data) {
    const payload = `event: ${event}\ndata: ${String(data).replace(/\n/g, " ")}\n\n`;
    for (const res of clients) res.write(payload);
  }

  build();

  const server = http.createServer((req, res) => {
    const hostHeader = (req.headers.host || "").replace(/:\d+$/, "");
    if (LOOPBACK_HOSTS.has(host) && !LOOPBACK_HOSTS.has(hostHeader)) {
      res.writeHead(403).end("Forbidden host");
      return;
    }
    const url = new URL(req.url || "/", "http://localhost");
    if (url.pathname === "/__clarify/events") {
      res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
      res.write("retry: 1000\n\n");
      if (lastError) res.write(`event: draft-error\ndata: ${lastError}\n\n`);
      clients.add(res);
      req.on("close", () => clients.delete(res));
      return;
    }
    if (url.pathname === "/" || url.pathname === "/index.html") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
      res.end(html || `<!doctype html><meta charset="utf-8"><title>Clarify</title><pre>${lastError.replace(/</g, "&lt;")}</pre>`);
      return;
    }
    res.writeHead(404, { "Content-Type": "text/plain" }).end("Not found");
  });

  // Watch the directory, not the file: editors often save via rename, which ends file watches.
  let timer;
  const watcher = fs.watch(path.dirname(abs), (_event, name) => {
    if (name && name !== path.basename(abs)) return;
    clearTimeout(timer);
    timer = setTimeout(rebuild, 60);
  });

  function rebuild() {
    if (!fs.existsSync(abs)) return;
    const r = build();
    if (!r.ok) {
      log(`✗ ${r.error}`);
      broadcast("draft-error", r.error);
    } else if (r.changed) {
      log(`↻ ${new Date().toLocaleTimeString()} rebuilt (${clients.size} viewer${clients.size === 1 ? "" : "s"})`);
      broadcast("reload", Date.now());
    }
  }

  const heartbeat = setInterval(() => { for (const res of clients) res.write(": ping\n\n"); }, 15000);
  heartbeat.unref();

  return new Promise((resolve, reject) => {
    let attempt = 0;
    const tryListen = (p) => {
      server.once("error", (err) => {
        if (/** @type {NodeJS.ErrnoException} */ (err).code === "EADDRINUSE" && attempt++ < 20) tryListen(p + 1);
        else reject(err);
      });
      server.listen(p, host, () => {
        const actual = /** @type {import("node:net").AddressInfo} */ (server.address()).port;
        const shownHost = host === "127.0.0.1" || host === "::1" ? "localhost" : host;
        resolve({
          url: `http://${shownHost}:${actual}/`,
          port: actual,
          rebuild,
          close: () => new Promise(done => {
            watcher.close();
            clearInterval(heartbeat);
            for (const res of clients) res.end();
            server.close(() => done());
          })
        });
      });
    };
    tryListen(port);
  });
}
