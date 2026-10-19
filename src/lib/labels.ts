/**
 * Country-name layout + collision rectangles (shared by the Names layer, LabelGuard, FlagDrop, City, Callout and the QA checker).
 * A name is ALWAYS fully inside its territory polygon: band tables from scripts/label_fit.ts give, for perpendicular
 * half-heights OFFS, the free segment [lo, hi] (degrees, measured from the pole of inaccessibility along the direction).
 * The text is centred on that segment (shift), and its length is capped to 0.88 × segment.
 */
export type Seg = [number, number];
export type Fit = {th: number; r: number; cs: number; bh: Seg[]; ba: Seg[]};
/** local screen metrics of a text direction at the label: px per ring-degree along / across the text, and the CSS angle of the direction */
export type DirScale = (dirDeg: number) => {along: number; perp: number; angle: number};
export type Layout = {fontPx: number; rotDeg: number; lines: string[]; /** centre shift in degrees along the text direction (lon·cos(lat), lat space) */ shift: number; /** math angle (deg, y up) of the text direction */ dirDeg: number};
export type Rect = {x: number; y: number; w: number; h: number};

const OFFS = [0, 0.2, 0.4, 0.6, 0.8, 1.0, 1.3, 1.6, 2.0, 2.5, 3.0, 3.6]; // must match scripts/label_fit.ts
export const CHAR_EM = 1.02; // Montserrat 700 caps advance (~0.74em) + 0.28em tracking
export const LINE_H = 1.15;
const SAFETY = 0.86;

/** free segment for a text of perpendicular half-height `halfH` (deg): intersection of the band rows up to halfH */
const bandSeg = (band: Seg[], halfH: number): Seg => {
  // rows are cumulative (monotonic) → take the first row whose half-height covers the text (conservative, no interpolation)
  const need = halfH * 1.25 + 0.06;
  for (let i = 0; i < OFFS.length; i++) if (OFFS[i] >= need) return band[i];
  return [0, 0]; // taller than our tables → not allowed
};
const split2 = (label: string): string[] | null => {
  const w = label.split(' ');
  if (w.length < 2) return null;
  let best: string[] | null = null, bestLen = Infinity;
  for (let k = 1; k < w.length; k++) { const a = w.slice(0, k).join(' '), b = w.slice(k).join(' '); const m = Math.max(a.length, b.length); if (m < bestLen) { bestLen = m; best = [a, b]; } }
  return best;
};
/** largest font (px) such that the text block fits the band; returns font and the centre shift (ring degrees) */
const fitFont = (lines: string[], band: Seg[], along: number, perp: number): {f: number; shift: number} => {
  const chars = Math.max(...lines.map((l) => l.length));
  const segFor = (f: number) => bandSeg(band, (lines.length * LINE_H * f) / 2 / perp);
  const ok = (f: number) => { const [lo, hi] = segFor(f); return chars * CHAR_EM * f <= SAFETY * (hi - lo) * along; };
  let lo = 6, hi = 130;
  if (!ok(lo)) return {f: 0, shift: 0};
  for (let it = 0; it < 16; it++) { const mid = (lo + hi) / 2; if (ok(mid)) lo = mid; else hi = mid; }
  const [a, b] = segFor(lo);
  return {f: lo, shift: (a + b) / 2};
};

/** layout for a fitted name at the current view; `sc` gives the on-screen metrics of a direction (handles globe foreshortening
 *  and the tilt of parallels away from the view centre). null = too small to draw */
export const layoutFitted = (label: string, fit: Fit, sc: DirScale): Layout | null => {
  const two = split2(label);
  const cands: {score: number; f: number; rot: number; lines: string[]; shift: number; dir: number}[] = [];
  const H = sc(0);
  const h1 = fitFont([label], fit.bh, H.along, H.perp); cands.push({score: h1.f, f: h1.f, rot: H.angle, lines: [label], shift: h1.shift, dir: 0});
  if (two) { const h2 = fitFont(two, fit.bh, H.along, H.perp); cands.push({score: h2.f * 0.9, f: h2.f, rot: H.angle, lines: two, shift: h2.shift, dir: 0}); }
  if (Math.abs(fit.th) > 12) {
    const A = sc(fit.th);
    const a1 = fitFont([label], fit.ba, A.along, A.perp); cands.push({score: a1.f / 1.4, f: a1.f, rot: A.angle, lines: [label], shift: a1.shift, dir: fit.th});
    if (two) { const a2 = fitFont(two, fit.ba, A.along, A.perp); cands.push({score: (a2.f * 0.9) / 1.4, f: a2.f, rot: A.angle, lines: two, shift: a2.shift, dir: fit.th}); }
  }
  cands.sort((p, q) => q.score - p.score);
  const best = cands[0];
  const fontPx = Math.min(120, best.f);
  if (fontPx < 13) return null;
  let rot = best.rot; while (rot > 90) rot -= 180; while (rot <= -90) rot += 180; // never upside down
  return {fontPx, rotDeg: rot, lines: best.lines, shift: best.shift, dirDeg: best.dir};
};

/** geographic position of the text centre = pole + shift along the text direction */
export const shiftedLonLat = (lon: number, lat: number, L: Layout, cs: number): [number, number] => {
  const a = (L.dirDeg * Math.PI) / 180;
  return [lon + (L.shift * Math.cos(a)) / Math.max(0.2, cs), lat + L.shift * Math.sin(a)];
};
/** on-screen metrics of a ring-space direction at (lon,lat): px per ring-degree along and across, CSS angle (deg, y down) */
export const dirScaleAt = (project: (ll: [number, number]) => [number, number] | null, lon: number, lat: number, cs: number): DirScale => (dirDeg) => {
  const a = (dirDeg * Math.PI) / 180, e = 0.05;
  const p0 = project([lon, lat]), p1 = project([lon + (e * Math.cos(a)) / cs, lat + e * Math.sin(a)]), p2 = project([lon - (e * Math.sin(a)) / cs, lat + e * Math.cos(a)]);
  if (!p0 || !p1 || !p2) return {along: 0, perp: 1, angle: 0};
  return {along: Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) / e, perp: Math.hypot(p2[0] - p0[0], p2[1] - p0[1]) / e, angle: (Math.atan2(p1[1] - p0[1], p1[0] - p0[0]) * 180) / Math.PI};
};

/** axis-aligned screen rectangle of a laid-out name centred at (cx, cy), with padding */
export const layoutRect = (cx: number, cy: number, L: Layout, pad = 10): Rect => {
  const chars = Math.max(...L.lines.map((l) => l.length));
  const w = chars * CHAR_EM * L.fontPx, h = L.lines.length * LINE_H * L.fontPx;
  const a = (L.rotDeg * Math.PI) / 180, c = Math.abs(Math.cos(a)), s = Math.abs(Math.sin(a));
  const bw = w * c + h * s, bh = w * s + h * c;
  return {x: cx - bw / 2 - pad, y: cy - bh / 2 - pad, w: bw + 2 * pad, h: bh + 2 * pad};
};
/** the rotated text box corners + edge midpoints (screen px) — used for the inside-polygon test */
export const layoutCorners = (cx: number, cy: number, L: Layout): [number, number][] => {
  const chars = Math.max(...L.lines.map((l) => l.length));
  const w = chars * CHAR_EM * L.fontPx, h = L.lines.length * LINE_H * L.fontPx;
  const a = (L.rotDeg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  const pts: [number, number][] = [];
  for (const [u, v] of [[-1, -1], [1, -1], [1, 1], [-1, 1], [0, -1], [0, 1], [-1, 0], [1, 0], [0, 0], [-0.5, -1], [0.5, -1], [-0.5, 1], [0.5, 1]]) {
    const x = (u * w) / 2, y = (v * h) / 2;
    pts.push([cx + x * c - y * s, cy + x * s + y * c]);
  }
  return pts;
};
export const intersects = (a: Rect, b: Rect) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
/** translation that moves `r` out of every rect in `avoid` (tries the 4 axis directions per hit, up to 3 hops; smallest total move wins).
 *  Returns null when no clean spot exists within reach → the caller hides the element (never draw it on a name). */
export const pushOut = (r: Rect, avoid: Rect[]): [number, number] | null => {
  const hitOf = (x: number, y: number) => avoid.find((a) => intersects({...r, x: r.x + x, y: r.y + y}, a));
  if (!hitOf(0, 0)) return [0, 0];
  let best: [number, number] | null = null, bestD = Infinity;
  const search = (x: number, y: number, depth: number) => {
    const hit = hitOf(x, y);
    if (!hit) { const d = Math.hypot(x, y); if (d < bestD) { bestD = d; best = [x, y]; } return; }
    if (depth === 0) return;
    const cur = {...r, x: r.x + x, y: r.y + y};
    const moves: [number, number][] = [
      [hit.x + hit.w - cur.x + 3, 0], [hit.x - (cur.x + cur.w) - 3, 0], [0, hit.y + hit.h - cur.y + 3], [0, hit.y - (cur.y + cur.h) - 3],
    ];
    for (const [mx, my] of moves) { if (Math.hypot(x + mx, y + my) >= bestD) continue; search(x + mx, y + my, depth - 1); }
  };
  search(0, 0, 3);
  if (best && bestD > 260) return null; // too far from its true position → hide instead
  return best;
};

/** candidate callout box positions (centre) around the point: preferred offset first, then mirrored, then a ring of 8 directions × 2 radii */
export const calloutPlacements = (x: number, y: number, dx: number, dy: number, boxW: number, boxH: number, W = 1920, H = 1080) => {
  const place = (ox: number, oy: number) => {
    let bx = x + ox, by = y + oy;
    if (by - boxH / 2 < 96) by = y + Math.abs(oy);
    if (by + boxH / 2 > H - 60) by = y - Math.abs(oy);
    if (bx < boxW / 2 + 40) bx = boxW / 2 + 40; else if (bx > W - boxW / 2 - 40) bx = W - boxW / 2 - 40;
    return {bx, by, rect: {x: bx - boxW / 2 - 6, y: by - boxH / 2 - 6, w: boxW + 12, h: boxH + 12} as Rect};
  };
  const out = [place(dx, dy), place(-dx, dy), place(dx, -dy), place(-dx, -dy)];
  const R = Math.max(220, Math.hypot(dx, dy));
  for (const r of [R, R * 1.45]) for (let k = 0; k < 8; k++) { const a = (k * Math.PI) / 4 - Math.PI / 2; out.push(place(r * Math.cos(a), r * Math.sin(a))); }
  return out;
};
