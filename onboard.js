// L'accueil du tout début : Bolt, le petit robot, discute avec l'enfant (comme une conversation) pour apprendre à le connaître,
// trouver où commencer (un petit test de 5 questions, ou le début) et fixer un objectif du jour.
import { el, S, save, chime, speak } from "./util.js";
import { robotSvg } from "./robot.js";
import { GOALS } from "./xp.js";
import { RANKS } from "./parcours.js";
import { placementQuestions, placeFrom, PLACEMENT_TOPICS } from "./dailyq.js";
import { speakCode } from "./codeengine.js";

const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const PITCH = {
  robot: "Tu vas construire un vrai robot sur une carte électronique, brancher ses yeux et ses roues, puis écrire son cerveau.",
  fun: "Tu vas jouer avec un petit robot : le guider, le faire danser, relever des défis.",
  code: "Tu vas apprendre à écrire du vrai code : d'abord avec des blocs, puis en Python et en JavaScript.",
  school: "Tu vas apprendre pas à pas, avec des leçons courtes et sans note : parfait pour t'entraîner."
};
export const STEPS = ["greeting", "name", "hello", "age", "motivation", "reassure", "experience", "path", "goal", "ready"];
const recText = rank => rank === 0 ? "On commence par les bases : c'est quoi un robot, un ordre, un programme ? Chaque leçon dure quelques minutes." : `On saute ce que tu sais déjà : tu démarres au rang ${rank + 1}, « ${RANKS[rank].name} » ${RANKS[rank].icon}. Tu pourras toujours revenir sur les rangs d'avant.`;

// ----- l'écran de conversation (partagé par l'accueil et le test refait plus tard) -----
function shell(host) {
  host.style.display = "flex";
  host.innerHTML = `<div class="ob"><div class="obbar"></div><div class="obmain"><div class="obbot"></div><div class="obchat"><div class="gmsg obbubbles"></div><div class="obextra"></div><div class="obact"></div></div></div></div>`;
  const q = s => host.querySelector(s), ui = { bar: q(".obbar"), bot: q(".obbot"), bub: q(".obbubbles"), extra: q(".obextra"), act: q(".obact") };
  ui.bot.innerHTML = robotSvg(S.robot);
  ui.say = (...lines) => { ui.bub.innerHTML = lines.map(l => `<p class="obb">${l}</p>`).join(""); ui.extra.innerHTML = ""; };
  ui.btn = (label, fn, cls = "") => { const b = el("button", "big-btn " + cls, label); b.onclick = fn; ui.act.append(b); return b; };
  ui.choice = (icon, label, sub, fn, cls = "") => { const b = el("button", "obchoice " + cls, `<span class="oi">${icon}</span><span><b>${esc(label)}</b>${sub ? `<small>${esc(sub)}</small>` : ""}</span>`); b.onclick = () => { chime("step"); fn(); }; ui.act.append(b); return b; };
  ui.progress = (i, n) => { ui.bar.innerHTML = Array.from({ length: n }, (_, k) => `<i class="${k < i ? "d" : k === i ? "c" : ""}"></i>`).join(""); };
  return ui;
}

// ----- le test de placement : 5 questions du plus facile au plus difficile -----
// ui : l'écran ; done({ rank, passes, answers }) est appelé quand l'enfant a accepté son résultat
export function runPlacement(ui, done, { quiet = false } = {}) {
  const qs = placementQuestions(), answers = []; let k = 0;
  ui.act.innerHTML = ""; ui.progress(0, 5);
  ui.say("Voici 5 petites questions, de la plus facile à la plus difficile.", "Si tu ne sais pas, touche « Je ne sais pas » : c'est très bien, ça m'aide à te placer au bon endroit !");
  ui.btn("C'est parti", () => ask());
  function ask() {
    const q = qs[k]; ui.act.innerHTML = ""; ui.progress(k, 5); ui.say(`Question ${k + 1} sur 5`, esc(q.text).replace(/\n/g, "<br>"));
    if (q.art) ui.extra.append(el("pre", "dgrid", esc(q.art)));
    if (q.code) { const p = el("pre", "excode", ""); p.textContent = q.code; p.dataset.say = "Voici le programme. " + speakCode(q.code, q.lang); ui.extra.append(p); }
    q.choices.forEach(c => ui.choice("▫️", c.label, "", () => answer(c.ok ? "ok" : "ko")));
    ui.choice("🤷", "Je ne sais pas", "", () => answer("dk"), "obdk");
  }
  function answer(a) { answers.push(a); k++; if (a !== "ok" || k >= qs.length) return result(); ask(); }
  function result() {
    ui.act.innerHTML = ""; ui.progress(5, 5); const { passes, rank } = placeFrom(answers);
    const known = PLACEMENT_TOPICS.slice(0, passes);
    ui.say("Merci ! Voilà ce que j'ai compris :", passes ? `Tu connais déjà : ${known.map(esc).join(" ; ")}.` : "On va tout découvrir ensemble, en douceur : c'est le meilleur départ !", `Je te conseille de commencer ${rank === 0 ? "au tout début, avec le rang Novice 🌱" : `au rang ${rank + 1} : « ${esc(RANKS[rank].name)} » ${RANKS[rank].icon}`}.`);
    ui.btn("✅ D'accord, on y va", () => { S.placementResult = { date: new Date().toISOString().slice(0, 10), passes, answers: answers.slice(), rank }; save(); done({ rank, passes, answers }); });
    if (rank > 0) ui.btn("↩ Je préfère tout reprendre au début", () => { S.placementResult = { date: new Date().toISOString().slice(0, 10), passes, answers: answers.slice(), rank: 0, chose: "debut" }; save(); done({ rank: 0, passes, answers }); }, "alt");
  }
}

// ----- le test refait plus tard (réglages parents) -----
export function mountPlacement(host, onDone) {
  const ui = shell(host);
  runPlacement(ui, res => { S.startRank = res.rank; S.placed = true; save(); host.style.display = "none"; host.innerHTML = ""; onDone(res); });
}

// ----- l'accueil complet -----
// host : l'élément plein écran (#overlay). onDone(réponses) est appelé à la fin.
export function mountOnboarding(host, onDone) {
  const ans = { name: S.name || "", age: S.age || "", motivation: "", rank: 0, goal: 100 }; let i = 0;
  const ui = shell(host), { say, btn, choice, act } = ui, next = () => { i++; render(); };
  function render() {
    act.innerHTML = ""; ui.progress(i, STEPS.length);
    const nm = ans.name ? ` ${esc(ans.name)}` : "";
    switch (STEPS[i]) {
      case "greeting": say("Salut ! Je suis <b>Bolt</b>, ton petit robot.", "Je serai ton compagnon de route dans le monde des robots et du code."); btn("Continuer", next); break;
      case "name": {
        say("Je suis curieux… Comment t'appelles-tu ?"); const inp = el("input", "pname obin"); inp.maxLength = 20; inp.placeholder = "Ton prénom"; inp.value = ans.name; inp.setAttribute("aria-label", "Ton prénom"); act.append(inp);
        const go = btn("Continuer", () => { ans.name = inp.value.trim().slice(0, 20); next(); }); go.disabled = !inp.value.trim(); inp.oninput = () => { go.disabled = !inp.value.trim(); };
        inp.onkeydown = e => { if (e.key === "Enter" && inp.value.trim()) go.click(); }; const skip = btn("Je préfère ne pas le dire", () => { ans.name = ""; next(); }, "alt"); skip.classList.add("obskip"); setTimeout(() => inp.focus(), 50); break;
      }
      case "hello": say(`Enchanté${nm} !`, "On va construire une expérience faite pour toi."); btn("C'est parti", next); break;
      case "age": say("Quel âge as-tu ?", "Je te proposerai les activités qui te conviennent le mieux."); [["a", "6 – 8 ans"], ["b", "8 – 10 ans"], ["c", "10 – 12 ans"], ["c", "Plus de 12 ans"]].forEach(([band, t]) => choice("🎂", t, "", () => { ans.age = band; next(); })); break;
      case "motivation": say("Qu'est-ce qui te donne envie d'apprendre ?"); [["robot", "🤖", "Construire un robot"], ["fun", "🎮", "M'amuser"], ["code", "⌨️", "Apprendre à écrire du code"], ["school", "🏫", "M'entraîner pour l'école"]].forEach(([k, ic, t]) => choice(ic, t, "", () => { ans.motivation = k; next(); })); break;
      case "reassure": say(`Tu vas te sentir à ta place ici${nm} !`, "Ici, on apprend en jouant : pas de chrono, pas de note. Se tromper, c'est la meilleure façon d'apprendre."); btn("Continuer", next); break;
      case "experience":
        say("Maintenant, je veux te placer au bon endroit.", "As-tu déjà programmé un peu ?");
        choice("🌱", "Non, je débute", "On commence tout au début, tranquillement", () => { ans.rank = 0; S.placementResult = null; next(); });
        choice("🎯", "Oui, un peu : je fais le petit test", "5 questions pour trouver ton niveau, sans stress", () => { runPlacement(ui, res => { ans.rank = res.rank; next(); }); }); break;
      case "path": {
        say("Voici ce que je te conseille :", esc(PITCH[ans.motivation] || PITCH.fun));
        const card = el("div", "obcard", `<div class="oc1">🗺️ Parcours complet</div><b>11 rangs, de Novice à Expert</b><span>${esc(recText(ans.rank))}</span><small>Mes premiers pas : ${RANKS[ans.rank].icon} ${esc(RANKS[ans.rank].name)} · tout se débloque à ton rythme</small>`); act.append(card);
        btn("Continuer avec le parcours complet", next); break;
      }
      case "goal": say("Dernière chose : fixe ton objectif du jour.", "Chaque étape réussie te rapporte des points d'expérience (XP). Tu pourras le changer quand tu veux."); GOALS.forEach(g => choice(g.icon, `${g.name} · ${g.xp} XP`, g.sub, () => { ans.goal = g.xp; next(); })); break;
      case "ready": say(`Parfait${nm} !`, ans.rank === 0 ? "On commence par ta toute première leçon ?" : "On y va ? Je t'emmène à ton point de départ."); btn("▶ Commencer", () => finish()); break;
    }
  }
  function finish() { S.name = ans.name; S.age = ans.age || "a"; S.startRank = ans.rank; S.placed = true; S.onboarded = true; S.motivation = ans.motivation; S.dailyGoalXP = ans.goal; save(); host.style.display = "none"; host.innerHTML = ""; onDone(ans); }
  render();
  return { step: () => STEPS[i], answers: ans };
}
