#!/usr/bin/env node
/* breite-messen.cjs — findet Elemente, die die Seite horizontal aufspannen.
   Windows-Fassung (headless Edge). Aufruf: node verify/breite-messen.cjs [breite] */
"use strict";
const { spawn } = require("child_process");
const http = require("http");
const path = require("path");

const W = parseInt(process.argv[2] || "390", 10);
const URL = "file://" + path.join(__dirname, "..", "index.html").replace(/\\/g, "/");
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9372;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const httpJSON = (u) => new Promise((res, rej) => http.get(u, (r) => { let d = ""; r.on("data", (c) => (d += c)); r.on("end", () => res(JSON.parse(d))); }).on("error", rej));

(async () => {
  const edge = spawn(EDGE, ["--headless=new", "--user-data-dir=" + require("os").tmpdir() + "\\edge-bm-" + PORT, "--disable-gpu", "--no-first-run", "--remote-debugging-port=" + PORT, "--hide-scrollbars", "--allow-file-access-from-files", `--window-size=${W},900`, "about:blank"], { stdio: "ignore" });
  let t;
  for (let i = 0; i < 60; i++) { try { const l = await httpJSON(`http://localhost:${PORT}/json`); t = l.find((x) => x.type === "page" && x.webSocketDebuggerUrl); if (t) break; } catch (_) {} await sleep(250); }
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 0; const cbs = {};
  ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && cbs[m.id]) { cbs[m.id](m); delete cbs[m.id]; } };
  const send = (method, params = {}) => { const i = ++id; ws.send(JSON.stringify({ id: i, method, params })); return new Promise((r) => (cbs[i] = r)); };
  await send("Page.enable"); await send("Runtime.enable");
  await send("Page.navigate", { url: URL });
  await sleep(4000);
  const r = await send("Runtime.evaluate", { expression: `
    (() => {
      const vw = document.documentElement.clientWidth;
      const sw = document.documentElement.scrollWidth;
      const bad = [];
      for (const el of document.querySelectorAll('body *')) {
        const rect = el.getBoundingClientRect();
        if (rect.width > vw + 2 || rect.right > sw - 1 && rect.width > vw) {
          bad.push(Math.round(rect.width) + 'px  <' + el.tagName.toLowerCase() +
                   (el.className && typeof el.className === 'string' ? ' class="' + el.className.slice(0,60) + '"' : '') + '>');
        }
      }
      return 'viewport=' + vw + ' scrollWidth=' + sw + '\\n' + bad.slice(0, 15).join('\\n');
    })()`, returnByValue: true });
  console.log(r.result.result.value);
  edge.kill();
  process.exit(0);
})();
