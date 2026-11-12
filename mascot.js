// Le petit robot qui réagit : un visage (celui du robot de l'enfant) qui sourit, s'inquiète, réfléchit ou fait la fête
// selon les messages de l'appli (bravo, « pas tout à fait », indice…). Il se glisse partout sans que chaque écran ait à s'en occuper.
import { S, speak } from "./util.js";
import { praise, encourage } from "./praise.js";
import { robot3d } from "./robot.js";

export const MOODS = ["neutral", "happy", "worried", "thinking", "celebrate"];
// quelle humeur pour ce message ? (null = message neutre : on ne change rien)
export function moodFor(cls, text) {
  const c = " " + (cls || "") + " ", t = String(text || "");
  if (/\swarn\s/.test(c)) return "worried";
  if (/\shint\s/.test(c)) return "thinking";
  if (/\sok\s/.test(c)) return /^\s*🎉|Bravo ! Ton programme|Bravo ! Ton robot|Objectif|Tu as construit tout le programme|Parfait/.test(t) ? "celebrate" : "happy";
  return null;
}
const WORDS = { happy: ["Super !", "Bien joué !", "Exact !", "Bravo !"], worried: ["Pas tout à fait…", "Presque !", "On réessaie ?", "Pas grave !"], thinking: ["Regarde bien…", "Un petit indice !", "Réfléchissons…"], celebrate: ["Quel exploit !", "Incroyable !", "Tu as réussi !"] };
// de temps en temps, le petit robot dit le prénom : « Bravo Léa ! », « Courage Léa, essaie encore ! »
const firstSentence = t => (String(t).match(/[^.!?…]+[.!?…]*/) || [t])[0].trim();
export const wordFor = (mood, n = 0) => {
  if (S.name && n % 3 === 0) { if (mood === "happy" || mood === "celebrate") return firstSentence(praise()); if (mood === "worried") return firstSentence(encourage()); }
  const a = WORDS[mood]; return a ? a[n % a.length] : "";
};
const LED = { neutral: "#bbb", happy: "#7CFC9A", worried: "#ffb347", thinking: "#8ec5ff", celebrate: "#ffd54a" };

// le visage : la tête du robot de l'enfant (forme et couleur), l'écran change selon l'humeur
export function faceSvg(mood = "neutral", o = S.robot) {
  const i3 = robot3d(o);
  if (i3 >= 0) return `<svg viewBox="-2 0 104 90" class="mface m3d" aria-hidden="true"><image href="theme/futur/bolt-c${i3}-${MOODS.includes(mood) ? mood : "neutral"}.webp" x="2" y="-4" width="96" height="96"/></svg>`;
  const c = o.color, d = "#38362f", cy = "#5de6ff", ST = `stroke="${cy}" stroke-width="4.5" stroke-linecap="round" fill="none"`;
  const head = o.head === "square" ? `<rect x="14" y="22" width="72" height="60" rx="10" fill="${c}" stroke="${d}" stroke-width="3.5"/>` : `<rect x="14" y="22" width="72" height="60" rx="28" fill="${c}" stroke="${d}" stroke-width="3.5"/>`;
  const ant = `<path d="M50 22V10" stroke="${d}" stroke-width="3.5"/><circle cx="50" cy="8" r="5.5" fill="${LED[mood] || LED.neutral}" stroke="${d}" stroke-width="2.5"/>`;
  const screen = `<rect x="22" y="31" width="56" height="42" rx="13" fill="#1b2a41"/>`;
  const star = (x, y) => `<path d="M${x} ${y - 8} l2.4 5.2 5.6.7 -4.1 3.9 1.1 5.6 -5-2.8 -5 2.8 1.1-5.6 -4.1-3.9 5.6-.7z" fill="#ffd54a"/>`;
  const faces = {
    neutral: `<circle cx="39" cy="49" r="5" fill="${cy}"/><circle cx="61" cy="49" r="5" fill="${cy}"/><path d="M44 62h12" ${ST} stroke-width="3.5"/>`,
    happy: `<path d="M32 52Q39 42 46 52M54 52Q61 42 68 52" ${ST}/><path d="M40 61Q50 71 60 61" ${ST} stroke-width="3.5"/><circle cx="31" cy="62" r="3.5" fill="#ff8fa3" opacity=".8"/><circle cx="69" cy="62" r="3.5" fill="#ff8fa3" opacity=".8"/>`,
    worried: `<path d="M31 41L45 45M69 41L55 45" ${ST} stroke-width="3"/><circle cx="39" cy="53" r="4.5" fill="${cy}"/><circle cx="61" cy="53" r="4.5" fill="${cy}"/><path d="M42 67Q50 60 58 67" ${ST} stroke-width="3.5"/><path d="M80 30q4 7 0 10q-4-3 0-10z" fill="#7fd4ff" stroke="${d}" stroke-width="1.5"/>`,
    thinking: `<circle cx="39" cy="49" r="5" fill="${cy}"/><path d="M55 49h12" ${ST}/><path d="M42 63h12l4-2" ${ST} stroke-width="3.5"/><circle cx="84" cy="22" r="2.4" fill="#fff"/><circle cx="90" cy="14" r="3.2" fill="#fff"/><circle cx="96" cy="4" r="4" fill="#fff"/>`,
    celebrate: `${star(38, 50)}${star(62, 50)}<path d="M40 60Q50 76 60 60Z" fill="#ff8fa3" stroke="${cy}" stroke-width="3" stroke-linejoin="round"/><path d="M8 18l3 3M8 24l5 0M92 70l3 3M88 76l5 0" stroke="#ffd54a" stroke-width="3" stroke-linecap="round"/>`
  };
  const ears = `<rect x="8" y="42" width="7" height="18" rx="3" fill="${d}"/><rect x="85" y="42" width="7" height="18" rx="3" fill="${d}"/>`;
  return `<svg viewBox="-2 0 104 90" class="mface" aria-hidden="true">${ant}${ears}${head}${screen}<g class="meyes">${faces[mood] || faces.neutral}</g></svg>`;
}

export function initMascot() {
  const root = document.createElement("div"); root.id = "mascot"; root.setAttribute("role", "img"); root.setAttribute("aria-label", "Bolt, ton petit robot");
  const bub = document.createElement("div"); bub.className = "mbub"; bub.style.display = "none";
  const fig = document.createElement("div"); fig.className = "mfig"; root.append(fig, bub); (document.querySelector("#dock .slot-mascot") || document.body).append(root);
  let mood = "neutral", back = 0, hideB = 0, n = 0, lastKey = "", lastAt = 0;
  const paint = () => { fig.innerHTML = faceSvg(mood); root.dataset.mood = mood; root.className = "m-" + mood; };
  function show() {
    const ov = document.getElementById("overlay"), onOverlay = ov && ov.style.display && ov.style.display !== "none" && ov.children.length;
    root.style.display = S.mascot !== false && document.querySelector(".astage") && !onOverlay ? "" : "none";
  }
  function set(m, say = true) {
    clearTimeout(back); clearTimeout(hideB); mood = m; paint();
    if (m !== "neutral" && say) { bub.textContent = wordFor(m, n++); bub.style.display = ""; hideB = setTimeout(() => { bub.style.display = "none"; }, 2600); } else bub.style.display = "none";
    if (m !== "neutral") back = setTimeout(() => { mood = "neutral"; paint(); }, m === "celebrate" ? 5000 : 3800);
  }
  const msgOf = node => { const e = node && (node.nodeType === 3 ? node.parentElement : node); return e && e.closest ? e.closest(".gmsg") : null; };
  let pend = null, t = 0;
  new MutationObserver(ms => {
    show();
    for (const m of ms) { const g = msgOf(m.target) || [...m.addedNodes].map(a => a.nodeType === 1 && (a.matches(".gmsg") ? a : a.querySelector(".gmsg"))).find(Boolean); if (g && !g.closest("#overlay")) pend = g; }
    if (!pend) return; clearTimeout(t); t = setTimeout(() => {
      const g = pend; pend = null; if (!g || !document.body.contains(g) || S.mascot === false) return;
      const md = moodFor(" " + g.className + " ", g.textContent); if (!md) return; const key = md + "|" + g.textContent.slice(0, 40), now = Date.now(); if (key === lastKey && now - lastAt < 700) return; lastKey = key; lastAt = now; set(md);
    }, 90);
  }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["class"] });
  // toucher le petit robot : un mot gentil
  root.onclick = () => { const tips = ["Tu peux le faire !", "Prends ton temps, je suis là.", "Chaque erreur t'apprend quelque chose.", "Touche 💡 si tu veux un indice."]; set("happy", false); bub.textContent = tips[n++ % tips.length]; bub.style.display = ""; hideB = setTimeout(() => { bub.style.display = "none"; }, 3200); speak(bub.textContent, { force: true }); };
  paint(); show();
  return { set, refresh: () => { paint(); show(); }, get mood() { return mood; } };
}
