"""Draws the Escape From Claudov brand assets (logo, icons, link preview) from code. Run from the repo root: python3 tools/dev/efc/brand.py"""
import os
from PIL import Image, ImageDraw, ImageFont
BOLD = "/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf"
INK, AMBER, DARK = (236, 232, 220, 255), (232, 163, 23, 255), (14, 17, 13, 255)
def font(px): return ImageFont.truetype(BOLD, px)
def logo(w=1000, h=230):
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.text((6, 0), "ESCAPE FROM", font=font(66), fill=INK)
    d.text((0, 66), "CLAUDOV", font=font(170), fill=AMBER)
    d.rectangle((300 + 190, 34, w - 8, 44), fill=INK)  # rule running out from the top line
    return im
def mark(size, pad=0.0, bg=DARK):
    """Square mark: an exit chevron through a doorway."""
    im = Image.new("RGBA", (size, size), bg); d = ImageDraw.Draw(im)
    a = size * pad; s = size - 2 * a; t = max(2, round(s * 0.09))
    d.rectangle((a + s * 0.18, a + s * 0.14, a + s * 0.82, a + s * 0.86), outline=INK, width=t)
    d.rectangle((a + s * 0.60, a + s * 0.30, a + s * 0.90, a + s * 0.70), fill=bg)  # gap in the frame: the way out
    cx, cy, r = a + s * 0.50, a + s * 0.50, s * 0.19
    d.polygon([(cx - r, cy - r), (cx + r * 1.5, cy), (cx - r, cy + r), (cx - r * 0.25, cy)], fill=AMBER)
    return im
os.makedirs("assets/icon", exist_ok=True)
logo().save("assets/logo.webp", lossless=True)
for name, size, pad in (("favicon-64", 64, 0), ("favicon-96", 96, 0), ("apple-touch-icon", 180, 0.06), ("icon-192", 192, 0.04), ("icon-512", 512, 0.04),
                        ("maskable-192", 192, 0.18), ("maskable-512", 512, 0.18)):
    mark(size, pad).save(f"assets/icon/{name}.png")
mark(64).save("assets/icon/favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
bg = Image.open("assets/menu-bg.webp").convert("RGB").resize((1470, 630)).crop((135, 0, 1335, 630)).convert("RGBA")
bg.alpha_composite(Image.new("RGBA", bg.size, (0, 0, 0, 90))); lg = logo().resize((700, 161)); bg.alpha_composite(lg, (60, 60))
bg.convert("RGB").save("assets/apercu.jpg", quality=86)
print("brand assets written")
