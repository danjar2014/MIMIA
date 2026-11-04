// « Mon parcours » : 11 rangs à débloquer, de Poussin (on ne sait rien) à Expert (on écrit du vrai code).
// Un rang se débloque quand le précédent est terminé. À l'intérieur d'un rang, on avance étape par étape.
import { S, isDone } from "./util.js";

const st = (sec, id) => ({ sec, id });
export const RANKS = [
  { icon: "🐣", name: "Poussin", goal: "Tu ne sais rien ? C'est parfait ! On te montre de quoi il s'agit : c'est quoi un robot, un ordre, un programme, et cet écran.", steps: ["l1", "l2", "l3", "l4", "l5", "l6"].map(i => st("learn", i)), unlocks: "la carte « Découvrir le robot »" },
  { icon: "🔍", name: "Curieux", goal: "Tu découvres les parties du robot : ses yeux, son cerveau, ses moteurs. Et tu commences à le guider avec des blocs.", steps: [st("disc", "d1"), st("disc", "d2"), st("disc", "d3"), st("disc", "d4"), st("prog", "a1"), st("prog", "a2")] , unlocks: "les cartes « Programmer » et « Construire »" },
  { icon: "🛠️", name: "Apprenti", goal: "Tu guides le robot sur des chemins plus longs et tu construis ta première carte électronique.", steps: [st("prog", "a3"), st("prog", "a4"), st("prog", "a5"), st("prog", "a6"), st("build", "e1"), st("build", "e2"), st("build", "e3")], unlocks: "la carte « Capteurs »" },
  { icon: "⚡", name: "Bricoleur", goal: "Tu apprends à répéter, et à donner des yeux au robot avec des capteurs.", steps: [st("lab", "k1"), st("lab", "k2"), st("prog", "b1"), st("prog", "b2"), st("build", "e4"), st("build", "e5"), st("build", "e6")], unlocks: "la carte « Créer »" },
  { icon: "💡", name: "Inventeur", goal: "Tu répètes avec malice, tu mesures la distance et tu inventes ton propre robot explorateur.", steps: [st("prog", "b3"), st("prog", "b4"), st("prog", "b5"), st("lab", "k3"), st("build", "e7"), st("build", "e8")], unlocks: "les blocs pour décider" },
  { icon: "🧠", name: "Programmeur", goal: "Tu apprends à décider tout seul : « tant que », « si », et tu programmes le cerveau avec des blocs.", steps: [st("prog", "c1"), st("prog", "c2"), st("prog", "c3"), st("prog", "c4"), st("build", "p1"), st("build", "p2"), st("build", "p3")], unlocks: "la carte « Coder pour de vrai »" },
  { icon: "🔗", name: "Traducteur", goal: "Tu découvres que les blocs sont une façon de cacher du vrai code. Tu regardes le code qui s'écrit tout seul.", steps: [st("prog", "c5"), st("prog", "c6"), st("build", "p4"), st("build", "p5"), st("learn", "l7")], unlocks: "tes premières lignes de vrai code" },
  { icon: "⌨️", name: "Codeur", goal: "Tu écris tes premières lignes de vrai code, en Python ou en JavaScript : afficher, variables, calculs, boucles.", steps: ["k1", "k2", "k3", "k4", "k5", "k6", "k7"].map(i => st("code", i)), unlocks: "la carte « Aller plus loin »" },
  { icon: "🔧", name: "Ingénieur", goal: "Tu écris des conditions, des fonctions, et tu fais bouger le robot avec du code.", steps: [st("code", "k8"), st("code", "k9"), st("code", "k10"), st("code", "k11"), st("code", "r1"), st("code", "r2"), st("code", "r3"), st("code", "r4")], unlocks: "les missions de robot en code" },
  { icon: "🤖", name: "Roboticien", goal: "Tu pilotes un robot avec du code intelligent et tu donnes de la mémoire à son cerveau.", steps: [st("code", "r5"), st("code", "r6"), st("code", "r7"), st("code", "r8"), st("code", "r9"), st("code", "r10"), st("build", "m1"), st("build", "m2")], unlocks: "les missions du cerveau en code" },
  { icon: "🏆", name: "Expert", goal: "Tu écris le programme complet du cerveau du robot, avec de la mémoire, puis tu relèves les défis d'expert et tu réalises ton Grand Projet : un robot complet, de l'idée jusqu'à la fiche finale.", steps: [...["c1", "c2", "c3", "c4", "c5", "c6", "c7", "x1", "x2", "x3"].map(i => st("code", i)), st("project", "pj")], unlocks: "ton diplôme d'expert" }
];
// la 7e étape du rang « Traducteur » est une activité spéciale (blocs affichés en code)
export const stepKey = s => s.sec + ":" + s.id;
export const stepDone = s => isDone(s.sec, s.id);
const startRank = () => (S.startRank == null ? 0 : S.startRank);
export const rankDone = i => RANKS[i].steps.every(stepDone);
export const rankProgress = i => ({ done: RANKS[i].steps.filter(stepDone).length, total: RANKS[i].steps.length });
export const rankUnlocked = i => i === 0 || !!S.unlockAll || i <= startRank() || rankDone(i - 1);
export const highestUnlocked = () => { let h = 0; RANKS.forEach((_, i) => { if (rankUnlocked(i)) h = i; }); return h; };
export const currentRank = () => { const i = RANKS.findIndex((_, k) => rankUnlocked(k) && !rankDone(k)); return i < 0 ? RANKS.length - 1 : i; };
// étape à faire : dans un rang, on avance dans l'ordre
export const stepUnlocked = (i, j) => !!S.unlockAll || i <= startRank() - 1 || RANKS[i].steps.slice(0, j).every(stepDone);
export const nextStep = () => { const i = currentRank(), j = RANKS[i].steps.findIndex(s => !stepDone(s)); return j < 0 ? null : { rank: i, index: j, step: RANKS[i].steps[j] }; };
// les cartes de l'accueil : rang minimum pour les ouvrir
export const CARD_RANK = { disc: 1, prog: 2, build: 2, lab: 3, create: 4, code: 6, adv: 8 };
export const cardLocked = key => !S.unlockAll && highestUnlocked() < (CARD_RANK[key] ?? 0);
export const lockReason = key => { const need = CARD_RANK[key] ?? 0, r = RANKS[need - 1]; return r ? `Pour débloquer cette carte, termine le rang « ${RANKS[need - 1].name} » ${RANKS[need - 1].icon} dans Mon parcours.` : ""; };
