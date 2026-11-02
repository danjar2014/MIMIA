// Le Grand Projet : deux projets au choix. L'enfant choisit ses pièces, monte la carte, écrit le programme du cerveau
// (en Python ou JavaScript), puis obtient sa fiche projet. Les cas de test sont dans boardlogic.js (PROG_CASES).
const PSTART = "# Écris le programme complet de ton robot\ndef boucle():\n    pass\n", JSTART = "// Écris le programme complet de ton robot\nfunction boucle() {\n  \n}\n";

export const PROJECTS = [
  { id: "explorateur", icon: "🧭", title: "Le robot explorateur prudent", stars: 2, goal: "pjexplorateur",
    brief: "Ton robot explore une grotte. Il avance quand le chemin est libre et qu'il y a assez de lumière. Il s'arrête devant un obstacle et prévient avec sa lampe. Très près d'un mur, il sonne. Et quand il fait trop sombre, il s'arrête et sa lampe clignote pour demander de l'aide.",
    features: ["Il roule seulement s'il fait clair ET que le chemin est libre.", "Devant un obstacle (moins de 20 cm), la lampe reste allumée.", "Tout près d'un mur (moins de 8 cm), le haut-parleur sonne.", "Dans le noir (lumière sous 35), il s'arrête et la lampe clignote avec le tic."],
    needs: ["dist", "light", "motor", "led", "speaker"],
    why: { dist: "pour voir les obstacles", light: "pour savoir s'il fait clair ou sombre", motor: "pour rouler", led: "pour prévenir (allumée ou clignotante)", speaker: "pour sonner tout près d'un mur" },
    hints: ["Commence par deux variables : clair = lumiere() >= 35 et libre = distance() >= 20.", "Les roues : roues(clair et libre).", "La lampe : s'il ne fait pas clair, elle suit tic(). Sinon, elle est allumée quand le chemin n'est pas libre.", "Le haut-parleur : haut_parleur(distance() < 8)."],
    py: { starter: PSTART, solution: "def boucle():\n    clair = lumiere() >= 35\n    libre = distance() >= 20\n    roues(clair and libre)\n    if not clair:\n        lampe(tic())\n    else:\n        lampe(not libre)\n    haut_parleur(distance() < 8)" },
    js: { starter: JSTART, solution: "function boucle() {\n  const clair = lumiere() >= 35;\n  const libre = distance() >= 20;\n  roues(clair && libre);\n  if (!clair) {\n    lampe(tic());\n  } else {\n    lampe(!libre);\n  }\n  hautParleur(distance() < 8);\n}" } },
  { id: "gardien", icon: "🛡️", title: "Le robot gardien", stars: 3, goal: "pjgardien",
    brief: "Ton robot garde un trésor. Il veille : sa lampe clignote doucement. Si un intrus passe à moins de 20 cm, l'alarme se déclenche : le haut-parleur sonne et la lampe reste allumée. Même si l'intrus s'enfuit, l'alarme continue ! Seul le bouton du propriétaire peut l'arrêter.",
    features: ["Il veille : la lampe clignote avec le tic.", "Un intrus à moins de 20 cm déclenche l'alarme : haut-parleur et lampe fixe.", "L'alarme se SOUVIENT : elle continue quand l'intrus est parti (mémoire).", "Le bouton arrête l'alarme et le robot reprend sa veille."],
    needs: ["dist", "button", "led", "speaker"],
    why: { dist: "pour repérer l'intrus", button: "pour arrêter l'alarme", led: "pour veiller et alerter", speaker: "pour sonner" },
    hints: ["Il te faut une mémoire : une variable alarme, vraie ou fausse, créée EN DEHORS de la fonction (et global en Python).", "Si distance() < 20 : alarme devient vraie. Si le bouton est appuyé : alarme devient fausse.", "Le haut-parleur suit la variable alarme. La lampe est allumée si alarme OU tic()."],
    py: { starter: "# Une boîte (variable) pour se souvenir de l'alarme\nalarme = False\n\ndef boucle():\n    global alarme\n    pass\n", solution: "alarme = False\n\ndef boucle():\n    global alarme\n    if distance() < 20:\n        alarme = True\n    if bouton_appuye():\n        alarme = False\n    haut_parleur(alarme)\n    lampe(alarme or tic())" },
    js: { starter: "// Une boîte (variable) pour se souvenir de l'alarme\nlet alarme = false;\n\nfunction boucle() {\n  \n}\n", solution: "let alarme = false;\n\nfunction boucle() {\n  if (distance() < 20) {\n    alarme = true;\n  }\n  if (boutonAppuye()) {\n    alarme = false;\n  }\n  hautParleur(alarme);\n  lampe(alarme || tic());\n}" } }
];
export const PARTS = ["battery", "motor", "led", "speaker", "dist", "light", "button"];
export const projectById = id => PROJECTS.find(p => p.id === id);
export const projectParts = p => ["battery", ...p.needs];
