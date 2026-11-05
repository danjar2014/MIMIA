import { $, el, S, save, isDone, markDone as baseMark, chime, speak, toast, sleep } from "./util.js";
import { RANKS, stepDone, rankDone, rankProgress, rankUnlocked, highestUnlocked, currentRank, stepUnlocked, nextStep, cardLocked, lockReason, FLAGS } from "./parcours.js";
import { mountLearn, LESSONS } from "./learn.js";
import { mountProject } from "./project.js";
import { initStats, track, limitState, extendLimit, dayKey } from "./stats.js";
import { renderDashboard } from "./dashboard.js";
import { hasPin, askPin, createPin } from "./pin.js";
import { mountDaily, dailyDoneToday } from "./daily.js";
import { checkBadges, badgeList, playDays, softStreak } from "./badges.js";
import { mountOnboarding, mountPlacement } from "./onboard.js";
import { needsParentSetup, startParentSetup, AGES, VOICES, LIMITS } from "./parentsetup.js";
import { askConfirm } from "./confirm.js";
import { initMascot, faceSvg } from "./mascot.js";
import { initScene, sceneFor } from "./scene.js";
import { icon } from "./icons.js";
import { addXP, stepXP, todayXP, goalXP, totalXP, GOALS } from "./xp.js";
import { robotSvg, COLORS } from "./robot.js";
import { LEVELS, BANDS } from "./levels.js";
import { mountGrid } from "./grid.js";
import { makePractice, trainReward } from "./practice.js";
import { mountDraw, DEFIS } from "./draw.js";
import { mountDance } from "./dance.js";
import { mountLab } from "./labs.js";
import { mountDiscover } from "./discover.js";
import { mountBuild } from "./build.js";
import { BUILD } from "./boardlogic.js";
import { ADV, mountAdv } from "./advgames.js";
import { initVoice } from "./voice.js";
import { mountCode } from "./code.js";
import { CODE, FLAT, FREE } from "./codemissions.js";
import { NODELABS, PUBLABS, mountNodes, mountPub, mountRL, mountSup } from "./advlabs.js";

const app = $("#app"), overlay = $("#overlay");
// chaque étape terminée peut débloquer une nouvelle aventure : on le fête
function announceBadges() { const fresh = checkBadges(); if (fresh.length) { const t = fresh.slice(0, 3).map(b => `${b.icon} ${b.name}`).join("  ·  ") + (fresh.length > 3 ? ` (+${fresh.length - 3})` : ""); toast("🏅 Nouveau badge : " + t, 5500); speak("Nouveau badge : " + fresh.slice(0, 3).map(b => b.name).join(", ")); } }
// les écrans de récompense s'enchaînent l'un après l'autre : série, objectif du jour, nouvelle aventure…
const ovQueue = []; let ovBusy = false;
function pushOverlay(fn) { ovQueue.push(fn); if (!ovBusy) { ovBusy = true; setTimeout(showNextOverlay, 0); } }
function showNextOverlay() { const f = ovQueue.shift(); if (!f) { ovBusy = false; overlay.style.display = "none"; return; } overlay.style.display = "flex"; f(showNextOverlay, () => { ovQueue.length = 0; ovBusy = false; overlay.style.display = "none"; }); }
const WEEK = ["D", "L", "M", "M", "J", "V", "S"];
function streakScreen(next) {
  const days = playDays(), ss = softStreak(days), n = Math.max(1, ss.streak), dots = [];
  for (let k = 6; k >= 0; k--) { const t = Date.now() - k * 86400000, key = new Date(t).toISOString().slice(0, 10), d = new Date(t); const local = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; dots.push(`<i class="${days.has(local) ? "on" : ""}">${WEEK[d.getDay()]}</i>`); }
  overlay.innerHTML = `<div class="panel rew"><div class="flame">🔥<b>${n}</b></div><div class="wk">${dots.join("")}</div><h1>${n <= 1 ? "Tu as commencé une série !" : `Série de ${n} jours !`}</h1><p class="sub">Joue un peu chaque jour pour la faire grandir. Un jour de repos ne la casse pas.</p><button class="big-btn" id="rwc">Continuer</button></div>`;
  $("#rwc").onclick = next;
}
const goalScreen = (r, earned) => next => {
  overlay.innerHTML = `<div class="panel rew"><div class="goalring" style="--p:${Math.min(100, Math.round(100 * r.after / r.goal))}"><span>⚡<small>${r.after} / ${r.goal} XP</small></span></div><h1>Objectif du jour atteint !</h1><p class="sub">Bravo${S.name ? " " + S.name : ""} ! Cette étape t'a rapporté <b>${earned} XP</b>. Reviens demain pour continuer ta série.</p><button class="big-btn" id="rwc">Récupérer</button></div>`;
  $("#rwc").onclick = next;
};
const REWARD_SECS = new Set(["learn", "disc", "lab", "prog", "build", "code", "project", "adv", "daily"]);
function rewardXP(sec, id) {
  if (!REWARD_SECS.has(sec)) return;
  const a = (S.stats && S.stats.acts && S.stats.acts[sec + ":" + id]) || { fails: 0 }, xp = stepXP(a.fails), r = addXP(xp);
  setTimeout(() => { const st = document.querySelector(".astage"); if (st) { const chip = el("div", "xpchip", `⚡ +${xp} XP${a.fails === 0 ? " · sans aucune erreur !" : ""} · aujourd'hui ${r.after}/${r.goal}`), wb = st.querySelector(".winbar"); wb ? st.insertBefore(chip, wb) : st.append(chip); } }, 450);
  setTimeout(() => { if (r.firstOfDay) pushOverlay(streakScreen); if (r.crossed) pushOverlay(goalScreen(r, xp)); }, 800);
}
function markDone(sec, id) { const first = !isDone(sec, id), was = RANKS.map((_, i) => rankDone(i)); baseMark(sec, id); if (first) rewardXP(sec, id); setTimeout(announceBadges, 350); const k = RANKS.findIndex((_, i) => rankDone(i) && !was[i]); if (k >= 0) setTimeout(() => celebrate(k), 1200); }
function celebrate(i) {
  pushOverlay((next, closeAll) => {
    const r = RANKS[i];
    if (i === RANKS.length - 1) { overlay.innerHTML = `<div class="panel diplome"><h1>🏆 Diplôme d'expert</h1><p class="sub">Félicitations <b>${S.name || "petit roboticien"}</b> !<br>Tu as parcouru tout le chemin : du premier « c'est quoi un robot ? » jusqu'au code du cerveau d'un robot, avec de la mémoire.${S.project && S.project.name ? `<br>Ton grand projet : le robot « <b>${S.project.name}</b> » !` : ""}</p><p class="sub">${new Date().toLocaleDateString("fr-FR")} · Petits Robots</p><div class="agebtns"><button class="big-btn" id="cel0">🖨️ Imprimer mon diplôme</button><button class="big-btn alt" id="cel2">Fermer</button></div></div>`; $("#cel0").onclick = () => window.print(); }
    else overlay.innerHTML = `<div class="panel"><h1>🎉 Aventure ${i + 1} terminée !</h1><p class="sub">${r.icon} Tu es maintenant <b>${r.name}</b>.<br>Tu viens de débloquer : ${r.unlocks}.</p><div class="agebtns"><button class="big-btn" id="cel1">🗺️ Voir mon parcours</button><button class="big-btn alt" id="cel2">Continuer</button></div></div>`;
    const c1 = $("#cel1"); if (c1) c1.onclick = () => { closeAll(); parcours(); };
    $("#cel2").onclick = next;
  });
}
let cleanup = null, longTimer;
const leave = () => { app.className = ""; track(null); if (cleanup) { try { cleanup(); } catch (e) {} cleanup = null; } window.__cur = null; };
let mascotApi = null, sceneApi = null;
const applySettings = () => { document.body.classList.toggle("calm", S.calm); document.body.classList.toggle("big", S.big); if (mascotApi) mascotApi.refresh(); if (sceneApi) sceneApi.refresh(); };


// ---------- coder pour de vrai ----------
function codeMenu() {
  const band = S.age || "a", items = FLAT.map(m => ({ ...m, done: isDone("code", m.id) })); let rec = items.findIndex(i => !i.done && i.band === band); if (rec < 0) rec = items.findIndex(i => !i.done);
  const groups = CODE.map(g => ({ header: g.title, items: g.items.map(m => { const it = items.find(i => i.id === m.id); return { icon: it.kind === "console" ? "⌨️" : it.kind === "robot" ? "🤖" : it.kind === "expert" ? "🏆" : "🧠", title: m.title, sub: m.mission.split(/[.!?]/)[0] + ".", done: it.done, rec: items.indexOf(it) === rec, go: () => playCode(m) }; }) }));
  groups.unshift({ header: "0. Des blocs au vrai code : pose des blocs et regarde le code s'écrire", items: [["a", 1, "Le robot avance et tourne"], ["b", 0, "Répéter : la boucle for"], ["c", 0, "Tant que : la boucle while"], ["c", 4, "Décider : if / else"]].map(([b, k, t]) => ({ icon: "🔗", title: t, sub: "avec le code en direct", done: false, go: () => playGrid(b, k, { codeOpen: true }) })) });
  groups.push({ header: "5. Le Grand Projet : concevoir un robot complet", items: [{ icon: "🏗️", title: "Le Grand Projet", sub: "choisis tes pièces, monte, programme, imprime ta fiche", done: isDone("project", "pj"), go: playProject }] });
  groups.push({ header: "6. Mon atelier", items: [{ icon: "🧪", title: "Atelier libre", sub: "écris ce que tu veux et regarde ce qui se passe", go: () => playCode(FREE) }] });
  menu("Coder pour de vrai", groups, home);
}
function playCode(m, code, lang) {
  lang = lang || S.codeLang || "py";
  const i = FLAT.findIndex(x => x.id === m.id), nx = i >= 0 && i + 1 < FLAT.length ? () => playCode(FLAT[i + 1]) : null;
  activity(m.title, "code", m.id, s => mountCode(s, m, { onWin: () => { markDone("code", m.id); winBar(nx, codeMenu); }, onSave: c => keep("code", m.id === "libre" ? "Mon programme" : m.title, { code: c, lang }), lang, onExplain: () => setTimeout(announceBadges, 300), onLang: l => { S.codeLang = l; save(); playCode(m, undefined, l); }, speakIntro: S.age === "a" }, code), codeMenu);
}

// ---------- la carte du robot ----------
function buildMenu() {
  const band = S.age || "a", items = BUILD.map(l => ({ icon: l.id === "e9" ? "🧰" : l.prog ? "🧠" : l.id.slice(1), title: l.title, sub: l.id === "e9" ? "assemble ce que tu veux" : l.mission.split(".")[0] + ".", done: isDone("build", l.id), band: l.band, go: () => playBuild(l) }));
  const k = items.findIndex(i => !i.done && i.band.includes(band) && i.band !== "abc"); if (k >= 0) items[k].rec = true;
  menu("Construire le robot", [{ header: "Assemble les éléments sur la carte, puis relie-les au cerveau avec des fils", items }], home);
}
function playBuild(level, preset) {
  const idx = BUILD.indexOf(level), next = idx + 1 < BUILD.length - 1 ? () => playBuild(BUILD[idx + 1]) : null;
  activity(level.title, "build", level.id, s => mountBuild(s, level, { onWin: () => { markDone("build", level.id); winBar(next, buildMenu); }, onSave: st => keep("carte", "Ma carte", { st }), onOpenCode: openCodeFromBlocks }, preset), buildMenu);
}


// ---------- aller plus loin (d'après le cours NovaSavo, unité 12) ----------
const advAdv = id => ({ id, icon: { cards: "🃏", quiz: "❓", order: "🔢", match: "🔗", sort: "🗂️" }[ADV[id].type], title: ADV[id].title, sub: ADV[id].sub, bands: ADV[id].bands, mount: (s, win) => mountAdv(s, id, win) });
const ADVGROUPS = [
  { header: "Les messagers du robot (ROS)", items: [advAdv("g1"), advAdv("g1q"),
    { id: "n1", icon: "📮", title: NODELABS[0].title, sub: "branche des nœuds avec des sujets", bands: "bc", mount: (s, w) => mountNodes(s, NODELABS[0], w) }, { id: "n2", icon: "📮", title: NODELABS[1].title, sub: "un sujet, plusieurs abonnés", bands: "c", mount: (s, w) => mountNodes(s, NODELABS[1], w) },
    { id: "p1", icon: "📤", title: "Mon premier nœud : Hello World", sub: "publie un message", bands: "bc", mount: (s, w) => mountPub(s, PUBLABS[0], w) }, { id: "p2", icon: "📤", title: PUBLABS[1].title, sub: "publie 3 fois sans copier", bands: "c", mount: (s, w) => mountPub(s, PUBLABS[1], w) },
    { id: "t1", icon: "📡", title: LEVELS.t[0].title, sub: "ton nœud pilote le robot", bands: "bc", mount: (s, w) => mountGrid(s, LEVELS.t[0], { onWin: w }) }, { id: "t2", icon: "📡", title: LEVELS.t[1].title, sub: "répéter un message", bands: "c", mount: (s, w) => mountGrid(s, LEVELS.t[1], { onWin: w }) }] },
  { header: "Le robot qui apprend", items: [advAdv("g4"), { id: "g5", icon: "🦾", title: "Le bras qui apprend", sub: "par essais et récompenses", bands: "bc", mount: (s, w) => mountRL(s, w) }, { id: "g6", icon: "🧑‍🏫", title: "Apprendre avec des exemples", sub: "tu es le professeur du robot", bands: "bc", mount: (s, w) => mountSup(s, w) }, advAdv("g7"), advAdv("g7q"), advAdv("g9")] },
  { header: "L'intelligence artificielle en robotique", items: [advAdv("g8")] },
  { header: "Les robots dans le monde", items: [advAdv("g10"), advAdv("g10f"), advAdv("g11")] },
  { header: "Ta route de roboticien", items: [advAdv("g12"), advAdv("g12o")] }
];
const ADVFLAT = ADVGROUPS.flatMap(g => g.items);
function advMenu() {
  const age = S.age || "a", groups = ADVGROUPS.map(g => ({ header: g.header, items: g.items.map(i => ({ icon: i.icon, title: i.title, sub: i.sub, done: isDone("adv", i.id), rec: false, bands: i.bands, go: () => playAdv(i) })) }));
  const flat = groups.flatMap(g => g.items), k = flat.findIndex(i => !i.done && i.bands.includes(age)); if (k >= 0) flat[k].rec = true;
  groups.unshift({ header: age === "a" ? "🚀 Cette rubrique est surtout pour les 8-12 ans. Tu peux déjà jeter un œil !" : "🚀 D'après le cours « Codage robotique » (NovaSavo), unité 12 : les idées des vrais roboticiens, adaptées pour toi.", items: [] });
  menu("Aller plus loin", groups, home);
}
function playAdv(item) {
  const i = ADVFLAT.indexOf(item), nx = i + 1 < ADVFLAT.length ? () => playAdv(ADVFLAT[i + 1]) : null;
  activity(item.title, "adv", item.id, s => item.mount(s, () => { markDone("adv", item.id); winBar(nx, advMenu); }), advMenu);
}

// ---------- listes d'activités ----------
const DISC = [{ id: "d1", icon: "🤖", title: "Découvre ton robot", sub: "Touche chaque partie pour apprendre son nom et son rôle", bands: "abc" }, { id: "d2", icon: "👂", title: "Touche la partie", sub: "On te dit un nom, tu touches la bonne partie", bands: "abc" },
  { id: "d3", icon: "🧠", title: "À quoi ça sert ?", sub: "On te dit un rôle, tu retrouves la partie", bands: "abc" }, { id: "d4", icon: "🔗", title: "Du capteur au moteur", sub: "Sentir, penser, agir : remets les étapes dans l'ordre", bands: "bc" }];
const LABS = [{ id: "k1", icon: "🌗", title: "Le capteur de lumière", sub: "Observe comment le robot réagit à la lumière", bands: "abc" }, { id: "k2", icon: "💡", title: "Écris la règle de la lampe", sub: "Compose une règle « si… alors »", bands: "bc" },
  { id: "k3", icon: "📏", title: "Le capteur de distance", sub: "Les yeux du robot mesurent la distance au mur", bands: "abc" }, { id: "k4", icon: "🚧", title: "Freine avant le mur", sub: "Règle le seuil comme un ingénieur", bands: "c" }];
const isRec = (bands) => !S.age || bands.includes(S.age);

// ---------- écrans ----------
function home() {
  onWelcome = false; announceBadges(); leave(); applySettings(); if (sceneApi) sceneApi.set("sky"); app.className = "home"; app.innerHTML = "";
  if (needsParentSetup()) startSetup(); else if (!S.age || !S.placed) startOnboarding();
  const esc = t => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const bar = el("div", "bar homebar"), chip = el("button", "pchip", `<span class="pcav">${robotSvg(S.robot)}</span><b>${esc(S.name || "Moi")}</b>`); chip.setAttribute("aria-label", "Changer de joueur");
  chip.onclick = () => askConfirm(overlay, { title: "Changer de joueur ?", onYes: () => { overlay.style.display = "none"; overlay.innerHTML = ""; welcome(); }, onNo: () => { overlay.style.display = "none"; overlay.innerHTML = ""; } });
  const ss = softStreak(playDays()), tx = todayXP(), gx = goalXP(), stats = el("div", "hstats");
  stats.innerHTML = `<span class="hstat" aria-label="Points aujourd'hui : ${tx} sur ${gx}">${icon("bolt", "mini")} ${tx}/${gx}${tx >= gx ? " ✅" : ""}</span><span class="hstat" aria-label="Série : ${ss.streak} jour${ss.streak > 1 ? "s" : ""}">🔥 ${ss.streak}</span>`;
  stats.dataset.say = `Aujourd'hui tu as ${tx} points sur ${gx}. Série : ${ss.streak} jour${ss.streak > 1 ? "s" : ""}.`;
  bar.append(chip, stats); app.append(bar, parentLock());
  const body = el("div", "homebody"); app.append(body);
  if (FLAGS.testUnlock) body.append(el("div", "testflag", "🧪 Mode test : tout est débloqué"));
  // 1. la prochaine étape : une grande tuile (le titre de l'étape, rien d'autre)
  const ns = nextStep(), info = ns ? stepInfo(ns.step) : null, hero = el("button", "herotile");
  hero.innerHTML = `<span class="hface">${faceSvg("happy")}</span><b>${esc(info ? info.title : "Défi du jour")}</b><span class="hplay">${icon("play")}</span>`;
  hero.setAttribute("aria-label", ns ? `Continuer : ${info.title}` : "Défi du jour"); hero.onclick = () => (ns ? launchStep(ns.step) : playDaily(false)); body.append(hero);
  // 2. de grosses icônes, un seul mot chacune (le détail reste pour les lecteurs d'écran et la voix)
  const tile = (ic, nm, sub, hue, fn, lock) => { const locked = lock && cardLocked(lock), b = el("button", "tile" + (locked ? " locked" : ""), `<span class="tic">${locked ? icon("lock") : ic.startsWith("<svg") ? ic : icon(ic)}</span><b>${esc(nm)}</b>`); b.setAttribute("aria-label", locked ? `${nm} : à débloquer` : sub ? `${nm}. ${sub}` : nm); b.style.setProperty("--tc", hue); b.onclick = locked ? () => { toast(lockReason(lock), 4500); speak(lockReason(lock)); } : fn; return b; };
  const grid = el("div", "igrid"), cr = currentRank(), nb = badgeList().filter(b => b.date).length, age = S.age || "a";
  grid.append(
    tile("target", "Défi", dailyDoneToday() ? "fait aujourd'hui" : "3 questions", "#ffe0ec", () => playDaily(false)), tile("path", "Parcours", `Aventure ${cr + 1} sur ${RANKS.length}`, "#fff1b8", parcours), tile("medal", "Badges", `${nb} sur ${badgeList().length}`, "#eadcff", showBadges),
    tile("dice", "S'entraîner", "un parcours surprise", "#ffe9c7", () => playPractice(age, 0), "prog"),
    tile("magnifier", "Découvrir", "les parties du robot", "#d6ecff", () => menu("Découvrir le robot", discItems(), home), "disc"), tile("blocks", "Programmer", "avec des blocs", "#d9f5d3", progMenu, "prog"),
    tile("gear", "Construire", "la carte du robot", "#e2dcff", buildMenu, "build"), tile("code", "Coder", "Python et JavaScript", "#d4e4ff", codeMenu, "code"),
    tile("sensor", "Capteurs", "lumière, distance", "#fff0c2", () => menu("Les capteurs", labItems(), home), "lab"), tile("palette", "Créer", "dessiner, danser", "#ffe0d2", createMenu, "create"),
    tile("rocket", "Plus loin", "ROS, IA, métiers", "#d2f1ef", advMenu, "adv"), tile(faceSvg("happy"), "Mon robot", "choisis son look", "#ece0f7", robotBuilder),
    tile("star", "Créations", `${S.creations.length} gardée${S.creations.length > 1 ? "s" : ""}`, "#e3f1f1", creations));
  body.append(grid);
}
function ageChooser() {
  overlay.style.display = "flex"; overlay.innerHTML = `<div class="panel"><h1>Quel âge as-tu ?</h1><p class="sub">Je te propose les activités qui conviennent le mieux. Tu pourras tout essayer quand tu veux.</p><div class="agebtns"></div></div>`;
  Object.entries(BANDS).forEach(([k, b]) => { const x = el("button", "big-btn", b.name); x.onclick = () => { S.age = k; save(); overlay.style.display = "none"; home(); }; overlay.querySelector(".agebtns").append(x); });
}
// première configuration : obligatoirement par un parent (code parent + profil de l'enfant), puis l'enfant commence
function startSetup() { startParentSetup(overlay, () => { applySettings(); home(); }); }
function startOnboarding() {
  mountOnboarding(overlay, ans => { applySettings(); home(); if (ans.rank === 0) playLearn("l1"); else parcours(); });
}
function levelChooser() {
  overlay.style.display = "flex"; overlay.innerHTML = `<div class="panel"><h1>Où en es-tu ?</h1><p class="sub">Choisis ce qui te ressemble. Tu pourras changer plus tard (réglages des parents).</p><div class="agebtns"></div></div>`;
  [["🐣 Je ne connais rien : je veux tout apprendre depuis le début", 0], ["🧩 J'ai déjà joué avec des blocs de programmation", 3], ["⌨️ Je sais déjà écrire un peu de code", 6]].forEach(([t, v]) => { const b = el("button", "big-btn", t); b.onclick = () => { S.startRank = v; S.placed = true; save(); overlay.style.display = "none"; home(); }; overlay.querySelector(".agebtns").append(b); });
}
function dashboard() {
  leave(); if (sceneApi) sceneApi.set("calm"); app.innerHTML = ""; app.append(topbar("Tableau de bord des parents", home, false)); const box = el("div", "astage dash"); app.append(box);
  renderDashboard(box, { onNext: s => stepInfo(s).title });
}
// fin de séance : la limite du jour est atteinte. Seul un adulte peut accorder 15 minutes de plus.
function showLimit() {
  overlay.style.display = "flex"; overlay.innerHTML = `<div class="panel"><h1>🌙 C'est assez pour aujourd'hui</h1><p class="sub">Tu as bien travaillé, bravo ! Ton robot se repose. À demain !</p><div class="agebtns"><button class="big-btn" id="lm1">🏠 Retour à l'accueil</button><button class="big-btn alt" id="lm2">Je suis un parent</button></div></div>`;
  $("#lm1").onclick = () => { overlay.style.display = "none"; home(); };
  $("#lm2").onclick = () => {
    if (hasPin()) return askPin({ title: "🔒 Espace parents", sub: "Entre le code pour accorder 15 minutes de plus.", onOk: () => { extendLimit(15); overlay.style.display = "none"; toast("15 minutes de plus accordées ✔"); }, onCancel: showLimit });
    const a = 3 + Math.floor(Math.random() * 7), b = 4 + Math.floor(Math.random() * 6);
    overlay.innerHTML = `<div class="panel"><h1>Espace parents</h1><p class="sub">Pour accorder 15 minutes de plus : combien font <b>${a} × ${b}</b> ?</p><input id="lmq" inputmode="numeric" class="pname" aria-label="Réponse"><div class="agebtns"><button class="big-btn" id="lmo">Valider</button><button class="big-btn alt" id="lmn">Annuler</button></div></div>`;
    $("#lmn").onclick = showLimit;
    $("#lmo").onclick = () => { if (+$("#lmq").value === a * b) { extendLimit(15); overlay.style.display = "none"; toast("15 minutes de plus accordées ✔"); } else { $("#lmq").value = ""; toast("Ce n'est pas la bonne réponse."); } };
  };
}
function playDaily(practice) {
  activity("Défi du jour", "daily", practice ? "pratique" : "jour", s => mountDaily(s, { practice, onParcours: parcours, onBadges: showBadges, onFinish: () => setTimeout(announceBadges, 300) }), home);
}
function showBadges() {
  leave(); if (sceneApi) sceneApi.set("party"); app.innerHTML = ""; app.append(topbar("Mes badges", home, false)); const box = el("div", "astage"); app.append(box);
  const L = badgeList(), got = L.filter(b => b.date).length, ss = softStreak(playDays());
  const intro = el("div", "gmsg lt", `🏅 ${got} sur ${L.length}${ss.streak ? ` · 🔥 ${ss.streak}` : ""}`); intro.dataset.say = `Tu as ${got} badge${got > 1 ? "s" : ""} sur ${L.length}.${ss.streak ? ` Série douce : ${ss.streak} jour${ss.streak > 1 ? "s" : ""}.` : ""} Un jour de repos ne casse jamais ta série.`; box.append(intro);
  const grid = el("div", "badgegrid"); L.forEach(b => { const c = el("div", "badge" + (b.date ? " on" : ""), `<span>${b.date ? b.icon : "🔒"}</span><b>${b.name}</b>`); c.onclick = () => toast(b.date ? "Gagné le " + b.date.split("-").reverse().slice(0, 2).join("/") : b.how, 4000); c.dataset.say = b.date ? `${b.name}. Badge gagné.` : `${b.name}. Pour l'obtenir : ${b.how}`; grid.append(c); }); box.append(grid);
}
function playLearn(id) {
  const i = LESSONS.findIndex(l => l.id === id), nx = i + 1 < LESSONS.length ? () => playLearn(LESSONS[i + 1].id) : null;
  activity(LESSONS[i].title, "learn", id, s => mountLearn(s, id, { onWin: () => { markDone("learn", id); winBar(nx, parcours); } }), parcours);
}
function stepInfo(s) {
  if (s.sec === "learn") { if (s.id === "l7") return { icon: "🔗", title: "Des blocs au vrai code", sub: "Pose des blocs et regarde le code s'écrire tout seul" }; const l = LESSONS.find(x => x.id === s.id); return { icon: l.icon, title: l.title, sub: "Leçon pour débuter" }; }
  if (s.sec === "disc") { const d = DISC.find(x => x.id === s.id); return { icon: d.icon, title: d.title, sub: d.sub }; }
  if (s.sec === "lab") { const d = LABS.find(x => x.id === s.id); return { icon: d.icon, title: d.title, sub: d.sub }; }
  if (s.sec === "prog") { const b = s.id[0], lv = LEVELS[b][+s.id.slice(1) - 1]; return { icon: "🧩", title: lv.title, sub: "Blocs · " + BANDS[b].short + " ans" }; }
  if (s.sec === "build") { const l = BUILD.find(x => x.id === s.id); return { icon: l.prog ? "🧠" : "🔧", title: l.title, sub: l.mission.split(".")[0] + "." }; }
  if (s.sec === "code") { const m = FLAT.find(x => x.id === s.id); return { icon: "⌨️", title: m.title, sub: m.mission.split(/[.!?]/)[0] + "." }; }
  if (s.sec === "project") return { icon: "🏗️", title: "Le Grand Projet", sub: "Conçois, monte et programme ton propre robot, de l'idée à la fiche finale" };
  return { icon: "⭐", title: s.id, sub: "" };
}
function launchStep(s) {
  if (s.sec === "learn") return s.id === "l7" ? playGrid("b", 0, { codeOpen: true, mark: ["learn", "l7"] }) : playLearn(s.id);
  if (s.sec === "disc") return discItems()[0].items.find(i => i.id === s.id).go();
  if (s.sec === "lab") return labItems()[0].items.find(i => i.id === s.id).go();
  if (s.sec === "prog") return playGrid(s.id[0], +s.id.slice(1) - 1);
  if (s.sec === "build") return playBuild(BUILD.find(l => l.id === s.id));
  if (s.sec === "code") return playCode(FLAT.find(m => m.id === s.id));
  if (s.sec === "project") return playProject();
}
function parcours() {
  const ns = nextStep();
  const groups = [];
  RANKS.forEach((r, i) => {
    const p = rankProgress(i), un = rankUnlocked(i), fin = rankDone(i);
    const header = `${r.icon} Aventure ${i + 1} · ${r.name}  (${p.done}/${p.total})${fin ? " ✅" : un ? "" : " 🔒"}`, info = un ? r.goal : "Termine l'aventure d'avant pour l'ouvrir.";
    if (!un) { groups.push({ header, info, items: [] }); return; }  // une aventure terminée reste ouverte : on peut refaire ses étapes
    groups.push({ header, info, collapsed: fin, items: r.steps.map((s, j) => { const info = stepInfo(s), ok = stepUnlocked(i, j); return { icon: info.icon, title: info.title, sub: info.sub, done: stepDone(s), rec: !!ns && ns.rank === i && ns.index === j, locked: !ok, go: ok ? () => launchStep(s) : () => { toast("Termine d'abord l'étape d'avant 🙂"); speak("Termine d'abord l'étape d'avant."); } }; }) });
  });
  menu("Mon parcours", groups, home);
}
function playProject() {
  activity("Le Grand Projet", "project", "pj", s => mountProject(s, { onFinish: () => { markDone("project", "pj"); winBar(null, parcours); }, onSave: d => keep("projet", d.name || "Mon grand projet", d) }), parcours);
}
function playProjectSheet(data) { activity("Fiche du Grand Projet", "project", "sheet", s => mountProject(s, {}, data), creations); }
function openCodeFromBlocks(info) {
  const lv = info.level, spec = info.kind === "robot" ? { kind: "robot", scenarios: (lv.scenarios || [{ map: lv.map, dir: lv.dir }]).map(s => ({ map: s.map, dir: s.dir ?? 1 })), auto: !!lv.auto } : { kind: "brain", goal: info.goal };
  playCode({ id: "blocs", title: "Mon code (venu des blocs)", mission: "Voici le code de tes blocs. Change-le, relance, et vois ce qui se passe !", lesson: "Les blocs et le code font exactement la même chose. Ici, tu peux modifier le code toi-même.", example: "", starter: info.code, hints: [], solution: "", spec }, info.code, info.lang);
}
function topbar(title, back, withPause = true) {
  const bar = el("div", "bar"), b = el("button", "iconbtn", "⬅️"); b.onclick = back; b.setAttribute("aria-label", "Retour"); const h = el("h1", "ttl", title);
  const p = el("button", "iconbtn", withPause ? "⏸️" : ""); if (withPause) p.setAttribute("aria-label", "Pause"); if (withPause) p.onclick = pauseScreen; else p.style.visibility = "hidden"; bar.append(b, h, p); return bar;
}
function menu(title, groups, back) {
  leave(); if (sceneApi) sceneApi.set("sky"); app.innerHTML = ""; app.append(topbar(title, back, false)); const box = el("div", "levels");
  groups.forEach(g => {
    const holder = el("div", "gitems");
    if (g.header) {
      // Montessori : très peu de mots à l'écran. On garde le début du titre ; l'explication se lit en touchant ℹ️
      const parts = String(g.header).split(/\s[:—]\s/), short = parts[0], more = g.info || parts.slice(1).join(" — ");
      const head = el("div", "gh"), tt = el(g.collapsed ? "button" : "span", "ght" + (g.collapsed ? " ghfold" : ""), short + (g.collapsed ? " ▸" : "")); head.append(tt); box.append(head);
      if (more) { const tip = el("div", "ghmore", more), inf = el("button", "ghi", "ℹ️"); tip.style.display = "none"; inf.setAttribute("aria-label", "Plus d'explications"); inf.onclick = () => { tip.style.display = tip.style.display === "none" ? "" : "none"; }; head.append(inf); box.append(tip); }
      if (g.collapsed) { holder.style.display = "none"; tt.onclick = () => { const open = holder.style.display === "none"; holder.style.display = open ? "" : "none"; tt.textContent = short + (open ? " ▾" : " ▸"); }; }
    }
    box.append(holder);
    (g.items || []).forEach(it => { const b = el("button", "lv" + (it.rec ? " rec" : "") + (it.locked ? " locked" : ""), `<span class="n">${it.icon}</span><span class="ttl2"><b>${it.title}</b></span><span class="st">${it.locked ? "🔒" : it.done ? "⭐" : ""}</span>`); if (it.sub) b.setAttribute("aria-label", `${String(it.title).replace(/<[^>]+>/g, "")}. ${String(it.sub).replace(/<[^>]+>/g, "")}`); b.onclick = it.go; holder.append(b); });
  });
  app.append(box);
}
const firstTodo = list => list.findIndex(i => !i.done);
function discItems() { const items = DISC.map(d => ({ ...d, done: isDone("disc", d.id), rec: false, go: () => activity(d.title, "disc", d.id, s => mountDiscover(s, d.id, hooksFor("disc", d.id, () => menu("Découvrir le robot", discItems(), home))), () => menu("Découvrir le robot", discItems(), home)) }));
  const k = items.findIndex(i => !i.done && i.bands.includes(S.age || "a")); if (k >= 0) items[k].rec = true; return [{ items }]; }
function labItems() { const items = LABS.map(d => ({ ...d, done: isDone("lab", d.id), go: () => activity(d.title, "lab", d.id, s => mountLab(s, d.id, hooksFor("lab", d.id, () => menu("Les capteurs", labItems(), home))), () => menu("Les capteurs", labItems(), home)) }));
  const k = items.findIndex(i => !i.done && i.bands.includes(S.age || "a")); if (k >= 0) items[k].rec = true; return [{ items }]; }

function progItems(band) { return LEVELS[band].map((lv, i) => ({ icon: String(i + 1), title: lv.title, done: isDone("prog", band + (i + 1)), go: () => playGrid(band, i) })); }
function progMenu() {
  const order = [S.age || "a", ...["a", "b", "c"].filter(b => b !== (S.age || "a"))];
  const groups = order.map(b => { const items = progItems(b); if (b === (S.age || "a")) { const k = firstTodo(items); if (k >= 0) items[k].rec = true; } return { header: `${BANDS[b].name}${b === (S.age || "a") ? " · pour toi" : ""}`, items }; });
  const band = S.age || "a"; groups.unshift({ header: "🎲 S'entraîner", info: "Un parcours surprise à chaque fois, toujours possible à réussir. Il devient plus difficile au fil des réussites.", items: [{ icon: "🎲", title: "Parcours surprise", sub: "un nouveau parcours à chaque fois", go: () => playPractice(band, 0) }] });
  menu("Programmer le robot", groups, home);
}
// S'entraîner : des parcours au hasard (practice.js), de plus en plus difficiles ; 5 XP par réussite, 30 XP au plus par jour
function playPractice(band, n = 0) {
  const lv = makePractice(band, n), next = () => playPractice(band, n + 1);
  activity(`🎲 ${lv.title}`, "prog", "train", s => mountGrid(s, lv, { onWin: () => { const xp = trainReward(S, dayKey(Date.now())); if (xp) { const r = addXP(xp); setTimeout(() => { const st = document.querySelector(".astage"); if (st) { const chip = el("div", "xpchip", `⚡ +${xp} XP · aujourd'hui ${r.after}/${r.goal}`), wb = st.querySelector(".winbar"); wb ? st.insertBefore(chip, wb) : st.append(chip); } }, 450); } else toast("Bravo ! Tu as déjà gagné tes points d'entraînement du jour 🌟", 3500); winBar(next, progMenu); }, speakIntro: false }), progMenu);
}
function playGrid(band, i, opts = {}) {
  const lv = LEVELS[band][i], id = band + (i + 1), nextLv = i + 1 < LEVELS[band].length ? () => playGrid(band, i + 1) : null;
  activity(`${BANDS[band].short} · ${lv.title}`, "prog", id, s => mountGrid(s, lv, { onWin: () => { markDone("prog", id); if (opts.mark) markDone(...opts.mark); winBar(nextLv, opts.mark ? parcours : progMenu); }, speakIntro: S.age === "a", codeOpen: opts.codeOpen, onOpenCode: openCodeFromBlocks }), opts.mark ? parcours : progMenu);
}
function createMenu() {
  const age = S.age || "a";
  menu("Créer", [
    { header: "Le robot dessine", items: [...DEFIS[age].map((d, i) => ({ icon: "✏️", title: d.title, sub: "avec un modèle à suivre", done: isDone("draw", age + (i + 1)), go: () => playDraw(age, i) })), { icon: "🖍️", title: "Dessin libre", sub: "invente ce que tu veux", go: () => freeDraw(age) }] },
    { header: "Le robot danse", items: [{ icon: "🎵", title: "Compose une danse", sub: "lumières, notes et sauts", go: () => freeDance(age) }] },
    { header: "Un parcours à toi", items: [{ icon: "🗺️", title: "Dessine un parcours", sub: "puis programme le robot pour le réussir", go: sandbox }] }
  ], home);
}
function playDraw(band, i) { const d = DEFIS[band][i], id = band + (i + 1), next = i + 1 < DEFIS[band].length ? () => playDraw(band, i + 1) : null;
  activity(d.title, "draw", id, s => mountDraw(s, band, d, { onWin: () => { markDone("draw", id); winBar(next, createMenu); }, onSave: (data, t) => keep("draw", t, { band, lists: data }) }), createMenu); }
function freeDraw(band, data) { activity("Dessin libre", "draw", "free", s => { const c = mountDraw(s, band, null, { onSave: (d, t) => keep("draw", "Mon dessin", { band, lists: d }) }); if (data) c.editor.set(data); return c; }, createMenu); }
function freeDance(band, data) { activity("Ma danse", "dance", "free", s => { const c = mountDance(s, band, { onWin: () => markDone("dance", "free"), onSave: (d) => keep("dance", "Ma danse", { band, lists: d }) }); if (data) c.editor.set(data); return c; }, createMenu); }

// ---------- activité générique ----------
function activity(title, sec, id, mount, back) {
  leave(); track(sec, id, title); if (sceneApi) sceneApi.set(sceneFor(sec)); app.innerHTML = ""; app.append(topbar(title, back)); const stage = el("div", "astage" + (sec === "learn" || sec === "daily" ? " player" : "")); app.append(stage);
  const c = mount(stage); cleanup = () => c && c.destroy && c.destroy(); window.__cur = c;
}
const hooksFor = (sec, id, back) => ({ onWin: () => { markDone(sec, id); winBar(null, back); } });
function winBar(next, list) {
  document.querySelectorAll(".winbar").forEach(x => x.remove()); const w = el("div", "winbar"), stage = document.querySelector(".astage"); if (!stage) return;
  if (next) { const b = el("button", "big-btn", "▶ Niveau suivant"); b.onclick = next; w.append(b); } const l = el("button", "big-btn alt", "☰ Liste des niveaux"); l.onclick = list; w.append(l); const pb = el("button", "big-btn alt", "🗺️ Mon parcours"); pb.onclick = parcours; w.append(pb); stage.append(w); w.scrollIntoView({ behavior: "smooth", block: "end" });
}
function keep(type, title, data) { S.creations.unshift({ id: Date.now(), type, title, data, date: new Date().toLocaleDateString("fr-FR") }); S.creations = S.creations.slice(0, 40); save(); toast("✔ Gardé dans « Mes créations » !"); }

// ---------- parcours à dessiner ----------
function sandbox() {
  leave(); app.innerHTML = ""; app.append(topbar("Dessine ton parcours", createMenu, false)); const box = el("div", "astage"); app.append(box);
  const H = 6, W = 6, cells = Array.from({ length: H }, () => Array(W).fill(".")); cells[0][0] = "R"; let flag = false;
  box.append(el("div", "intro", "Touche une case pour changer : 🪨 caillou → ⭐ étoile → 🏁 arrivée → vide. Le robot 🤖 part de la case en haut à gauche, tourné vers la droite."));
  const g = el("div", "sbgrid"); box.append(g);
  const draw = () => { g.innerHTML = ""; cells.forEach((row, r) => row.forEach((ch, c) => { const d = el("button", "sbcell", ch === "R" ? "🤖" : ch === "#" ? "🪨" : ch === "*" ? "⭐" : ch === "F" ? "🏁" : ""); d.onclick = () => { if (ch === "R") return; const seq = [".", "#", "*", "F"]; let n = seq[(seq.indexOf(ch) + 1) % 4]; if (n === "F" && flag) n = "."; if (ch === "F") flag = false; if (n === "F") flag = true; cells[r][c] = n; draw(); }; g.append(d); })); };
  draw();
  const go = el("button", "big-btn", "▶ Programmer ce parcours"); go.onclick = () => { if (!flag) { toast("Place d'abord un drapeau 🏁 d'arrivée"); return; }
    const map = cells.map(r => r.join("")); activity("Mon parcours", "map", "free", s => { const c = mountGrid(s, { map, dir: 1, allow: ["fd", "tl", "tr", "rep", "while", "if", "pick", "call"], auto: true, fn: true, intro: "Écris le programme qui mène le robot au drapeau en ramassant toutes les étoiles. Tu peux utiliser tous les blocs.", sol: { main: [{ t: "fd" }] } }, { onWin: () => { markDone("map", "free"); winBar(null, sandbox); keepBtn(s, map); } }); return c; }, sandbox); };
  box.append(go);
}
function keepBtn(stage, map) { const b = el("button", "big-btn alt", "💾 Garder ce parcours"); b.onclick = () => { keep("map", "Mon parcours", { map }); b.disabled = true; }; document.querySelector(".winbar")?.append(b); }

// ---------- Mon robot ----------
function robotBuilder() {
  leave(); app.innerHTML = ""; app.append(topbar("Mon robot", home, false)); const box = el("div", "astage"); app.append(box);
  const prev = el("div", "rprev"), draw = () => prev.innerHTML = robotSvg(S.robot, "#ffd54a"); draw(); box.append(prev);
  const row = (label, content) => { const r = el("div", "ropt"); r.append(el("div", "rl", label)); r.append(content); box.append(r); };
  const name = el("input", "rinput"); name.value = S.robot.name; name.maxLength = 14; name.oninput = () => { S.robot.name = name.value; save(); }; row("Son prénom", name);
  const sw = el("div", "rsw"); COLORS.forEach(c => { const b = el("button", "swb" + (c === S.robot.color ? " on" : "")); b.style.background = c; b.onclick = () => { S.robot.color = c; save(); draw(); sw.querySelectorAll(".swb").forEach(x => x.classList.toggle("on", x === b)); }; sw.append(b); }); row("Sa couleur", sw);
  const choice = (key, opts) => { const w = el("div", "rch"); opts.forEach(([v, t]) => { const b = el("button", "chip" + (S.robot[key] === v ? " on" : ""), t); b.onclick = () => { S.robot[key] = v; save(); draw(); w.querySelectorAll(".chip").forEach(x => x.classList.toggle("on", x === b)); }; w.append(b); }); return w; };
  row("Sa tête", choice("head", [["round", "Ronde"], ["square", "Carrée"]])); row("Ses yeux", choice("eyes", [["dots", "Ronds"], ["visor", "Visière"]])); row("Son antenne", choice("antenna", [[true, "Oui"], [false, "Non"]]));
  const ok = el("button", "big-btn", "✔ C'est mon robot !"); ok.onclick = () => { chime("done"); home(); }; box.append(ok);
}

// ---------- mes créations ----------
function creations() {
  leave(); app.innerHTML = ""; app.append(topbar("Mes créations", home, false)); const box = el("div", "levels");
  if (!S.creations.length) box.append(el("div", "empty", "Rien pour l'instant. Dans « Créer », appuie sur 💾 pour garder un dessin, une danse ou un parcours."));
  S.creations.forEach((c, i) => { const ic = c.type === "draw" ? "🎨" : c.type === "dance" ? "🎵" : c.type === "carte" ? "🔧" : "🗺️"; const b = el("div", "lv cr"); b.innerHTML = `<span class="n">${ic}</span><span class="ttl2"><b>${c.title}</b><small>${c.date}</small></span>`;
    const play = el("button", "gb go", "▶"), del = el("button", "gb", "✕"); play.onclick = () => c.type === "draw" ? freeDraw(c.data.band, c.data.lists) : c.type === "dance" ? freeDance(c.data.band, c.data.lists) : c.type === "projet" ? playProjectSheet(c.data) : c.type === "code" ? playCode(FREE, c.data.code, c.data.lang) : c.type === "carte" ? playBuild(BUILD[BUILD.length - 1], c.data.st) : playMap(c.data.map);
    del.onclick = () => { S.creations.splice(i, 1); save(); creations(); }; b.append(play, del); box.append(b); });
  app.append(box);
}
function playMap(map) { activity("Mon parcours", "map", "free", s => mountGrid(s, { map, dir: 1, allow: ["fd", "tl", "tr", "rep", "while", "if", "pick", "call"], auto: true, fn: true, intro: "Écris le programme qui mène le robot au drapeau.", sol: { main: [{ t: "fd" }] } }, { onWin: () => winBar(null, creations) }), creations); }

// ---------- pause, réglages ----------
let breathTimer;
function pauseScreen() {
  overlay.style.display = "flex"; overlay.innerHTML = `<div class="panel"><h1>Pause</h1><div class="breath"></div><div class="sub" id="bt">Respire doucement…</div><br><button class="big-btn" id="res">Continuer</button></div>`;
  let inh = true; const upd = () => { $("#bt").textContent = inh ? "Inspire" : "Souffle"; inh = !inh; }; upd(); breathTimer = setInterval(upd, 4000);
  $("#res").onclick = () => { clearInterval(breathTimer); overlay.style.display = "none"; };
}
// les réglages (et le tableau de bord) sont protégés par le code parent, s'il existe
// tout le parcours de l'enfant repart de zéro (progression, XP, badges, défis, projet, test de niveau) ; les réglages, les créations
// et les statistiques des parents restent (ils ont leur propre bouton)
function resetJourney() {
  S.progress = {}; S.xp = null; S.badges = null; S.badgesInit = false; S.daily = null; S.dailyDays = []; S.dailyLast = []; S.project = null; S.placementResult = null; S.flags = {}; S.startRank = 0; save();
}
function openSettings() { if (needsParentSetup()) return startSetup(); askPin({ title: "🔒 Espace parents", sub: "Entre le code à 4 chiffres pour ouvrir les réglages.", onOk: settings, onCancel: () => { overlay.style.display = "none"; } }); }
// ----- « Qui joue ? » : à chaque ouverture, le robot et le prénom de l'enfant ; en bas à gauche, le cadenas des parents (inspiré d'iwawa) -----
let onWelcome = false;
// le bouton des parents : le même sur « Qui joue ? » et sur l'accueil (cadenas en bas à gauche, code obligatoire)
function parentLock() { const par = el("button", "wlock", `<span aria-hidden="true">👨‍👩‍👧</span><i aria-hidden="true">🔒</i>`); par.setAttribute("aria-label", "Espace parents, avec le code"); par.onclick = () => openSettings(); return par; }
function welcome() {
  onWelcome = true; leave(); overlay.style.display = "none"; if (sceneApi) sceneApi.set("sky"); app.className = "home welcome"; app.innerHTML = "";
  const esc = t => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const who = el("button", "wchild", `<span class="wavatar">${robotSvg(S.robot)}</span><span class="wname">${esc(S.name || "Moi")}</span>`); who.setAttribute("aria-label", `Jouer : ${S.name || "moi"}`); who.dataset.say = S.name ? `Salut ${S.name} ! Touche le robot pour jouer.` : "Touche le robot pour jouer."; who.onclick = () => { chime("step"); home(); };
  app.append(who, parentLock());
}
// premier écran : « Qui joue ? » si tout est réglé ; sinon la configuration (parent), puis l'accueil de l'enfant
function startApp() { if (!needsParentSetup() && S.age && S.placed) welcome(); else home(); }
const closeSettings = () => { overlay.style.display = "none"; overlay.innerHTML = ""; onWelcome ? welcome() : home(); };

// ----- Espace parents : deux blocs d'icônes ; chaque icône ouvre un petit écran de quelques réglages (inspiré d'iwawa) -----
const PARENT_BLOCKS = [
  { title: "Mon enfant", tiles: [["profil", "🧒", "Profil", "#ffe0ec"], ["son", "🔊", "Son", "#d6ecff"], ["ecran", "🎨", "Écran", "#eadcff"], ["parcours", "🗺️", "Parcours", "#fff1b8"]] },
  { title: "Compte", tiles: [["temps", "⏱️", "Temps", "#d9f5d3"], ["suivi", "📊", "Suivi", "#d2f1ef"], ["code", "🔒", "Code", "#ffe0d2"], ["abo", "⭐", "Abonnement", "#fff0c2"]] }
];
const optList = (v, opts) => opts.map(([val, lab]) => `<option value="${val}" ${v == val ? "selected" : ""}>${lab}</option>`).join("");
const togRow = (label, k, on) => `<div class="row"><span>${label}</span><button class="tog ${on ? "on" : ""}" data-k="${k}" aria-label="${label}"></button></div>`;
const PARENT_SCREENS = {
  profil: () => ({ title: "Profil", html: `<div class="row"><span>Prénom</span><input id="sn" value="${String(S.name).replace(/"/g, "&quot;")}" maxlength="20"></div>
    <div class="row"><span>Âge</span><select id="sa">${optList(S.age, AGES)}</select></div>
    <div class="row"><span>Objectif du jour</span><select id="sg">${optList(S.dailyGoalXP || 100, GOALS.map(g => [g.xp, `${g.name} · ${g.xp} XP`]))}</select></div>` }),
  son: () => ({ title: "Son", html: togRow("Voix", "voice", S.voice) + `<div class="row"><span>Ce que la voix lit</span><select id="sv">${optList(S.voiceMode || "auto", VOICES)}</select></div>` + togRow("Sons", "sound", S.sound) }),
  ecran: () => ({ title: "Écran", html: togRow("Décor animé", "scene", S.scene !== false) + togRow("Petit robot qui réagit", "mascot", S.mascot !== false) + togRow("Mode calme", "calm", S.calm) + togRow("Grand affichage", "big", S.big) }),
  parcours: () => ({ title: "Parcours", html: `<div class="row"><span>Niveau de départ</span><select id="ss">${optList(S.startRank ?? 0, RANKS.map((r, i) => [i, `Aventure ${i + 1} · ${r.name}`]))}</select></div>
    <div class="row"><span>Test de niveau${S.placementResult ? ` (dernier : ${S.placementResult.passes}/5)` : ""}</span><button class="big-btn alt psmall" id="sdt">🎯</button></div>` + togRow("Tout débloquer", "unlockAll", S.unlockAll) + `<div class="row"><span>Effacer la progression</span><button class="big-btn alt psmall" id="rs" aria-label="Effacer la progression">↺</button></div>` }),
  temps: () => ({ title: "Temps", html: `<div class="row"><span>Pause (minutes)</span><select id="sr">${optList(S.reminder, [[0, "jamais"], [10, "10"], [15, "15"], [20, "20"], [30, "30"]])}</select></div>
    <div class="row"><span>Jeu par jour</span><select id="sl">${optList(S.dailyLimit || 0, LIMITS)}</select></div>` }),
  code: () => ({ title: "Code", html: `<div class="row"><span>Code parent ✅</span><button class="big-btn alt psmall" id="pc">Changer</button></div>` }),
  abo: () => ({ title: "Abonnement", html: `<div class="row"><span>Version gratuite</span><span aria-hidden="true">⭐</span></div><p class="sub">La gestion de l'abonnement arrive bientôt.</p>` })
};
// enregistre les réglages affichés (seuls les champs présents sur l'écran courant)
function grabParent() {
  const v = id => { const e = overlay.querySelector(id); return e ? e.value : null; };
  const n = v("#sn"); if (n !== null && n.trim()) S.name = n.trim().slice(0, 20);
  const a = v("#sa"); if (a !== null) S.age = a;
  const g = v("#sg"); if (g !== null && +g > 0) S.dailyGoalXP = +g;   // jamais de valeur vide
  const sv = v("#sv"); if (sv !== null) { S.voiceMode = sv; S.voiceModeSet = sv !== "auto"; }
  const ss = v("#ss"); if (ss !== null) { S.startRank = +ss; S.placed = true; }
  const sr = v("#sr"); if (sr !== null) S.reminder = +sr;
  const sl = v("#sl"); if (sl !== null) { S.dailyLimit = +sl; S.limitShown = null; }
  save(); applySettings();
}
function parentScreen(id) {
  const sc = PARENT_SCREENS[id](); overlay.style.display = "flex";
  overlay.innerHTML = `<div class="panel"><div class="phead"><button class="iconbtn" id="pback" aria-label="Retour">⬅️</button><h1>${sc.title}</h1></div>${sc.html}</div>`;
  overlay.querySelectorAll(".tog").forEach(b => b.onclick = () => { S[b.dataset.k] = !S[b.dataset.k]; b.classList.toggle("on", S[b.dataset.k]); save(); applySettings(); });
  $("#pback").onclick = () => { grabParent(); settings(); };
  const sdt = $("#sdt"); if (sdt) sdt.onclick = () => { grabParent(); mountPlacement(overlay, res => { toast(res.rank ? `Nouveau départ : aventure ${res.rank + 1} · ${RANKS[res.rank].name}` : "Départ au tout début", 4000); closeSettings(); }); };
  const rs = $("#rs"); if (rs) rs.onclick = () => { grabParent(); askConfirm(overlay, { title: "Effacer la progression ?", sub: "Le parcours de l'enfant repart de zéro.", onYes: () => { resetJourney(); toast("Progression effacée"); parentScreen("parcours"); }, onNo: () => parentScreen("parcours") }); };
  const pc = $("#pc"); if (pc) pc.onclick = () => createPin({ onDone: settings, onCancel: () => parentScreen("code") });
}
function settings() {
  overlay.style.display = "flex";
  overlay.innerHTML = `<div class="panel parentpanel"><h1>Espace parents</h1>${PARENT_BLOCKS.map(b => `<h2 class="pbtitle">${b.title}</h2><div class="pgrid2">${b.tiles.map(([id, ic, nm, hue]) => `<button class="tile" data-id="${id}" style="--tc:${hue}"><span class="tpic" aria-hidden="true">${ic}</span><b>${nm}</b></button>`).join("")}</div>`).join("")}<div class="cfmbtns"><button class="cfmno" id="pclose" aria-label="Fermer l'espace parents">✖</button></div></div>`;
  overlay.querySelectorAll(".tile").forEach(b => b.onclick = () => { if (b.dataset.id === "suivi") { overlay.style.display = "none"; overlay.innerHTML = ""; dashboard(); } else parentScreen(b.dataset.id); });
  $("#pclose").onclick = closeSettings;
}
let lastNudge = Date.now();
setInterval(() => { if (window.__cur && S.reminder > 0 && Date.now() - lastNudge > S.reminder * 60000) { lastNudge = Date.now(); toast("Petite pause ? 🌿 Un robot aussi a besoin de se recharger !"); speak("Petite pause ?"); } }, 20000);

if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("sw.js").catch(() => {});
initVoice();
mascotApi = initMascot();
sceneApi = initScene();
initStats({ onLimit: () => { if (overlay.style.display !== "flex") showLimit(); } });
window.__app = { get mascot() { return mascotApi; }, welcome, startApp, parentScreen, playPractice, progMenu, startSetup, startOnboarding, pushOverlay, streakScreen, goalScreen, rewardXP, playDaily, showBadges, announceBadges, openSettings, settings, dashboard, showLimit, playProject, playProjectSheet, parcours, playLearn, launchStep, stepInfo, celebrate, levelChooser, openCodeFromBlocks, RANKS, LESSONS, codeMenu, playCode, FLAT, FREE, home, advMenu, playAdv, ADVFLAT, buildMenu, playBuild, BUILD, playGrid, playDraw, freeDance, freeDraw, S, LEVELS, DEFIS, DISC, LABS, activity, sandbox, creations, robotBuilder, get cur() { return window.__cur; } };
startApp();
