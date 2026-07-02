#!/usr/bin/env node
/* verify-shot.cjs — Screenshot + Konsolen-Check einer Ansicht. Args: <page> <breite> <out> [slices] */
"use strict";
const { spawn } = require("child_process");
const http = require("http");
const fs = require("fs");
const path = require("path");

const PAGE = process.argv[2] || "start";
const W = parseInt(process.argv[3] || "1440", 10);
const OUT = process.argv[4] || "shot.png";
const SLICES = parseInt(process.argv[5] || "1", 10);
const H = W < 800 ? 844 : 900;
const URL = "file://" + path.join(__dirname, "index.html");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9371;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const httpJSON = (u) => new Promise((res, rej) => http.get(u, (r) => { let d = ""; r.on("data", (c) => (d += c)); r.on("end", () => res(JSON.parse(d))); }).on("error", rej));

class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.cbs = {}; this.errors = []; ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && this.cbs[m.id]) { this.cbs[m.id](m); delete this.cbs[m.id]; } else if (m.method === "Runtime.exceptionThrown") { this.errors.push(JSON.stringify(m.params.exceptionDetails && m.params.exceptionDetails.exception && m.params.exceptionDetails.exception.description || m.params).slice(0, 300)); } }; }
  send(method, params = {}) { const id = ++this.id; this.ws.send(JSON.stringify({ id, method, params })); return new Promise((r) => (this.cbs[id] = r)); }
  async evalJS(expr) { const r = await this.send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true }); return r.result && r.result.result ? r.result.result.value : undefined; }
}

(async () => {
  const chrome = spawn(CHROME, ["--headless=new", "--user-data-dir=/tmp/chrome-vs-"+PORT, "--disable-gpu", "--no-first-run", "--remote-debugging-port=" + PORT, "--hide-scrollbars", "--allow-file-access-from-files", "about:blank"], { stdio: "ignore" });
  let t;
  for (let i = 0; i < 50; i++) { try { const l = await httpJSON(`http://localhost:${PORT}/json`); t = l.find((x) => x.type === "page" && x.webSocketDebuggerUrl); if (t) break; } catch (_) {} await sleep(250); }
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  const cdp = new CDP(ws);
  await cdp.send("Page.enable"); await cdp.send("Runtime.enable");
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: W < 800 ? 2 : 1, mobile: W < 800 });
  await cdp.send("Page.navigate", { url: URL });
  await sleep(2500);
  if (PAGE !== "start") { await cdp.evalJS(`XDAB_showPage('${PAGE}')`); await sleep(1000); }
  const pageH = await cdp.evalJS("document.documentElement.scrollHeight");
  const overflow = await cdp.evalJS("document.documentElement.scrollWidth - document.documentElement.clientWidth");
  for (let i = 0; i < SLICES; i++) {
    await cdp.evalJS(`window.scrollTo(0, ${i * H})`);
    await sleep(500);
    const s = await cdp.send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(SLICES > 1 ? OUT.replace(".png", `-${String(i).padStart(2, "0")}.png`) : OUT, Buffer.from(s.result.data, "base64"));
  }
  console.log(`${PAGE}@${W}: height=${pageH}px overflow=${overflow}px jsErrors=${cdp.errors.length}`);
  cdp.errors.slice(0, 5).forEach((e) => console.log("  ERR:", e));
  ws.close(); chrome.kill();
  process.exit(cdp.errors.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
