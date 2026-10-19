/**
 * Fit country-name labels to their polygons: pole of inaccessibility (anchor), principal axis (rotation),
 * free length along the axis and across it (for the font size). Output: src/label_pos.json
 */
import * as fs from 'fs';
import * as topojson from 'topojson-client';

type Ring = [number, number][];
const load = (file: string, obj: string) => {
  const topo = JSON.parse(fs.readFileSync(`public/data/${file}.json`, 'utf8'));
  return (topojson.feature(topo, topo.objects[obj]) as any).features as any[];
};
const ringArea = (r: Ring) => { let a = 0; for (let i = 0, n = r.length; i < n; i++) { const [x1, y1] = r[i], [x2, y2] = r[(i + 1) % n]; a += x1 * y2 - x2 * y1; } return Math.abs(a) / 2; };
const inside = (x: number, y: number, r: Ring) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, yi] = r[i], [xj, yj] = r[j]; if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
const segDist = (x: number, y: number, r: Ring) => { let d = Infinity; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, yi] = r[i], [xj, yj] = r[j]; const dx = xj - xi, dy = yj - yi; const l2 = dx * dx + dy * dy || 1e-12; let t = ((x - xi) * dx + (y - yi) * dy) / l2; t = Math.max(0, Math.min(1, t)); const px = xi + t * dx - x, py = yi + t * dy - y; d = Math.min(d, px * px + py * py); } return Math.sqrt(d); };

const OFFS = [0, 0.2, 0.4, 0.6, 0.8, 1.0, 1.3, 1.6, 2.0, 2.5, 3.0, 3.6]; // must match src/lib/labels.ts
const fit = (geom: any) => {
  const polys: Ring[][] = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
  let bestP: Ring[] | null = null, bestA = 0;
  for (const p of polys) { const a = ringArea(p[0]); if (a > bestA) { bestA = a; bestP = p; } }
  if (!bestP) return null;
  const best = bestP[0];
  const latc = best.reduce((s, p) => s + p[1], 0) / best.length;
  const cs = Math.cos((latc * Math.PI) / 180);
  const ring: Ring = best.map(([lo, la]) => [lo * cs, la]);
  const holes: Ring[] = bestP.slice(1).map((h) => h.map(([lo, la]) => [lo * cs, la] as [number, number]));
  // Candidate centers must sit inside the matched historical polygon, including when a feature contains holes.
  const insideP = (x: number, y: number) => inside(x, y, ring) && !holes.some((h) => inside(x, y, h));
  const xs = ring.map((p) => p[0]), ys = ring.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const N = 70; const P: [number, number][] = [];
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { const x = x0 + ((i + 0.5) / N) * (x1 - x0), y = y0 + ((j + 0.5) / N) * (y1 - y0); if (insideP(x, y)) P.push([x, y]); }
  if (P.length < 4) return null;
  const distAll = (x: number, y: number) => Math.min(segDist(x, y, ring), ...holes.map((h) => segDist(x, y, h)));
  // pole of inaccessibility
  let pole = P[0], pd = -1;
  for (const [x, y] of P) { const d = distAll(x, y); if (d > pd) { pd = d; pole = [x, y]; } }
  const step = Math.max(x1 - x0, y1 - y0) / N;
  for (let i = -4; i <= 4; i++) for (let j = -4; j <= 4; j++) { const x = pole[0] + (i * step) / 4, y = pole[1] + (j * step) / 4; if (insideP(x, y)) { const d = distAll(x, y); if (d > pd) { pd = d; pole = [x, y]; } } }
  // PCA
  const mx = P.reduce((s, p) => s + p[0], 0) / P.length, my = P.reduce((s, p) => s + p[1], 0) / P.length;
  let sxx = 0, syy = 0, sxy = 0;
  for (const [x, y] of P) { sxx += (x - mx) ** 2; syy += (y - my) ** 2; sxy += (x - mx) * (y - my); }
  const th = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  const l1 = (sxx + syy) / 2 + Math.sqrt(((sxx - syy) / 2) ** 2 + sxy ** 2), l2 = (sxx + syy) / 2 - Math.sqrt(((sxx - syy) / 2) ** 2 + sxy ** 2);
  const ratio = Math.sqrt(l1 / Math.max(l2, 1e-9));
  // free segment through a point p along direction ang: [lo, hi] (signed distances, [0,0] if p is outside)
  const ST = 0.03; // degrees
  const segFrom = (px: number, py: number, ang: number): [number, number] => {
    if (!insideP(px, py)) return [0, 0];
    const u = [Math.cos(ang), Math.sin(ang)]; const out: number[] = [];
    for (const sgn of [1, -1]) { let d = 0; while (d < 120) { d += ST; if (!insideP(px + sgn * u[0] * d, py + sgn * u[1] * d)) break; } out.push(d - ST); }
    return [-out[1], out[0]];
  };
  const rayFrom = (px: number, py: number, ang: number) => { const [lo, hi] = segFrom(px, py, ang); return hi - lo; };
  // rows[i] = free segment common to ALL rays at perpendicular offsets |o| ≤ OFFS[i] (cast every 0.06°) → a text block of that
  // half-height placed on the segment is inside everywhere; cumulative so rows shrink monotonically
  const band = (ang: number) => {
    const nx = -Math.sin(ang), ny = Math.cos(ang);
    const rows: [number, number][] = [];
    let lo = -Infinity, hi = Infinity, o = 0;
    for (const off of OFFS) {
      while (o <= off + 1e-9) {
        for (const sg of o === 0 ? [0] : [-o, o]) { const [a, b] = segFrom(pole[0] + nx * sg, pole[1] + ny * sg, ang); lo = Math.max(lo, a); hi = Math.min(hi, b); }
        o = +(o + 0.06).toFixed(4);
      }
      rows.push([+lo.toFixed(2), +Math.max(lo, hi).toFixed(2)]);
    }
    return rows;
  };
  let a = (th * 180) / Math.PI; // math angle (y up); CSS rotation = -a
  while (a > 90) a -= 180; while (a <= -90) a += 180;
  const L0 = rayFrom(pole[0], pole[1], 0), Lv = rayFrom(pole[0], pole[1], Math.PI / 2), Laxis = rayFrom(pole[0], pole[1], th), Lperp = rayFrom(pole[0], pole[1], th + Math.PI / 2);
  return {lon: +(pole[0] / cs).toFixed(3), lat: +pole[1].toFixed(3), cs: +cs.toFixed(4), th: +a.toFixed(1), L0: +L0.toFixed(2), Lv: +Lv.toFixed(2), La: +Laxis.toFixed(2), Lp: +Lperp.toFixed(2), ratio: +ratio.toFixed(2), r: +pd.toFixed(2), bh: band(0), ba: band(th)};
};

const out: Record<string, Record<string, any>> = {};
for (const [file, obj, key] of [['italy_1815', 'w1815', '1815'], ['italy_1871', 'w1871', '1871']] as const) {
  out[key] = {};
  for (const f of load(file, obj)) { const n = f.properties?.NAME; if (!n) continue; const r = fit(f.geometry); if (r) out[key][n] = r; }
}
fs.writeFileSync('src/label_pos.json', JSON.stringify(out));
for (const k of Object.keys(out)) console.log(k, Object.keys(out[k]).length, 'labels');
for (const n of ['Kingdom of Sardinia','Lombardy–Venetia','Duchy of Parma','Duchy of Modena','Grand Duchy of Tuscany','Papal States','Kingdom of the Two Sicilies','Austrian Empire','Kingdom of Italy']) console.log(n, Boolean(out['1815'][n]||out['1871'][n]));
