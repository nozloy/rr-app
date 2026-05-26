from __future__ import annotations

import argparse
import io
import json
import math
import re
import urllib.request
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter, ImageOps

try:
    import cv2
    import numpy as np
except ImportError:  # Pillow fallback keeps the script usable without OpenCV.
    cv2 = None
    np = None

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "scripts" / "raid_reference_sources.json"
REFERENCE_DIR = ROOT / "tmp" / "raid-reference-images"
OUT_DIR = ROOT / "public" / "raids"
SIZE = (1920, 1080)
MIDNIGHT_REFERENCE_SLUGS = {"march-on-queldanas", "the-dreamrift", "the-voidspire"}
MIDNIGHT_STYLE_REFERENCE_PATHS = [
    OUT_DIR / "march_on_queldanas.jpg",
    OUT_DIR / "the_dreamrift.png",
    OUT_DIR / "the_voidspire.png",
    OUT_DIR / "march_on_queldanas_styled_16x9.jpg",
    OUT_DIR / "the_dreamrift_styled_16x9.jpg",
    OUT_DIR / "the_voidspire_styled_16x9.jpg",
]
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 RaidReminderAssetBuilder/1.0",
}
_MIDNIGHT_STYLE_TEXTURE: Image.Image | None = None


def fetch_bytes(url: str) -> bytes:
    request = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(request, timeout=45) as response:
        return response.read()


def resolve_og_image(page_url: str) -> str:
    html = fetch_bytes(page_url).decode("utf-8", "ignore")
    patterns = [
        r'<meta property="og:image" content="([^"]+)"',
        r'<meta property="twitter:image" content="([^"]+)"',
        r'<meta name="twitter:image" content="([^"]+)"',
    ]
    for pattern in patterns:
        match = re.search(pattern, html, flags=re.I)
        if match:
            return match.group(1).replace("&amp;", "&")
    raise RuntimeError(f"No og:image found for {page_url}")


def crop_visible_content(image: Image.Image) -> Image.Image:
    if "A" not in image.getbands():
        return image

    # Local Midnight reference PNGs can include transparent gutters. Crop only
    # the painted area so the style texture does not learn gray padding.
    alpha = image.getchannel("A")
    mask = alpha.point(lambda pixel: 255 if pixel > 96 else 0)
    bbox = mask.getbbox()
    if not bbox:
        return image
    return image.crop(bbox)


def flatten_transparency(image: Image.Image) -> Image.Image:
    if "A" not in image.getbands():
        return image.convert("RGB")

    canvas = Image.new("RGBA", image.size, (5, 8, 14, 255))
    canvas.alpha_composite(image.convert("RGBA"))
    return canvas.convert("RGB")


def cover_crop(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    image = flatten_transparency(crop_visible_content(ImageOps.exif_transpose(image)))
    src_w, src_h = image.size
    dst_w, dst_h = size
    src_ratio = src_w / src_h
    dst_ratio = dst_w / dst_h

    if src_ratio > dst_ratio:
        crop_h = src_h
        crop_w = int(src_h * dst_ratio)
        left = max(0, (src_w - crop_w) // 2)
        box = (left, 0, left + crop_w, crop_h)
    else:
        crop_w = src_w
        crop_h = int(src_w / dst_ratio)
        top = max(0, int((src_h - crop_h) * 0.42))
        box = (0, top, crop_w, top + crop_h)

    return image.crop(box).resize(size, Image.Resampling.LANCZOS)


def average_color(image: Image.Image) -> tuple[int, int, int]:
    thumb = image.resize((1, 1), Image.Resampling.BOX)
    return thumb.getpixel((0, 0))


def get_midnight_style_texture() -> Image.Image | None:
    global _MIDNIGHT_STYLE_TEXTURE

    if _MIDNIGHT_STYLE_TEXTURE is not None:
        return _MIDNIGHT_STYLE_TEXTURE

    texture: Image.Image | None = None
    count = 0
    for path in MIDNIGHT_STYLE_REFERENCE_PATHS:
        if not path.exists():
            continue

        with Image.open(path) as reference:
            painted_reference = cover_crop(reference, SIZE)

        luma = ImageOps.grayscale(painted_reference)
        low_frequency = luma.filter(ImageFilter.GaussianBlur(18))
        high_frequency = ImageChops.subtract(luma, low_frequency, scale=1.0, offset=128)
        high_frequency = ImageEnhance.Contrast(high_frequency).enhance(1.85)
        high_frequency = high_frequency.filter(ImageFilter.GaussianBlur(0.35))

        count += 1
        if texture is None:
            texture = high_frequency
        else:
            texture = Image.blend(texture, high_frequency, 1 / count)

    _MIDNIGHT_STYLE_TEXTURE = texture
    return texture


def apply_midnight_brush_texture(image: Image.Image) -> Image.Image:
    texture = get_midnight_style_texture()
    if texture is None:
        return image

    result = image.convert("RGBA")
    light = Image.new("RGBA", SIZE, (255, 255, 255, 0))
    dark = Image.new("RGBA", SIZE, (0, 0, 0, 0))
    light.putalpha(texture.point(lambda p: min(36, int(max(0, p - 130) * 0.28))))
    dark.putalpha(texture.point(lambda p: min(48, int(max(0, 126 - p) * 0.38))))
    result = Image.alpha_composite(result, light)
    result = Image.alpha_composite(result, dark)
    return result.convert("RGB")


def preserve_source_palette(source: Image.Image, styled: Image.Image) -> Image.Image:
    source_hue, source_saturation, _ = source.convert("HSV").split()
    _, _, styled_value = styled.convert("HSV").split()

    # Keep the official reference palette. Only value/texture treatment is
    # allowed to drift toward the Midnight-style painted look.
    saturation = ImageEnhance.Contrast(source_saturation).enhance(1.04)
    return Image.merge("HSV", (source_hue, saturation, styled_value)).convert("RGB")


def apply_optional_watercolor_pass(image: Image.Image) -> Image.Image:
    if cv2 is None or np is None:
        return image

    rgb = image.convert("RGB")
    bgr = cv2.cvtColor(np.array(rgb), cv2.COLOR_RGB2BGR)
    small = cv2.resize(bgr, (960, 540), interpolation=cv2.INTER_AREA)
    painted = cv2.stylization(small, sigma_s=70, sigma_r=0.42)
    painted = cv2.resize(painted, SIZE, interpolation=cv2.INTER_CUBIC)
    painted = cv2.cvtColor(painted, cv2.COLOR_BGR2RGB)
    return Image.fromarray(painted)


def apply_banner_style(image: Image.Image) -> Image.Image:
    base = image.convert("RGB")
    # Keep recognizable raid composition, but push raw screenshots toward the
    # broad, painted concept-art feel of the local Midnight raid references.
    soft_shapes = base.resize((640, 360), Image.Resampling.BICUBIC)
    soft_shapes = soft_shapes.filter(ImageFilter.MedianFilter(3)).filter(ImageFilter.SMOOTH_MORE)
    soft_shapes = soft_shapes.resize(SIZE, Image.Resampling.LANCZOS)
    reduced_palette = base.filter(ImageFilter.MedianFilter(3)).quantize(
        colors=72,
        method=Image.Quantize.FASTOCTREE,
        dither=Image.Dither.NONE,
    )
    reduced_palette = reduced_palette.convert("RGB").filter(ImageFilter.GaussianBlur(0.18))
    posterized = ImageOps.posterize(base, 5).filter(ImageFilter.GaussianBlur(0.35))
    painterly = Image.blend(soft_shapes, reduced_palette, 0.38)
    painterly = Image.blend(painterly, posterized, 0.18)
    watercolor = apply_optional_watercolor_pass(base)
    painterly = Image.blend(painterly, watercolor, 0.36)

    detail = ImageEnhance.Sharpness(base.filter(ImageFilter.DETAIL)).enhance(1.35)
    styled = Image.blend(painterly, detail, 0.16)
    styled = preserve_source_palette(base, styled)
    styled = ImageEnhance.Color(styled).enhance(1.08)
    styled = ImageEnhance.Contrast(styled).enhance(1.2)
    styled = ImageEnhance.Brightness(styled).enhance(0.88)
    styled = apply_midnight_brush_texture(styled)

    edge_source = ImageOps.grayscale(base).filter(ImageFilter.FIND_EDGES)
    edge_source = ImageOps.autocontrast(edge_source).filter(ImageFilter.GaussianBlur(0.45))
    edge_alpha = edge_source.point(lambda p: min(50, int(max(0, p - 26) * 0.25)))
    edge_layer = Image.new("RGBA", SIZE, (2, 4, 9, 0))
    edge_layer.putalpha(edge_alpha)
    styled = Image.alpha_composite(styled.convert("RGBA"), edge_layer).convert("RGB")

    avg = average_color(styled)
    cool_shadow = tuple(max(0, int(c * 0.38)) for c in avg)
    overlay = Image.new("RGBA", SIZE, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay, "RGBA")

    # Banner-safe readability overlays: current renderer already overlays too,
    # but asset-level grading keeps legacy/current output consistent.
    draw.rectangle((0, 0, SIZE[0], SIZE[1]), fill=(3, 8, 15, 34))
    draw.rectangle((0, 0, 760, SIZE[1]), fill=(2, 6, 12, 54))
    draw.rectangle((0, 700, SIZE[0], SIZE[1]), fill=(2, 6, 12, 50))

    for radius, alpha, y_bias in [(900, 72, 0.42), (620, 46, 0.2)]:
        glow = Image.new("RGBA", SIZE, (0, 0, 0, 0))
        gd = ImageDraw.Draw(glow, "RGBA")
        cx = int(SIZE[0] * 0.68)
        cy = int(SIZE[1] * y_bias)
        gd.ellipse(
            (cx - radius, cy - radius // 2, cx + radius, cy + radius // 2),
            fill=(*cool_shadow, alpha),
        )
        overlay = Image.alpha_composite(overlay, glow.filter(ImageFilter.GaussianBlur(70)))

    # Subtle vignette without hard edges.
    vignette = Image.new("L", SIZE, 0)
    vd = ImageDraw.Draw(vignette)
    vd.ellipse((-220, -120, SIZE[0] + 220, SIZE[1] + 190), fill=255)
    vignette = ImageOps.invert(vignette.filter(ImageFilter.GaussianBlur(95)))
    v_rgba = Image.new("RGBA", SIZE, (0, 0, 0, 0))
    v_rgba.putalpha(vignette.point(lambda p: int(p * 0.36)))

    result = Image.alpha_composite(styled.convert("RGBA"), overlay)
    result = Image.alpha_composite(result, v_rgba)

    # Gentle texture to match compressed concept-art assets and hide screenshot noise.
    grain = Image.effect_noise(SIZE, 10).convert("L")
    grain_rgba = Image.new("RGBA", SIZE, (255, 255, 255, 0))
    grain_rgba.putalpha(grain.point(lambda p: int(max(0, p - 118) * 0.05)))
    result = Image.alpha_composite(result, grain_rgba)

    return result.convert("RGB")


def build_assets(
    force: bool,
    selected_slugs: set[str] | None = None,
    include_current: bool = False,
) -> list[dict]:
    entries = json.loads(MANIFEST.read_text(encoding="utf-8"))
    REFERENCE_DIR.mkdir(parents=True, exist_ok=True)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    results = []

    for entry in entries:
        slug = entry["slug"]
        if selected_slugs is not None and slug not in selected_slugs:
            continue

        out_path = OUT_DIR / f"{slug.replace('-', '_')}_styled_16x9.jpg"
        reference_path = REFERENCE_DIR / f"{slug}.jpg"

        if slug in MIDNIGHT_REFERENCE_SLUGS and not include_current:
            results.append({
                "slug": slug,
                "asset": str(out_path.relative_to(ROOT)),
                "reference": "local Midnight style reference",
                "imageUrl": entry.get("imageUrl", ""),
                "status": "skipped-current",
            })
            continue

        image_url = entry.get("imageUrl")
        if not image_url:
            image_url = resolve_og_image(entry["pageUrl"])
            entry["imageUrl"] = image_url

        if force or not reference_path.exists():
            reference_path.write_bytes(fetch_bytes(image_url))

        if force or not out_path.exists():
            with Image.open(reference_path) as source:
                final = apply_banner_style(cover_crop(source, SIZE))
            final.save(out_path, "JPEG", quality=90, optimize=True, progressive=True)

        results.append({
            "slug": slug,
            "asset": str(out_path.relative_to(ROOT)),
            "reference": str(reference_path.relative_to(ROOT)),
            "imageUrl": image_url,
            "status": "built" if force else "ready",
        })

    MANIFEST.write_text(
        json.dumps(entries, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return results


def main() -> None:
    parser = argparse.ArgumentParser(
        description=(
            "Build RaidReminder 16:9 raid backgrounds from Wowhead reference images "
            "with the local Midnight raid artwork as the drawing-style reference."
        ),
    )
    parser.add_argument("--force", action="store_true", help="Regenerate existing assets and refresh references.")
    parser.add_argument("--slugs", nargs="*", help="Only process these raid slugs.")
    parser.add_argument(
        "--include-current",
        action="store_true",
        help="Also rebuild current Midnight assets. By default they are preserved as style references.",
    )
    args = parser.parse_args()

    selected_slugs = set(args.slugs) if args.slugs else None
    results = build_assets(force=args.force, selected_slugs=selected_slugs, include_current=args.include_current)
    print(f"processed={len(results)}")
    for result in results:
        print(f"{result['slug']} [{result['status']}] -> {result['asset']}")


if __name__ == "__main__":
    main()
