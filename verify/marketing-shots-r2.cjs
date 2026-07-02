#!/usr/bin/env node
/* marketing-shots-r2.cjs — Runde 2 bereinigter Marketing-Screenshots (Port 9365).
   Baut auf marketing-shots.cjs/-mobile.cjs (Runde 1) auf. Korrekturen:
   1) Art.-50-Notiz (#xdab-art50-notice) auch auf DESKTOP ausblenden (per CSS !important,
      da der _ext-Observer sie bei remove() neu anlegen würde). Der Badge .xdab-art50-mark
      in Chat-Antworten bleibt sichtbar.
   2) Schwarzer ovaler Fleck im Chat-Header: die pulsierende Status-LED
      (.model-picker .model-dot, animation:pulse + box-shadow-Glow) erzeugt im
      Headless-Compositing eine eigene dunkle Layer-Box über dem backdrop-filter-Glas.
      Fix: Animation + Glow einfrieren → statischer grüner Punkt. */
"use strict";
const { spawn } = require("child_process");
const http = require("http");
const fs = require("fs");
const path = require("path");

const URL = "file:///tmp/xdab-live/xdab-workspace.html";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9365;
const OUT = "/Users/davidoff/xdab-landing-redesign/assets/raw";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const httpJSON = (u) => new Promise((res, rej) => http.get(u, (r) => { let d = ""; r.on("data", (c) => (d += c)); r.on("end", () => res(JSON.parse(d))); }).on("error", rej));

class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.cbs = {}; ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && this.cbs[m.id]) { this.cbs[m.id](m); delete this.cbs[m.id]; } }; }
  send(method, params = {}) { const id = ++this.id; this.ws.send(JSON.stringify({ id, method, params })); return new Promise((r) => (this.cbs[id] = r)); }
  async evalJS(expr) { const r = await this.send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true }); return r.result && r.result.result ? r.result.result.value : (r.result && r.result.exceptionDetails ? "EXC:" + JSON.stringify(r.result.exceptionDetails.text) : undefined); }
}

/* Bereinigung Runde 2: Runde 1 + Art.-50-Notiz überall + Dot-Fix als CSS-Regel. */
const CLEAN = `(function(){
  var done=[];
  try{
    if(!document.getElementById('xdab-shot-style')){
      var st=document.createElement('style'); st.id='xdab-shot-style';
      st.textContent='#xdab-art50-notice{display:none!important}'
        +'.model-picker .model-dot{animation:none!important;box-shadow:none!important}';
      document.head.appendChild(st); done.push('shot-style');
    }
  }catch(_){}
  try{ if(typeof welcomeClose==='function'){welcomeClose();done.push('welcomeClose');} }catch(_){}
  try{ var ov=document.getElementById('welcomeOverlay'); if(ov){ov.classList.remove('visible');ov.style.display='none';} }catch(_){}
  try{ var b=document.getElementById('onboardingBanner'); if(b&&b.style.display!=='none'){b.style.display='none';done.push('banner');} }catch(_){}
  try{ window.XDAB_BUILD=''; var bm=document.getElementById('xdab-build'); if(bm){bm.textContent='';bm.style.display='none';done.push('build');} }catch(_){}
  try{ var g=document.getElementById('xdab-greet'); if(g&&/\\bUser\\b/.test(g.textContent)){g.textContent=g.textContent.replace(/\\bUser\\b/,'Dr. Weber');done.push('greet');} }catch(_){}
  try{ [].forEach.call(document.querySelectorAll('.toast,.upd-toast,#updToast'),function(t){t.style.display='none';}); }catch(_){}
  return done.join(',')||'ok';
})()`;

const SEED_PROFILE = `(function(){
  try{
    localStorage.setItem('xdab-welcome-done','1');
    localStorage.setItem('xdab-profile-v1', JSON.stringify({displayName:'Dr. Weber',email:'',company:'Kanzlei Weber & Partner',role:'Partnerin',onboardingDone:true}));
    return 'seeded';
  }catch(e){ return 'ERR:'+e.message; }
})()`;

const EXPAND_CHIPS = `(function(){ var w=document.getElementById('xdab-skills-wrap'); if(w){w.classList.remove('collapsed'); if(window.__xdabPeek){clearTimeout(window.__xdabPeek);window.__xdabPeek=null;} return 'expanded';} return 'no-wrap'; })()`;

/* Demo-Konversation für m-chat (wie Runde 1, Modus Experten-Team aktiv). */
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
  /* Ext-Panel öffnen + Text-Probe (Hardware-Preis-/Leer-Check) */
  async function panelShot(panelId, fileName) {
    const r = await cdp.evalJS("(function(){try{openPanel('" + panelId + "');return 'ok'}catch(e){return 'ERR:'+e.message}})()");
    console.log("open " + panelId + ":", r);
    await sleep(1400); // Panel-Render + evtl. Ladeindikatoren
    await cdp.evalJS(CLEAN);
    const txt = await cdp.evalJS("(function(){var c=document.getElementById('panelContent');return c?c.innerText.slice(0,4000):''})()");
    fs.writeFileSync("/tmp/xdab-live/panel-" + panelId + ".txt", String(txt || ""));
    const empty = !txt || String(txt).trim().length < 40;
    const hw = /vram|ab ~|€\/h|4090|H100|RTX|Strix|NUC/i.test(String(txt || ""));
    console.log("panel " + panelId + ": len=" + String(txt || "").trim().length + (empty ? " LEER!" : "") + (hw ? " HARDWARE-BEGRIFFE (pruefen!)" : ""));
    await shot(fileName);
  }

  /* ---- Profil einmalig seeden (localStorage auf file://-Origin), dann frisch laden ---- */
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 2, mobile: false });
  await cdp.send("Page.navigate", { url: URL });
  await sleep(2500);
  console.log("seed:", await cdp.evalJS(SEED_PROFILE));

  /* ================= DESKTOP 1440x900 — RETAKES ================= */
  await nav(4500);
  console.log("chips:", await cdp.evalJS(EXPAND_CHIPS));
  await sleep(900);
  await cdp.evalJS(CLEAN);
  await shot("d-home");

  await panelShot("vergleich", "d-vergleich");
  await panelShot("security", "d-security");
  await panelShot("agenten", "d-agenten");

  /* ================= DESKTOP — NEUE EXT-PANELS ================= */
  await panelShot("schwarm", "d-schwarm");
  await panelShot("kosten", "d-kosten");
  await panelShot("tierrouter", "d-tierrouter");
  await panelShot("erklaer", "d-concierge");
  await panelShot("audit", "d-audit");
  await panelShot("katalog", "d-katalog");

  /* ================= MOBIL 390x844 — m-chat RETAKE ================= */
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await nav(4500);
  await cdp.evalJS(EXPAND_CHIPS);
  await sleep(900);
  await cdp.evalJS(CLEAN);
  console.log("demo-chat:", await cdp.evalJS(DEMO_CHAT));
  await sleep(900);
  await cdp.evalJS(CLEAN);
  /* Kontrolle: keine fixen Elemente über dem Composer außer erlaubten */
  const fixedChk = await cdp.evalJS(`(function(){
    var bad=[];
    [].forEach.call(document.body.querySelectorAll('*'),function(el){
      var cs=getComputedStyle(el);
      if(cs.position==='fixed'&&cs.display!=='none'&&cs.visibility!=='hidden'){
        var r=el.getBoundingClientRect();
        if(r.width>0&&r.height>0&&r.bottom>600&&r.top>500&&!el.closest('.input-area,.composer,#composer,.top-bar,.app'))
          bad.push((el.id||el.className||el.tagName)+' @'+Math.round(r.top));
      }
    });
    return bad.slice(0,10).join(' | ')||'keine';
  })()`);
  console.log("fixed-ueber-composer:", fixedChk);
  await shot("m-chat");

  ws.close(); chrome.kill(); process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
