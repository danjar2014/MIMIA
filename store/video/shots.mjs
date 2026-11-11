// Captures d'écran pour la fiche Google Play (téléphone, 1080 × 1920) : lance Chrome sans fenêtre, ouvre l'appli servie sur http://localhost:8123 et clique à travers.
// Usage : (serveur web sur le dossier de l'appli)  node store/make-screenshots.mjs
import { spawn } from "node:child_process";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe", PORT = 9333, URL0 = "http://localhost:8123/index.html";
rmSync("C:/gtmp/chrome-prof", { recursive: true, force: true });
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${PORT}`, "--user-data-dir=C:/gtmp/chrome-prof", "--no-first-run", "--hide-scrollbars", "--mute-audio", "about:blank"], { stdio: "ignore" });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tabs.length) break; } catch (e) {} await sleep(500); }
const ws = new WebSocket(tabs.find(t => t.type === "page").webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async js => (await send("Runtime.evaluate", { expression: js, awaitPromise: true, returnByValue: true })).result?.result?.value;
await send("Page.enable"); await send("Emulation.setDeviceMetricsOverride", { width: 540, height: 960, deviceScaleFactor: 2, mobile: true });
const shot = async name => { const r = await send("Page.captureScreenshot", { format: "png" }); writeFileSync(`C:/gtmp/ad/shots/${name}.png`, Buffer.from(r.result.data, "base64")); console.log("ok", name); };
mkdirSync("C:/gtmp/ad/shots", { recursive: true });
const nav = async url => { await send("Page.navigate", { url }); await sleep(1500); };
const seed = async (lang, age, name) => {
  await nav(URL0);
  await ev(`(async () => { localStorage.clear(); localStorage.setItem("robotique-junior-lang", ${JSON.stringify(lang)});
    localStorage.setItem("robotique-junior-global", JSON.stringify({pin:{salt:"a",hash:"b",rec:"c"},parentSetup:true,voice:false,sound:false,calm:true,scene:true,mascot:true,active:"p1",profiles:["p1"]}));
    const cards = {}; ["Défi","Parcours","Badges","S'entraîner","Découvrir","Programmer","Puzzle","Construire","Coder","Capteurs","Créer","Plus loin","Mon robot","Créations"].forEach(n => cards[n] = "open");
    localStorage.setItem("robotique-junior-v1", JSON.stringify({name:${JSON.stringify(name)},sex:"f",age:${JSON.stringify(age)},placed:true,onboarded:true,robot:{},cards,startRank:${age === "z" ? 0 : 2}}));
    for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister(); for (const k of await caches.keys()) await caches.delete(k); return "ok"; })()`);
  await nav(URL0); await sleep(1800);
  await ev(`document.querySelector(".splash")?.click(); 1`); await sleep(1500);
  await ev(`document.querySelector(".installbar")?.remove(); document.body.classList.remove("hasinstall"); document.querySelector(".wchild")?.click(); 1`); await sleep(1200);
};
const click = async re => { await ev(`(() => { const b = [...document.querySelectorAll("#app button")].find(b => ${re}.test((b.getAttribute("aria-label")||"") + b.textContent)); if (b) b.click(); return !!b; })()`); await sleep(1100); };
const back = async () => { await ev(`document.querySelector("#dock .dockback")?.click(); 1`); await sleep(700); };



for (const [lang, name, L] of [["fr", "Léa", {days: /Jours/, colors: /Couleurs/, program: /Programmer/, build: /Construire/, code: /Coder/}], ["en", "Mia", {days: /Days/, colors: /Colou?rs/, program: /Program/, build: /Build/, code: /Code/}]]) {
  const re = r => r.toString();
  await seed(lang, "z", name); await shot(lang + "-home3");
  await click(re(L.days)); await sleep(3000); await shot(lang + "-lesson");
  await back(); await click(re(L.colors)); await ev(`document.querySelector(".ptplay")?.click(); 1`); await sleep(900); await shot(lang + "-colors");
  await seed(lang, "a", name); await shot(lang + "-home6"); await click(re(L.program)); await shot(lang + "-program");
  await seed(lang, "b", name); await click(re(L.build)); await sleep(1500); await shot(lang + "-build");
  await seed(lang, "c", name); await click(re(L.code)); await sleep(1500); await shot(lang + "-code");
}
chrome.kill(); ws.close(); process.exit(0);
