import {geoDistance} from 'd3-geo';
import {FLAGS, FLAGS_EXTRA} from '../events';
import {pushOut, type Rect} from './labels';
import type {Cam} from '../components/WorldMap';

/** Screen rectangles of the flags drawn at this frame — the exact FlagDrop geometry (size by zoom, pushOut from names/cards).
 *  Shared by the City/Callout components and the QA checker so nothing is ever placed on a flag. */
export const flagRectsAt = (frame: number, fps: number, cam: Cam, projection: (ll: [number, number]) => [number, number] | null, avoid: Rect[]): Rect[] => {
  const out: Rect[] = [];
  const k = Math.min(1.45, Math.max(0.7, Math.pow(cam.scale / 2600, 0.55)));
  for (const f of [...FLAGS, ...FLAGS_EXTRA]) {
    const at = Math.round(f.t * fps), until = f.until ? Math.round(f.until * fps) : undefined;
    if (frame < at || (until !== undefined && frame > until)) continue;
    if (geoDistance([f.lon, f.lat], [cam.lon, cam.lat]) >= Math.PI / 2 - 0.02) continue;
    const p = projection([f.lon, f.lat]);
    if (!p) continue;
    const w = (f.w ?? 72) * k, h = (w * 2) / 3, bh = h + (f.label ? 24 * k : 0);
    const r: Rect = {x: p[0] - w / 2 - 4, y: p[1] - bh / 2 - 4, w: w + 8, h: bh + 8};
    const mv = pushOut(r, avoid);
    if (!mv) continue;
    out.push({...r, x: r.x + mv[0], y: r.y + mv[1]});
  }
  return out;
};
