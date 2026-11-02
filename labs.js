// Laboratoire des capteurs : le robot sent, pense, agit
import { el, S, chime, speak, sleep } from "./util.js";
import { robotSvg } from "./robot.js";

export function mountLab(stage, id, hooks = {}) {
  if (id === "k1" || id === "k2") return light(stage, id, hooks);
  return dist(stage, id, hooks);
}
const bar = (cls, html) => el("div", cls, html);
function slider(min, max, val, onInput) { const s = el("input", "rng"); s.type = "range"; s.min = min; s.max = max; s.value = val; s.oninput = () => onInput(+s.value); return s; }

function light(stage, id, hooks) {
  let alive = true, v = 90; const dark = x => x < 35;
  const scene = el("div", "lscene"), sky = el("div", "lsky"), body = el("div", "lbot"), gauge = el("div", "gauge"), msg = el("div", "gmsg", "&nbsp;");
  scene.append(sky, body); const lampOn = x => (id === "k1" ? dark(x) : rule.on(x));
  const rule = { cond: "sombre", act: "allume", on: x => ((rule.cond === "sombre" ? dark(x) : !dark(x)) ? rule.act === "allume" : rule.act !== "allume") };
  function paint(x, override) { const on = override ?? lampOn(x); sky.style.background = `linear-gradient(${dark(x) ? "#0d1b3d,#2b3b6b" : "#9fd3f7,#e6f5ff"})`; sky.innerHTML = dark(x) ? '<span class="big">🌙</span>' : '<span class="big">☀️</span>';
    body.innerHTML = robotSvg(S.robot, on ? "#ffd54a" : "#bbb"); body.classList.toggle("glow", on); gauge.innerHTML = `Capteur de lumière : <b>${x}</b> ${dark(x) ? "(sombre)" : "(clair)"}`; }
  const sl = slider(0, 100, v, x => { v = x; paint(x); if (id === "k1") observe(x); });
  stage.append(el("div", "intro", id === "k1" ? "Le capteur de lumière envoie un nombre au cerveau : petit = sombre, grand = clair. Ici la règle est déjà écrite : « Si c'est sombre, la lampe s'allume »."
    : "Écris toi-même la règle du robot ! Compose la phrase avec les menus, puis teste-la sur tout un jour et une nuit."), scene, gauge, el("div", "sub", "☀️ ← glisse pour changer la lumière → 🌙"), sl);
  const seen = { on: false, off: false };
  const todo = el("div", "todo"); function observe(x) { if (dark(x)) seen.on = true; else seen.off = true; todo.innerHTML = `${seen.on ? "✅" : "⬜"} Fais s'allumer la lampe<br>${seen.off ? "✅" : "⬜"} Fais-la s'éteindre`; if (seen.on && seen.off && !todo.dataset.done) { todo.dataset.done = 1; chime("done"); msg.innerHTML = "🎉 Bravo ! Tu as vu comment le robot réagit à la lumière."; hooks.onWin && hooks.onWin(); } }
  if (id === "k1") { todo.innerHTML = "⬜ Fais s'allumer la lampe<br>⬜ Fais-la s'éteindre"; stage.append(todo, msg); }
  else {
    const row = el("div", "rulebox");
    row.innerHTML = `<b>Si</b> <select id="rc"><option value="sombre">il fait sombre</option><option value="clair">il fait clair</option></select> <b>alors</b> la lampe <select id="ra"><option value="allume">s'allume</option><option value="eteint">s'éteint</option></select>`;
    const go = el("button", "gb go", "▶ Tester sur un jour entier"); stage.append(row, go, msg);
    row.querySelector("#rc").onchange = e => { rule.cond = e.target.value; paint(v); }; row.querySelector("#ra").onchange = e => { rule.act = e.target.value; paint(v); };
    go.onclick = async () => { go.disabled = true; msg.innerHTML = "Le soleil se couche…"; let darkOn = null, clearOn = null;
      for (let x = 100; x >= 0 && alive; x -= 5) { sl.value = x; v = x; paint(x); if (dark(x)) darkOn = rule.on(x); else clearOn = rule.on(x); await sleep(window.__turbo ? 2 : S.calm ? 20 : 90); }
      go.disabled = false; if (!alive) return;
      if (darkOn && !clearOn) { chime("done"); msg.innerHTML = "🎉 Bravo ! La lampe s'allume la nuit et reste éteinte le jour. C'est une règle « si… alors ».", "ok"; hooks.onWin && hooks.onWin(); }
      else { chime("no"); msg.innerHTML = darkOn ? "La lampe reste allumée en plein jour : ça gaspille de l'énergie. Change la règle 🙂" : clearOn ? "La lampe s'allume le jour et reste éteinte la nuit : c'est le contraire de ce qu'on veut !" : "La lampe ne s'allume jamais la nuit. Essaie une autre règle 🙂"; } };
    paint(v);
  }
  paint(v); return { destroy() { alive = false; } };
}

function dist(stage, id, hooks) {
  let alive = true, d = 90;
  const scene = el("div", "dscene"), robot = el("div", "dbot2"), wall = el("div", "wall", "🧱"), gauge = el("div", "gauge"), msg = el("div", "gmsg", "&nbsp;");
  scene.append(robot, wall); const X = c => (8 + (100 - Math.min(c, 100)) * 0.0 + 0) ;
  function paint(cm, led) { const wallX = 88, x = wallX - (cm / 120) * 80; robot.style.left = x + "%"; robot.innerHTML = robotSvg(S.robot, led || (cm < 20 ? "#e24b4b" : "#4caf6a")); gauge.innerHTML = `Capteur de distance : <b>${Math.round(cm)} cm</b>`; }
  if (id === "k3") {
    const seen = { near: false, far: false }; const todo = el("div", "todo", "⬜ Approche le robot du mur (moins de 20 cm)<br>⬜ Éloigne-le (plus de 60 cm)");
    const sl = slider(0, 120, d, x => { d = x; paint(x); if (x < 20) seen.near = true; if (x > 60) seen.far = true; todo.innerHTML = `${seen.near ? "✅" : "⬜"} Approche le robot du mur (moins de 20 cm)<br>${seen.far ? "✅" : "⬜"} Éloigne-le (plus de 60 cm)`;
      if (seen.near && seen.far && !todo.dataset.done) { todo.dataset.done = 1; chime("done"); msg.innerHTML = "🎉 Bravo ! La lampe passe au rouge quand le mur est trop près : c'est une alerte."; hooks.onWin && hooks.onWin(); } });
    stage.append(el("div", "intro", "Les yeux du robot mesurent la distance jusqu'au mur, en centimètres. Règle du robot : « Si la distance est plus petite que 20 cm, la lampe devient rouge »."), scene, gauge, el("div", "sub", "Glisse pour changer la distance"), sl, todo, msg); paint(d);
  } else {
    let N = 20; const nbox = el("div", "rulebox"); const upd = () => nbox.innerHTML = `<b>Si</b> la distance est plus petite que <button class="mini" id="m">−</button> <b>${N} cm</b> <button class="mini" id="p">+</button> <b>alors</b> le robot freine.`;
    upd(); nbox.onclick = e => { if (e.target.id === "m") N = Math.max(5, N - 5); else if (e.target.id === "p") N = Math.min(50, N + 5); else return; upd(); };
    const go = el("button", "gb go", "▶ Lancer le robot"); const info = el("div", "sub", "Le robot roule vers le mur. Quand il freine, il a besoin d'un peu de place pour s'arrêter (environ 8 cm). Choisis le bon nombre pour qu'il s'arrête juste avant le mur, sans le toucher !");
    stage.append(el("div", "intro", "Défi de l'ingénieur : règle le seuil de freinage."), scene, gauge, info, nbox, go, msg); paint(100);
    go.onclick = async () => { go.disabled = true; msg.innerHTML = "Le robot avance…"; let pos = 100, braking = false, stopAt = null;
      while (alive) { if (!braking && pos < N) { braking = true; stopAt = pos - 8; } pos -= braking ? Math.max(0.5, (pos - stopAt) * 0.12) : 2.4; paint(Math.max(0, pos), braking ? "#ffb703" : null); await sleep(window.__turbo ? 1 : S.calm ? 8 : 35); if (braking && pos - stopAt < 0.6) break; if (pos <= 0) break; }
      go.disabled = false; if (!alive) return; const fin = Math.max(0, braking ? stopAt : pos); paint(fin, "#e24b4b");
      if (fin < 3) { chime("no"); msg.innerHTML = `💥 Il a touché le mur (il s'est arrêté à ${Math.round(fin)} cm). Il a besoin de plus de place pour freiner : augmente le nombre.`; }
      else if (fin > 15) { chime("no"); msg.innerHTML = `Il s'est arrêté très loin du mur (${Math.round(fin)} cm). Il peut avancer encore un peu : diminue le nombre.`; }
      else { chime("done"); msg.innerHTML = `🎉 Parfait ! Il s'arrête à ${Math.round(fin)} cm du mur. Un vrai ingénieur règle ses capteurs en testant !`; speak("Parfait ! Il s'arrête juste avant le mur."); hooks.onWin && hooks.onWin(); } };
  }
  return { destroy() { alive = false; } };
}
