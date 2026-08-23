#!/usr/bin/env node
/* element-foto.cjs — scrollt zu einem Selektor und fotografiert den Viewport.
   Aufruf: node verify/element-foto.cjs "#ablauf" out.png [breite] [hoehe] [#hash] */
"use strict";
const { spawn } = require("child_process");
const http = require("http");
const path = require("path");
const fs = require("fs");

const SEL = process.argv[2] || "body";
const OUT = process.argv[3] || "foto.png";
const W = parseInt(process.argv[4] || "520", 10);
const H = parseInt(process.argv[5] || "1200", 10);
const HASH = process.argv[6] || "";
const URL = "file://" + path.join(__dirname, "..", "index.html").split(path.sep).join("/") + HASH;
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const PORT = 9374;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const httpJSON = (u) => new Promise((res, rej) => http.get(u, (r) => { let d = ""; r.on("data", (c) => (d += c)); r.on("end", () => res(JSON.parse(d))); }).on("error", rej));

(async () => {
  const edge = spawn(EDGE, ["--headless=new", "--user-data-dir=" + path.join(require("os").tmpdir(), "edge-ef-" + PORT), "--disable-gpu", "--no-first-run", "--remote-debugging-port=" + PORT, "--hide-scrollbars", "--allow-file-access-from-files", `--window-size=${W},${H}`, "about:blank"], { stdio: "ignore" });
  let t; for (let i = 0; i < 60; i++) { try { const l = await httpJSON(`http://localhost:${PORT}/json`); t = l.find((x) => x.type === "page" && x.webSocketDebuggerUrl); if (t) break; } catch (_) {} await sleep(250); }
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 0; const cbs = {};
  ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && cbs[m.id]) { cbs[m.id](m); delete cbs[m.id]; } };
  const send = (method, params = {}) => { const i = ++id; ws.send(JSON.stringify({ id: i, method, params })); return new Promise((r) => (cbs[i] = r)); };
  await send("Page.enable"); await send("Runtime.enable");
  await send("Page.navigate", { url: URL });
  await sleep(4500);
  await send("Runtime.evaluate", { expression: `var el=document.querySelector(${JSON.stringify(SEL)}); if(el){el.scrollIntoView({block:'start'})}` });
  await sleep(1200);
  const shot = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(OUT, Buffer.from(shot.result.data, "base64"));
  console.log("gespeichert:", OUT);
  edge.kill(); process.exit(0);
})();
