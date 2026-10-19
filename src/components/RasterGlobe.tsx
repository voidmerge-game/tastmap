import React, {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {continueRender, delayRender, staticFile} from 'remotion';
import {W, H} from '../theme';
import type {Cam} from './WorldMap';

/** Equirectangular earth texture, reprojected per-frame onto an orthographic globe (bilinear sampling). */

export type Tex = {data: Uint8ClampedArray; w: number; h: number};
export const TEXS: Record<string, Tex> = {};
const PROMS: Record<string, Promise<void>> = {};

export const loadTex = (src: string) => {
  if (!PROMS[src]) {
    PROMS[src] = new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        const ctx = c.getContext('2d', {willReadFrequently: true})!;
        ctx.drawImage(img, 0, 0);
        const id = ctx.getImageData(0, 0, c.width, c.height);
        TEXS[src] = {data: id.data, w: c.width, h: c.height};
        resolve();
      };
      img.onerror = reject;
      img.src = staticFile(src);
    });
  }
  return PROMS[src];
};

export type Tint = [number, number, number];

export type Bounds = {lon0: number; lon1: number; lat0: number; lat1: number};

const renderGlobe = (out: Uint8ClampedArray, cam: Cam, w: number, h: number, res: number, src: string, tint: Tint, lightAmt: number, bounds?: Bounds) => {
  const T = TEXS[src];
  const TW = T.w, TH = T.h, tex = T.data;
  const R = cam.scale * res, cx = (W / 2) * res, cy = (H / 2) * res;
  const lat0 = (cam.lat * Math.PI) / 180, l0 = (cam.lon * Math.PI) / 180;
  const sinP = Math.sin(lat0), cosP = Math.cos(lat0);
  const kx = TW / (2 * Math.PI), ky = TH / Math.PI;
  // limb darkening + soft edge
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
      const lon = l0 + Math.atan2(px * sc, rho * cc * cosP - py * sc * sinP);
      let u: number, v: number;
      if (bounds) {
        const lonD = ((lon * 180) / Math.PI + 540) % 360 - 180;
        const latD = (lat * 180) / Math.PI;
        u = ((lonD - bounds.lon0) / (bounds.lon1 - bounds.lon0)) * TW;
        v = ((bounds.lat1 - latD) / (bounds.lat1 - bounds.lat0)) * TH;
        if (u < 0 || u >= TW - 1 || v < 0 || v >= TH - 1) { out[idx + 3] = 0; continue; }
      } else {
        u = (lon + Math.PI) * kx;
        v = (Math.PI / 2 - lat) * ky;
        u = ((u % TW) + TW) % TW;
        if (v < 0) v = 0; else if (v > TH - 1.001) v = TH - 1.001;
      }
      const u0 = u | 0, v0 = v | 0, fu = u - u0, fv = v - v0, u1 = (u0 + 1) % TW, v1 = Math.min(TH - 1, v0 + 1);
      const i00 = (v0 * TW + u0) * 4, i10 = (v0 * TW + u1) * 4, i01 = (v1 * TW + u0) * 4, i11 = (v1 * TW + u1) * 4;
      // lighting: light from upper-left, limb darkening
      const nz = cc; // cosine of angle from view axis
      const light = 1 + lightAmt * (-0.22 + 0.32 * Math.max(0, -px * 0.45 + py * 0.35 + nz * 0.8) - 0.25 * Math.pow(rho, 6));
      for (let k = 0; k < 3; k++) {
        const s = (tex[i00 + k] * (1 - fu) + tex[i10 + k] * fu) * (1 - fv) + (tex[i01 + k] * (1 - fu) + tex[i11 + k] * fu) * fv;
        out[idx + k] = s * light * tint[k];
      }
      const a = (tex[i00 + 3] * (1 - fu) + tex[i10 + 3] * fu) * (1 - fv) + (tex[i01 + 3] * (1 - fu) + tex[i11 + 3] * fu) * fv;
      out[idx + 3] = rho > 0.995 ? Math.max(0, a * (1 - rho) / 0.005) : a;
    }
  }
};

export const RasterGlobe: React.FC<{cam: Cam; res?: number; opacity?: number; src?: string; tint?: Tint; light?: number; blend?: string; bounds?: Bounds}> = ({
  cam, res = 1, opacity = 1, src = 'data/earth_4k.jpg', tint = [1, 1, 1], light = 1, blend, bounds,
}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const [handle] = useState(() => delayRender('raster-globe'));
  const [ready, setReady] = useState(!!TEXS[src]);
  useEffect(() => {
    loadTex(src).then(() => { setReady(true); continueRender(handle); }).catch((e) => { console.error('RASTER-FAIL', src, String(e)); continueRender(handle); });
  }, [handle, src]);
  const w = Math.round(W * res), h = Math.round(H * res);
  useLayoutEffect(() => {
    if (!ready || !ref.current) return;
    const ctx = ref.current.getContext('2d')!;
    const id = ctx.createImageData(w, h);
    renderGlobe(id.data, cam, w, h, res, src, tint, light, bounds);
    ctx.putImageData(id, 0, 0);
  }, [ready, cam.lon, cam.lat, cam.scale, w, h, res, src, tint[0], tint[1], tint[2], light, bounds]);
  return (
    <canvas
      ref={ref}
      width={w}
      height={h}
      style={{position: 'absolute', left: 0, top: 0, width: W, height: H, opacity, imageRendering: 'auto', mixBlendMode: blend as any}}
    />
  );
};
