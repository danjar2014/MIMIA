// « Voir mon programme en vrai code » : un panneau qui montre, en direct, ce que les blocs deviennent en Python ou JavaScript
import { el, S, save, speak } from "./util.js";
import { speakCode } from "./codeengine.js";

export function attachCodeView(host, { gen, onOpen, open = false, note }) {
  const wrap = el("div", "cview"), head = el("button", "gb cvhead", ""), body = el("div", "cvbody"), pre = el("pre", "excode"), sw = el("div", "langsw"), act = el("div", "gctl");
  let isOpen = open, code = "";
  const lang = () => S.codeLang || "py";
  const paintHead = () => { head.textContent = isOpen ? "🙈 Cacher le code" : "👀 Voir mon programme en vrai code"; body.style.display = isOpen ? "" : "none"; };
  const chips = [["py", "🐍 Python"], ["js", "🟨 JavaScript"]].map(([l, label]) => { const b = el("button", "chip", label); b.onclick = () => { S.codeLang = l; save(); update(); }; sw.append(b); return [l, b]; });
  function update() { code = gen(lang()); pre.textContent = code; pre.dataset.say = "Voici ton programme en code. " + speakCode(code, lang()); chips.forEach(([l, b]) => b.classList.toggle("on", l === lang())); }
  head.onclick = () => { isOpen = !isOpen; paintHead(); if (isOpen) update(); };
  const read = el("button", "gb", "🔊 Lire ce code"); read.onclick = () => speak("Voici ton programme en code. " + speakCode(code, lang()), { force: true });
  act.append(read);
  if (onOpen) { const o = el("button", "gb", "⌨️ L'ouvrir dans l'éditeur"); o.onclick = () => onOpen(code, lang()); act.append(o); }
  body.append(el("div", "lesson", note || "💡 Chaque bloc devient une ligne de code. Les blocs et le code font exactement la même chose !"), sw, pre, act);
  wrap.append(head, body); host.append(wrap); paintHead(); update();
  return { update, el: wrap };
}
