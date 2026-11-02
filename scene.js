// Le décor animé, en dessin animé : quatre petits mondes colorés qui bougent doucement derrière l'appli
// (ciel, espace, atelier, fête). Rien de lourd : des formes SVG qui flottent, tournent ou scintillent (transform et opacity seulement).
// Il se fige en mode calme, si le système demande moins d'animations, ou si le décor est coupé dans les réglages.
import { S } from "./util.js";

const BG = {
  sky: "linear-gradient(180deg,#5cc8ff 0%,#9fe0ff 45%,#d9f4ff 72%,#bff0a8 100%)",
  space: "linear-gradient(180deg,#1b1464 0%,#3a1c8c 55%,#7b2cbf 100%)",
  workshop: "linear-gradient(180deg,#43b5e8 0%,#7be0c3 55%,#ffe29a 100%)",
  party: "linear-gradient(135deg,#ff9ac1 0%,#ffd27a 50%,#8fe3ff 100%)",
  calm: "linear-gradient(180deg,#eef4fb 0%,#fbf7ee 100%)"
};
// quelle ambiance pour quelle activité ?
export const SCENE_OF = { home: "sky", learn: "sky", disc: "sky", prog: "sky", adv: "sky", code: "space", project: "space", build: "workshop", lab: "workshop", daily: "party", badges: "party", draw: "party", dance: "party", dash: "calm" };
export const sceneFor = sec => SCENE_OF[sec] || "sky";

const at = (cls, style, inner) => `<div class="sc ${cls}" style="${style}">${inner}</div>`;
const CLOUD = `<svg viewBox="0 0 120 64"><path d="M26 54a19 19 0 0 1 3-37 25 25 0 0 1 48-6 21 21 0 0 1 29 15 17 17 0 0 1-3 28z" fill="#fff"/><path d="M34 46a12 12 0 0 1 4-10" stroke="#e7f6ff" stroke-width="4" stroke-linecap="round" fill="none"/></svg>`;
const SUN = `<svg viewBox="0 0 100 100"><g stroke="#ffb703" stroke-width="6" stroke-linecap="round"><path d="M50 4v12M50 84v12M4 50h12M84 50h12M17 17l8 8M75 75l8 8M83 17l-8 8M25 75l-8 8"/></g><circle cx="50" cy="50" r="27" fill="#ffd54a"/><circle cx="41" cy="46" r="3.2" fill="#38362f"/><circle cx="59" cy="46" r="3.2" fill="#38362f"/><path d="M40 57q10 9 20 0" stroke="#38362f" stroke-width="3" stroke-linecap="round" fill="none"/><circle cx="35" cy="56" r="4" fill="#ff8fa3" opacity=".7"/><circle cx="65" cy="56" r="4" fill="#ff8fa3" opacity=".7"/></svg>`;
const BALLOON = c => `<svg viewBox="0 0 60 92"><path d="M30 4C14 4 6 18 6 30c0 16 14 28 24 36 10-8 24-20 24-36C54 18 46 4 30 4z" fill="${c}" stroke="#38362f" stroke-width="2.5"/><path d="M30 4C21 11 20 24 22 38M30 4c9 7 10 20 8 34" stroke="#fff" stroke-opacity=".55" stroke-width="2.5" fill="none"/><path d="M24 70h12l-2 9H26z" fill="#a8672f" stroke="#38362f" stroke-width="2.2" stroke-linejoin="round"/><path d="M25 66l-1 4M35 66l1 4" stroke="#38362f" stroke-width="2"/></svg>`;
const HILLS = `<svg viewBox="0 0 400 90" preserveAspectRatio="none"><path d="M0 60Q60 20 130 52T270 48T400 40V90H0z" fill="#79d36b"/><path d="M0 76Q80 46 170 70T400 62V90H0z" fill="#4cb86a"/><circle cx="62" cy="62" r="3" fill="#fff"/><circle cx="210" cy="64" r="3" fill="#ffd54a"/><circle cx="330" cy="58" r="3" fill="#ff6fa5"/></svg>`;
const STAR = c => `<svg viewBox="0 0 24 24"><path d="M12 1l3 7 8 .8-6 5.4 1.8 7.8L12 17.7 5.2 22l1.8-7.8-6-5.4L9 8z" fill="${c}"/></svg>`;
const PLANET = `<svg viewBox="0 0 120 90"><ellipse cx="60" cy="45" rx="58" ry="12" fill="none" stroke="#ffd1ec" stroke-width="5" transform="rotate(-18 60 45)"/><circle cx="60" cy="45" r="30" fill="#ff8fc7"/><path d="M38 34q22-14 44 4M34 52q26 12 52-2" stroke="#ffd1ec" stroke-width="5" stroke-linecap="round" fill="none" opacity=".7"/><circle cx="48" cy="34" r="5" fill="#fff" opacity=".5"/><path d="M6 58a58 12 0 0 0 108-14" fill="none" stroke="#ffd1ec" stroke-width="5" transform="rotate(-18 60 45)"/></svg>`;
const MOON = `<svg viewBox="0 0 80 80"><path d="M52 6a34 34 0 1 0 22 52A28 28 0 0 1 52 6z" fill="#fff3c4"/><circle cx="30" cy="40" r="4" fill="#f2dc93"/><circle cx="40" cy="56" r="3" fill="#f2dc93"/></svg>`;
const ROCKET = `<svg viewBox="0 0 60 110"><path d="M30 4c14 12 18 34 14 56H16C12 38 16 16 30 4z" fill="#fff" stroke="#38362f" stroke-width="3" stroke-linejoin="round"/><circle cx="30" cy="34" r="8" fill="#6fcfff" stroke="#38362f" stroke-width="3"/><path d="M16 60l-12 14 14-3zM44 60l12 14-14-3z" fill="#ff6fa5" stroke="#38362f" stroke-width="3" stroke-linejoin="round"/><path d="M21 60h18l-9 30z" fill="#ffd54a" stroke="#38362f" stroke-width="3" stroke-linejoin="round" class="flame"/></svg>`;
const gearSvg = (c, n = 8) => { const pts = []; for (let i = 0; i < n * 2; i++) { const a = (Math.PI * i) / n, r = i % 2 ? 36 : 46; pts.push(`${(50 + r * Math.cos(a - 0.17)).toFixed(1)},${(50 + r * Math.sin(a - 0.17)).toFixed(1)} ${(50 + r * Math.cos(a + 0.17)).toFixed(1)},${(50 + r * Math.sin(a + 0.17)).toFixed(1)}`); } return `<svg viewBox="0 0 100 100"><polygon points="${pts.join(" ")}" fill="${c}" stroke="#38362f" stroke-width="3.5" stroke-linejoin="round"/><circle cx="50" cy="50" r="15" fill="#fff" stroke="#38362f" stroke-width="3.5"/></svg>`; };
const BUBBLE = `<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="17" fill="#fff" fill-opacity=".35" stroke="#fff" stroke-width="2.5"/><path d="M11 14a11 11 0 0 1 8-6" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none"/></svg>`;
const CONF = c => `<svg viewBox="0 0 12 18"><rect x="1" y="1" width="10" height="16" rx="2.5" fill="${c}"/></svg>`;

export const SCENES = {
  sky: [
    at("sc-spin", "right:5%;top:2%;width:128px;--d:60s", SUN),
    at("sc-drift", "top:7%;width:130px;--d:70s;--dl:-10s;opacity:.95", CLOUD), at("sc-drift", "top:17%;width:90px;--d:95s;--dl:-60s;opacity:.85", CLOUD),
    at("sc-drift", "top:30%;width:160px;--d:120s;--dl:-35s;opacity:.9", CLOUD), at("sc-drift", "top:44%;width:100px;--d:85s;--dl:-5s;opacity:.8", CLOUD),
    at("sc-bob", "left:6%;top:6%;width:84px;--d:6s", BALLOON("#ff6fa5")), at("sc-bob", "left:36%;top:16%;width:58px;--d:8s;--dl:-3s", BALLOON("#8a5cf6")), at("sc-bob", "right:22%;top:40%;width:70px;--d:7s;--dl:-2s", BALLOON("#ffb703")),
    at("sc-hills", "left:0;right:0;bottom:0;height:90px", HILLS)
  ],
  space: [
    ...Array.from({ length: 14 }, (_, i) => at("sc-twinkle", `left:${(i * 37 + 8) % 96}%;top:${(i * 53 + 5) % 92}%;width:${10 + (i % 4) * 5}px;--d:${2 + (i % 5) * 0.7}s;--dl:${-(i % 7) * 0.6}s`, STAR(i % 3 ? "#fff" : "#ffd54a"))),
    at("sc-bob", "right:7%;top:9%;width:120px;--d:9s", PLANET), at("sc-bob", "left:6%;top:14%;width:70px;--d:11s;--dl:-4s", MOON), at("sc-fly", "left:-10%;bottom:8%;width:56px;--d:22s", ROCKET)
  ],
  workshop: [
    at("sc-spin", "left:-30px;top:6%;width:150px;--d:26s", gearSvg("#ff9140", 10)), at("sc-spin sc-rev", "left:98px;top:18%;width:96px;--d:17s", gearSvg("#8a5cf6", 8)),
    at("sc-spin", "right:-26px;top:34%;width:130px;--d:24s", gearSvg("#ff6fa5", 9)), at("sc-spin sc-rev", "right:90px;top:50%;width:70px;--d:12s", gearSvg("#34c38f", 7)),
    ...Array.from({ length: 7 }, (_, i) => at("sc-rise", `left:${6 + i * 14}%;bottom:-40px;width:${22 + (i % 3) * 10}px;--d:${9 + (i % 4) * 2}s;--dl:${-i * 1.7}s`, BUBBLE))
  ],
  party: [
    ...Array.from({ length: 16 }, (_, i) => at("sc-fall", `left:${(i * 29 + 4) % 97}%;top:-30px;width:${9 + (i % 3) * 3}px;--d:${7 + (i % 5)}s;--dl:${-i * 0.9}s;--r:${(i % 2 ? 1 : -1) * (180 + i * 17)}deg`, CONF(["#ff6fa5", "#ffd54a", "#3f7fd6", "#34c38f", "#8a5cf6", "#ff9140"][i % 6]))),
    at("sc-twinkle", "left:10%;top:12%;width:38px;--d:2.6s", STAR("#fff")), at("sc-twinkle", "right:12%;top:20%;width:30px;--d:3.1s;--dl:-1s", STAR("#fff")), at("sc-bob", "right:8%;bottom:14%;width:64px;--d:7s", BALLOON("#3f7fd6"))
  ],
  calm: []
};
export const sceneHtml = name => (SCENES[name] || SCENES.sky).join("");
export const animatedCount = name => (SCENES[name] || []).length;

export function initScene() {
  const root = document.createElement("div"); root.id = "scene"; root.setAttribute("aria-hidden", "true"); document.body.prepend(root);
  let cur = "", want = "sky";
  const set = name => { want = name; const n = S.scene === false ? "calm" : name; if (n === cur) return; cur = n; root.style.background = BG[n] || BG.sky; root.dataset.scene = n; root.innerHTML = sceneHtml(n); document.body.dataset.scene = n; };
  document.addEventListener("visibilitychange", () => root.classList.toggle("paused", document.hidden));
  set("sky");
  return { set, get current() { return cur; }, refresh: () => set(want) };
}
