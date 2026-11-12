from PIL import Image, ImageDraw, ImageFilter
import random, os
ROOT = r"C:\Users\BelhassenM'BARKI\Documents\Codex\2026-10-30\files-pasted-by-the-user-tu\outputs\Robotique-Junior"
RES = ROOT + r"\flutter_app\android\app\src\main\res"
bolt = Image.open(r"C:\gtmp\bolt\icon\bolt-c0-front.png").convert("RGBA")
bb = bolt.getbbox(); bolt = bolt.crop(bb)   # le robot seul, sans marge

def background(S):
    im = Image.new("RGB", (S, S)); d = ImageDraw.Draw(im)
    top, mid, bot = (8, 10, 44), (26, 18, 92), (74, 26, 128)
    for y in range(S):
        t = y / S; a, b, u = (top, mid, t / 0.55) if t < 0.55 else (mid, bot, (t - 0.55) / 0.45)
        d.line([(0, y), (S, y)], fill=tuple(int(a[i] + (b[i] - a[i]) * u) for i in range(3)))
    random.seed(11)
    for _ in range(int(S * S / 9000)):
        x, y = random.randrange(S), random.randrange(int(S * 0.7)); r = random.choice([1, 2, 2, 3]) * S // 1024 + 1
        d.ellipse([x, y, x + r, y + r], fill=random.choice([(255, 255, 255), (170, 200, 255), (255, 200, 240)]))
    glow = Image.new("RGB", (S, S), (0, 0, 0)); g = ImageDraw.Draw(glow)
    g.ellipse([S * 0.14, S * 0.16, S * 0.86, S * 0.88], fill=(40, 190, 215)); glow = glow.filter(ImageFilter.GaussianBlur(S * 0.11))
    im = Image.blend(im, Image.composite(glow, im, glow.convert("L")), 0.55).convert("RGBA")
    ring = Image.new("RGBA", (S, S), (0, 0, 0, 0)); r = ImageDraw.Draw(ring)
    r.ellipse([S * 0.1, S * 0.1, S * 0.9, S * 0.9], outline=(45, 226, 230, 235), width=max(3, S // 64))
    im.alpha_composite(ring.filter(ImageFilter.GaussianBlur(S * 0.012))); im.alpha_composite(ring)
    return im

def robot(S, frac, dy=0.0):   # le robot centré, à « frac » de la hauteur
    h = int(S * frac); w = int(bolt.width * h / bolt.height); b = bolt.resize((w, h), Image.LANCZOS)
    layer = Image.new("RGBA", (S, S), (0, 0, 0, 0)); layer.alpha_composite(b, ((S - w) // 2, int((S - h) / 2 + S * dy))); return layer

M = 1024
full = background(M); full.alpha_composite(robot(M, 0.80, 0.015))
full = full.convert("RGB")
full.save(r"C:\gtmp\bolt\final\icone-1024.png")
for path, s in ((ROOT + r"\icon-512.png", 512), (ROOT + r"\icon-192.png", 192), (ROOT + r"\store\icon-512.png", 512), (ROOT + r"\site\img\icon-512.png", 512)):
    full.resize((s, s), Image.LANCZOS).save(path)
# Android : icône classique (coins arrondis) + premier plan de l'icône adaptative (robot dans la zone sûre, fond = dégradé XML)
def rounded(im, s):
    im = im.resize((s, s), Image.LANCZOS).convert("RGBA"); m = Image.new("L", (s * 4, s * 4), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, s * 4 - 1, s * 4 - 1], radius=int(s * 4 * 0.22), fill=255); im.putalpha(m.resize((s, s), Image.LANCZOS)); return im
fg = Image.new("RGBA", (M, M), (0, 0, 0, 0))
ring = Image.new("RGBA", (M, M), (0, 0, 0, 0)); ImageDraw.Draw(ring).ellipse([M * 0.2, M * 0.2, M * 0.8, M * 0.8], outline=(45, 226, 230, 230), width=12)
fg.alpha_composite(ring.filter(ImageFilter.GaussianBlur(10))); fg.alpha_composite(ring); fg.alpha_composite(robot(M, 0.52, 0.01))
for dens, legacy, fore in (("mdpi", 48, 108), ("hdpi", 72, 162), ("xhdpi", 96, 216), ("xxhdpi", 144, 324), ("xxxhdpi", 192, 432)):
    rounded(full, legacy).save(RES + rf"\mipmap-{dens}\ic_launcher.png")
    f = fg.resize((fore, fore), Image.LANCZOS); f.save(RES + rf"\mipmap-{dens}\ic_launcher_foreground.png")
    p = RES + rf"\drawable-{dens}\ic_launcher_foreground.png"
    if os.path.exists(p): f.save(p)
print("icônes écrites")
