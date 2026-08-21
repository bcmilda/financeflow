#!/usr/bin/env python3
"""
FinanceFlow · rámeček telefonu pro Google Play screenshoty
==========================================================
Vezme screenshot z aplikace a vloží ho do vizuálu telefonu na barevném pozadí
s titulkem. Výstup má rozměr 1080×1920 (Play: telefon, poměr 9:16).

Použití:
    python3 ramecek.py vstup.png vystup.png "Titulek" ["Podtitulek"]

Volitelně:
    --barva "#0f1117"     pozadí
    --akcent "#06b6d4"    barva titulku
"""
import sys, argparse
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H = 1080, 1920                      # Play: telefon 9:16
PHONE_W, PHONE_H = 760, 1360           # vnější rozměr telefonu
BEZEL = 14                             # rámeček kolem displeje
RADIUS = 58

def font(size, bold=False):
    cesty = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold
        else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    for c in cesty:
        try: return ImageFont.truetype(c, size)
        except Exception: pass
    return ImageFont.load_default()

def zaobli(img, r):
    maska = Image.new("L", img.size, 0)
    ImageDraw.Draw(maska).rounded_rectangle([0, 0, img.size[0]-1, img.size[1]-1], r, fill=255)
    out = img.copy(); out.putalpha(maska); return out

def ramecek(vstup, vystup, titulek, podtitulek="", barva="#0f1117", akcent="#06b6d4"):
    plátno = Image.new("RGB", (W, H), barva)
    d = ImageDraw.Draw(plátno)

    # jemný přechod dolů, ať pozadí není placaté
    for y in range(H):
        k = y / H
        d.line([(0, y), (W, y)],
               fill=tuple(int(c * (1 - 0.18 * k)) for c in Image.new("RGB", (1, 1), barva).getpixel((0, 0))))

    # titulek
    d.text((W // 2, 128), titulek, font=font(62, True), fill=akcent, anchor="mm")
    if podtitulek:
        d.text((W // 2, 202), podtitulek, font=font(34), fill="#a8aec8", anchor="mm")

    # ── telefon ──
    px, py = (W - PHONE_W) // 2, 288
    stin = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(stin).rounded_rectangle(
        [px + 10, py + 18, px + PHONE_W + 10, py + PHONE_H + 18], RADIUS, fill=(0, 0, 0, 150))
    plátno.paste(Image.alpha_composite(
        plátno.convert("RGBA"), stin.filter(ImageFilter.GaussianBlur(22))).convert("RGB"), (0, 0))

    telo = Image.new("RGB", (PHONE_W, PHONE_H), "#2a2f3d")
    plátno.paste(zaobli(telo, RADIUS), (px, py), zaobli(telo, RADIUS))

    # displej = screenshot, oříznutý na poměr displeje
    sw, sh = PHONE_W - 2 * BEZEL, PHONE_H - 2 * BEZEL
    s = Image.open(vstup).convert("RGB")
    pomer_cil, pomer_zdroj = sw / sh, s.width / s.height
    if pomer_zdroj > pomer_cil:                       # široký (desktop) → vezmi levou část
        nova = int(s.height * pomer_cil)
        s = s.crop((0, 0, nova, s.height))
    else:
        nova = int(s.width / pomer_cil)
        s = s.crop((0, 0, s.width, min(nova, s.height)))
    s = s.resize((sw, sh), Image.LANCZOS)
    plátno.paste(zaobli(s, RADIUS - BEZEL), (px + BEZEL, py + BEZEL), zaobli(s, RADIUS - BEZEL))

    # reproduktor
    d = ImageDraw.Draw(plátno)
    d.rounded_rectangle([W // 2 - 52, py + 26, W // 2 + 52, py + 36], 5, fill="#3a4158")

    plátno.save(vystup, "PNG", optimize=True)
    return vystup

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("vstup"); ap.add_argument("vystup")
    ap.add_argument("titulek"); ap.add_argument("podtitulek", nargs="?", default="")
    ap.add_argument("--barva", default="#0f1117"); ap.add_argument("--akcent", default="#06b6d4")
    a = ap.parse_args()
    print(ramecek(a.vstup, a.vystup, a.titulek, a.podtitulek, a.barva, a.akcent))
