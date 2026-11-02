// Aller plus loin (d'après le cours « Codage robotique », unité 12, NovaSavo) :
// exercices adaptés à 6-12 ans : fiches, quiz, mise en ordre, associations, tri.
import { el, S, chime, speak, shuffle, sleep } from "./util.js";

const say = (stage, html, cls) => { const m = stage.querySelector(".gmsg") || stage.appendChild(el("div", "gmsg")); m.className = "gmsg " + (cls || ""); m.innerHTML = html; };

// ---------- fiches à feuilleter ----------
export function cards(stage, spec, onWin) {
  let i = 0; const box = el("div", "infocard"), nav = el("div", "gctl"), dots = el("div", "prog2"); stage.append(el("div", "intro", spec.intro), dots, box, nav);
  const next = el("button", "gb go", "Suivant ▶"), prev = el("button", "gb", "◀ Retour"); nav.append(prev, next);
  function show() { const c = spec.cards[i]; dots.innerHTML = spec.cards.map((_, k) => `<i class="${k < i ? "on" : k === i ? "cur" : ""}"></i>`).join(""); box.innerHTML = `<div class="ic">${c.icon}</div><h2>${c.title}</h2><p>${c.text}</p>${c.fact ? `<div class="fact">${c.fact}</div>` : ""}<button class="say" aria-label="Écouter">🔊</button>`;
    box.querySelector(".say").onclick = () => speak(`${c.title}. ${c.text}`, { force: true }); prev.style.visibility = i ? "" : "hidden"; next.textContent = i === spec.cards.length - 1 ? "J'ai compris ✔" : "Suivant ▶"; }
  next.onclick = () => { chime("step"); if (i < spec.cards.length - 1) { i++; show(); } else { chime("done"); onWin(); } }; prev.onclick = () => { if (i) { i--; show(); } };
  show(); return { destroy() {} };
}

// ---------- quiz à choix ----------
export function quiz(stage, spec, onWin) {
  let q = 0, wrong = 0, alive = true; const prog = el("div", "prog2"), qEl = el("div", "prompt2"), opts = el("div", "qopts"), fb = el("div", "gmsg", "&nbsp;"); stage.append(el("div", "intro", spec.intro), prog, qEl, opts, fb);
  function draw() { const Q = spec.questions[q]; wrong = 0; fb.innerHTML = "&nbsp;"; prog.innerHTML = spec.questions.map((_, k) => `<i class="${k < q ? "on" : k === q ? "cur" : ""}"></i>`).join("");
    qEl.innerHTML = `<span>${Q.q}</span><button class="say" aria-label="Écouter">🔊</button>`; qEl.querySelector(".say").onclick = () => speak(Q.q, { force: true }); opts.innerHTML = ""; speak(Q.q);
    shuffle(Q.o.map((t, k) => ({ t, ok: k === Q.ok }))).forEach(o => { const b = el("button", "qopt", o.t); b.onclick = () => { if (b.classList.contains("no") || b.classList.contains("good")) return;
      if (o.ok) { chime("ok"); b.classList.add("good"); opts.querySelectorAll(".qopt").forEach(x => { if (x !== b) x.classList.add("no"); }); fb.innerHTML = "✔ " + (Q.why || "Bravo !"); q++; setTimeout(() => { if (!alive) return; if (q >= spec.questions.length) { chime("done"); prog.querySelectorAll("i").forEach(d => d.className = "on"); fb.innerHTML = "🎉 Bravo !"; onWin(); } else draw(); }, 1900); }
      else { wrong++; chime("no"); b.classList.add("no"); fb.innerHTML = wrong === 1 ? "Pas tout à fait. Relis bien et essaie encore 🙂" : "💡 " + (Q.hint || "Regarde la fiche du cours et réfléchis encore."); if (wrong >= 2) opts.querySelectorAll(".qopt").forEach((x, k) => {}); } }; opts.append(b); }); }
  draw(); return { destroy() { alive = false; } };
}

// ---------- remettre dans l'ordre ----------
export function order(stage, spec, onWin) {
  let next = 0; const list = el("div", "slots"), pool = el("div", "cards"), fb = el("div", "gmsg", "&nbsp;"); stage.append(el("div", "intro", spec.intro), list, pool, fb);
  spec.steps.forEach((_, i) => list.append(el("div", "sl", `<b>${i + 1}</b>`)));
  shuffle(spec.steps.map((t, k) => ({ t, k }))).forEach(c => { const b = el("button", "stepcard", c.t); b.onclick = () => { if (b.disabled) return;
    if (c.k === next) { chime("ok"); b.disabled = true; b.classList.add("used"); list.children[next].innerHTML = `<b>${next + 1}</b> ${c.t}`; next++; fb.innerHTML = "&nbsp;"; if (next === spec.steps.length) { chime("done"); fb.innerHTML = "🎉 Bravo, tout est dans le bon ordre !"; onWin(); } }
    else { chime("no"); b.classList.add("shake"); setTimeout(() => b.classList.remove("shake"), 400); fb.innerHTML = spec.hint ? spec.hint(next) : `Ce n'est pas l'étape ${next + 1}. Qu'est-ce qui se fait en premier ?`; } }; pool.append(b); });
  return { destroy() {} };
}

// ---------- associer deux colonnes ----------
export function match(stage, spec, onWin) {
  let sel = null, done = 0; const wrap = el("div", "matchwrap"), L = el("div", "mcol"), R = el("div", "mcol"), fb = el("div", "gmsg", "&nbsp;"); wrap.append(L, R); stage.append(el("div", "intro", spec.intro), wrap, fb);
  const left = shuffle(spec.pairs.map((p, k) => ({ t: p[0], k }))), right = shuffle(spec.pairs.map((p, k) => ({ t: p[1], k })));
  const mk = (item, col, side) => { const b = el("button", "mitem", item.t); b.dataset.k = item.k; b.onclick = () => { if (b.classList.contains("ok")) return;
    if (side === "L") { L.querySelectorAll(".mitem").forEach(x => x.classList.remove("sel")); sel = b; b.classList.add("sel"); speak(item.t, { prio: 0 }); fb.innerHTML = "Maintenant, touche ce qui va avec."; return; }
    if (!sel) { fb.innerHTML = "Touche d'abord un élément à gauche 👈"; return; }
    if (sel.dataset.k === b.dataset.k) { chime("ok"); sel.classList.remove("sel"); sel.classList.add("ok"); b.classList.add("ok"); sel = null; fb.innerHTML = "✔ Oui !"; if (++done === spec.pairs.length) { chime("done"); fb.innerHTML = "🎉 Bravo, tout est associé !"; onWin(); } }
    else { chime("no"); b.classList.add("shake"); setTimeout(() => b.classList.remove("shake"), 400); fb.innerHTML = "Ce n'est pas ça. Relis bien les deux et essaie encore 🙂"; } }; col.append(b); };
  left.forEach(i => mk(i, L, "L")); right.forEach(i => mk(i, R, "R")); return { destroy() {} };
}

// ---------- classer des situations dans des catégories ----------
export function sort(stage, spec, onWin) {
  let i = 0, wrong = 0; const items = shuffle(spec.items), card = el("div", "sortcard"), cats = el("div", "sortcats"), prog = el("div", "prog2"), fb = el("div", "gmsg", "&nbsp;"); stage.append(el("div", "intro", spec.intro), prog, card, cats, fb);
  spec.cats.forEach((c, k) => { const b = el("button", "scat", `<b>${c.t}</b><small>${c.sub || ""}</small>`); b.onclick = () => { const it = items[i];
    if (it.cat === k) { chime("ok"); fb.innerHTML = "✔ " + (it.why || "Bravo !"); i++; wrong = 0; setTimeout(() => { if (i >= items.length) { chime("done"); prog.querySelectorAll("i").forEach(d => d.className = "on"); fb.innerHTML = "🎉 Bravo, tout est classé !"; card.innerHTML = ""; onWin(); } else draw(); }, 1400); }
    else { chime("no"); wrong++; b.classList.add("shake"); setTimeout(() => b.classList.remove("shake"), 400); fb.innerHTML = wrong === 1 ? "Pas tout à fait. Relis la situation et les niveaux 🙂" : "💡 " + (it.hint || "Pense à ce que le robot sait faire seul."); } }; cats.append(b); });
  function draw() { const it = items[i]; prog.innerHTML = items.map((_, k) => `<i class="${k < i ? "on" : k === i ? "cur" : ""}"></i>`).join(""); card.innerHTML = `<div class="ic">${it.icon || "🤖"}</div><p>${it.t}</p><button class="say">🔊</button>`; card.querySelector(".say").onclick = () => speak(it.t); speak(it.t); fb.innerHTML = "&nbsp;"; }
  draw(); return { destroy() {} };
}

// ---------- contenu tiré du cours ----------
export const ADV = {
  g1: { type: "cards", title: "Les messagers du robot (ROS)", sub: "Comment les petits programmes d'un robot se parlent", bands: "bc", spec: { intro: "Un vrai robot n'a pas UN programme, il en a beaucoup. Découvre comment ils travaillent ensemble.", cards: [
    { icon: "🧩", title: "Beaucoup de petits programmes", text: "Un robot a souvent un programme pour la caméra, un autre pour les moteurs, un autre pour décider du chemin. Chaque petit programme s'appelle un nœud." },
    { icon: "📮", title: "Les sujets (topics)", text: "Les nœuds se parlent avec des sujets, comme des boîtes aux lettres. Un nœud publie un message sur un sujet. Les nœuds qui s'abonnent à ce sujet reçoivent le message.", fact: "Exemple : la caméra publie sur /image, le planificateur s'abonne à /image." },
    { icon: "🧠", title: "ROS, un intermédiaire", text: "ROS veut dire Robot Operating System. Malgré son nom, ce n'est pas un système d'exploitation comme Windows : c'est un intermédiaire (un middleware) qui aide tous les programmes à se parler.", fact: "ROS existe depuis 2007. ROS 2 peut même fonctionner sur de petits microcontrôleurs." },
    { icon: "🚀", title: "Services et lancement", text: "Un service, c'est une question et sa réponse. Un fichier de lancement (launch file) démarre plusieurs nœuds en une seule fois, comme allumer tout le robot d'un coup." }] } },
  g1q: { type: "quiz", title: "Vrai ou faux sur ROS", sub: "Teste ce que tu as appris", bands: "bc", spec: { intro: "Un petit quiz sur ROS.", questions: [
    { q: "À quoi sert ROS ?", o: ["À faire parler entre eux les programmes (nœuds) d'un robot", "À remplacer Windows sur les robots", "À dessiner des robots en 3D", "À fabriquer les pièces du robot"], ok: 0, why: "ROS est un middleware : il fait communiquer les nœuds.", hint: "Pense aux boîtes aux lettres entre les petits programmes." },
    { q: "« ROS est un système d'exploitation comme Windows. » Mythe ou réalité ?", o: ["Mythe : c'est un middleware", "Réalité"], ok: 0, why: "Mythe ! ROS n'est pas un système d'exploitation classique, c'est une couche qui fait communiquer les programmes." },
    { q: "Comment un nœud envoie-t-il un message aux autres ?", o: ["Il le publie sur un sujet (topic)", "Il l'imprime sur du papier", "Il éteint le robot", "Il efface les autres nœuds"], ok: 0, why: "Publier sur un sujet, et les nœuds abonnés le reçoivent." }] } },
  g4: { type: "match", title: "Les façons d'apprendre", sub: "Comment une machine peut apprendre", bands: "bc", spec: { intro: "Une machine peut apprendre de plusieurs façons. Associe chaque situation à sa famille d'apprentissage.", pairs: [
    ["On montre des images avec leur nom pour qu'elle apprenne à reconnaître", "Apprentissage supervisé"], ["Elle cherche seule des groupes, sans noms ni étiquettes", "Apprentissage non supervisé"], ["Elle essaie, gagne une récompense ou une pénalité, et change sa stratégie", "Apprentissage par renforcement"], ["De grands réseaux de neurones pour voir ou comprendre la voix", "Apprentissage profond"]] } },
  g7: { type: "order", title: "Les étapes pour qu'un robot apprenne", sub: "Du recueil des données au test", bands: "c", spec: { intro: "Voici les 6 étapes pour entraîner un robot. Touche-les dans le bon ordre.", steps: ["Collecter des données (capteurs, caméras)", "Préparer les données (prétraitement)", "Choisir un algorithme", "Entraîner le modèle", "Valider sur d'autres données", "Tester sur le robot"], hint: n => n === 0 ? "On ne peut rien apprendre sans données : c'est l'étape 1." : n === 5 ? "Le test sur le vrai robot vient en dernier." : "Qu'est-ce qu'il faut avant de pouvoir entraîner ?" } },
  g7q: { type: "quiz", title: "Les bonnes habitudes de l'apprentissage", sub: "Ce qu'il faut faire, et ce qu'il faut éviter", bands: "c", spec: { intro: "Choisis à chaque fois la bonne façon de faire.", questions: [
    { q: "L'environnement du robot change tout le temps. Que choisir ?", o: ["L'apprentissage par renforcement", "L'apprentissage supervisé seulement"], ok: 0, why: "Par renforcement : le robot s'adapte par essais et erreurs.", hint: "Il faut un robot qui s'adapte quand ça change." },
    { q: "Avant d'entraîner le robot, que faut-il faire des données ?", o: ["Collecter des données de toutes les situations possibles", "Prendre toujours les mêmes exemples"], ok: 0, why: "Des données variées : sinon le robot ne connaît que quelques cas.", hint: "Un robot ne peut pas deviner ce qu'il n'a jamais vu." },
    { q: "Avant de lancer le robot pour de vrai, que faut-il faire ?", o: ["Valider le modèle avec des données séparées", "Tout essayer directement sur le robot"], ok: 0, why: "On vérifie d'abord : cela évite les surprises (et les dégâts).", hint: "Mieux vaut vérifier avant d'utiliser le robot." }] } },
  g8: { type: "sort", title: "Les 4 niveaux d'autonomie", sub: "Du robot qui obéit au robot qui apprend", bands: "bc", spec: { intro: "Il y a 4 niveaux d'IA en robotique. Classe chaque situation dans le bon niveau. (Aujourd'hui, la plupart des robots sont aux niveaux 0 ou 1.)", cats: [{ t: "Niveau 0", sub: "règles codées" }, { t: "Niveau 1", sub: "IA pour une tâche" }, { t: "Niveau 2", sub: "IA qui aide" }, { t: "Niveau 3", sub: "il apprend et décide" }], items: [
    { icon: "➖", t: "Un robot suit une ligne noire en appliquant des règles écrites à la main.", cat: 0, why: "Niveau 0 : règles codées, il n'apprend rien." }, { icon: "📏", t: "Un bras répète toujours exactement le même geste.", cat: 0, why: "Niveau 0 : des instructions fixes." },
    { icon: "👁️", t: "Un robot reconnaît un obstacle sur une image grâce à un modèle d'IA.", cat: 1, why: "Niveau 1 : une IA pour UNE tâche (la vision)." }, { icon: "📷", t: "Une caméra détecte des objets pour un robot de tri.", cat: 1, why: "Niveau 1 : IA spécialisée dans la détection." },
    { icon: "💬", t: "Une IA propose du code ou une trajectoire à un programmeur qui garde la main.", cat: 2, why: "Niveau 2 : l'IA assiste le développement." },
    { icon: "🧭", t: "Un robot explorateur apprend de ses essais et décide seul comment avancer.", cat: 3, why: "Niveau 3 : comportements appris, décisions autonomes." }] } },
  g9: { type: "quiz", title: "Règles codées ou apprentissage ?", sub: "Choisis la bonne méthode", bands: "c", spec: { intro: "Approche A : on écrit toutes les règles à la main. Approche B : le robot apprend par renforcement (essais et récompenses). Laquelle choisir ?", questions: [
    { q: "Un robot doit suivre une ligne noire toujours identique.", o: ["A : écrire les règles", "B : apprentissage par renforcement"], ok: 0, why: "Des règles simples suffisent : c'est plus facile et plus sûr.", hint: "Si rien ne change, pas besoin d'apprendre." },
    { q: "Un robot de ferme marche sur un sol qui change tout le temps (boue, herbe, pluie).", o: ["A : écrire les règles", "B : apprentissage par renforcement"], ok: 1, why: "Le terrain change : le robot doit s'adapter sans être reprogrammé.", hint: "Il y aurait trop de règles à écrire !" },
    { q: "Un bras rate parfois à saisir des objets de formes différentes.", o: ["A : écrire les règles", "B : apprentissage par renforcement"], ok: 1, why: "Le bras peut changer sa trajectoire après chaque échec, sans nouvelle instruction.", hint: "Le bras peut apprendre de ses échecs." },
    { q: "Un robot doit s'arrêter à 20 cm d'un mur.", o: ["A : écrire les règles", "B : apprentissage par renforcement"], ok: 0, why: "Une seule règle « si distance < 20 alors stop » suffit.", hint: "C'est une règle toute simple !" }] } },
  g10: { type: "match", title: "Où travaillent les robots ?", sub: "Les secteurs de la robotique", bands: "bc", spec: { intro: "Les robots travaillent partout. Associe chaque robot à son domaine.", pairs: [["BellaBot, un robot qui livre les plats", "Services"], ["Naïo, un robot qui désherbe les champs", "Agriculture"], ["Da Vinci, un robot qui aide les chirurgiens", "Santé"], ["Un bras manipulateur dans une usine", "Industrie"], ["Marty, un petit robot pour apprendre à coder", "Éducation"]] } },
  g10f: { type: "cards", title: "Des chiffres sur les robots", sub: "Quelques chiffres du cours", bands: "bc", spec: { intro: "Voici quelques chiffres donnés dans le cours.", cards: [
    { icon: "🏭", title: "Industrie", text: "Plus de 546 000 robots industriels ont été installés en 2024. Amazon utilise plus de 750 000 robots mobiles dans ses entrepôts." }, { icon: "🏥", title: "Santé", text: "Le robot chirurgical Da Vinci équipe plus de 9 000 établissements. Les exosquelettes Atalante aident à la rééducation." },
    { icon: "🌾", title: "Agriculture", text: "Les robots désherbeurs Naïo sont vendus dans plus de 15 pays. Lely a installé 100 000 robots de traite." }, { icon: "🧹", title: "Services", text: "Des robots livrent des plats (BellaBot), accueillent le public (Pepper) ou nettoient seuls des sols (Brain Corp)." }] } },
  g11: { type: "match", title: "Quel métier ?", sub: "Les métiers de la robotique", bands: "bc", spec: { intro: "Associe chaque description à son métier.", pairs: [["Elle conçoit le robot en entier : mécanique, électronique et programmes", "Ingénieure en robotique"], ["Il écrit les programmes qui contrôlent le robot (Python, C++, ROS)", "Programmeur de robots"], ["Elle installe, entretient et répare les robots", "Technicienne en robotique"], ["Il dessine l'aspect du robot et évite les angles pointus pour la sécurité", "Designer industriel"], ["Elle explore de nouvelles technologies, souvent avec un doctorat", "Chercheuse en robotique"]] } },
  g12: { type: "cards", title: "Ta route de roboticien", sub: "Les 4 étapes pour aller loin", bands: "bc", spec: { intro: "Voici un chemin possible pour devenir un as de la robotique.", cards: [
    { icon: "🧱", title: "1. Les blocs", text: "Des plateformes comme Marty, Scratch et Python : on commence par les blocs, puis on passe au code écrit." }, { icon: "🖥️", title: "2. ROS et la simulation", text: "On installe ROS sur Ubuntu et on teste ses robots dans un simulateur (Gazebo) avant de les construire." },
    { icon: "🧠", title: "3. L'intelligence artificielle", text: "On apprend l'apprentissage automatique avec des outils comme OpenCV et PyTorch." }, { icon: "🤝", title: "4. La communauté", text: "On rejoint des projets open source et des concours : on apprend en équipe.", fact: "Astuce du cours : participer à des défis ROS ou à des projets sur GitHub montre qu'on sait résoudre de vrais problèmes." }] } },
  g12o: { type: "order", title: "Démarrer avec ROS", sub: "Les 5 premiers pas, dans l'ordre", bands: "c", spec: { intro: "Pour démarrer avec ROS, il y a 5 étapes. Remets-les dans l'ordre.", steps: ["Choisir le matériel (PC, Raspberry Pi…)", "Choisir où programmer (Ubuntu, VS Code…)", "Installer ROS", "Comprendre : ROS Core, nœuds, sujets, services", "Créer un premier nœud qui publie « Hello World »"], hint: n => n === 0 ? "Il faut d'abord un ordinateur ou une carte pour faire tourner ROS." : "Qu'est-ce qui est nécessaire avant cette étape ?" } }
};
export const mountAdv = (stage, id, onWin) => { const a = ADV[id]; return ({ cards, quiz, order, match, sort })[a.type](stage, a.spec, onWin); };
