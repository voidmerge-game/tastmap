/** Motion-graphics layer in the style of broadcast history documentaries:
 *  - BigLabel: large, letter-spaced, optionally rotated region names ("F R A N C E")
 *  - Callout: black plate with white caps + animated pointer line to a map point
 *  - Route: animated great-circle arrow (expeditions, campaigns, fleets)
 *  - City: dot + small label, only shown when the camera is close enough
 */
import {intersects, calloutPlacements, LINE_H, type Rect} from '../lib/labels';
import {namesAt} from '../lib/names';
import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {reservedAt} from '../lib/reserve';
import {flagRectsAt} from '../lib/flags';
import {geoInterpolate} from 'd3-geo';
import {useMap, Marker, AvoidCtx} from './WorldMap';
import {FONT, C, W, H} from '../theme';
import {clamp01, easeOutCubic} from '../lib/anim';

const fadeIO = (f: number, len: number, a = 10, b = 12) => Math.min(clamp01(f / a), clamp01((len - f) / b));

/** Collision rectangles for this frame: all drawn country names (+ cards/badge/counter). Everything inside keeps clear of them. */
export const LabelGuard: React.FC<{fps: number; children: React.ReactNode}> = ({fps, children}) => {
  const frame = useCurrentFrame();
  const {cam, projection} = useMap();
  const rects: Rect[] = namesAt(frame, fps, cam, projection).map((n) => ({x: n.rect.x - 2, y: n.rect.y - 2, w: n.rect.w + 4, h: n.rect.h + 4}));
  for (const r of reservedAt(frame / fps)) rects.push(r);
  const flags = flagRectsAt(frame, fps, cam, (ll) => projection(ll) as [number, number] | null, rects);
  return <AvoidCtx.Provider value={rects}><FlagCtx.Provider value={flags}>{children}</FlagCtx.Provider></AvoidCtx.Provider>;
};
/** rectangles of the flags drawn this frame (cities and callouts keep clear of them; flags themselves use AvoidCtx) */
export const FlagCtx = React.createContext<Rect[]>([]);

/** The country-name layer. One decision function (lib/names.ts) → always inside the polygon, never overlapping anything. */
export const Names: React.FC<{fps: number; light: Set<string>}> = ({fps, light}) => {
  const frame = useCurrentFrame();
  const {cam, projection} = useMap();
  const names = namesAt(frame, fps, cam, projection);
  const track = 0.28;
  return (
    <>
      {names.map((n) => {
        const isLight = light.has(n.ev.text);
        return (
          <div key={`${n.ev.text}@${n.ev.t}`} style={{position: 'absolute', left: n.x, top: n.y, transform: 'translate(-50%, -50%)', pointerEvents: 'none'}}>
            <div
              style={{
                opacity: n.vis, transform: `rotate(${n.L.rotDeg}deg)`, transformOrigin: '50% 50%', whiteSpace: 'nowrap', textAlign: 'center',
                fontFamily: FONT.map, fontWeight: 700, fontSize: n.L.fontPx, letterSpacing: `${track}em`, textTransform: 'uppercase', lineHeight: LINE_H,
                color: isLight ? 'rgba(246,243,238,0.97)' : 'rgba(14,10,8,0.9)',
                textShadow: isLight ? '0 2px 2px rgba(0,0,0,0.55), 0 0 14px rgba(0,0,0,0.5)' : '0 1px 0 rgba(255,255,255,0.25), 0 0 10px rgba(255,240,225,0.35)',
                paddingLeft: `${track}em`,
              }}
            >
              {n.L.lines.map((l, i) => <div key={i}>{l}</div>)}
            </div>
          </div>
        );
      })}
    </>
  );
};

/* ---------- City dot ---------- */
export const City: React.FC<{lon: number; lat: number; name: string; at: number; until?: number; minScale?: number; capital?: boolean; side?: 'r' | 'l' | 'b' | 't'}> = ({
  lon, lat, name, at, until, minScale = 1500, capital = false, side = 'r',
}) => {
  const frame = useCurrentFrame();
  const {cam, projection, avoid: avoid0} = useMap();
  const flags = React.useContext(FlagCtx);
  const avoid = React.useMemo(() => [...avoid0, ...flags], [avoid0, flags]);
  if (frame < at || (until !== undefined && frame > until)) return null;
  const vis = clamp01((cam.scale - minScale) / 250);
  if (vis <= 0) return null;
  const op = vis * (until !== undefined ? fadeIO(frame - at, until - at, 10, 10) : clamp01((frame - at) / 10));
  const dot = capital ? 16 : 11;
  const fs = capital ? 26 : 22;
  const tw = name.length * fs * 0.78, th = fs * 1.2;
  // pick the first side (preferred first) whose text box does not touch a country name
  const p = projection([lon, lat]) ?? [0, 0];
  const rectFor = (sd: 'r' | 'l' | 'b' | 't') =>
    sd === 'r' ? {x: p[0] + dot / 2 + 6, y: p[1] - th / 2, w: tw, h: th} :
    sd === 'l' ? {x: p[0] - dot / 2 - 6 - tw, y: p[1] - th / 2, w: tw, h: th} :
    sd === 'b' ? {x: p[0] - tw / 2, y: p[1] + dot / 2 + 4, w: tw, h: th} : {x: p[0] - tw / 2, y: p[1] - dot / 2 - 4 - th, w: tw, h: th};
  const order: ('r' | 'l' | 'b' | 't')[] = [side, ...(['r', 'l', 'b', 't'] as const).filter((x) => x !== side)];
  const found = order.find((sd) => !avoid.some((a) => intersects(rectFor(sd), a)));
  const use = found ?? side;
  const dotRect = {x: p[0] - dot, y: p[1] - dot, w: dot * 2, h: dot * 2};
  if (avoid.some((a) => intersects(dotRect, a))) return null; // the point itself is covered (card/name) -> skip this city for now
  const showText = !!found;
  const pos: React.CSSProperties =
    use === 'r' ? {left: dot + 6, top: '50%', transform: 'translateY(-50%)'} :
    use === 'l' ? {right: dot + 6, top: '50%', transform: 'translateY(-50%)'} :
    use === 'b' ? {top: dot + 4, left: '50%', transform: 'translateX(-50%)'} : {bottom: dot + 4, left: '50%', transform: 'translateX(-50%)'};
  return (
    <Marker lon={lon} lat={lat}>
      <div style={{position: 'relative', width: dot, height: dot, opacity: op}}>
        <div style={{width: dot, height: dot, borderRadius: capital ? 1 : dot, background: '#fff', boxShadow: '0 0 0 2.5px rgba(10,8,6,0.9), 0 2px 5px rgba(0,0,0,0.6)', border: capital ? '3px solid #141210' : undefined, boxSizing: 'border-box'}} />
        {showText && <div style={{position: 'absolute', whiteSpace: 'nowrap', fontFamily: FONT.map, fontSize: fs, letterSpacing: 2.5, color: '#fff', textTransform: 'uppercase', textShadow: '0 1px 2px rgba(0,0,0,0.9), 0 0 10px rgba(0,0,0,0.8)', fontWeight: 600, ...pos}}>
          {name}
        </div>}
      </div>
    </Marker>
  );
};

/* ---------- Callout (v5, measured from the reference): box wipes open L→R with motion blur (5 f), the black stem grows
 *  to the point (4 f), text types in at ~30 chars/s (second line after the first), white pulse rings expand from the point ---------- */
export const Callout: React.FC<{
  lon: number; lat: number; text: string; sub?: string; at: number; until: number;
  /** offset of the box centre from the point, in px (default: straight above) */
  dx?: number; dy?: number;
}> = ({lon, lat, text, sub, at, until, dx = 0, dy = -250}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const {projection, visible, avoid: avoid0} = useMap();
  const flags = React.useContext(FlagCtx);
  const avoid = React.useMemo(() => [...avoid0, ...flags], [avoid0, flags]);
  if (frame < at || frame > until || !visible(lon, lat)) return null;
  const p = projection([lon, lat]);
  if (!p) return null;
  // v6: the anchor itself must be on screen and not under a card / badge — otherwise the callout is dropped
  if (p[0] < 30 || p[0] > W - 30 || p[1] < 30 || p[1] > H - 30) return null;
  if (reservedAt(frame / fps).some((r) => p[0] >= r.x && p[0] <= r.x + r.w && p[1] >= r.y && p[1] <= r.y + r.h)) return null;
  const f = frame - at;
  const op = fadeIO(f, until - at, 2, 10);
  const wipe = easeOutCubic(clamp01(f / 5));                 // box reveal
  const grow = easeOutCubic(clamp01((f - 4) / 5));           // stem
  const n1 = Math.min(text.length, Math.max(0, Math.floor((f - 5) * 1.05)));
  const n2 = sub ? Math.min(sub.length, Math.max(0, Math.floor((f - 5 - text.length / 1.05 - 3) * 1.05))) : 0;
  const [x, y] = p;
  const fs1 = 32, fs2 = 26;
  const boxW = 48 + Math.max(text.length * fs1 * 0.66, (sub ?? '').length * fs2 * 0.62);
  const boxH = sub ? 104 : 66;
  // candidate placements (shared with the QA checker); the first whose box touches no name/card/badge wins
  const cands = calloutPlacements(x, y, dx, dy, boxW, boxH, W, H);
  const pick = cands.find((c) => !avoid.some((a) => intersects(c.rect, a)));
  if (!pick) return null;
  const {bx, by} = pick;
  // stem from the nearest box edge to the point
  const ang = Math.atan2(y - by, x - bx);
  const edge = Math.min(Math.abs((boxW / 2) / Math.max(1e-3, Math.cos(ang))), Math.abs((boxH / 2) / Math.max(1e-3, Math.sin(ang))));
  const sx = bx + Math.cos(ang) * (edge - 2), sy = by + Math.sin(ang) * (edge - 2);
  const full = Math.hypot(x - sx, y - sy);
  const len = Math.max(0, (full - 12) * grow);
  const shaft = 18, headW = 64, headL = 54;
  const tipX = sx + Math.cos(ang) * len, tipY = sy + Math.sin(ang) * len;
  const baseL = Math.max(0, len - headL);
  const nx = -Math.sin(ang), ny = Math.cos(ang);
  const P = (dAlong: number, dSide: number) => `${(sx + Math.cos(ang) * dAlong + nx * dSide).toFixed(1)},${(sy + Math.sin(ang) * dAlong + ny * dSide).toFixed(1)}`;
  const poly = `${P(0, -shaft / 2)} ${P(baseL, -shaft / 2)} ${P(baseL, -headW / 2)} ${tipX.toFixed(1)},${tipY.toFixed(1)} ${P(baseL, headW / 2)} ${P(baseL, shaft / 2)} ${P(0, shaft / 2)}`;
  const rings = f >= 8 ? [0, 7].map((o) => ((f - 8 + o) % 14) / 14) : [];
  return (
    <div style={{position: 'absolute', inset: 0, pointerEvents: 'none', opacity: op}}>
      <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
        {rings.map((r, i) => (
          <circle key={i} cx={x} cy={y} r={8 + r * 46} fill="none" stroke="#fff" strokeWidth={2.5 * (1 - r) + 0.5} opacity={0.9 * (1 - r)} />
        ))}
        {len > 4 && (
          <g style={{filter: 'drop-shadow(0 5px 7px rgba(0,0,0,0.5))'}}>
            <polygon points={poly} fill="#000" stroke="#ffffff" strokeWidth={2.5} strokeLinejoin="round" />
          </g>
        )}
        <circle cx={x} cy={y} r={5.5} fill="#fff" stroke="#000" strokeWidth={2.5} />
      </svg>
      <div
        style={{
          position: 'absolute', left: bx - boxW / 2, top: by - boxH / 2, width: boxW, height: boxH,
          clipPath: `inset(0 ${(1 - wipe) * 100}% 0 0)`, filter: wipe < 1 ? `blur(${(1 - wipe) * 7}px)` : undefined,
          background: '#000', boxShadow: '0 10px 26px rgba(0,0,0,0.55)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
        }}
      >
        <div style={{fontFamily: FONT.map, fontWeight: 700, fontSize: fs1, letterSpacing: 1, color: '#fff', textTransform: 'uppercase', lineHeight: 1.15, whiteSpace: 'pre'}}>{text.slice(0, n1)}</div>
        {sub && <div style={{fontFamily: FONT.map, fontWeight: 600, fontSize: fs2, letterSpacing: 1, color: '#fff', textTransform: 'uppercase', lineHeight: 1.2, marginTop: 2, whiteSpace: 'pre', minHeight: fs2 * 1.2}}>{sub.slice(0, n2)}</div>}
      </div>
    </div>
  );
};

/* ---------- Animated route arrow along great circles ---------- */
export const Route: React.FC<{
  pts: [number, number][]; at: number; until: number; color?: string; width?: number; dashed?: boolean; drawDur?: number; head?: boolean;
}> = ({pts, at, until, color = '#ffffff', width = 5, dashed = false, drawDur = 45, head = true}) => {
  const frame = useCurrentFrame();
  const {projection, visible} = useMap();
  if (frame < at || frame > until || pts.length < 2) return null;
  const f = frame - at;
  const op = fadeIO(f, until - at, 6, 14);
  const prog = easeOutCubic(clamp01(f / drawDur));
  // densify along great circles
  const dense: [number, number][] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const ip = geoInterpolate(pts[i], pts[i + 1]);
    const n = 24;
    for (let k = 0; k < n; k++) dense.push(ip(k / n));
  }
  dense.push(pts[pts.length - 1]);
  const total = dense.length - 1;
  const upto = Math.max(1, Math.floor(total * prog));
  const proj = dense.slice(0, upto + 1).filter((q) => visible(q[0], q[1])).map((q) => projection(q)).filter(Boolean) as [number, number][];
  if (proj.length < 2) return null;
  const d = proj.map((q, i) => `${i ? 'L' : 'M'}${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(' ');
  // arrow head direction from last two points
  const [ax, ay] = proj[proj.length - 1];
  const [bx, by] = proj[Math.max(0, proj.length - 4)];
  const ang = (Math.atan2(ay - by, ax - bx) * 180) / Math.PI;
  const hs = Math.max(20, width * 3.4);
  return (
    <svg width={W} height={H} style={{position: 'absolute', inset: 0, pointerEvents: 'none', opacity: op}}>
      <path d={d} fill="none" stroke="rgba(0,0,0,0.55)" strokeWidth={width + 10} strokeLinecap="round" strokeLinejoin="round" style={{filter: 'blur(4px)'}} />
      <path d={d} fill="none" stroke="rgba(0,0,0,0.85)" strokeWidth={width + 4} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={dashed ? `${width * 3} ${width * 2.2}` : undefined} />
      <path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={dashed ? `${width * 3} ${width * 2.2}` : undefined} />
      {head && (
        <g transform={`translate(${ax},${ay}) rotate(${ang})`}>
          <path d={`M${hs * 0.6},0 L${-hs * 0.9},${-hs * 0.75} L${-hs * 0.45},0 L${-hs * 0.9},${hs * 0.75} Z`} fill={color} stroke="rgba(0,0,0,0.8)" strokeWidth={2} strokeLinejoin="round" />
        </g>
      )}
    </svg>
  );
};

/* ---------- Pulse marker (battle / event) ---------- */
export const Pulse: React.FC<{lon: number; lat: number; at: number; until: number; color?: string}> = ({lon, lat, at, until, color = '#ffffff'}) => {
  const frame = useCurrentFrame();
  const {projection, visible, avoid} = useMap();
  if (frame < at || frame > until || !visible(lon, lat)) return null;
  const p = projection([lon, lat]);
  if (!p) return null;
  const f = frame - at;
  const op = fadeIO(f, until - at, 6, 12);
  const rings = [0, 14, 28].map((o) => ((f + o) % 42) / 42);
  return (
    <svg width={W} height={H} style={{position: 'absolute', inset: 0, pointerEvents: 'none', opacity: op}}>
      {rings.map((r, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={6 + r * 44} fill="none" stroke={color} strokeWidth={3 * (1 - r) + 0.5} opacity={1 - r} />
      ))}
      <circle cx={p[0]} cy={p[1]} r={7} fill={color} stroke="#000" strokeWidth={2} />
    </svg>
  );
};
