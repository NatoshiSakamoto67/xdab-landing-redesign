#!/usr/bin/env node
/* retake-concierge.cjs — d-concierge mit Fix für doppelt-escapte Textknoten (Port 9366). */
"use strict";
const { spawn } = require("child_process");
const http = require("http");
const fs = require("fs");

const URL = "file:///tmp/xdab-live/xdab-workspace.html";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9366;
const OUT = "/Users/davidoff/xdab-landing-redesign/assets/raw";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const httpJSON = (u) => new Promise((res, rej) => http.get(u, (r) => { let d = ""; r.on("data", (c) => (d += c)); r.on("end", () => res(JSON.parse(d))); }).on("error", rej));

class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.cbs = {}; ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && this.cbs[m.id]) { this.cbs[m.id](m); delete this.cbs[m.id]; } }; }
  send(method, params = {}) { const id = ++this.id; this.ws.send(JSON.stringify({ id, method, params })); return new Promise((r) => (this.cbs[id] = r)); }
  async evalJS(expr) { const r = await this.send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true }); return r.result && r.result.result ? r.result.result.value : undefined; }
}

const CLEAN = `(function(){
  try{
    if(!document.getElementById('xdab-shot-style')){
      var st=document.createElement('style'); st.id='xdab-shot-style';
      st.textContent='#xdab-art50-notice{display:none!important}'
        +'.model-picker .model-dot{animation:none!important;box-shadow:none!important}';
      document.head.appendChild(st);
    }
  }catch(_){}
  try{ if(typeof welcomeClose==='function') welcomeClose(); }catch(_){}
  try{ var ov=document.getElementById('welcomeOverlay'); if(ov){ov.classList.remove('visible');ov.style.display='none';} }catch(_){}
  try{ var b=document.getElementById('onboardingBanner'); if(b) b.style.display='none'; }catch(_){}
  try{ window.XDAB_BUILD=''; var bm=document.getElementById('xdab-build'); if(bm){bm.textContent='';bm.style.display='none';} }catch(_){}
  try{ [].forEach.call(document.querySelectorAll('.toast,.upd-toast,#updToast'),function(t){t.style.display='none';}); }catch(_){}
  return 'ok';
})()`;

/* Doppelt-escapte Textknoten glätten: &amp; -> & und literalen <strong>-Tag-Text entfernen. */
const FIX_ESC = `(function(){
  var c=document.getElementById('panelContent'); if(!c) return 'no-content';
  var n=0, w=document.createTreeWalker(c, NodeFilter.SHOW_TEXT);
  while(w.nextNode()){
    var t=w.currentNode, v=t.nodeValue;
    if(/&amp;|<\\/?strong>/.test(v)){ t.nodeValue=v.replace(/&amp;/g,'&').replace(/<\\/?strong>/g,''); n++; }
  }
  return 'fixed:'+n;
})()`;

(async () => {
  const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--no-first-run", "--remote-debugging-port=" + PORT, "--hide-scrollbars", "about:blank"], { stdio: "ignore" });
  let t;
  for (let i = 0; i < 50; i++) { try { const l = await httpJSON(`http://localhost:${PORT}/json`); t = l.find((x) => x.type === "page" && x.webSocketDebuggerUrl); if (t) break; } catch (_) {} await sleep(250); }
  if (!t) throw new Error("Kein CDP-Target gefunden");
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  const cdp = new CDP(ws);
  await cdp.send("Page.enable"); await cdp.send("Runtime.enable");
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 2, mobile: false });
  await cdp.send("Page.navigate", { url: URL });
  await sleep(2500);
  await cdp.evalJS(`(function(){try{localStorage.setItem('xdab-welcome-done','1');localStorage.setItem('xdab-profile-v1',JSON.stringify({displayName:'Dr. Weber',email:'',company:'Kanzlei Weber & Partner',role:'Partnerin',onboardingDone:true}));return 'ok'}catch(e){return e.message}})()`);
  await cdp.send("Page.navigate", { url: URL });
  await sleep(4500);
  await cdp.evalJS(CLEAN);
  await sleep(900);
  await cdp.evalJS(CLEAN);
  console.log("open erklaer:", await cdp.evalJS("(function(){try{openPanel('erklaer');return 'ok'}catch(e){return 'ERR:'+e.message}})()"));
  await sleep(1400);
  await cdp.evalJS(CLEAN);
  console.log("fix-esc:", await cdp.evalJS(FIX_ESC));
  const chk = await cdp.evalJS("(function(){var c=document.getElementById('panelContent');return c&&/&amp;|<strong>/.test(c.innerText)?'NOCH-DA':'sauber'})()");
  console.log("check:", chk);
  const s = await cdp.send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(OUT + "/d-concierge.png", Buffer.from(s.result.data, "base64"));
  console.log("shot: d-concierge");
  ws.close(); chrome.kill(); process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
