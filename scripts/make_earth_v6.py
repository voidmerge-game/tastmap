#!/usr/bin/env python3
"""v6 realistic earth textures (all public domain sources):
  NASA Blue Marble Next Generation (topo+bathy, July) 21600px tiles -> region 60 px/deg + world 4096x2048
  Natural Earth GRAY_HR_SR_OB (shaded relief) -> tangent-space bump map (R=dE, G=dN) + ocean mask (B)
  NASA Black Marble 2016 -> night lights 2048x1024
Inputs in /var/tmp/ne (bm_{B1,C1}.jpg, bm_world.jpg, gray.zip, clouds.tif)
Outputs in public/data: earth_region.jpg, earth_world.jpg, bump_region.jpg, bump_world.jpg, clouds_italy.png, clouds_world.png
Region = lon -8..30, lat 33..52 (REGION in src/components/EarthGlobe.tsx must match)
"""
import os, sys, zipfile, numpy as np
from PIL import Image, ImageFilter
Image.MAX_IMAGE_PIXELS = None
NE = '/var/tmp/ne'
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'data')
LON0, LON1, LAT0, LAT1 = -8, 30, 33, 52
PPD = 60
CLON0, CLON1, CLAT0, CLAT1 = -12, 35, 30, 56
RW, RH = (LON1 - LON0) * PPD, (LAT1 - LAT0) * PPD  # 2280 x 1140

def step(msg):
    print(msg, flush=True)

# ---------- Blue Marble region ----------
if not os.path.exists(f'{OUT}/earth_region.jpg'):
    region = Image.new('RGB', (RW, RH))
    tiles = {'B1': (-90, 0, 0, 90), 'C1': (0, 90, 0, 90)}
    for name, (tl0, tl1, tb0, tb1) in tiles.items():
        im = Image.open(f'{NE}/bm_{name}.jpg')
        im.draft('RGB', (5400, 5400))  # JPEG DCT downscale 1/4 -> 60 px/deg
        im = im.convert('RGB')
        assert im.size == (5400, 5400), im.size
        # overlap of tile with region (degrees)
        a0, a1 = max(tl0, LON0), min(tl1, LON1)
        b0, b1 = max(tb0, LAT0), min(tb1, LAT1)
        if a1 <= a0 or b1 <= b0:
            continue
        box = ((a0 - tl0) * PPD, (tb1 - b1) * PPD, (a1 - tl0) * PPD, (tb1 - b0) * PPD)
        crop = im.crop(box)
        region.paste(crop, ((a0 - LON0) * PPD, (LAT1 - b1) * PPD))
        step(f'tile {name} box {box} -> region')
        del im, crop
    region.save(f'{OUT}/earth_region.jpg', quality=90, subsampling=0, optimize=True)
    step(f'earth_region.jpg {region.size}')
    del region

# ---------- Blue Marble world ----------
if not os.path.exists(f'{OUT}/earth_world.jpg'):
    w = Image.open(f'{NE}/bm_world.jpg').convert('RGB').resize((4096, 2048), Image.LANCZOS)
    w.save(f'{OUT}/earth_world.jpg', quality=88, optimize=True)
    step('earth_world.jpg')

# ---------- GRAY relief -> bump + ocean mask (memmap, strip-wise: sandbox has 2 GB RAM) ----------
def bump_from_gray(a: np.ndarray, sigma_hp: float, gain: float) -> Image.Image:
    """R,G = horizontal gradients of high-passed relief (128 = flat), B = land mask (255 land)."""
    g = Image.fromarray(a)
    hp = a.astype(np.float32) - np.asarray(g.filter(ImageFilter.GaussianBlur(sigma_hp))).astype(np.float32)
    gy, gx = np.gradient(hp)  # rows (south+), cols (east+)
    del hp
    R = np.clip(128 + gx * gain, 0, 255).astype(np.uint8); del gx
    G = np.clip(128 - gy * gain, 0, 255).astype(np.uint8); del gy  # north-positive
    land = (a > 118).astype(np.uint8) * 255
    land = np.asarray(Image.fromarray(land).filter(ImageFilter.GaussianBlur(0.8)))
    return Image.merge('RGB', [Image.fromarray(R), Image.fromarray(G), Image.fromarray(land)])

if not (os.path.exists(f'{OUT}/bump_region.jpg') and os.path.exists(f'{OUT}/bump_world.jpg')):
    import tifffile
    if not os.path.exists(f'{NE}/gray.tif'):
        z = zipfile.ZipFile(f'{NE}/gray.zip'); tif = [n for n in z.namelist() if n.lower().endswith('.tif')][0]
        z.extract(tif, NE); os.rename(os.path.join(NE, tif), f'{NE}/gray.tif')
    g = tifffile.memmap(f'{NE}/gray.tif')  # (10800, 21600) uint8, read-only view on disk
    assert g.shape == (10800, 21600), g.shape
    if not os.path.exists(f'{OUT}/bump_region.jpg'):
        x0, y0, x1, y1 = (LON0 + 180) * 60, (90 - LAT1) * 60, (LON1 + 180) * 60, (90 - LAT0) * 60
        out = Image.new('RGB', (RW, RH))
        PAD, STEP = 24, 1020
        for ys in range(y0, y1, STEP):
            ye = min(y1, ys + STEP)
            a = np.ascontiguousarray(g[max(0, ys - PAD):min(10800, ye + PAD), x0:x1])
            b = bump_from_gray(a, 6, 7.0)
            top = ys - max(0, ys - PAD)
            out.paste(b.crop((0, top, RW, top + (ye - ys))), (0, ys - y0))
            del a, b
        out.save(f'{OUT}/bump_region.jpg', quality=90, subsampling=0)
        step('bump_region.jpg'); del out
    if not os.path.exists(f'{OUT}/bump_world.jpg'):
        # 21600x10800 -> 4096x2048 by strips (box filter 5.27x; use PIL on 1350-row strips)
        rows = []
        for ys in range(0, 10800, 1350):
            a = np.ascontiguousarray(g[ys:ys + 1350, :])
            rows.append(Image.fromarray(a).resize((4096, 256), Image.LANCZOS)); del a
        gw = Image.new('L', (4096, 2048))
        for i, r in enumerate(rows): gw.paste(r, (0, i * 256))
        bump_from_gray(np.asarray(gw), 3, 9.0).save(f'{OUT}/bump_world.jpg', quality=90, subsampling=0)
        step('bump_world.jpg')
    del g

# ---------- night lights ----------
if not os.path.exists(f'{OUT}/night_world.jpg') and os.path.exists(f'{NE}/night.jpg') and os.path.getsize(f'{NE}/night.jpg') > 100000:
    n = Image.open(f'{NE}/night.jpg'); n.draft('RGB', (3400, 1700)); n = n.convert('RGB').resize((2048, 1024), Image.LANCZOS)
    n.save(f'{OUT}/night_world.jpg', quality=85, optimize=True)
    step('night_world.jpg')

# ---------- NASA cloud layer: world and high-resolution Italy crop ----------
if os.path.exists(f'{NE}/clouds.tif') and not (os.path.exists(f'{OUT}/clouds_world.png') and os.path.exists(f'{OUT}/clouds_italy.png')):
    src = Image.open(f'{NE}/clouds.tif').convert('L')
    cw, ch = src.size
    if abs(cw / ch - 2.0) > 0.02: raise RuntimeError(f'unexpected cloud raster aspect {src.size}')
    def rgba_cloud(gray: Image.Image) -> Image.Image:
        a = np.asarray(gray, dtype=np.uint8)
        alpha = np.clip((a.astype(np.float32) - 24.0) * 1.35, 0, 220).astype(np.uint8)
        white = Image.new('RGB', gray.size, (255,255,255))
        white.putalpha(Image.fromarray(alpha))
        return white
    if not os.path.exists(f'{OUT}/clouds_world.png'):
        rgba_cloud(src.resize((4096,2048), Image.Resampling.LANCZOS)).save(f'{OUT}/clouds_world.png', optimize=True)
        step('clouds_world.png')
    if not os.path.exists(f'{OUT}/clouds_italy.png'):
        sx, sy = cw / 360.0, ch / 180.0
        cropbox = (int((CLON0 + 180) * sx), int((90 - CLAT1) * sy), int((CLON1 + 180) * sx), int((90 - CLAT0) * sy))
        cr = src.crop(cropbox).resize(((CLON1-CLON0)*PPD, (CLAT1-CLAT0)*PPD), Image.Resampling.LANCZOS)
        rgba_cloud(cr).save(f'{OUT}/clouds_italy.png', optimize=True)
        step(f'clouds_italy.png {cr.size}')
step('done')
