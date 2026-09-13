#!/usr/bin/env python3
"""Generate ROOTK store icons from public/rootk-logo.png."""

from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
LOGO = ROOT / "public" / "rootk-logo.png"
NAVY = (8, 40, 104, 255)
WHITE = (255, 255, 255, 255)
OUT_STORE = ROOT / "native" / "store-assets"
ANDROID_RES = ROOT / "android" / "app" / "src" / "main" / "res"
IOS_ICON = (
    ROOT
    / "ios"
    / "App"
    / "App"
    / "Assets.xcassets"
    / "AppIcon.appiconset"
    / "AppIcon-512@2x.png"
)
IOS_SPLASH_DIR = (
    ROOT / "ios" / "App" / "App" / "Assets.xcassets" / "Splash.imageset"
)
WWW = ROOT / "native" / "www"


def fit_logo(logo: Image.Image, box: int, pad_ratio: float = 0.18) -> Image.Image:
    canvas = Image.new("RGBA", (box, box), WHITE)
    inner = int(box * (1 - pad_ratio * 2))
    copy = logo.convert("RGBA")
    copy.thumbnail((inner, inner), Image.Resampling.LANCZOS)
    x = (box - copy.width) // 2
    y = (box - copy.height) // 2
    canvas.paste(copy, (x, y), copy)
    return canvas


def as_white_mark(logo: Image.Image) -> Image.Image:
    """Recolor opaque logo pixels to white (for navy app-icon / splash grounds)."""
    copy = logo.convert("RGBA")
    pixels = copy.load()
    w, h = copy.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if a < 16:
                continue
            # Keep anti-aliased edges soft by scaling alpha only.
            pixels[x, y] = (255, 255, 255, a)
    return copy


def white_mark_on_transparent(logo: Image.Image, box: int, pad_ratio: float = 0.18) -> Image.Image:
    canvas = Image.new("RGBA", (box, box), (0, 0, 0, 0))
    inner = int(box * (1 - pad_ratio * 2))
    copy = as_white_mark(logo)
    copy.thumbnail((inner, inner), Image.Resampling.LANCZOS)
    x = (box - copy.width) // 2
    y = (box - copy.height) // 2
    canvas.paste(copy, (x, y), copy)
    return canvas


def navy_square(logo: Image.Image, box: int, pad_ratio: float = 0.22) -> Image.Image:
    canvas = Image.new("RGBA", (box, box), NAVY)
    mark = white_mark_on_transparent(logo, box, pad_ratio=pad_ratio)
    canvas.paste(mark, (0, 0), mark)
    return canvas


def navy_splash_mark(logo: Image.Image, box: int, pad_ratio: float = 0.12) -> Image.Image:
    """White mark on transparent square — pasted onto navy splash frames."""
    return white_mark_on_transparent(logo, box, pad_ratio=pad_ratio)

def save_png(img: Image.Image, path: Path, *, rgb: bool = False) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    out = img.convert("RGB") if rgb else img.convert("RGBA")
    out.save(path, format="PNG", optimize=True)


def main() -> None:
    logo = Image.open(LOGO)
    OUT_STORE.mkdir(parents=True, exist_ok=True)

    master = navy_square(logo, 1024, pad_ratio=0.18)
    # App Store rejects icons that include an alpha channel.
    save_png(master, OUT_STORE / "app-icon-1024.png", rgb=True)
    save_png(master, IOS_ICON, rgb=True)

    foreground = white_mark_on_transparent(logo, 432, pad_ratio=0.18)
    save_png(foreground, OUT_STORE / "adaptive-foreground-432.png")

    densities = {
        "mipmap-mdpi": 48,
        "mipmap-hdpi": 72,
        "mipmap-xhdpi": 96,
        "mipmap-xxhdpi": 144,
        "mipmap-xxxhdpi": 192,
    }
    for folder, size in densities.items():
        icon = navy_square(logo, size, pad_ratio=0.16)
        fg = white_mark_on_transparent(logo, size, pad_ratio=0.18)
        base = ANDROID_RES / folder
        save_png(icon, base / "ic_launcher.png")
        save_png(icon, base / "ic_launcher_round.png")
        save_png(fg, base / "ic_launcher_foreground.png")
    splash_sizes = {
        "drawable-port-mdpi": (320, 480),
        "drawable-port-hdpi": (480, 800),
        "drawable-port-xhdpi": (720, 1280),
        "drawable-port-xxhdpi": (1080, 1920),
        "drawable-port-xxxhdpi": (1440, 2560),
        "drawable-land-mdpi": (480, 320),
        "drawable-land-hdpi": (800, 480),
        "drawable-land-xhdpi": (1280, 720),
        "drawable-land-xxhdpi": (1920, 1080),
        "drawable-land-xxxhdpi": (2560, 1440),
        "drawable": (480, 800),
    }
    for folder, (w, h) in splash_sizes.items():
        splash = Image.new("RGBA", (w, h), NAVY)
        mark = navy_splash_mark(logo, min(w, h) // 3, pad_ratio=0.12)
        x = (w - mark.width) // 2
        y = (h - mark.height) // 2
        splash.paste(mark, (x, y), mark)
        save_png(splash, ANDROID_RES / folder / "splash.png")

    # iOS LaunchScreen Splash.imageset (Capacitor uses 2732×2732 assets).
    ios_splash = Image.new("RGBA", (2732, 2732), NAVY)
    ios_mark = navy_splash_mark(logo, 720, pad_ratio=0.1)
    ix = (2732 - ios_mark.width) // 2
    iy = (2732 - ios_mark.height) // 2
    ios_splash.paste(ios_mark, (ix, iy), ios_mark)
    for name in (
        "splash-2732x2732.png",
        "splash-2732x2732-1.png",
        "splash-2732x2732-2.png",
    ):
        save_png(ios_splash, IOS_SPLASH_DIR / name)

    save_png(fit_logo(logo, 256, pad_ratio=0.08), WWW / "rootk-logo.png")
    print("Generated ROOTK store icons.")


if __name__ == "__main__":
    main()
