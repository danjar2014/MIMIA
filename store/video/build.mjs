// Vidéo publicitaire RobotKids : node build.mjs fr|en  ->  C:/gtmp/ad/out/RobotKids-ad-<lang>.mp4 (1920×1080, 30 i/s)
import { spawn, execFileSync } from "node:child_process";
import { writeFileSync, readFileSync, mkdirSync, rmSync } from "node:fs";
const lang = process.argv[2] || "fr", D = "C:/gtmp/ad", FPS = 30;
const ROOT = "C:/Users/BelhassenM'BARKI/Documents/Codex/2026-10-30/files-pasted-by-the-user-tu/outputs/Robotique-Junior";
const dur = JSON.parse(readFileSync(`${D}/vo/dur-fr-en.json`, "utf8"));
const T = {
  fr: { tag: "Robots, code et jeux<br>pour les 3 à 12 ans", s: [
      ["3 – 6 ans", "Des jeux de style Montessori", "Tout est dit à voix haute : pas besoin de savoir lire."],
      ["6 – 8 ans", "Guider un robot avec des blocs", "Les premiers programmes, pas à pas."],
      ["8 – 12 ans", "Des circuits et du vrai code", "Capteurs, moteurs, Python et JavaScript."]],
    par: "Pensé pour les parents", b: [["🚫", "Sans publicité"], ["🔒", "Aucune donnée collectée"], ["✈️", "Fonctionne sans Internet"]],
    cta: "7 jours d'essai gratuit", store: "Disponible sur Google Play", fine: "Puis abonnement mensuel ou annuel. Annulable à tout moment." },
  en: { tag: "Robots, coding and games<br>for ages 3 to 12", s: [
      ["Ages 3 – 6", "Montessori-style games", "Everything is spoken aloud: no reading needed."],
      ["Ages 6 – 8", "Guide a robot with blocks", "First programs, step by step."],
      ["Ages 8 – 12", "Circuits and real code", "Sensors, motors, Python and JavaScript."]],
    par: "Made for parents", b: [["🚫", "No ads"], ["🔒", "No data collected"], ["✈️", "Works offline"]],
    cta: "7-day free trial", store: "Available on Google Play", fine: "Then a monthly or yearly subscription. Cancel any time." },
}[lang];
const LEAD = 0.45, TAIL = 0.65;
const len = [0, 1, 2, 3, 4, 5].map(i => Math.max(3.4, dur[lang + i] + LEAD + TAIL)); len[5] += 1.2;
const start = len.map((_, i) => len.slice(0, i).reduce((a, b) => a + b, 0)), total = len.reduce((a, b) => a + b, 0);
const img = n => `file:///${D}/shots/${lang}-${n}.png`, icon = `file:///C:/gtmp/bolt/out/bolt-celebrate.png`;
const phones = (list, h) => list.map((n, i) => `<div class="ph" data-i="${i}" data-n="${list.length}" style="--h:${h}px"><img src="${img(n)}"></div>`).join("");
const age = (i, list, h, col) => `<section class="sc split" style="--c:${col}"><div class="txt"><span class="pill a1">${T.s[i][0]}</span><h2 class="a2">${T.s[i][1]}</h2><p class="a3">${T.s[i][2]}</p></div><div class="stage">${phones(list, h)}</div></section>`;
const html = `<!doctype html><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0}html,body{width:1920px;height:1080px;overflow:hidden}
body{font-family:"Segoe UI",system-ui,sans-serif;color:#e8f4ff;background:#0b1030 url(file:///C:/gtmp/ad/space.jpg) center/cover no-repeat}.cloud,.sun{display:none}
.cloud{position:absolute;background:#fff;border-radius:999px;opacity:.75;filter:blur(1px)}
.sun{position:absolute;right:120px;top:70px;width:170px;height:170px;border-radius:50%;background:radial-gradient(#ffe36b,#ffc93c);box-shadow:0 0 90px 30px rgba(255,220,90,.55)}
.sc{position:absolute;inset:0;opacity:0}
.center{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
.logo{width:640px;height:640px;margin:-80px 0 -80px;filter:drop-shadow(0 0 34px rgba(45,226,230,.55))}
h1{font-size:150px;font-weight:900;letter-spacing:-3px;margin-top:-20px;color:#e8f4ff;text-shadow:0 0 30px rgba(45,226,230,.45)}h1 b{color:#ff7a3d}
.tagl{font-size:60px;font-weight:700;line-height:1.2;margin-top:10px;color:#6fe9ee}
.split .txt{position:absolute;left:100px;top:0;bottom:0;width:800px;display:flex;flex-direction:column;justify-content:center;align-items:flex-start}
.pill{background:var(--c);color:#fff;font-weight:900;font-size:54px;padding:12px 40px;border-radius:999px;box-shadow:0 10px 24px rgba(0,0,0,.18)}
h2{font-size:86px;font-weight:900;line-height:1.08;margin-top:38px;color:#fff}
.split p{font-size:44px;font-weight:600;line-height:1.3;margin-top:30px;color:#cfe0ff}
.stage{position:absolute;left:980px;right:40px;top:0;bottom:0}
.ph{position:absolute;top:50%;left:50%;height:var(--h);aspect-ratio:9/16;border-radius:46px;background:#05071c;padding:13px;box-shadow:0 0 0 3px #2de2e6,0 0 46px rgba(45,226,230,.5)}
.ph img{width:100%;height:100%;object-fit:cover;border-radius:34px;display:block}
.par h2{margin:0 0 70px;font-size:104px}.bd:nth-child(2){border-color:#ff5fd2;box-shadow:0 0 34px rgba(255,95,210,.45)}.bd:nth-child(3){border-color:#ffc93c;box-shadow:0 0 34px rgba(255,201,60,.4)}
.badges{display:flex;gap:56px}
.bd{width:500px;height:400px;background:rgba(20,26,82,.94);border:4px solid #2de2e6;border-radius:52px;box-shadow:0 0 34px rgba(45,226,230,.45);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:26px}
.bd i{font-style:normal;font-size:130px;line-height:1}.bd span{font-size:50px;font-weight:800;color:#e8f4ff;padding:0 30px;line-height:1.15}
.cta .logo{width:440px;height:440px;margin:-60px 0 -56px}.cta h1{font-size:120px;margin-top:-16px}
.btn{margin-top:36px;background:#ff7a3d;color:#fff;font-size:84px;font-weight:900;padding:26px 76px;border-radius:999px;box-shadow:0 18px 40px rgba(255,122,61,.45)}
.store{margin-top:36px;font-size:56px;font-weight:800;color:#e8f4ff}.fine{margin-top:14px;font-size:34px;font-weight:600;color:#b9c8f5}
.url{margin-top:22px;font-size:36px;font-weight:700;color:#6fe9ee}
</style><body>
<div class="sun"></div>
<div class="cloud" data-v="14" style="left:120px;top:110px;width:330px;height:92px"></div><div class="cloud" data-v="9" style="left:980px;top:210px;width:240px;height:70px"></div>
<div class="cloud" data-v="18" style="left:520px;top:880px;width:380px;height:100px"></div><div class="cloud" data-v="11" style="left:1500px;top:820px;width:280px;height:80px"></div>
<section class="sc center"><img class="logo a1" src="${icon}"><h1 class="a2">Robot<b>Kids</b></h1><div class="tagl a3">${T.tag}</div></section>
${age(0, ["lesson", "home3", "colors"], 700, "#ff8a3d")}
${age(1, ["home6", "program"], 800, "#2f9e5b")}
${age(2, ["build", "code"], 800, "#3b74e0")}
<section class="sc center par"><h2 class="a1">${T.par}</h2><div class="badges">${T.b.map((b, i) => `<div class="bd" data-i="${i}"><i>${b[0]}</i><span>${b[1]}</span></div>`).join("")}</div></section>
<section class="sc center cta"><img class="logo a1" src="${icon}"><h1 class="a1">Robot<b>Kids</b></h1><div class="btn a2">${T.cta}</div><div class="store a3">${T.store}</div><div class="fine a3">${T.fine}</div><div class="url a3">robotkids.robotkids.workers.dev</div></section>
<script>
const START=${JSON.stringify(start)},LEN=${JSON.stringify(len)},scs=[...document.querySelectorAll(".sc")];
const cl=(x,a=0,b=1)=>Math.min(b,Math.max(a,x)),ease=x=>1-Math.pow(1-cl(x),3),back=x=>{x=cl(x);const c=1.70158;return 1+(c+1)*Math.pow(x-1,3)+c*Math.pow(x-1,2)};
window.render=t=>{
  document.querySelectorAll(".cloud").forEach(c=>c.style.transform="translateX("+(t*c.dataset.v)+"px)");
  scs.forEach((s,k)=>{
    const u=t-START[k],L=LEN[k],last=k===scs.length-1;
    if(u<0||u>=L){s.style.opacity=0;return}
    const out=last?0:ease((u-(L-.35))/.35);
    s.style.opacity=Math.min(ease(u/.3),1-out);s.style.transform="translateX("+(-70*out)+"px)";
    [["a1",0],["a2",.18],["a3",.36]].forEach(([c,d])=>s.querySelectorAll("."+c).forEach(e=>{const p=ease((u-d)/.55);e.style.opacity=p;
      e.style.transform=e.classList.contains("logo")||e.classList.contains("btn")?"scale("+(.6+.4*back((u-d)/.6))+")":"translateY("+(46*(1-p))+"px)"}));
    s.querySelectorAll(".ph").forEach(e=>{const i=+e.dataset.i,n=+e.dataset.n,p=ease((u-.15-i*.16)/.7),mid=(n-1)/2,
      x=(i-mid)*(n===3?255:410),rot=(i-mid)*(n===3?7:5),y=Math.abs(i-mid)*(n===3?46:0)+(n===2?(i?34:-34):0)+Math.sin(u*1.1+i*1.7)*9+(1-p)*420;
      e.style.zIndex=n===3&&i===1?3:1;e.style.opacity=cl(p*1.6);e.style.transform="translate(-50%,-50%) translate("+x+"px,"+y+"px) rotate("+rot+"deg) scale("+(1+u*.006)+")"});
    s.querySelectorAll(".bd").forEach(e=>{const d=.35+e.dataset.i*.75,p=(u-d)/.5;e.style.opacity=ease(p);e.style.transform="scale("+(.5+.5*back(p))+")"});
  });
};render(0);
</script>`;
writeFileSync(`${D}/ad-${lang}.html`, html);
mkdirSync(`${D}/out`, { recursive: true });

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe", PORT = 9334;
rmSync("C:/gtmp/chrome-prof-ad", { recursive: true, force: true });
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${PORT}`, "--user-data-dir=C:/gtmp/chrome-prof-ad", "--no-first-run", "--hide-scrollbars", "--mute-audio", "--allow-file-access-from-files", "about:blank"], { stdio: "ignore" });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tabs.length) break; } catch (e) {} await sleep(500); }
const ws = new WebSocket(tabs.find(t => t.type === "page").webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send("Page.enable"); await send("Emulation.setDeviceMetricsOverride", { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
await send("Page.navigate", { url: `file:///${D}/ad-${lang}.html` }); await sleep(2500);
const grab = async t => { await send("Runtime.evaluate", { expression: `render(${t})` }); return Buffer.from((await send("Page.captureScreenshot", { format: "jpeg", quality: 95 })).result.data, "base64"); };

if (process.argv[3] === "preview") {   // images de contrôle : milieu de chaque scène
  for (let k = 0; k < 6; k++) writeFileSync(`${D}/out/prev-${lang}-${k}.jpg`, await grab(start[k] + Math.min(len[k] - 0.6, 2.6)));
  chrome.kill(); ws.close(); process.exit(0);
}
const silent = `${D}/out/silent-${lang}.mp4`;
const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "17", "-pix_fmt", "yuv420p", "-r", String(FPS), silent], { stdio: ["pipe", "inherit", "inherit"] });
const N = Math.round(total * FPS);
for (let f = 0; f < N; f++) { const b = await grab(f / FPS); if (!ff.stdin.write(b)) await new Promise(r => ff.stdin.once("drain", r)); if (f % 150 === 0) console.log("image", f, "/", N); }
ff.stdin.end(); await new Promise(r => ff.on("close", r)); chrome.kill(); ws.close();

// son : musique douce + voix off calée au début de chaque scène
execFileSync("python", [`${D}/music.py`, String(total), `${D}/out/music.wav`]);
const ins = [], fl = []; [0, 1, 2, 3, 4, 5].forEach(i => { ins.push("-i", `${D}/vo/${lang}${i}.wav`); fl.push(`[${i + 2}:a]adelay=${Math.round((start[i] + LEAD) * 1000)}:all=1[v${i}]`); });
const filter = fl.join(";") + `;[1:a]volume=0.5[m];[m]${[0, 1, 2, 3, 4, 5].map(i => `[v${i}]`).join("")}amix=inputs=7:normalize=0:duration=first,alimiter=limit=0.95[a]`;
const out = `${D}/out/RobotKids-ad-${lang}.mp4`;
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", silent, "-i", `${D}/out/music.wav`, ...ins, "-filter_complex", filter, "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "-t", total.toFixed(2), out]);
console.log("FINI", out, total.toFixed(1) + " s"); process.exit(0);
