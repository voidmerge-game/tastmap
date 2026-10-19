import React, {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {continueRender, delayRender} from 'remotion';
import {W, H} from '../theme';
import type {Cam} from './WorldMap';
import {loadTex, TEXS, type Tex} from './RasterGlobe';

/**
 * v6 realistic earth: single-pass per-pixel orthographic renderer.
 *  - NASA Blue Marble (topo+bathy) base, 60 px/deg over Italy/Mediterranean region, 4096x2048 world fallback
 *  - tangent-space bump (Natural Earth shaded relief) lit by a fixed key light (upper-left, as the baked relief)
 *  - Blinn-Phong + Fresnel ocean specular, drifting clouds with displaced ground shadows,
 *    atmospheric rim scattering, limb darkening, night lights on the dark limb.
 */

export const REGION = {lon0: -8, lon1: 30, lat0: 33, lat1: 52}; // Italy test crop; match scripts/make_earth_v6.py
const CLOUDS_HD = {lon0: -12, lon1: 35, lat0: 30, lat1: 56};

const SRC = {
  base: 'data/earth_region.jpg', baseW: 'data/earth_world.jpg',
  bump: 'data/bump_region.jpg', bumpW: 'data/bump_world.jpg',
  cloud: 'data/clouds_italy.png', cloudW: 'data/clouds_world.png',
  night: 'data/night_world.jpg',
};

export type EarthParams = {
  /** key light direction in view space (x right, y up, z to viewer) */
  sun?: [number, number, number];
  ambient?: number;
  exposure?: number;
  bumpK?: number;
  specK?: number;
  cloudK?: number;
  shadowK?: number;
  rimK?: number;
  nightK?: number;
  /** cloud drift in degrees of longitude */
  cloudDrift?: number;
  /** 0..1 colour saturation of the base texture */
  sat?: number;
};

const DEF: Required<EarthParams> = {sun: [-0.42, 0.5, 0.76], ambient: 0.38, exposure: 1.08, bumpK: 1.6, specK: 0.75, cloudK: 0.95, shadowK: 0.55, rimK: 1.0, nightK: 0.9, cloudDrift: 0, sat: 1.0};

const norm3 = (v: [number, number, number]): [number, number, number] => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};

/** bilinear fetch of channel k at (u,v) in texture T (no wrap) */
const sample = (T: Tex, u: number, v: number, k: number, wrap: boolean): number => {
  const TW = T.w, TH = T.h, d = T.data;
  if (wrap) u = ((u % TW) + TW) % TW;
  else if (u < 0) u = 0; else if (u > TW - 1.001) u = TW - 1.001;
  if (v < 0) v = 0; else if (v > TH - 1.001) v = TH - 1.001;
  const u0 = u | 0, v0 = v | 0, fu = u - u0, fv = v - v0;
  const u1 = wrap ? (u0 + 1) % TW : Math.min(TW - 1, u0 + 1), v1 = Math.min(TH - 1, v0 + 1);
  const r0 = v0 * TW, r1 = v1 * TW;
  return (d[(r0 + u0) * 4 + k] * (1 - fu) + d[(r0 + u1) * 4 + k] * fu) * (1 - fv) + (d[(r1 + u0) * 4 + k] * (1 - fu) + d[(r1 + u1) * 4 + k] * fu) * fv;
};

export const renderEarth = (out: Uint8ClampedArray, cam: Cam, w: number, h: number, res: number, P: Required<EarthParams>) => {
  const base = TEXS[SRC.base], baseW = TEXS[SRC.baseW], bump = TEXS[SRC.bump], bumpW = TEXS[SRC.bumpW];
  const cloud = TEXS[SRC.cloud], cloudW = TEXS[SRC.cloudW], night = TEXS[SRC.night];
  if (!baseW || !bumpW) return;
  const R = cam.scale * res, cx = (W / 2) * res, cy = (H / 2) * res;
  const lat0 = (cam.lat * Math.PI) / 180, l0 = (cam.lon * Math.PI) / 180;
  const sinP = Math.sin(lat0), cosP = Math.cos(lat0);
  const [Sx, Sy, Sz] = norm3(P.sun);
  const [Hx, Hy, Hz] = norm3([Sx, Sy, Sz + 1]);
  const amb = P.ambient, exp = P.exposure, bumpK = P.bumpK;
  const D2R = 180 / Math.PI;
  const rk = base ? base.w / (REGION.lon1 - REGION.lon0) : 0; // px per degree (region)
  const bk = bump ? bump.w / (REGION.lon1 - REGION.lon0) : 0;
  const ck = cloud ? cloud.w / (CLOUDS_HD.lon1 - CLOUDS_HD.lon0) : 0;
  const drift = P.cloudDrift;
  const wide = cam.scale < 900; // world view: cheaper, uses world textures only
  for (let y = 0; y < h; y++) {
    const py = -(y - cy) / R;
    const o = y * w * 4;
    for (let x = 0; x < w; x++) {
      const px = (x - cx) / R;
      const r2 = px * px + py * py;
      const idx = o + x * 4;
      if (r2 > 1) { out[idx + 3] = 0; continue; }
      const rho = Math.sqrt(r2);
      const c = Math.asin(rho);
      const sc = Math.sin(c), cc = Math.cos(c);
      const lat = rho === 0 ? lat0 : Math.asin(cc * sinP + (py * sc * cosP) / rho);
      const dl = rho === 0 ? 0 : Math.atan2(px * sc, rho * cc * cosP - py * sc * sinP);
      const lon = l0 + dl;
      const lonD = ((lon * D2R + 540) % 360) - 180;
      const latD = lat * D2R;
      // ---- base colour + bump ----
      let r: number, g: number, b: number, gx: number, gy: number, land: number;
      const inR = !wide && base && bump && lonD >= REGION.lon0 && lonD < REGION.lon1 && latD > REGION.lat0 && latD <= REGION.lat1;
      if (inR) {
        const u = (lonD - REGION.lon0) * rk, v = (REGION.lat1 - latD) * rk;
        r = sample(base!, u, v, 0, false); g = sample(base!, u, v, 1, false); b = sample(base!, u, v, 2, false);
        const ub = (lonD - REGION.lon0) * bk, vb = (REGION.lat1 - latD) * bk;
        gx = (sample(bump!, ub, vb, 0, false) - 128) / 128; gy = (sample(bump!, ub, vb, 1, false) - 128) / 128; land = sample(bump!, ub, vb, 2, false) / 255;
      } else {
        const u = ((lonD + 180) / 360) * baseW.w, v = ((90 - latD) / 180) * baseW.h;
        r = sample(baseW, u, v, 0, true); g = sample(baseW, u, v, 1, true); b = sample(baseW, u, v, 2, true);
        const ub = ((lonD + 180) / 360) * bumpW.w, vb = ((90 - latD) / 180) * bumpW.h;
        gx = (sample(bumpW, ub, vb, 0, true) - 128) / 128; gy = (sample(bumpW, ub, vb, 1, true) - 128) / 128; land = sample(bumpW, ub, vb, 2, true) / 255;
      }
      if (P.sat !== 1) { const l = 0.3 * r + 0.59 * g + 0.11 * b; r = l + (r - l) * P.sat; g = l + (g - l) * P.sat; b = l + (b - l) * P.sat; }
      // ---- tangent frame (view space) ----
      const sdl = Math.sin(dl), cdl = Math.cos(dl), sf = Math.sin(lat), cf = Math.cos(lat);
      const Ex = cdl, Ey = sinP * sdl, Ez = -cosP * sdl;
      const Ux = -sf * sdl, Uy = cosP * cf + sinP * sf * cdl, Uz = sinP * cf - cosP * sf * cdl;
      const Nx = px, Ny = py, Nz = cc;
      const k = bumpK * land;
      let nx = Nx - k * (gx * Ex + gy * Ux), ny = Ny - k * (gx * Ey + gy * Uy), nz = Nz - k * (gx * Ez + gy * Uz);
      const nl = Math.sqrt(nx * nx + ny * ny + nz * nz); nx /= nl; ny /= nl; nz /= nl;
      const diff = Math.max(0, nx * Sx + ny * Sy + nz * Sz);
      const sph = Math.max(0, Nx * Sx + Ny * Sy + Nz * Sz);
      const light = (amb + (1 - amb) * diff) * exp;
      // ---- ocean specular (Blinn-Phong, Fresnel) ----
      const ocean = 1 - land;
      let spec = 0;
      if (ocean > 0.01) {
        const nh = Math.max(0, Nx * Hx + Ny * Hy + Nz * Hz);
        const nh2 = nh * nh, nh4 = nh2 * nh2, nh8 = nh4 * nh4, nh16 = nh8 * nh8, nh32 = nh16 * nh16;
        const fres = 0.35 + 0.65 * (1 - cc) * (1 - cc);
        spec = ocean * P.specK * (nh32 * nh16 * 0.9 + nh8 * 0.12) * fres * 255;
      }
      // ---- clouds + shadow ----
      let ac = 0, ash = 0;
      if (P.cloudK > 0) {
        const lc = lonD + drift;
        if (!wide && cloud && lc >= CLOUDS_HD.lon0 + 0.6 && lc < CLOUDS_HD.lon1 - 0.6 && latD > CLOUDS_HD.lat0 + 0.6 && latD < CLOUDS_HD.lat1 - 0.6) {
          ac = sample(cloud, (lc - CLOUDS_HD.lon0) * ck, (CLOUDS_HD.lat1 - latD) * ck, 3, false) / 255;
          ash = sample(cloud, (lc + 0.32 - CLOUDS_HD.lon0) * ck, (CLOUDS_HD.lat1 - (latD - 0.28)) * ck, 3, false) / 255;
        } else if (cloudW) {
          const uw = ((lc + 180) / 360) * cloudW.w, vw = ((90 - latD) / 180) * cloudW.h, dpx = cloudW.w / 360;
          ac = sample(cloudW, uw, vw, 3, true) / 255;
          ash = sample(cloudW, uw + 0.5 * dpx, vw + 0.45 * dpx, 3, true) / 255;
        }
      }
      const shadow = 1 - P.shadowK * ash * (1 - ac);
      let cr = r * light * shadow + spec * 1.0, cg = g * light * shadow + spec * 0.96, cb = b * light * shadow + spec * 0.88;
      if (ac > 0) {
        const a = Math.min(1, ac * P.cloudK);
        const cl = 255 * (amb * 0.9 + (1 - amb * 0.9) * sph) * exp;
        cr = cr * (1 - a) + cl * a; cg = cg * (1 - a) + cl * a; cb = cb * (1 - a) + cl * 0.98 * a;
      }
      // ---- night lights on the dark limb ----
      if (night && sph < 0.22 && P.nightK > 0) {
        const un = ((lonD + 180) / 360) * night.w, vn = ((90 - latD) / 180) * night.h;
        const t = (1 - sph / 0.22) * P.nightK;
        cr += sample(night, un, vn, 0, true) * t; cg += sample(night, un, vn, 1, true) * t * 0.9; cb += sample(night, un, vn, 2, true) * t * 0.75;
      }
      // ---- atmosphere: rim scattering + limb darkening ----
      const f = 1 - cc;
      const rim = f * f * f * (0.3 + 0.7 * sph) * P.rimK;
      const dark = 1 - 0.55 * f * f;
      out[idx] = cr * dark + 95 * rim;
      out[idx + 1] = cg * dark + 150 * rim;
      out[idx + 2] = cb * dark + 255 * rim;
      out[idx + 3] = rho > 0.996 ? (255 * (1 - rho)) / 0.004 : 255;
    }
  }
};

export const EarthGlobe: React.FC<{cam: Cam; res?: number; opacity?: number; params?: EarthParams}> = ({cam, res = 1, opacity = 1, params}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const [handle] = useState(() => delayRender('earth-globe'));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const req = [SRC.baseW, SRC.bumpW, SRC.cloudW];
    const opt = [SRC.base, SRC.bump, SRC.cloud, SRC.night];
    Promise.all(req.map(loadTex))
      .then(() => Promise.all(opt.map((s) => loadTex(s).catch(() => undefined))))
      .then(() => { setReady(true); continueRender(handle); })
      .catch((e) => { console.error('EARTH-FAIL', String(e)); continueRender(handle); });
  }, [handle]);
  const w = Math.round(W * res), h = Math.round(H * res);
  const P: Required<EarthParams> = {...DEF, ...(params ?? {})};
  const key = JSON.stringify(P);
  useLayoutEffect(() => {
    if (!ready || !ref.current) return;
    const ctx = ref.current.getContext('2d')!;
    const id = ctx.createImageData(w, h);
    renderEarth(id.data, cam, w, h, res, P);
    ctx.putImageData(id, 0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, cam.lon, cam.lat, cam.scale, w, h, res, key]);
  return <canvas ref={ref} width={w} height={h} style={{position: 'absolute', left: 0, top: 0, width: W, height: H, opacity}} />;
};
