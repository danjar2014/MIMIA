// Dessin du robot (personnalisable) et description de ses parties
import { S, futur } from "./util.js";

export const COLORS = ["#3f7fd6", "#e24b4b", "#4caf6a", "#f4c430", "#8e5bc0", "#f28c28", "#2a2a2e", "#14b8a6"];

// petit robot pour les grilles, la danse, etc.  led = couleur de la LED (ou null)
// thème « futur » : le robot en 3D, dans la couleur choisie (theme/futur/bolt-c<n>-<pose>.webp) ; -1 si la couleur n'a pas d'image
export const robot3d = o => (futur() && o && o.color ? COLORS.indexOf(String(o.color).toLowerCase()) : -1);
export function robotSvg(o = S.robot, led = null) {
  const i3 = robot3d(o);
  if (i3 >= 0) return `<svg viewBox="0 0 100 100" class="robot r3d"><image href="theme/futur/bolt-c${i3}-front.webp" x="-4" y="0" width="108" height="108"/>${led ? `<circle cx="50" cy="6.5" r="5" fill="${led}" stroke="#fff" stroke-width="1.5"/>` : ""}</svg>`;
  return robotSvgFlat(o, led);
}
// le dessin à plat (thème clair, et partout où la couleur exacte compte : jeu des couleurs)
export function robotSvgFlat(o = S.robot, led = null) {
  const c = o.color, d = "#38362f";
  const head = o.head === "square" ? `<rect x="28" y="14" width="44" height="34" rx="6" fill="${c}" stroke="${d}" stroke-width="3"/>` : `<rect x="28" y="14" width="44" height="34" rx="17" fill="${c}" stroke="${d}" stroke-width="3"/>`;
  const eyes = o.eyes === "visor" ? `<rect x="34" y="26" width="32" height="10" rx="5" fill="#bfe9ff" stroke="${d}" stroke-width="2"/><circle cx="44" cy="31" r="3" fill="${d}"/><circle cx="56" cy="31" r="3" fill="${d}"/>` : `<circle cx="42" cy="31" r="6" fill="#fff" stroke="${d}" stroke-width="2"/><circle cx="58" cy="31" r="6" fill="#fff" stroke="${d}" stroke-width="2"/><circle cx="43" cy="32" r="2.5" fill="${d}"/><circle cx="59" cy="32" r="2.5" fill="${d}"/>`;
  const ant = o.antenna ? `<path d="M50 14V5" stroke="${d}" stroke-width="3"/><circle cx="50" cy="4" r="4.5" fill="${led || "#bbb"}" stroke="${d}" stroke-width="2"/>` : (led ? `<circle cx="50" cy="9" r="4.5" fill="${led}" stroke="${d}" stroke-width="2"/>` : "");
  return `<svg viewBox="0 0 100 100" class="robot">${ant}${head}${eyes}<rect x="32" y="52" width="36" height="28" rx="6" fill="${c}" stroke="${d}" stroke-width="3"/><rect x="40" y="58" width="20" height="10" rx="2" fill="#fff" opacity=".85"/><circle cx="34" cy="86" r="9" fill="#555" stroke="${d}" stroke-width="3"/><circle cx="66" cy="86" r="9" fill="#555" stroke="${d}" stroke-width="3"/><circle cx="34" cy="86" r="3" fill="#bbb"/><circle cx="66" cy="86" r="3" fill="#bbb"/></svg>`;
}

// les parties du robot (leçon de nomenclature)
export const PARTS = [
  { k: "cerveau", nom: "le cerveau", court: "Cerveau (carte électronique)", role: "Il réfléchit et donne des ordres à toutes les autres parties.", sert: "réfléchit et donne les ordres", hot: [104, 144, 92, 62] },
  { k: "yeux", nom: "les yeux", court: "Capteur de distance (les yeux)", role: "Ils mesurent la distance entre le robot et ce qui est devant lui.", sert: "mesure la distance devant le robot", hot: [96, 52, 108, 52] },
  { k: "lumiere", nom: "le capteur de lumière", court: "Capteur de lumière", role: "Il sent s'il fait clair ou s'il fait sombre.", sert: "sent s'il fait clair ou sombre", hot: [128, 28, 44, 26] },
  { k: "led", nom: "la lampe", court: "LED (la lampe)", role: "Elle s'allume en couleur pour dire ce que le robot pense.", sert: "s'allume en couleur", hot: [126, -2, 48, 30] },
  { k: "roues", nom: "les roues", court: "Moteurs et roues", role: "Les moteurs font tourner les roues : le robot avance et tourne.", sert: "fait avancer et tourner le robot", hot: [52, 252, 196, 66] },
  { k: "batterie", nom: "la batterie", court: "Batterie", role: "Elle donne l'énergie à tout le robot, comme un petit réservoir.", sert: "donne l'énergie au robot", hot: [160, 208, 60, 42] },
  { k: "haut-parleur", nom: "le haut-parleur", court: "Haut-parleur", role: "Il fait des sons, des bips et de la musique.", sert: "fait des sons et de la musique", hot: [88, 206, 56, 42] }
];

// grand schéma du robot avec toutes les parties repérables
export function bigRobotSvg(highlight = null, found = new Set()) {
  const c = S.robot.color, d = "#38362f", H = k => (highlight === k ? ' class="part on"' : ' class="part"');
  const hit = k => { const p = PARTS.find(x => x.k === k).hot; return `<rect class="hit${found.has(k) ? " found" : ""}" data-k="${k}" x="${p[0]}" y="${p[1]}" width="${p[2]}" height="${p[3]}" rx="10" fill="transparent"/>`; };
  return `<svg viewBox="0 0 300 330" class="bigrobot">
  <g${H("led")}><path d="M150 30V14" stroke="${d}" stroke-width="5"/><circle cx="150" cy="10" r="10" fill="#ffd54a" stroke="${d}" stroke-width="4"/></g>
  <rect x="88" y="30" width="124" height="94" rx="20" fill="${c}" stroke="${d}" stroke-width="5"/>
  <g${H("lumiere")}><circle cx="150" cy="44" r="8" fill="#fff6c8" stroke="${d}" stroke-width="3"/><path d="M150 30v-4M138 34l-3-3M162 34l3-3" stroke="${d}" stroke-width="2"/></g>
  <g${H("yeux")}><circle cx="124" cy="82" r="20" fill="#fff" stroke="${d}" stroke-width="4"/><circle cx="176" cy="82" r="20" fill="#fff" stroke="${d}" stroke-width="4"/><circle cx="124" cy="84" r="9" fill="${d}"/><circle cx="176" cy="84" r="9" fill="${d}"/></g>
  <rect x="78" y="134" width="144" height="124" rx="18" fill="${c}" stroke="${d}" stroke-width="5"/>
  <g${H("cerveau")}><rect x="108" y="148" width="84" height="54" rx="8" fill="#2d6a4f" stroke="${d}" stroke-width="3"/><path d="M118 160h20M118 172h30M118 184h16M164 160h18M156 176h26M168 190h14" stroke="#95d5b2" stroke-width="3" stroke-linecap="round"/><rect x="146" y="166" width="14" height="14" fill="#1b4332" stroke="#95d5b2" stroke-width="2"/></g>
  <g${H("haut-parleur")}><circle cx="116" cy="228" r="20" fill="#e9e4d8" stroke="${d}" stroke-width="3"/><circle cx="116" cy="228" r="11" fill="#9a958a"/><circle cx="116" cy="228" r="4" fill="${d}"/></g>
  <g${H("batterie")}><rect x="166" y="214" width="46" height="28" rx="5" fill="#ffd54a" stroke="${d}" stroke-width="3"/><rect x="212" y="222" width="6" height="12" fill="${d}"/><path d="M184 228h10M189 223v10" stroke="${d}" stroke-width="3"/></g>
  <g${H("roues")}><circle cx="86" cy="284" r="32" fill="#555" stroke="${d}" stroke-width="5"/><circle cx="214" cy="284" r="32" fill="#555" stroke="${d}" stroke-width="5"/><circle cx="86" cy="284" r="12" fill="#bbb"/><circle cx="214" cy="284" r="12" fill="#bbb"/><path d="M86 252v-6M214 252v-6" stroke="${d}" stroke-width="4"/></g>
  ${PARTS.map(p => hit(p.k)).join("")}</svg>`;
}
