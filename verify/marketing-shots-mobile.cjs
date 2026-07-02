#!/usr/bin/env node
/* marketing-shots-mobile.cjs — Mobile-Nachbesserung: Art.-50-Notice (fixed, überlappt Composer)
   ausblenden + Chat-Verlauf im Menü mit Demo-Einträgen füllen. */
"use strict";
const { spawn } = require("child_process");
const http = require("http");
const fs = require("fs");
const path = require("path");

const URL = "file:///tmp/xdab-live/xdab-workspace.html";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9362;
const OUT = "/Users/davidoff/xdab-landing-redesign/assets/raw";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const httpJSON = (u) => new Promise((res, rej) => http.get(u, (r) => { let d = ""; r.on("data", (c) => (d += c)); r.on("end", () => res(JSON.parse(d))); }).on("error", rej));

class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.cbs = {}; ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && this.cbs[m.id]) { this.cbs[m.id](m); delete this.cbs[m.id]; } }; }
  send(method, params = {}) { const id = ++this.id; this.ws.send(JSON.stringify({ id, method, params })); return new Promise((r) => (this.cbs[id] = r)); }
  async evalJS(expr) { const r = await this.send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true }); return r.result && r.result.result ? r.result.result.value : undefined; }
}

const CLEAN = `(function(){
  try{ if(typeof welcomeClose==='function') welcomeClose(); }catch(_){}
  try{ var ov=document.getElementById('welcomeOverlay'); if(ov){ov.classList.remove('visible');ov.style.display='none';} }catch(_){}
  try{ var b=document.getElementById('onboardingBanner'); if(b) b.style.display='none'; }catch(_){}
  try{ window.XDAB_BUILD=''; var bm=document.getElementById('xdab-build'); if(bm){bm.textContent='';bm.style.display='none';} }catch(_){}
  try{ var g=document.getElementById('xdab-greet'); if(g&&/\\bUser\\b/.test(g.textContent)) g.textContent=g.textContent.replace(/\\bUser\\b/,'Dr. Weber'); }catch(_){}
  try{ var n=document.getElementById('xdab-art50-notice'); if(n) n.style.display='none'; }catch(_){}
  try{ [].forEach.call(document.querySelectorAll('.toast,#updToast'),function(t){t.style.display='none';}); }catch(_){}
  return 'ok';
})()`;

const EXPAND_CHIPS = `(function(){ var w=document.getElementById('xdab-skills-wrap'); if(w){w.classList.remove('collapsed'); if(window.__xdabPeek){clearTimeout(window.__xdabPeek);window.__xdabPeek=null;}} return 'ok'; })()`;

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

/* Demo-Chatverlauf ins Menü (rein DOM — deterministisch, keine IDB-Abhängigkeit). */
const SEED_MENU_CHATS = `(function(){
  try{
    var box=document.getElementById('chatList'); if(!box) return 'no-chatlist';
    var empty=document.getElementById('chatListEmpty'); if(empty) empty.style.display='none';
    if(box.querySelector('.menu-chat-item')) return 'already';
    var items=[
      ['AVV-Pr\\u00fcfung Dienstleister M\\u00fcller','Heute, 09:12'],
      ['DSFA: KI-Diktat in der Praxis','Heute, 08:41'],
      ['Security-Bericht Website','Gestern, 16:05']
    ];
    var html=items.map(function(it){
      return '<div class="menu-chat-item"><div class="menu-chat-row"><div class="menu-chat-texts">'
        +'<div class="menu-chat-title">'+it[0]+'</div>'
        +'<div class="menu-chat-time">'+it[1]+'</div>'
        +'</div></div></div>';
    }).join('');
    if(empty) empty.insertAdjacentHTML('beforebegin', html); else box.insertAdjacentHTML('beforeend', html);
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

  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await cdp.send("Page.navigate", { url: URL });
  await sleep(2500);
  await cdp.evalJS(`(function(){try{localStorage.setItem('xdab-welcome-done','1');localStorage.setItem('xdab-profile-v1',JSON.stringify({displayName:'Dr. Weber',email:'',company:'Kanzlei Weber & Partner',role:'Partnerin',onboardingDone:true}));return 'ok'}catch(e){return e.message}})()`);
  await cdp.send("Page.navigate", { url: URL });
  await sleep(4500);
  console.log("clean:", await cdp.evalJS(CLEAN));
  await cdp.evalJS(EXPAND_CHIPS);
  await sleep(900);
  await cdp.evalJS(CLEAN);
  await shot("m-home");

  console.log("demo-chat:", await cdp.evalJS(DEMO_CHAT));
  await sleep(900);
  await cdp.evalJS(CLEAN);
  await shot("m-chat");

  console.log("menu:", await cdp.evalJS("(function(){try{if(typeof closePanel==='function')closePanel();openMenu();return 'ok'}catch(e){return 'ERR:'+e.message}})()"));
  await sleep(1000);
  console.log("seed-menu:", await cdp.evalJS(SEED_MENU_CHATS));
  await sleep(400);
  await cdp.evalJS(CLEAN);
  await shot("m-menu");

  ws.close(); chrome.kill(); process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
