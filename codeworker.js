// Le programme de l'enfant s'exécute ici, dans un Worker : il ne peut ni toucher la page ni bloquer l'appli.
import { runSpec } from "./codeengine.js";
onmessage = e => {
  let r;
  try { r = runSpec(e.data.spec, e.data.code); }
  catch (x) { r = { ok: false, stage: "runtime", error: { msg: "Il y a une erreur dans ton programme : " + String((x && x.message) || x), line: null, text: "" }, output: [] }; }
  postMessage(r);
};
