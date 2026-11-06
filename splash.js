// Animation d'entrée : le robot de l'enfant arrive en volant dans l'espace (étoiles, planète, lune), puis l'appli s'ouvre.
// Un toucher la passe. En « mode calme », elle est presque immédiate et sans mouvement.
import { S, APP_VERSION, tone, slide } from "./util.js";
import { robotSvg } from "./robot.js";

// le son de l'arrivée (synthétisé, sans fichier) : moteur qui démarre, souffle du décollage, étoiles qui scintillent, petite fanfare
function splashSound() {
  slide(70, 170, 1.4, "sawtooth", 0.07); slide(250, 1500, 1.5, "sine", 0.1, 0.3); slide(1500, 500, 1.0, "triangle", 0.06, 1.7);
  [988, 1319, 1568, 1976].forEach((f, k) => tone(f, 0.18, "sine", 0.09, 1.0 + k * 0.22));
  [523, 659, 784, 1047].forEach((f, k) => tone(f, 0.22, "triangle", 0.14, 2.25 + k * 0.14));
}
export const SPLASH_MS = 3300;
export function showSplash(done, ms = SPLASH_MS) {
  const d = document.createElement("div"), calm = !!S.calm;
  d.className = "splash" + (calm ? " calm" : ""); d.setAttribute("role", "img"); d.setAttribute("aria-label", "Ton robot arrive dans l'espace");
  d.innerHTML = `<div class="sp-stars"></div><div class="sp-stars sp-stars2"></div>
    <i class="sp-streak s1"></i><i class="sp-streak s2"></i><i class="sp-streak s3"></i>
    <div class="sp-planet"></div><div class="sp-moon"></div>
    <div class="sp-bot"><div class="sp-flame"></div>${robotSvg(S.robot, "#ffd54a")}</div>
    <div class="sp-ver">v ${APP_VERSION}</div>`;
  document.body.append(d); if (!calm) splashSound();
  let ended = false; const end = () => { if (ended) return; ended = true; d.remove(); done(); };
  d.addEventListener("click", end); setTimeout(end, calm ? 900 : ms);
  return end;
}
