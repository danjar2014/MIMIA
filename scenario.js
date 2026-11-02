// Lecture d'une carte de parcours (sans affichage, utilisable partout)
export const DIRS = [[-1, 0], [0, 1], [1, 0], [0, -1]];

export function parseScenario(sc) {
  const rows = sc.map, h = rows.length, w = rows[0].length, o = { h, w, rocks: new Set(), stars: new Set(), start: [0, 0], flag: null, dir: sc.dir ?? 1 };
  rows.forEach((row, r) => [...row].forEach((ch, c) => { const k = r + "," + c;
    if (ch === "#") o.rocks.add(k); else if (ch === "*") o.stars.add(k); else if (ch === "F") o.flag = [r, c]; else if (ch === "R") o.start = [r, c]; else if (ch === "r") { o.start = [r, c]; o.flag = [r, c]; } }));
  return o;
}
