#!/usr/bin/env python3
"""Generates ios/App/Assets.xcassets/AppIcon.appiconset/*.png from the
existing mn-alwahsh-updated/icon-512.png (same source the Android launcher
icons were derived from), flattened onto the site's background colour
(#0a0000, from manifest.json) since App Store icons must not carry an
alpha channel.

Re-run this if icon-512.png ever changes:
    python3 ios/scripts/generate_app_icons.py
"""
import os
from PIL import Image

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SOURCE = os.path.join(REPO_ROOT, "mn-alwahsh-updated", "icon-512.png")
OUT_DIR = os.path.join(REPO_ROOT, "ios", "App", "Assets.xcassets", "AppIcon.appiconset")
BACKGROUND = (0x0A, 0x00, 0x00)  # manifest.json background_color #0a0000

# (filename, pixel size)
SIZES = [
    ("icon-20.png", 20), ("icon-20@2x.png", 40), ("icon-20@3x.png", 60),
    ("icon-29.png", 29), ("icon-29@2x.png", 58), ("icon-29@3x.png", 87),
    ("icon-40.png", 40), ("icon-40@2x.png", 80), ("icon-40@3x.png", 120),
    ("icon-60@2x.png", 120), ("icon-60@3x.png", 180),
    ("icon-76.png", 76), ("icon-76@2x.png", 152),
    ("icon-83.5@2x.png", 167),
    ("icon-1024.png", 1024),
]


def flatten(im, size):
    im = im.convert("RGBA").resize((size, size), Image.LANCZOS)
    bg = Image.new("RGB", (size, size), BACKGROUND)
    bg.paste(im, mask=im.split()[3])
    return bg


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    src = Image.open(SOURCE)
    for filename, size in SIZES:
        flatten(src, size).save(os.path.join(OUT_DIR, filename), "PNG")
        print(f"wrote {filename} ({size}x{size})")


if __name__ == "__main__":
    main()
