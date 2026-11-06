// Le petit cours avant chaque jeu des 3-6 ans : une phrase, puis les mots un par un (les jours, les mois, les chiffres…).
import { PARTS } from "./parts.js";
import { NUMS, DAYS, MONTHS, COLORS, LETTER_OBJ, POSITIONS } from "./petits.js";
import { robotSvg } from "./robot.js";
import { S } from "./util.js";

const words = list => list.map(w => ({ html: `<b>${w}</b>`, label: w }));
export const PETIT_LESSONS = {
  chiffres: { say: "Les nombres servent à compter. Compte avec moi, de un jusqu'à dix.", items: NUMS.slice(1).map((w, i) => ({ html: `<b>${i + 1}</b>`, label: w })) },
  lettres: { say: "Chaque lettre commence un mot. Écoute.", items: LETTER_OBJ.slice(0, 6).map(([svg, w, L]) => ({ html: `<span class="ptbig">${svg}</span><b>${L}</b>`, label: `${L}, comme ${w}` })) },
  couleurs: { say: "Voici les couleurs des robots. Écoute leurs noms.", items: COLORS.map(([n, hex]) => ({ html: `<span class="ptbig">${robotSvg({ ...S.robot, color: hex })}</span>`, label: n })) },
  pieces: { say: "Un robot est fait de plusieurs pièces. Voici quelques pièces.", items: PARTS.slice(0, 6).map(p => ({ html: `<span class="ptbig">${p.svg}</span>`, label: p.name })) },
  jours: { say: "Une semaine est composée de sept jours. Écoute-les un par un.", items: words(DAYS) },
  mois: { say: "Une année est composée de douze mois. Écoute-les un par un.", items: words(MONTHS) },
  relier: { say: "Chaque objet a son ombre. Relie l'objet à la bonne ombre.", items: [] },
  espace: { say: "Dans l'espace, il y a le haut, le bas, la gauche et la droite. Écoute.", items: POSITIONS.map(([emo, w]) => ({ html: `<span class="ptbig">${emo}</span>`, label: w })) }
};
// une courte introduction pour chaque étagère Montessori
export const CAT_LESSONS = {
  geometrie: "Les formes sont partout, même sur les robots. Regarde bien chaque forme.", "tour-rose": "Les blocs ont des tailles différentes. On va du plus petit au plus grand.",
  couleurs: "Les couleurs sont partout. On les regarde, puis on les nomme.", triangles: "Un triangle a trois côtés. On peut en assembler plusieurs.",
  poids: "Certaines choses sont lourdes, d'autres légères. Sens la différence.", sons: "Un son peut être grave ou aigu, fort ou faible. Écoute bien.",
  chiffres: "Les chiffres servent à compter. On compte avec les doigts et avec les yeux.", fractions: "Un tout peut être coupé en parts égales. Chaque part est une partie du tout.",
  barres: "Les barres sont courtes ou longues. On les compare pour les ranger.", cent: "Les nombres se suivent, de un jusqu'à cent. On cherche celui qui manque.",
  decimal: "Dix unités font une dizaine. Dix dizaines font une centaine.", dizaines: "Après dix, viennent onze, douze, treize, jusqu'à dix-neuf.",
  "barres-num": "Chaque barre vaut un nombre. Plus la barre est longue, plus le nombre est grand.", addition: "Additionner, c'est ajouter. Deux groupes qu'on met ensemble font un plus grand groupe.",
  soustraction: "Soustraire, c'est enlever. Quand on enlève, il en reste moins.", horloge: "L'horloge montre l'heure. La petite aiguille dit l'heure, la grande dit les minutes."
};
// les phrases du cours à enregistrer (voice/extract.mjs) ; les mots un par un restent à la voix de l'appareil
export const lessonPhrases = () => [...Object.values(PETIT_LESSONS).map(l => l.say), ...Object.values(CAT_LESSONS)].flatMap(t => t.match(/[^.!?…]+[.!?…]*/g) || []).map(s => s.trim()).filter(s => s.split(/\s+/).length >= 2);
