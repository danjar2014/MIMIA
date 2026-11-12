from PIL import Image, ImageDraw, ImageFilter, ImageFont
import random, math, os
D = r"C:\gtmp\bolt"; W, H = 1080, 1920
os.makedirs(D + r"\final", exist_ok=True)
F = lambda s: ImageFont.truetype(r"C:\Windows\Fonts\segoeuib.ttf", s)

def decor():
    im = Image.new("RGB", (W, H)); d = ImageDraw.Draw(im)
    top, mid, bot = (6, 8, 34), (22, 16, 78), (58, 22, 110)
    for y in range(H):
        t = y / H; a, b, u = (top, mid, t / 0.6) if t < 0.6 else (mid, bot, (t - 0.6) / 0.4)
        d.line([(0, y), (W, y)], fill=tuple(int(a[i] + (b[i] - a[i]) * u) for i in range(3)))
    random.seed(7)
    for _ in range(260):
        x, y = random.randrange(W), random.randrange(int(H * 0.8)); r = random.choice([1, 1, 2, 2, 3]); c = random.choice([(255, 255, 255), (170, 200, 255), (255, 200, 240)])
        d.ellipse([x, y, x + r, y + r], fill=c)
    # lueur d'horizon + sol quadrillé en perspective
    glow = Image.new("RGB", (W, H), (0, 0, 0)); g = ImageDraw.Draw(glow); hz = int(H * 0.8)
    g.ellipse([-200, hz - 150, W + 200, hz + 150], fill=(150, 40, 170)); glow = glow.filter(ImageFilter.GaussianBlur(90))
    im = Image.blend(im, Image.composite(glow, im, glow.convert("L").point(lambda v: min(255, v * 2))), 0.75)
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0)); o = ImageDraw.Draw(ov)
    o.rectangle([0, hz, W, H], fill=(14, 8, 46, 255))
    for i in range(1, 13):
        y = hz + int((H - hz) * (i / 12) ** 2.1); o.line([(0, y), (W, y)], fill=(45, 226, 230, 150), width=2)
    for i in range(-14, 15):
        o.line([(W / 2 + i * 26, hz), (W / 2 + i * 190, H)], fill=(255, 95, 210, 130), width=2)
    o.line([(0, hz), (W, hz)], fill=(120, 240, 255, 255), width=4)
    im = Image.alpha_composite(im.convert("RGBA"), ov)
    return im.convert("RGB")

def tile(im, x, y, w, h, ico, label, col):
    ov = Image.new("RGBA", im.size, (0, 0, 0, 0)); o = ImageDraw.Draw(ov)
    glow = Image.new("RGBA", im.size, (0, 0, 0, 0)); gd = ImageDraw.Draw(glow); gd.rounded_rectangle([x - 4, y - 4, x + w + 4, y + h + 4], 46, outline=col + (200,), width=10)
    im.alpha_composite(glow.filter(ImageFilter.GaussianBlur(12)))
    o.rounded_rectangle([x, y, x + w, y + h], 42, fill=(16, 20, 66, 225), outline=col + (255,), width=4)
    o.rounded_rectangle([x + 10, y + 10, x + w - 10, y + h * 0.42], 34, fill=(255, 255, 255, 14))
    im.alpha_composite(ov)
    ic = Image.open(ico).convert("RGBA"); s = int(w * 0.82); ic = ic.resize((s, s), Image.LANCZOS); im.alpha_composite(ic, (x + (w - s) // 2, y + 2))
    d = ImageDraw.Draw(im); f = F(38 if len(label) < 11 else 33); tw = d.textlength(label, font=f); d.text((x + (w - tw) / 2, y + h - 62), label, font=f, fill=(232, 244, 255))

def screen(bg, name, mood, tiles, out):
    im = bg.convert("RGBA").copy(); d = ImageDraw.Draw(im)
    for (x, txt, col) in ((40, name, (45, 226, 230)), (W - 330, "⚡ 0 / 100", (255, 95, 210))):
        d.rounded_rectangle([x, 70, x + 290, 150], 40, fill=(16, 20, 66, 230), outline=col, width=4); f = F(40); tw = d.textlength(txt.replace("⚡ ", ""), font=f)
        d.text((x + (290 - tw) / 2, 82), txt.replace("⚡ ", ""), font=f, fill=(232, 244, 255))
    bolt = Image.open(D + rf"\out\bolt-{mood}.png").resize((560, 560), Image.LANCZOS); im.alpha_composite(bolt, (W // 2 - 300, 130))
    cols, tw, th, gap = 3, 310, 300, 30; x0 = (W - cols * tw - (cols - 1) * gap) // 2; y0 = 700
    PAL = [(45, 226, 230), (255, 95, 210), (255, 201, 60), (124, 255, 138), (157, 140, 255), (255, 122, 61)]
    for i, (ico, label) in enumerate(tiles):
        tile(im, x0 + (i % cols) * (tw + gap), y0 + (i // cols) * (th + gap), tw, th, D + rf"\icons\ico-{ico}.png", label, PAL[i % len(PAL)])
    im.convert("RGB").save(out, quality=92); return im.convert("RGB")

bg = decor(); bg.save(D + r"\final\decor-espace.jpg", quality=90)
a = screen(bg, "Léa", "happy", [("school", "Montessori"), ("numbers", "Chiffres"), ("letters", "Lettres"), ("colors", "Couleurs"), ("parts", "Pièces"), ("days", "Jours"), ("months", "Mois"), ("link", "Relier"), ("space", "Espace")], D + r"\final\accueil-3-6.jpg")
b = screen(bg, "Adam", "celebrate", [("target", "Défi"), ("path", "Parcours"), ("medal", "Badges"), ("blocks", "Programmer"), ("gear", "Construire"), ("code", "Coder"), ("sensor", "Capteurs"), ("palette", "Créer"), ("rocket", "Plus loin")], D + r"\final\accueil-6-12.jpg")
sheet = Image.new("RGB", (W * 2 + 60, H), (10, 10, 30)); sheet.paste(a, (0, 0)); sheet.paste(b, (W + 60, 0)); sheet.resize(((W * 2 + 60) // 2, H // 2), Image.LANCZOS).save(D + r"\final\apercu-accueils.jpg", quality=90)
moods = ["neutral", "happy", "worried", "thinking", "celebrate", "sleep"]; m = Image.new("RGB", (6 * 400, 440), (14, 18, 60))
for i, n in enumerate(moods):
    r = Image.open(D + rf"\out\bolt-{n}.png").resize((400, 400), Image.LANCZOS); m.paste(r, (i * 400, 20), r)
m.save(D + r"\final\apercu-humeurs.jpg", quality=90); print("ok")
