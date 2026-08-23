"use strict";
const { spawn } = require("child_process");
const http = require("http");
const fs = require("fs");
const path = require("path");
const URL0 = process.argv[2] || "https://xdab-ki.de/xdab-workspace.html";
const OUT = process.argv[3] || "ws.png";
const W = parseInt(process.argv[4] || "390", 10);
const H = parseInt(process.argv[5] || "844", 10);
const EXPR = process.argv[6] || "";
const WAIT = parseInt(process.argv[7] || "2500", 10);
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const PORT = 9376;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const httpJSON = (u) => new Promise((res, rej) => http.get(u, (r) => { let d = ""; r.on("data", (c) => (d += c)); r.on("end", () => res(JSON.parse(d))); }).on("error", rej));
(async () => {
  const edge = spawn(EDGE, ["--headless=new", "--user-data-dir=" + path.join(require("os").tmpdir(), "edge-ws-" + PORT), "--disable-gpu", "--no-first-run", "--remote-debugging-port=" + PORT, "--hide-scrollbars", `--window-size=${W},${H}`, "about:blank"], { stdio: "ignore" });
  let t; for (let i = 0; i < 60; i++) { try { const l = await httpJSON(`http://localhost:${PORT}/json`); t = l.find((x) => x.type === "page" && x.webSocketDebuggerUrl); if (t) break; } catch (_) {} await sleep(250); }
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 0; const cbs = {};
  ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && cbs[m.id]) { cbs[m.id](m); delete cbs[m.id]; } };
  const send = (method, params = {}) => { const i = ++id; ws.send(JSON.stringify({ id: i, method, params })); return new Promise((r) => (cbs[i] = r)); };
  await send("Page.enable"); await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 2, mobile: W < 700 });
  await send("Page.navigate", { url: URL0 });
  await sleep(4500);
  if (EXPR) { await send("Runtime.evaluate", { expression: EXPR, awaitPromise: true }); await sleep(WAIT); }
  const CX = parseInt(process.argv[8] || "0", 10), CY = parseInt(process.argv[9] || "0", 10);
  if (CX && CY) {
    for (const type of ["mousePressed", "mouseReleased"])
      await send("Input.dispatchMouseEvent", { type, x: CX, y: CY, button: "left", clickCount: 1 });
    await sleep(1500);
  }
  const shot = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(OUT, Buffer.from(shot.result.data, "base64"));
  console.log("ok:", OUT);
  edge.kill(); process.exit(0);
})();
