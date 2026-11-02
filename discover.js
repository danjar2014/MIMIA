// Découvrir le robot : leçon en 3 temps (je te montre / touche / c'est quoi ?) puis du capteur au moteur
import { el, S, chime, speak, shuffle, pick, sleep } from "./util.js";
import { PARTS, bigRobotSvg } from "./robot.js";

const partOf = k => PARTS.find(p => p.k === k);

export function mountDiscover(stage, id, hooks = {}) {
  if (id === "d1") return d1(stage, hooks); if (id === "d2") return d2(stage, hooks); if (id === "d3") return d3(stage, hooks); return d4(stage, hooks);
}
function robotBox(stage, onTap, found = new Set(), highlight = null) {
  const box = el("div", "bigwrap", bigRobotSvg(highlight, found)); stage.append(box);
  box.querySelectorAll(".hit").forEach(h => h.addEventListener("click", () => onTap(h.dataset.k, h)));
  return box;
}
function d1(stage, hooks) {
  const found = new Set(), info = el("div", "pinfo", "👆 Touche une partie du robot pour la découvrir."), count = el("div", "sub", `Parties découvertes : 0 / ${PARTS.length}`);
  stage.append(el("div", "intro", "Voici ton robot ! Chaque partie a un nom et un rôle. Touche-les toutes."), info, count);
  const box = robotBox(stage, k => { const p = partOf(k); found.add(k); info.innerHTML = `<b>${p.court}</b><br>${p.role}`; speak(`${p.nom}. ${p.role}`); chime("ok"); count.textContent = `Parties découvertes : ${found.size} / ${PARTS.length}`;
    box.querySelectorAll(".hit").forEach(h => h.classList.toggle("found", found.has(h.dataset.k))); box.querySelectorAll(".part").forEach(g => g.classList.remove("on"));
    if (found.size === PARTS.length) { info.innerHTML += `<br><br>🎉 Bravo ! Tu connais toutes les parties du robot.`; chime("done"); hooks.onWin && hooks.onWin(); } });
  return { destroy() {} };
}
function rounds(stage, hooks, makeQ, intro) {
  let round = 0, wrong = 0, alive = true; const total = 5, order = shuffle(PARTS.map(p => p.k)).slice(0, 5);
  const prog = el("div", "prog2"), q = el("div", "prompt2"), fb = el("div", "gmsg", "&nbsp;"); stage.append(el("div", "intro", intro), prog, q, fb);
  let box;
  function draw() { prog.innerHTML = Array.from({ length: total }, (_, i) => `<i class="${i < round ? "on" : i === round ? "cur" : ""}"></i>`).join(""); const k = order[round], t = makeQ(k); q.innerHTML = `<span>${t}</span><button class="say" aria-label="Écouter">🔊</button>`; q.querySelector(".say").onclick = () => speak(t); speak(t); wrong = 0; fb.innerHTML = "&nbsp;";
    if (box) box.remove(); box = robotBox(stage, (kk, h) => answer(kk, h, k)); box.querySelectorAll(".hit").forEach(h => h.classList.remove("found")); }
  function answer(kk, h, k) {
    if (kk === k) { chime("ok"); h.classList.add("good"); fb.innerHTML = "✔ Oui, c'est " + partOf(k).nom + " !"; round++; setTimeout(() => { if (!alive) return; if (round >= total) { chime("done"); hooks.onWin && hooks.onWin(); fb.innerHTML = "🎉 Bravo !"; } else draw(); }, 1100); }
    else { wrong++; chime("no"); h.classList.add("bad"); setTimeout(() => h.classList.remove("bad"), 500); fb.innerHTML = wrong === 1 ? "Pas tout à fait. Regarde bien et essaie encore 🙂" : `Indice : c'est « ${partOf(k).court} ».`; if (wrong >= 2) { const t = box.querySelector(`.hit[data-k="${k}"]`); t.classList.add("pulse"); } }
  }
  draw(); return { destroy() { alive = false; } };
}
const d2 = (stage, hooks) => rounds(stage, hooks, k => `Touche ${partOf(k).nom}.`, "Écoute le nom, puis touche la bonne partie du robot.");
const d3 = (stage, hooks) => rounds(stage, hooks, k => `Touche la partie qui ${partOf(k).sert}.`, "Cette fois on te dit à quoi sert la partie. Trouve laquelle c'est !");

const SCENES = [
  { story: "Le robot voit un mur devant lui.", steps: ["Les yeux mesurent : le mur est proche !", "Le cerveau décide : il faut s'arrêter.", "Les roues s'arrêtent."], tags: ["Capteur", "Cerveau", "Moteur"] },
  { story: "Il fait nuit dans la pièce.", steps: ["Le capteur de lumière sent qu'il fait sombre.", "Le cerveau décide d'allumer la lampe.", "La LED s'allume."], tags: ["Capteur", "Cerveau", "Sortie"] },
  { story: "Tu appuies sur le bouton « musique ».", steps: ["Le bouton envoie un signal.", "Le cerveau choisit la chanson.", "Le haut-parleur joue la musique."], tags: ["Entrée", "Cerveau", "Sortie"] }
];
function d4(stage, hooks) {
  let i = 0, alive = true; const wrap = el("div", "scene"), fb = el("div", "gmsg", "&nbsp;"); stage.append(el("div", "intro", "Un robot suit toujours 3 étapes : il SENT (capteur), il PENSE (cerveau), il AGIT (moteur, lampe, son). Remets les étapes dans l'ordre."), wrap, fb);
  function show() { const sc = SCENES[i]; let next = 0; wrap.innerHTML = `<div class="story">📖 ${sc.story}</div><div class="slots">${[1, 2, 3].map(n => `<div class="sl" data-n="${n}"><b>${n}</b></div>`).join("")}</div><div class="cards"></div>`;
    const cards = wrap.querySelector(".cards"); shuffle(sc.steps.map((s, k) => ({ s, k }))).forEach(c => { const b = el("button", "stepcard", c.s); b.onclick = () => { if (b.disabled) return;
      if (c.k === next) { chime("ok"); b.disabled = true; wrap.querySelector(`.sl[data-n="${next + 1}"]`).innerHTML = `<b>${next + 1}</b> ${c.s}<small>${sc.tags[next]}</small>`; b.classList.add("used"); next++; fb.innerHTML = "&nbsp;";
        if (next === 3) { setTimeout(() => { if (!alive) return; i++; if (i >= SCENES.length) { chime("done"); fb.innerHTML = "🎉 Bravo ! Sentir, penser, agir : tu as compris comment pense un robot."; hooks.onWin && hooks.onWin(); wrap.innerHTML = ""; } else show(); }, 1000); } }
      else { chime("no"); b.classList.add("shake"); setTimeout(() => b.classList.remove("shake"), 400); fb.innerHTML = next === 0 ? "Que se passe-t-il en premier ? Le robot doit d'abord SENTIR quelque chose." : next === 1 ? "Maintenant le robot doit PENSER : c'est le travail du cerveau." : "Pour finir, le robot AGIT."; } }; cards.append(b); }); speak(sc.story); }
  show(); return { destroy() { alive = false; } };
}
