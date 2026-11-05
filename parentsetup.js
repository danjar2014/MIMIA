// Première configuration, obligatoirement faite par un parent :
// 1. une question d'adulte, 2. le code parent (avec son code de secours), 3. le profil de l'enfant, 4. l'abonnement (à venir), 5. l'enfant peut jouer.
// Tant que ce n'est pas fait, l'enfant n'a accès à rien. Ensuite, tous les réglages passent par le code parent.
import { S, save, el } from "./util.js";
import { hasPin, createPin, askPin } from "./pin.js";
import { GOALS } from "./xp.js";

const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
export const AGES = [["a", "6 – 8 ans"], ["b", "8 – 10 ans"], ["c", "10 – 12 ans"]];
export const SEXES = [["f", "Fille"], ["m", "Garçon"]];   // sert aux compliments (« tu es une championne » / « un champion »)
export const VOICES = [["auto", "Selon l'âge (conseillé)"], ["guide", "Consigne et résultat"], ["demande", "Seulement avec le bouton 🔊"], ["complet", "Tout ce qu'on touche"]];
export const LIMITS = [[0, "Pas de limite"], [20, "20 minutes"], [30, "30 minutes"], [45, "45 minutes"], [60, "1 heure"], [90, "1 h 30"]];

// la configuration n'est terminée que si le profil est enregistré ET qu'un code parent existe
export const needsParentSetup = () => !(S.parentSetup && hasPin());
export const validProfile = p => String((p && p.name) || "").trim().length > 0 && SEXES.some(x => x[0] === (p && p.sex));
// enregistre le profil de l'enfant choisi par le parent
export function applyProfile(p) {
  if (!validProfile(p)) throw new Error("prénom");
  S.name = String(p.name).trim().slice(0, 20);
  S.sex = p.sex; S.age = AGES.some(a => a[0] === p.age) ? p.age : "a";
  S.dailyGoalXP = +p.goal || 100;
  S.voiceMode = VOICES.some(v => v[0] === p.voiceMode) ? p.voiceMode : "auto"; S.voiceModeSet = S.voiceMode !== "auto";
  S.dailyLimit = +p.limit || 0; S.limitShown = null;
  S.parentSetup = { date: new Date().toISOString().slice(0, 10), plan: (S.parentSetup && S.parentSetup.plan) || "free", v: 1 };
  if (!S.onboarded) S.placed = false;
  save(); return S.parentSetup;
}
// une question d'adulte : (a × b) avec des tables qu'un enfant de 6-8 ans ne connaît pas encore
export const adultQuestion = (rnd = Math.random) => { const a = 6 + Math.floor(rnd() * 4), b = 6 + Math.floor(rnd() * 4); return { a, b, answer: a * b }; };

let active = false;
export const setupActive = () => active;
// host : l'élément plein écran (#overlay). onDone() est appelé quand le parent a fini : l'enfant peut commencer.
export function startParentSetup(host, onDone) {
  // déjà ouverte : on ne la rouvre pas. Mais si l'écran a été fermé en route (annulation d'un sous-écran), on la relance : jamais de blocage
  if (active && host.style.display === "flex") return; active = true; host.style.display = "flex";
  const profile = { name: S.name || "", sex: S.sex || "", age: S.age || "a", goal: S.dailyGoalXP || 100, voiceMode: S.voiceMode || "auto", limit: S.dailyLimit || 0 };
  const opts = (list, v) => list.map(([val, lab]) => `<option value="${val}" ${String(v) === String(val) ? "selected" : ""}>${esc(lab)}</option>`).join("");

  function intro() {
    const q = adultQuestion();
    host.innerHTML = `<div class="panel" data-step="intro"><h1>👨‍👩‍👧 Bienvenue !</h1>
      <p class="sub">La première configuration est <b>réservée à un parent</b>. Vous allez choisir un code secret, régler le profil de votre enfant, puis votre enfant pourra jouer.</p>
      <p class="sub">Pour continuer, répondez : combien font <b>${q.a} × ${q.b}</b> ?</p>
      <input id="psq" inputmode="numeric" class="pname" autocomplete="off" aria-label="Réponse"><div class="pinmsg gmsg" id="psm" aria-live="polite"></div>
      <div class="agebtns"><button class="big-btn" id="psok">Continuer</button></div></div>`;
    const go = () => { if (+host.querySelector("#psq").value === q.answer) pin(); else { const m = host.querySelector("#psm"); m.className = "pinmsg gmsg warn"; m.textContent = "Ce n'est pas la bonne réponse. Cette étape est réservée aux adultes."; host.querySelector("#psq").value = ""; } };
    host.querySelector("#psok").onclick = go; host.querySelector("#psq").onkeydown = e => { if (e.key === "Enter") go(); };
  }
  // le code existe déjà (configuration interrompue) : on le redemande, sinon on le crée
  function pin() {
    if (hasPin()) askPin({ title: "🔒 Code parent", sub: "Entre ton code parent pour continuer la configuration.", onOk: form });
    else createPin({ onDone: form });
  }
  function form() {
    host.style.display = "flex";
    host.innerHTML = `<div class="panel" data-step="profile"><h1>🧒 Le profil de votre enfant</h1>
      <p class="sub">Vous pourrez tout modifier plus tard, avec votre code parent.</p>
      <div class="row"><span>Prénom</span><input id="pfn" value="${esc(profile.name)}" maxlength="20" autocomplete="off" aria-label="Prénom de l'enfant"></div>
      <div class="row"><span>Fille ou garçon</span><select id="pfx" aria-label="Fille ou garçon"><option value="">Choisir…</option>${opts(SEXES, profile.sex)}</select></div>
      <div class="row"><span>Tranche d'âge</span><select id="pfa">${opts(AGES, profile.age)}</select></div>
      <div class="row"><span>Objectif du jour</span><select id="pfg">${opts(GOALS.map(g => [g.xp, `${g.name} · ${g.xp} XP`]), profile.goal)}</select></div>
      <div class="row"><span>Ce que la voix lit</span><select id="pfv">${opts(VOICES, profile.voiceMode)}</select></div>
      <div class="row"><span>Temps de jeu par jour</span><select id="pfl">${opts(LIMITS, profile.limit)}</select></div>
      <div class="pinmsg gmsg" id="pfm" aria-live="polite"></div>
      <div class="agebtns"><button class="big-btn" id="pfok">Continuer</button></div></div>`;
    host.querySelector("#pfok").onclick = () => {
      const q = s => host.querySelector(s).value;
      Object.assign(profile, { name: q("#pfn").trim(), sex: q("#pfx"), age: q("#pfa"), goal: +q("#pfg"), voiceMode: q("#pfv"), limit: +q("#pfl") });
      if (!validProfile(profile)) { const m = host.querySelector("#pfm"); m.className = "pinmsg gmsg warn"; m.textContent = String(profile.name).trim() ? "Choisissez : fille ou garçon." : "Écrivez le prénom de votre enfant."; host.querySelector(String(profile.name).trim() ? "#pfx" : "#pfn").focus(); return; }
      plan();
    };
  }
  function plan() {
    host.innerHTML = `<div class="panel" data-step="plan"><h1>⭐ Abonnement</h1>
      <p class="sub">Vous utilisez la <b>version gratuite</b>. Dans la prochaine version, l'abonnement (plus de contenus, plusieurs enfants) se gérera depuis cet espace parent, protégé par votre code.</p>
      <p class="sub">Rien à faire pour l'instant.</p>
      <div class="agebtns"><button class="big-btn" id="plok">Terminer la configuration</button><button class="big-btn alt" id="plbk">Retour</button></div></div>`;
    host.querySelector("#plbk").onclick = form;
    host.querySelector("#plok").onclick = () => { applyProfile(profile); done(); };
  }
  function done() {
    host.innerHTML = `<div class="panel" data-step="done"><h1>✅ Tout est prêt !</h1>
      <p class="sub">Le code parent est actif. Les réglages ne s'ouvrent plus qu'avec ce code. Vous pouvez maintenant passer l'appareil à ${esc(S.name)}.</p>
      <div class="agebtns"><button class="big-btn" id="dnok">▶ Laisser ${esc(S.name)} commencer</button></div></div>`;
    host.querySelector("#dnok").onclick = () => { active = false; host.style.display = "none"; host.innerHTML = ""; onDone && onDone(); };
  }
  intro();
}
