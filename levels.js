// Niveaux de programmation du robot sur grille.
// Carte : R = départ du robot, r = départ qui est aussi l'arrivée, F = arrivée (drapeau), * = étoile, # = caillou, . = vide
// dir : 0 haut, 1 droite, 2 bas, 3 gauche
export const fd = (n = 1) => Array.from({ length: n }, () => ({ t: "fd" }));
const tl = () => ({ t: "tl" }), tr = () => ({ t: "tr" }), pick = () => ({ t: "pick" }), call = () => ({ t: "call" });
const rep = (n, ...b) => ({ t: "rep", n, body: b.flat() });
const wh = (cond, ...b) => ({ t: "while", cond, body: b.flat() });
const iff = (cond, a, b = []) => ({ t: "if", cond, body: [a].flat(), else: [b].flat() });
const prog = (...m) => ({ main: m.flat(), fn: [] });

export const CONDS = [{ v: "obstacle", label: "obstacle devant" }, { v: "libre", label: "chemin libre" }, { v: "etoile", label: "étoile ici" }, { v: "pasarrive", label: "pas arrivé" }];
const corridor = n => ({ map: ["." .repeat(n), "R" + ".".repeat(n - 2) + "F", ".".repeat(n)], dir: 1 });
const lshape = (h, w) => ({ map: Array.from({ length: h }, (_, r) => Array.from({ length: w }, (_, c) => (r === 0 && c === 0 ? "R" : r === h - 1 && c === w - 1 ? "F" : ".")).join("")), dir: 1 });
const stars = cols => { const row = Array.from({ length: 7 }, (_, c) => (c === 0 ? "R" : c === 6 ? "F" : cols.includes(c) ? "*" : ".")).join(""); return { map: [".......", row, "......."], dir: 1 }; };
const rocks = (c, st = []) => { const row = Array.from({ length: 9 }, (_, k) => (k === 0 ? "R" : k === 8 ? "F" : k === c ? "#" : st.includes(k) ? "*" : ".")).join(""); return { map: [".".repeat(9), row, ".".repeat(9)], dir: 1 }; };
const BUMP = [tl(), fd(1), tr(), fd(2), tr(), fd(1), tl()].flat();

const A = ["fd", "tl", "tr"], B = ["fd", "tl", "tr", "rep"], C = ["fd", "tl", "tr", "rep", "while", "if", "pick", "call"];
export const LEVELS = {
  a: [
    { title: "Premiers pas", intro: "Le robot veut arriver au drapeau 🏁. Touche les blocs pour lui dire quoi faire, dans l'ordre.", map: [".....", "R...F", "....."], dir: 1, allow: A, auto: true, sol: prog(fd(4)) },
    { title: "Un virage", intro: "Pour tourner, utilise les blocs ↶ et ↷. Le robot tourne sur place.", map: ["R...", "....", "...F", "...."], dir: 1, allow: A, auto: true, sol: prog(fd(3), tr(), fd(2)) },
    { title: "Une étoile sur la route", intro: "Quand le robot passe sur une étoile ⭐, il la ramasse tout seul.", map: ["R*..", "....", "...F", "...."], dir: 1, allow: A, auto: true, sol: prog(fd(3), tr(), fd(2)) },
    { title: "Attention au caillou", intro: "Le robot ne peut pas traverser un caillou 🪨. Trouve un chemin pour le contourner.", map: ["R.#.", "....", "....", "...F"], dir: 1, allow: A, auto: true, sol: prog(tr(), fd(1), tl(), fd(3), tr(), fd(2)) },
    { title: "Deux étoiles", intro: "Ramasse les deux étoiles avant d'arriver au drapeau.", map: ["R*.#", "....", ".*.F", "...."], dir: 1, allow: A, auto: true, sol: prog(fd(1), tr(), fd(2), tl(), fd(2)) },
    { title: "Le grand parcours", intro: "Un parcours plus long. Pense en petites étapes.", map: ["R.*.", "....", ".*..", "...F"], dir: 1, allow: A, auto: true, sol: prog(fd(2), tr(), fd(2), tr(), fd(1), tl(), fd(1), tl(), fd(2)) }
  ],
  b: [
    { title: "Répéter", intro: "Le drapeau est loin ! Le bloc « répéter » fait la même chose plusieurs fois. Mets « avancer » dedans.", map: ["........", "R......F", "........"], dir: 1, allow: B, auto: true, sol: prog(rep(7, fd(1))) },
    { title: "L'escalier", intro: "Regarde le dessin : le robot refait toujours la même petite suite. Trouve-la et répète-la.", map: ["R....", ".*...", ".....", "...*.", "....F"], dir: 1, allow: B, auto: true, sol: prog(rep(4, fd(1), tr(), fd(1), tl())) },
    { title: "Le tour du carré", intro: "Ramasse les trois étoiles et reviens au point de départ 🏁.", map: ["r..*", "....", "....", "*..*"], dir: 1, allow: B, auto: true, sol: prog(rep(4, fd(3), tr())) },
    { title: "Le rectangle", intro: "Fais le tour du rectangle. Un bloc « répéter » peut en contenir un autre, ou plusieurs blocs.", map: ["r...*", ".....", "*...*"], dir: 1, allow: B, auto: true, sol: prog(rep(2, fd(4), tr(), fd(2), tr())) },
    { title: "Le serpent", intro: "Le robot descend en serpentant. Cherche la suite qui se répète deux fois.", map: ["R....", "*....", "....*", ".....", "F####"], dir: 1, allow: B, auto: true, sol: prog(rep(2, fd(4), tr(), fd(1), tr(), fd(4), tl(), fd(1), tl())) }
  ],
  c: [
    { title: "Tant que", intro: "Le couloir change de longueur, mais ton programme doit marcher dans tous les couloirs ! « Tant que le chemin est libre, avance. »", scenarios: [corridor(5), corridor(7), corridor(9)], allow: C, auto: true, fn: false, sol: prog(wh("libre", fd(1))) },
    { title: "Le virage du couloir", intro: "Trois couloirs en L, trois tailles. Un seul programme doit réussir les trois.", scenarios: [lshape(4, 5), lshape(5, 7), lshape(3, 4)], allow: C, auto: true, fn: false, sol: prog(wh("libre", fd(1)), tr(), wh("libre", fd(1))) },
    { title: "Si étoile ici", intro: "Ici le robot ne ramasse pas tout seul. Utilise « si étoile ici » puis « ramasser l'étoile ». Les étoiles ne sont pas toujours aux mêmes places !", scenarios: [stars([2, 4]), stars([1, 3, 5]), stars([2, 5])], allow: C, auto: false, fn: false, sol: prog(rep(6, iff("etoile", pick()), fd(1))) },
    { title: "Mon bloc", intro: "Deux cailloux, même détour ! Dans l'onglet « Mon bloc », écris le détour une seule fois, puis appelle-le deux fois.", map: [".........", "R.#...#.F", "........."], dir: 1, allow: C, auto: true, fn: true, sol: { main: [...fd(1), call(), ...fd(2), call(), ...fd(1)], fn: BUMP } },
    { title: "Décider tout seul", intro: "Le caillou est parfois ici, parfois là. Le robot doit décider : « si obstacle devant, utilise Mon bloc, sinon avance ».", scenarios: [rocks(3), rocks(5), rocks(4)], allow: C, auto: true, fn: true, sol: { main: [wh("pasarrive", iff("obstacle", call(), fd(1)))], fn: BUMP } },
    { title: "Le grand défi", intro: "Étoiles ET cailloux ! Combine tout ce que tu sais : tant que, si, Mon bloc.", scenarios: [rocks(3, [1, 5, 7]), rocks(6, [2, 4]), rocks(2, [1, 3, 6])], allow: C, auto: false, fn: true, sol: { main: [wh("pasarrive", iff("etoile", pick()), iff("obstacle", call(), fd(1)))], fn: BUMP } }
  ]
};
// niveaux « télécommande » : ton programme est un nœud qui publie des messages, le robot est un nœud qui écoute
LEVELS.t = [
  { title: "La télécommande", intro: "Ton programme est un NŒUD qui publie des messages sur le sujet /cmd. Le robot est un autre nœud : il écoute /cmd et obéit. Envoie-lui les bons messages pour atteindre le drapeau.", map: ["R...", "....", "...F"], dir: 1, allow: ["pfd", "ptl", "ptr"], auto: true, sol: prog(fd(3), tr(), fd(2)) },
  { title: "Un message qui se répète", intro: "Publier 5 fois le même message, c'est long ! Utilise « répéter ».", map: ["R.....", "......", ".....F"], dir: 1, allow: ["pfd", "ptl", "ptr", "rep"], auto: true, sol: prog(rep(5, fd(1)), tr(), fd(2)) }
];
export const BANDS = { a: { name: "6 – 8 ans", short: "6-8" }, b: { name: "8 – 10 ans", short: "8-10" }, c: { name: "10 – 12 ans", short: "10-12" } };
