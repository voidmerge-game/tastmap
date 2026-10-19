import {interpolate} from 'remotion';

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeOutQuint = (t: number) => 1 - Math.pow(1 - t, 5);
export const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;

/** progress 0→1 between two frames (clamped) with easing */
export const prog = (frame: number, from: number, to: number, ease = easeInOutCubic) =>
  ease(clamp01((frame - from) / Math.max(1, to - from)));

/** fade in over `inF` frames, hold, fade out over `outF` frames; relative frame f in [0,len] */
export const fadeInOut = (f: number, len: number, inF = 15, outF = 15) =>
  interpolate(f, [0, inF, Math.max(inF + 1, len - outF), len], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

export type CamKey = {t: number; lon: number; lat: number; scale: number};

/** Interpolate camera keyframes (t in seconds). Scale is interpolated in log space. */
export const camAt = (keys: CamKey[], tSec: number) => {
  if (tSec <= keys[0].t) return keys[0];
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (tSec >= a.t && tSec <= b.t) {
      const p = easeInOutCubic(clamp01((tSec - a.t) / Math.max(0.001, b.t - a.t)));
      return {
        t: tSec,
        lon: a.lon + (b.lon - a.lon) * p,
        lat: a.lat + (b.lat - a.lat) * p,
        scale: Math.exp(Math.log(a.scale) + (Math.log(b.scale) - Math.log(a.scale)) * p),
      };
    }
  }
  return keys[keys.length - 1];
};

/** v5 camera = keyframes + slow organic drift (screen-pixel amplitudes converted to degrees). Pure: shared by Main and the QA checker. */
export const camWithDrift = (keys: CamKey[], t: number) => {
  const c = camAt(keys, t);
  const degPerPx = 57.2958 / c.scale;
  const dz = 1 + 0.012 * Math.sin(t * 0.21) + 0.006 * Math.sin(t * 0.53);
  return {...c, lon: c.lon + (16 * Math.sin(t * 0.17) + 6 * Math.sin(t * 0.41)) * degPerPx, lat: c.lat + (11 * Math.cos(t * 0.13) + 5 * Math.cos(t * 0.37)) * degPerPx, scale: c.scale * dz};
};
