#!/usr/bin/env node
/* marketing-shots.cjs — bereinigte Marketing-Screenshots des XDAB-Arbeitsplatzes.
   CDP-Muster nach ~/xdab-tiering-lab/verify/mobile-shot.cjs / desk-shots-audit.cjs. */
"use strict";
const { spawn } = require("child_process");
const http = require("http");
const fs = require("fs");
const path = require("path");

const URL = "file:///tmp/xdab-live/xdab-workspace.html";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9361;
const OUT = "/Users/davidoff/xdab-landing-redesign/assets/raw";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const httpJSON = (u) => new Promise((res, rej) => http.get(u, (r) => { let d = ""; r.on("data", (c) => (d += c)); r.on("end", () => res(JSON.parse(d))); }).on("error", rej));

class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.cbs = {}; ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && this.cbs[m.id]) { this.cbs[m.id](m); delete this.cbs[m.id]; } }; }
  send(method, params = {}) { const id = ++this.id; this.ws.send(JSON.stringify({ id, method, params })); return new Promise((r) => (this.cbs[id] = r)); }
  async evalJS(expr) { const r = await this.send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true }); return r.result && r.result.result ? r.result.result.value : (r.result && r.result.exceptionDetails ? "EXC:" + JSON.stringify(r.result.exceptionDetails.text) : undefined); }
}

/* Bereinigung: Onboarding-Banner, Build-Zeile, Tutorial-Overlay, "User"-Platzhalter. */
const CLEAN = `(function(){
  var done=[];
  try{ if(typeof welcomeClose==='function'){welcomeClose();done.push('welcomeClose');} }catch(_){}
  try{ var ov=document.getElementById('welcomeOverlay'); if(ov){ov.classList.remove('visible');ov.style.display='none';} }catch(_){}
  try{ var b=document.getElementById('onboardingBanner'); if(b&&b.style.display!=='none'){b.style.display='none';done.push('banner');} }catch(_){}
  try{ window.XDAB_BUILD=''; var bm=document.getElementById('xdab-build'); if(bm){bm.textContent='';bm.style.display='none';done.push('build');} }catch(_){}
  try{ var g=document.getElementById('xdab-greet'); if(g&&/\\bUser\\b/.test(g.textContent)){g.textContent=g.textContent.replace(/\\bUser\\b/,'Dr. Weber');done.push('greet');} }catch(_){}
  try{ [].forEach.call(document.querySelectorAll('.toast,.upd-toast,#updToast'),function(t){t.style.display='none';}); }catch(_){}
  return done.join(',');
})()`;

const SEED_PROFILE = `(function(){
  try{
    localStorage.setItem('xdab-welcome-done','1');
    localStorage.setItem('xdab-profile-v1', JSON.stringify({displayName:'Dr. Weber',email:'',company:'Kanzlei Weber & Partner',role:'Partnerin',onboardingDone:true}));
    return 'seeded';
  }catch(e){ return 'ERR:'+e.message; }
})()`;

const EXPAND_CHIPS = `(function(){ var w=document.getElementById('xdab-skills-wrap'); if(w){w.classList.remove('collapsed'); if(window.__xdabPeek){clearTimeout(window.__xdabPeek);window.__xdabPeek=null;} return 'expanded';} return 'no-wrap'; })()`;

/* Demo-Konversation für m-chat (Modus Experten-Team aktiv). */
const DEMO_CHAT = `(function(){
  try{
    if(typeof xdabSetMode==='function' && (!window.xdabModes||window.xdabModes.indexOf('schwarm')<0)) xdabSetMode('schwarm');
    var w=document.querySelector('#chatMessages .welcome'); if(w) w.remove();
    var t=document.getElementById('currentChatTitle'); if(t) t.textContent='KI-Diktat in der Praxis';
    var msgs=document.getElementById('chatMessages'); if(!msgs) return 'no-msgs';
    if(document.getElementById('demo-conv')) return 'already';
    var user='<div class="message message-user" id="demo-conv"><div class="bubble">Wir wollen ein KI-Diktat- und Transkriptionstool f\\u00fcr Patientengespr\\u00e4che einf\\u00fchren. Worauf m\\u00fcssen wir achten?</div></div>';
    var body='<p><strong>Datenschutz (Art. 9 DSGVO):</strong> Gesundheitsdaten \\u2014 vor Einf\\u00fchrung ist eine DSFA n\\u00f6tig; Verarbeitung nur auf EU-Servern mit AVV.</p>'
      +'<p><strong>Berufsrecht (\\u00a7 203 StGB):</strong> Schweigepflicht gilt auch gegen\\u00fcber dem Anbieter \\u2014 lokale Verarbeitung oder \\u00a7203-f\\u00e4higer Auftragsverarbeiter.</p>'
      +'<p><strong>IT-Security:</strong> Ende-zu-Ende-Verschl\\u00fcsselung, Rollenkonzept, L\\u00f6schfristen f\\u00fcr Roh-Audio definieren.</p>'
      +'<p><strong>Synthese:</strong> Machbar \\u2014 EU-gehostetes Tool mit AVV + DSFA, Roh-Audio nach Transkription l\\u00f6schen, Team vor Rollout schulen.</p>';
    var asst='<div class="message message-assistant"><div class="msg-header"><span class="msg-model"><span style="width:6px;height:6px;border-radius:50%;background:#10a37f;display:inline-block;"></span>XDAB EU-Gateway</span><span class="msg-stats">4,2 s</span><span class="msg-cost">0,4 ct</span></div><div class="bubble">'+body+'</div></div>';
    msgs.insertAdjacentHTML('beforeend', user+asst);
    var area=document.getElementById('chatArea'); if(area) area.scrollTop=0;
    return 'seeded';
  }catch(e){ return 'ERR:'+e.message; }
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

  async function shot(name) {
    const s = await cdp.send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(OUT, name + ".png"), Buffer.from(s.result.data, "base64"));
    console.log("shot:", name);
  }
  async function nav(waitMs) {
    await cdp.send("Page.navigate", { url: URL });
    await sleep(waitMs || 4000);
    console.log("clean:", await cdp.evalJS(CLEAN));
    await sleep(900);
    await cdp.evalJS(CLEAN); // Self-healing-Renderer nachziehen
  }

  /* ---- Profil einmalig seeden (localStorage auf file://-Origin), dann frisch laden ---- */
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 2, mobile: false });
  await cdp.send("Page.navigate", { url: URL });
  await sleep(2500);
  console.log("seed:", await cdp.evalJS(SEED_PROFILE));

  /* ================= DESKTOP 1440x900 ================= */
  await nav(4500);
  console.log("chips:", await cdp.evalJS(EXPAND_CHIPS));
  await sleep(900);
  await cdp.evalJS(CLEAN);
  await shot("d-home");

  console.log("open vergleich:", await cdp.evalJS("(function(){try{openPanel('vergleich');return 'ok'}catch(e){return 'ERR:'+e.message}})()"));
  await sleep(1000); await cdp.evalJS(CLEAN);
  await shot("d-vergleich");

  console.log("open security:", await cdp.evalJS("(function(){try{openPanel('security');return 'ok'}catch(e){return 'ERR:'+e.message}})()"));
  await sleep(1000); await cdp.evalJS(CLEAN);
  await shot("d-security");

  console.log("open agenten:", await cdp.evalJS("(function(){try{openPanel('agenten');return 'ok'}catch(e){return 'ERR:'+e.message}})()"));
  await sleep(1000); await cdp.evalJS(CLEAN);
  await shot("d-agenten");

  /* ================= MOBIL 390x844 ================= */
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await nav(4500);
  await cdp.evalJS(EXPAND_CHIPS);
  await sleep(900);
  await cdp.evalJS(CLEAN);
  await shot("m-home");

  console.log("demo-chat:", await cdp.evalJS(DEMO_CHAT));
  await sleep(900);
  await cdp.evalJS(CLEAN);
  await shot("m-chat");

  console.log("open menu:", await cdp.evalJS("(function(){try{if(typeof closePanel==='function')closePanel();openMenu();return 'ok'}catch(e){return 'ERR:'+e.message}})()"));
  await sleep(1000); await cdp.evalJS(CLEAN);
  /* VRAM-/Preis-Check im sichtbaren Menü */
  const menuTxt = await cdp.evalJS("(function(){var m=document.getElementById('slideMenu');return m?m.innerText.slice(0,3000):''})()");
  const hasHw = /vram|€|\bEUR\b|preis/i.test(menuTxt || "");
  console.log("menu-hardware-check:", hasHw ? "HARDWARE/VRAM SICHTBAR" : "sauber");
  await shot("m-menu");
  fs.writeFileSync("/tmp/xdab-live/menu-text.txt", String(menuTxt || ""));

  ws.close(); chrome.kill(); process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
