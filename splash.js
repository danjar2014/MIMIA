// Animation d'entrée : le robot de l'enfant arrive en volant dans l'espace (étoiles, planète, lune), puis l'appli s'ouvre.
// Un toucher la passe. En « mode calme », elle est presque immédiate et sans mouvement.
import { S } from "./util.js";
import { robotSvg } from "./robot.js";

export const SPLASH_MS = 3300;
export function showSplash(done, ms = SPLASH_MS) {
  const d = document.createElement("div"), calm = !!S.calm;
  d.className = "splash" + (calm ? " calm" : ""); d.setAttribute("role", "img"); d.setAttribute("aria-label", "Ton robot arrive dans l'espace");
  d.innerHTML = `<div class="sp-stars"></div><div class="sp-stars sp-stars2"></div>
    <i class="sp-streak s1"></i><i class="sp-streak s2"></i><i class="sp-streak s3"></i>
    <div class="sp-planet"></div><div class="sp-moon"></div>
    <div class="sp-bot"><div class="sp-flame"></div>${robotSvg(S.robot, "#ffd54a")}</div>`;
  document.body.append(d);
  let ended = false; const end = () => { if (ended) return; ended = true; d.remove(); done(); };
  d.addEventListener("click", end); setTimeout(end, calm ? 900 : ms);
  return end;
}
