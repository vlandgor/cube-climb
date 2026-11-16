#!/usr/bin/env python3
"""Renders every icon and splash image from art.py.

Needs rsvg-convert (librsvg) and Pillow. Run from the repo root:  python3 tools/icons/make.py
Writes the Android launcher icons (adaptive + legacy + themed monochrome), the splash
images, the web favicon and the Play Store icon.
"""
import os, subprocess, tempfile, sys
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
import art

RES = "android/app/src/main/res"
DENS = {"mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}
BG = (11, 14, 20)                                   # #0b0e14, the game's background

def render(svg, w, h=None):
    h = h or w
    with tempfile.NamedTemporaryFile("w", suffix=".svg", delete=False) as f:
        f.write(svg); path = f.name
    out = path + ".png"
    subprocess.run(["rsvg-convert", "-w", str(w), "-h", str(h), path, "-o", out], check=True)
    im = Image.open(out).convert("RGBA"); os.remove(path); os.remove(out)
    return im

def save(im, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.save(path, optimize=True)

for d, k in DENS.items():
    # adaptive icon layers: 108dp
    s = round(108 * k)
    save(render(art.FG(), s), f"{RES}/mipmap-{d}/ic_launcher_foreground.png")
    save(render(art.BG(), s), f"{RES}/mipmap-{d}/ic_launcher_background.png")
    save(render(art.MONO(), s), f"{RES}/mipmap-{d}/ic_launcher_monochrome.png")
    # legacy icons for Android 7 and older launchers: 48dp, the visible 72dp of the canvas
    s = round(48 * k)
    save(render(art.FULL("squircle", view="0 0 108 108").replace('viewBox="0 0 108 108"', 'viewBox="18 18 72 72"'), s),
         f"{RES}/mipmap-{d}/ic_launcher.png")
    save(render(art.FULL("circle", view="0 0 108 108").replace('viewBox="0 0 108 108"', 'viewBox="18 18 72 72"'), s),
         f"{RES}/mipmap-{d}/ic_launcher_round.png")
    # Android 12+ splash icon: 288dp canvas, content inside the 192dp circle
    save(render(art.SPLASH(), round(288 * k)), f"{RES}/drawable-{d}/splash_icon.png")

# legacy splash (Android 11 and older): the game's background with the icon in the middle
SPLASH = {"port-mdpi": (320, 480), "port-hdpi": (480, 800), "port-xhdpi": (720, 1280),
          "port-xxhdpi": (960, 1600), "port-xxxhdpi": (1280, 1920),
          "land-mdpi": (480, 320), "land-hdpi": (800, 480), "land-xhdpi": (1280, 720),
          "land-xxhdpi": (1600, 960), "land-xxxhdpi": (1920, 1280), "": (480, 320)}
for q, (w, h) in SPLASH.items():
    im = Image.new("RGBA", (w, h), BG + (255,))
    s = round(min(w, h) * 0.9)
    fg = render(art.SPLASH(), s)
    im.alpha_composite(fg, ((w - s) // 2, (h - s) // 2))
    save(im.convert("RGB"), f"{RES}/drawable{'-' + q if q else ''}/splash.png")

# Play Store icon: 512x512, full bleed (Play rounds the corners itself)
full = art.FULL(None, view="18 18 72 72")
save(render(full, 512).convert("RGB"), "store/icon-512.png")
# Play Store feature graphic, 1024x500: the staircase climbing across, the name on the left.
# no other words, so one image serves every store language
def feature():
    tiles = []
    for i in range(9):                        # a staircase rising left to right
        cx, top = 470 + i * 70, 430 - i * 48
        col, op = ("#5ad1a8", 1) if i < 3 else ("#7f8fae", .75 - i * .06)
        tiles.append(f'<rect x="{cx-27}" y="{top}" width="54" height="13" rx="6" fill="{col}" opacity="{op:.2f}"/>')
    lines = "".join(f'<line x1="0" x2="1024" y1="{y}" y2="{y}" stroke="#fff" stroke-opacity=".045" stroke-width="2"/>'
                    for y in range(60, 500, 110))
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500" viewBox="0 0 1024 500">
<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1c2846"/>
<stop offset="1" stop-color="#0b0e14"/></linearGradient></defs>
<rect width="1024" height="500" fill="url(#bg)"/>{lines}{"".join(tiles)}
<rect x="{680-31}" y="{286-4}" width="62" height="21" rx="9" fill="none" stroke="#5ad1a8" stroke-opacity=".6" stroke-width="3"/>
<path d="M610 331 Q612 262 636 250" fill="none" stroke="#cfe0ff" stroke-opacity=".45" stroke-width="4"
 stroke-linecap="round" stroke-dasharray="0.1 11"/>
<g transform="rotate(12 652 220)"><rect x="626" y="194" width="52" height="52" rx="11" fill="#4b8bff"/>
<rect x="633" y="201" width="38" height="7" rx="3.5" fill="#fff" opacity=".8"/></g>
<text x="64" y="232" font-family="Noto Sans, Inter, Roboto, DejaVu Sans, sans-serif" font-weight="800"
 font-size="92" fill="#e6ebf5" letter-spacing="1">Cube</text>
<text x="64" y="330" font-family="Noto Sans, Inter, Roboto, DejaVu Sans, sans-serif" font-weight="800"
 font-size="92" fill="#e6ebf5" letter-spacing="1">Climb</text>
</svg>'''
save(render(feature(), 1024, 500).convert("RGB"), "store/feature-graphic-1024x500.png")

# web favicon
os.makedirs("public", exist_ok=True)
open("public/icon.svg", "w").write(art.FULL("squircle", view="18 18 72 72"))
print("icons and splash written")
