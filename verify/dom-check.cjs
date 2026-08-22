"use strict";
const { spawn } = require("child_process");
const http = require("http");
const path = require("path");
const EXPR = process.argv[2] || "document.title";
const HASH = process.argv[3] || "";
const URL = "file://" + path.join(__dirname, "..", "index.html").split(path.sep).join("/") + HASH;
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const PORT = 9373;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const httpJSON = (u) => new Promise((res, rej) => http.get(u, (r) => { let d = ""; r.on("data", (c) => (d += c)); r.on("end", () => res(JSON.parse(d))); }).on("error", rej));
(async () => {
  const edge = spawn(EDGE, ["--headless=new", "--user-data-dir=" + path.join(require("os").tmpdir(), "edge-dc-" + PORT), "--disable-gpu", "--no-first-run", "--remote-debugging-port=" + PORT, "--allow-file-access-from-files", "--window-size=1440,900", "about:blank"], { stdio: "ignore" });
  let t; for (let i = 0; i < 60; i++) { try { const l = await httpJSON(`http://localhost:${PORT}/json`); t = l.find((x) => x.type === "page" && x.webSocketDebuggerUrl); if (t) break; } catch (_) {} await sleep(250); }
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 0; const cbs = {}; const errs = [];
  ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && cbs[m.id]) { cbs[m.id](m); delete cbs[m.id]; } else if (m.method === "Runtime.exceptionThrown") { errs.push(JSON.stringify(m.params).slice(0, 200)); } };
  const send = (method, params = {}) => { const i = ++id; ws.send(JSON.stringify({ id: i, method, params })); return new Promise((r) => (cbs[i] = r)); };
  await send("Page.enable"); await send("Runtime.enable");
  await send("Page.navigate", { url: URL });
  await sleep(4000);
  const r = await send("Runtime.evaluate", { expression: EXPR, returnByValue: true });
  console.log(JSON.stringify(r.result.result ? r.result.result.value : r.result, null, 1));
  if (errs.length) console.log("JS-FEHLER:", errs.join("\n"));
  edge.kill(); process.exit(0);
})();
