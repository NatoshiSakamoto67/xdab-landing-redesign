const { spawn } = require("child_process");
const http = require("http");
const URL = "file:///Users/davidoff/xdab-landing-redesign/index.html";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9385;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const httpJSON = (u) => new Promise((res, rej) => http.get(u, (r) => { let d = ""; r.on("data", (c) => (d += c)); r.on("end", () => res(JSON.parse(d))); }).on("error", rej));
(async () => {
  const chrome = spawn(CHROME, ["--headless=new","--user-data-dir=/tmp/chrome-rc","--disable-gpu","--no-first-run","--remote-debugging-port="+PORT,"--allow-file-access-from-files","about:blank"],{stdio:"ignore"});
  let t; for (let i=0;i<50;i++){ try{ const l=await httpJSON(`http://localhost:${PORT}/json`); t=l.find(x=>x.type==="page"&&x.webSocketDebuggerUrl); if(t)break;}catch(_){} await sleep(250);}
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
  let id=0,cbs={};
  ws.onmessage=(e)=>{const m=JSON.parse(e.data);if(m.id&&cbs[m.id]){cbs[m.id](m);delete cbs[m.id];}};
  const send=(m2,p={})=>{const i=++id;ws.send(JSON.stringify({id:i,method:m2,params:p}));return new Promise(r=>cbs[i]=r);};
  const ev=async(x)=>{const r=await send("Runtime.evaluate",{expression:x,returnByValue:true,awaitPromise:true});return r.result&&r.result.result?r.result.result.value:undefined;};
  await send("Page.enable");await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride",{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  await send("Page.navigate",{url:URL}); await sleep(2500);
  const active=()=>ev(`document.querySelector('.lp-page.lp-active').getAttribute('data-page')`);
  let pass=0,fail=0;
  async function check(name,cond){ if(cond){pass++;console.log('OK  '+name);}else{fail++;console.log('FEHLER '+name);} }
  // 1) Nav "Leistungen" von der Pakete-Seite aus (war tot)
  await ev(`XDAB_showPage('pakete')`); await sleep(400);
  await ev(`document.querySelector('.nav-links a[href="#leistungen"]').click()`); await sleep(700);
  await check('Leistungen-Link von Pakete-Seite -> start', (await active())==='start');
  // 2) Hash wird gesetzt (teilbare URL)
  await ev(`XDAB_showPage('pakete')`); await sleep(300);
  await check('Hash nach Pakete-Nav', (await ev('location.hash'))==='#pakete');
  // 3) Back-Button kehrt zur Startseite zurueck
  await ev('history.back()'); await sleep(600);
  await check('Back-Button -> vorherige Ansicht', (await active())!=='pakete');
  // 4) Weiche: Mandat-Karte springt zu #mandat auf Pakete-Seite
  await ev(`XDAB_showPage('start')`); await sleep(300);
  await ev(`document.querySelector('.pw-card[href="#mandat"], a[href="#mandat"]')?null:null`); // Teaser-Karte
  await ev(`[].slice.call(document.querySelectorAll('a[href="#mandat"]'))[0].click()`); await sleep(800);
  await check('Teaser/Weiche -> Pakete-Seite (mandat)', (await active())==='pakete');
  await check('Mandat-Sektion existiert & sichtbar', await ev(`!!document.getElementById('mandat') && document.getElementById('mandat').offsetHeight>100`));
  // 5) Paket-Modal oeffnet aus gemeinsamer Datenquelle
  await ev(`document.querySelector('.pkg[data-pkg="workspace"]').click()`); await sleep(500);
  await check('Paket-Modal Workspace offen', await ev(`!document.getElementById('pkgModal').hidden`));
  await check('Modal zeigt 379', await ev(`document.getElementById('pkgModalBody').textContent.indexOf('379')>=0`));
  await check('Modal zeigt korrigierte Token-Zahl (~1.500)', await ev(`document.getElementById('pkgModalBody').textContent.indexOf('1.500')>=0`));
  await ev(`document.getElementById('pmClose').click()`); await sleep(200);
  // 6) Kein Warenkorb mehr
  await check('Kein Warenkorb-FAB', await ev(`document.querySelectorAll('.cart-fab').length===0`));
  // 7) Fokus-Karten & Glossar vorhanden
  await check('Fokus-Zeile (Security ohne KI 349)', await ev(`document.getElementById('fokusRow').textContent.indexOf('349')>=0`));
  await check('Glossar (id=module) vorhanden', await ev(`!!document.getElementById('module')`));
  // 8) Skip-Link + main
  await check('main-Landmark', await ev(`document.querySelectorAll('main').length===1`));
  console.log(`\n${pass} OK, ${fail} FEHLER`);
  ws.close(); chrome.kill(); process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1)});
