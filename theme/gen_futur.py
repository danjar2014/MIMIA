"""Fabrique theme-futur.css : l'habillage sombre « futur » de TOUTE l'appli.
  python theme/gen_futur.py
Lit style.css, et pour chaque règle qui pose une couleur claire (fond, bordure) ou un texte foncé, écrit la même règle
préfixée par body.theme-futur avec la couleur sombre équivalente (même teinte). Puis ajoute theme/futur-extra.css (réglages à la main)."""
import re, colorsys, os
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
src = open(os.path.join(ROOT, "style.css"), encoding="utf-8").read()

HEX = re.compile(r"#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![0-9a-fA-F])")
RGBA_W = re.compile(r"rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*([0-9.]+)\s*\)")

def parse(h):
    h = h.lstrip("#")
    if len(h) in (3, 4): h = "".join(c * 2 for c in h)
    r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)); a = int(h[6:8], 16) / 255 if len(h) == 8 else 1
    return r, g, b, a
def fmt(r, g, b, a=1):
    v = [round(max(0, min(1, x)) * 255) for x in (r, g, b)]
    return "#%02x%02x%02x" % tuple(v) if a >= 0.999 else "rgba(%d,%d,%d,%.2f)" % (v[0], v[1], v[2], a)
BASE_H = 232 / 360   # bleu nuit : teinte des surfaces neutres

def surface(m):   # fond clair -> surface sombre de même teinte
    r, g, b, a = parse(m.group(0)); h, l, s = colorsys.rgb_to_hls(r, g, b)
    if l < 0.72: return m.group(0)
    beige = 0.07 < h < 0.2 and s < 0.8   # beiges et crèmes : traités comme des neutres (sinon ils virent au marron)
    if s < 0.12 or beige: h, s2 = BASE_H + (0.02 if beige else 0), 0.56
    else: s2 = max(0.42, min(0.62, s * 0.7))
    l2 = 0.215 + (1 - l) * (0.55 if beige else 0.25)
    return fmt(*colorsys.hls_to_rgb(h, l2, s2), max(a, 0.9) if a < 1 else 1)
def border(m):    # bordure claire -> bordure bleu moyen
    r, g, b, a = parse(m.group(0)); h, l, s = colorsys.rgb_to_hls(r, g, b)
    if l < 0.74: return m.group(0)
    if s < 0.12 or (0.07 < h < 0.2 and s < 0.8): h, s2 = BASE_H, 0.5
    else: s2 = max(0.4, min(0.6, s * 0.7))
    return fmt(*colorsys.hls_to_rgb(h, 0.40, s2), a)
def text(m):      # texte foncé -> texte clair ; les bleus et verts moyens sont éclaircis
    r, g, b, a = parse(m.group(0)); h, l, s = colorsys.rgb_to_hls(r, g, b)
    if l > 0.62: return m.group(0)
    if l < 0.36 and s < 0.5: return fmt(*colorsys.hls_to_rgb(h if s > 0.12 else BASE_H, 0.92, 0.6 if s > 0.12 else 0.5), a)
    return fmt(*colorsys.hls_to_rgb(h, 0.74, min(1, s * 1.1 + 0.1)), a)

def convert(prop, val):
    p = prop.strip().lower(); v = val
    if p in ("background", "background-color"):
        if "url(" in v: return None
        v = HEX.sub(surface, v); v = RGBA_W.sub(lambda m: "rgba(14,18,62,%.2f)" % max(float(m.group(1)), 0.86), v)
        v = re.sub(r"\bwhite\b", "#18205e", v)
    elif p.startswith("border") and not p.endswith(("radius", "width", "style", "collapse", "spacing")) or p == "outline":
        v = HEX.sub(border, v)
    elif p == "color":
        v = HEX.sub(text, v)
    else: return None
    return v if v != val else None

def blocks(css):   # découpe en (prélude, corps) au premier niveau
    out, i, n = [], 0, len(css)
    while i < n:
        j = css.find("{", i)
        if j < 0: break
        pre = css[i:j].strip(); depth, k = 1, j + 1
        while k < n and depth:
            depth += css[k] == "{"; depth -= css[k] == "}"; k += 1
        out.append((pre, css[j + 1:k - 1])); i = k
    return out

def prefix(sel):
    res = []
    for s in re.split(r",(?![^()]*\))", sel):
        s = s.strip()
        if not s or s.startswith((":root", "html", "@")): continue
        # :where() ne pèse rien : la règle convertie remplace la règle d'origine (elle vient après) sans écraser
        # les règles d'état plus précises restées telles quelles (un point de code rempli, un bouton actif…)
        if s.startswith("body"): res.append("body:where(.theme-futur)" + s[4:])
        else: res.append(":where(body.theme-futur) " + s)
    return ",".join(res)

def rules(css):
    out = []
    for pre, body in blocks(re.sub(r"/\*.*?\*/", "", css, flags=re.S)):
        if pre.startswith("@media") or pre.startswith("@supports"):
            inner = rules(body)
            if inner: out.append(pre + "{" + "".join(inner) + "}")
            continue
        if pre.startswith("@"): continue
        decls = []
        for d in body.split(";"):
            if ":" not in d: continue
            p, v = d.split(":", 1); nv = convert(p, v.strip())
            if nv is not None: decls.append(p.strip() + ":" + nv)
        sel = prefix(pre)
        if decls and sel: out.append(sel + "{" + ";".join(decls) + "}")
    return out

gen = rules(src)
extra = open(os.path.join(HERE, "futur-extra.css"), encoding="utf-8").read()
head = "/* Fichier fabriqué par theme/gen_futur.py : ne pas modifier à la main (les réglages manuels sont dans theme/futur-extra.css). */\n"
open(os.path.join(ROOT, "theme-futur.css"), "w", encoding="utf-8", newline="\n").write(head + "\n".join(gen) + "\n" + extra)
print(len(gen), "règles converties")
