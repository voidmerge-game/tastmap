/**
 * Automated layout QA — runs the film's label geometry for every sampled time without rendering:
 *   (A) every drawn country name lies fully inside its own polygon,
 *   (B) no drawn name overlaps another name, a card/badge/counter, a flag, a city label or a callout box.
 * Usage: npx tsx scripts/qa_check.ts [stepSeconds=0.5]   → prints violations, exit 1 if any.
 */
import fs from 'fs';
import {geoOrthographic, geoDistance} from 'd3-geo';
const pip = (x: number, y: number, r: number[][]) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, yi] = r[i], [xj, yj] = r[j]; if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
const containsLL = (g: any, lon: number, lat: number) => { const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates; for (const p of polys) if (pip(lon, lat, p[0]) && !p.slice(1).some((h: number[][]) => pip(lon, lat, h))) return true; return false; };
import * as topojson from 'topojson-client';
import {BIG, CITIES, FLAGS, FLAGS_EXTRA, CALLOUTS, CAM4} from '../src/events';
import {flagRectsAt} from '../src/lib/flags';
import {TOTAL} from '../src/timeline';
import {camWithDrift} from '../src/lib/anim';
import {layoutCorners, intersects, pushOut, calloutPlacements, type Rect} from '../src/lib/labels';
import {namesAt} from '../src/lib/names';
import {reservedAt} from '../src/lib/reserve';

const W = 1920, H = 1080, fps = 30;
const step = parseFloat(process.argv[2] ?? '0.5');
const FILES: Record<string, [string, string]> = {'1815': ['italy_1815', 'w1815'], '1871': ['italy_1871', 'w1871']};
const feats: Record<string, Record<string, any>> = {};
for (const [era, [file, obj]] of Object.entries(FILES)) {
  const topo = JSON.parse(fs.readFileSync(`public/data/${file}.json`, 'utf8'));
  feats[era] = {};
  for (const f of (topojson.feature(topo, topo.objects[obj]) as any).features) if (f.properties?.NAME) feats[era][f.properties.NAME] = f;
}
type V = {t: number; kind: string; what: string};
const viol: V[] = []; const hidden = new Map<string, number>();
let drawn = 0, frames = 0;
for (let t = 0; t <= TOTAL; t = +(t + step).toFixed(3)) {
  frames++;
  const frame = Math.round(t * fps);
  const cam = camWithDrift(CAM4, t);
  const proj = geoOrthographic().translate([W / 2, H / 2]).scale(cam.scale).rotate([-cam.lon, -cam.lat, 0]).clipAngle(90).precision(0.3);
  const visible = (lon: number, lat: number) => geoDistance([lon, lat], [cam.lon, cam.lat]) < Math.PI / 2 - 0.02;
  const reserved = reservedAt(t);
  // ---- names: exactly what the Names layer draws
  const drawnNames = namesAt(frame, fps, cam, proj);
  const names: {rect: Rect; text: string}[] = [];
  for (const n of drawnNames) {
    const b = n.ev;
    if (!b.fitKey) { viol.push({t, kind: 'NO_FIT', what: b.text}); continue; }
    const feat = feats[b.fitKey[0]]?.[b.fitKey[1]];
    if (!feat) { viol.push({t, kind: 'NO_POLY', what: `${b.text} -> ${b.fitKey.join('/')}`}); continue; }
    for (const [x, y] of layoutCorners(n.x, n.y, n.L)) {
      if (x < -2 || y < -2 || x > W + 2 || y > H + 2) continue; // invisible part
      const ll = proj.invert?.([x, y]);
      if (!ll || !containsLL(feat.geometry, ll[0], ll[1])) { viol.push({t, kind: 'OUTSIDE', what: `${b.text} (${n.L.lines.join('|')} ${n.L.fontPx.toFixed(0)}px rot ${n.L.rotDeg.toFixed(0)} shift ${n.L.shift.toFixed(2)}) corner (${x.toFixed(0)},${y.toFixed(0)})`}); break; }
    }
    for (const o of names) if (intersects(o.rect, n.rect)) viol.push({t, kind: 'NAME×NAME', what: `${b.text} × ${o.text}`});
    for (const r of reserved) if (intersects(n.rect, r) && t >= r.v0 && t <= r.v1 && n.vis > 0.05) viol.push({t, kind: 'NAME×CARD', what: `${b.text} × ${r.id} (vis ${n.vis.toFixed(2)})`});
    names.push({rect: n.rect, text: b.text}); drawn++;
  }
  // names that exist in the script but are not drawn now (for information)
  for (const b of BIG) {
    const at = Math.round(b.t * fps), until = b.until !== undefined ? Math.round(b.until * fps) : undefined;
    if (frame < at || (until !== undefined && frame > until) || !visible(b.lon, b.lat)) continue;
    const pp = proj([b.lon, b.lat]); if (!pp || pp[0] < 0 || pp[0] > W || pp[1] < 0 || pp[1] > H) continue; // only count when its anchor is on screen
    if (!drawnNames.some((n) => n.ev === b)) hidden.set(b.text, (hidden.get(b.text) ?? 0) + 1);
  }
  const avoid: Rect[] = [...names.map((n) => ({...n.rect, x: n.rect.x - 2, y: n.rect.y - 2, w: n.rect.w + 4, h: n.rect.h + 4})), ...reserved];
  // ---- flags first (shared geometry) → cities and callouts must also keep clear of them
  const flagRects = flagRectsAt(frame, fps, cam, proj as any, avoid);
  const avoidF: Rect[] = [...avoid, ...flagRects];
  // ---- cities (same side rule as Motion.tsx City)
  for (const c of CITIES) {
    const at = Math.round((c.t ?? 0) * fps), until = c.until ? Math.round(c.until * fps) : undefined;
    if (frame < at || (until !== undefined && frame > until) || !visible(c.lon, c.lat)) continue;
    if (cam.scale - (c.minScale ?? 1500) <= 0) continue;
    const dot = c.capital ? 16 : 11, fs = c.capital ? 26 : 22, tw = c.name.length * fs * 0.78, th = fs * 1.2;
    const p = proj([c.lon, c.lat]); if (!p) continue;
    const rectFor = (sd: string): Rect => sd === 'r' ? {x: p[0] + dot / 2 + 6, y: p[1] - th / 2, w: tw, h: th} : sd === 'l' ? {x: p[0] - dot / 2 - 6 - tw, y: p[1] - th / 2, w: tw, h: th} : sd === 'b' ? {x: p[0] - tw / 2, y: p[1] + dot / 2 + 4, w: tw, h: th} : {x: p[0] - tw / 2, y: p[1] - dot / 2 - 4 - th, w: tw, h: th};
    const side = c.side ?? 'r';
    const order = [side, ...['r', 'l', 'b', 't'].filter((x) => x !== side)];
    const found = order.find((sd) => !avoidF.some((a) => intersects(rectFor(sd), a)));
    if (!found) continue; // text hidden by the component
    for (const n of names) if (intersects(rectFor(found), n.rect)) viol.push({t, kind: 'CITY×NAME', what: `${c.name} × ${n.text}`});
    for (const fr of flagRects) if (intersects(rectFor(found), fr)) viol.push({t, kind: 'CITY×FLAG', what: `${c.name}`});
  }
  // ---- flags (FlagDrop geometry)
  for (const f of [...FLAGS, ...FLAGS_EXTRA]) {
    const at = Math.round(f.t * fps), until = f.until ? Math.round(f.until * fps) : undefined;
    if (frame < at || (until !== undefined && frame > until) || !visible(f.lon, f.lat)) continue;
    const k = Math.min(1.45, Math.max(0.7, Math.pow(cam.scale / 2600, 0.55)));
    const w = (f.w ?? 72) * k, h = (w * 2) / 3, bh = h + (f.label ? 24 * k : 0);
    const p = proj([f.lon, f.lat]); if (!p) continue;
    const r: Rect = {x: p[0] - w / 2 - 4, y: p[1] - bh / 2 - 4, w: w + 8, h: bh + 8};
    const mv = pushOut(r, avoid);
    if (!mv) { hidden.set('flag ' + f.power, (hidden.get('flag ' + f.power) ?? 0) + 1); continue; }
    const rr = {...r, x: r.x + mv[0], y: r.y + mv[1]};
    for (const n of names) if (intersects(rr, n.rect)) viol.push({t, kind: 'FLAG×NAME', what: `${f.power} flag @${f.lon},${f.lat} × ${n.text}`});
  }
  // ---- callouts
  for (const c of CALLOUTS) {
    if (frame < Math.round(c.t * fps) || frame > Math.round(c.until * fps) || !visible(c.lon, c.lat)) continue;
    const p = proj([c.lon, c.lat]); if (!p) continue;
    const fs1 = 32, fs2 = 26, boxW = 48 + Math.max(c.text.length * fs1 * 0.66, (c.sub ?? '').length * fs2 * 0.62), boxH = c.sub ? 104 : 66;
    const dx = c.dx ?? 0, dy = c.dy ?? -270, [x, y] = p;
    const cands = calloutPlacements(x, y, dx, dy, boxW, boxH, W, H).map((c) => c.rect);
    if (x < 30 || x > W - 30 || y < 30 || y > H - 30 || reserved.some((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h)) { hidden.set('callout ' + c.text, (hidden.get('callout ' + c.text) ?? 0) + 1); continue; }
    const pick = cands.find((r) => !avoidF.some((a) => intersects(r, a)));
    if (!pick) { hidden.set('callout ' + c.text, (hidden.get('callout ' + c.text) ?? 0) + 1); continue; }
    for (const n of names) if (intersects(pick, n.rect)) viol.push({t, kind: 'CALLOUT×NAME', what: `${c.text} × ${n.text}`});
    for (const fr of flagRects) if (intersects(pick, fr)) viol.push({t, kind: 'CALLOUT×FLAG', what: `${c.text}`});
  }
}
const byKind: Record<string, number> = {};
for (const v of viol) byKind[v.kind] = (byKind[v.kind] ?? 0) + 1;
console.log(`QA: ${frames} samples (step ${step}s), ${drawn} name-draws checked`);
console.log('violations by kind:', byKind);
const seen = new Set<string>();
for (const v of viol) { const k = `${v.kind} ${v.what.split(' corner')[0]}`; if (seen.has(k)) continue; seen.add(k); console.log(`  [${v.kind}] t=${v.t.toFixed(1)}s ${v.what}`); }
console.log('hidden (not drawn, by rule):', Object.fromEntries([...hidden.entries()].map(([k, n]) => [k, +(n * step).toFixed(1) + 's'])));
fs.writeFileSync('qa_report.json', JSON.stringify({step, frames, drawn, byKind, viol, hidden: [...hidden.entries()]}, null, 1));
process.exit(viol.length ? 1 : 0);
