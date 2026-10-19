import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {FONT, C} from '../theme';
import {YEARS} from '../events';
import {clamp01, easeOutCubic} from '../lib/anim';

/* =====================================================================================
 *  v6 extras: 3D title, live timeline ribbon, 1914 share chart, filmic grade
 * ===================================================================================== */

/* ---------- 3D extruded title with a light sweep ---------- */
export const Title3D: React.FC<{title: string; sub: string; at: number; until: number}> = ({title, sub, at, until}) => {
  const frame = useCurrentFrame();
  if (frame < at || frame > until) return null;
  const f = frame - at, len = until - at;
  const op = Math.min(1, f / 18, (len - f) / 24);
  const e = easeOutCubic(clamp01(f / 46));
  const tilt = 22 - 16 * e, spread = 11 - 6 * e, scale = 0.9 + 0.1 * e;
  const sweep = clamp01((f - 30) / 70); // highlight travels across the letters once
  const lineW = 560 * easeOutCubic(clamp01((f - 26) / 40));
  const depth = 14;
  const shadows: string[] = [];
  for (let i = 1; i <= depth; i++) shadows.push(`0 ${i}px 0 rgb(${96 - i * 4},${72 - i * 3},${30 - i})`);
  shadows.push('0 26px 40px rgba(0,0,0,0.85)');
  const base: React.CSSProperties = {fontFamily: FONT.title, fontWeight: 700, fontSize: 98, letterSpacing: spread, lineHeight: 1.05, whiteSpace: 'nowrap'};
  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', opacity: Math.max(0, op)}}>
      <div style={{textAlign: 'center', transform: `perspective(1100px) rotateX(${tilt}deg) scale(${scale})`, transformOrigin: '50% 60%'}}>
        <div style={{position: 'relative'}}>
          {/* extrusion */}
          <div style={{...base, color: '#b08d4a', textShadow: shadows.join(',')}}>{title}</div>
          {/* gold face with a moving highlight */}
          <div
            style={{
              ...base, position: 'absolute', left: 0, top: 0, width: '100%',
              backgroundImage: `linear-gradient(100deg, #e9d7a6 0%, #c9a75e ${sweep * 140 - 30}%, #fff6d8 ${sweep * 140 - 18}%, #caa75c ${sweep * 140 - 6}%, #e2c98b 100%)`,
              WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
            }}
          >
            {title}
          </div>
        </div>
        <div style={{height: 3, width: lineW, background: C.gold, margin: '22px auto 16px', boxShadow: '0 0 18px rgba(214,179,106,0.6)'}} />
        <div style={{fontFamily: FONT.label, fontSize: 34, color: C.gold, letterSpacing: 9, textTransform: 'uppercase', opacity: clamp01((f - 30) / 20), textShadow: '0 4px 18px rgba(0,0,0,0.9)'}}>{sub}</div>
      </div>
    </AbsoluteFill>
  );
};

/* ---------- live timeline ribbon 1870 → 1914 (bottom of the frame) ---------- */
export const RIBBON = {x: 560, y: 1008, w: 800, h: 62, y0: 1815, y1: 1871};
const yearValue = (y: string): number | null => (y === 'TODAY' ? null : y === '1890s' ? 1895 : parseInt(y, 10));
/** current (eased) position on the ribbon, in years; null while the badge shows TODAY */
export const ribbonYear = (t: number): number | null => {
  let i = -1;
  for (let k = 0; k < YEARS.length; k++) if (t >= YEARS[k][0]) i = k;
  if (i < 0) return RIBBON.y0;
  const cur = yearValue(YEARS[i][1]);
  if (cur === null) return null;
  const prev = i > 0 ? yearValue(YEARS[i - 1][1]) ?? cur : RIBBON.y0;
  const p = easeOutCubic(clamp01((t - YEARS[i][0]) / 0.9));
  return prev + (cur - prev) * p;
};
export const TimelineRibbon: React.FC<{t: number; from: number; until: number}> = ({t, from, until}) => {
  if (t < from - 0.5 || t > until + 0.6) return null;
  const yv = ribbonYear(t);
  const op = Math.min(1, (t - (from - 0.5)) / 0.8, (until + 0.6 - t) / 0.6) * (yv === null ? 0 : 1);
  if (op <= 0) return null;
  const X = (y: number) => RIBBON.x + ((y - RIBBON.y0) / (RIBBON.y1 - RIBBON.y0)) * RIBBON.w;
  const yr = yv ?? RIBBON.y0;
  const mx = X(Math.min(RIBBON.y1, Math.max(RIBBON.y0, yr)));
  const ticks: number[] = [];
  for (let y = RIBBON.y0; y <= RIBBON.y1; y += 1) ticks.push(y);
  const ly = RIBBON.y + 30;
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, pointerEvents: 'none', opacity: op}}>
      <div style={{position: 'absolute', left: RIBBON.x - 60, top: RIBBON.y - 6, width: RIBBON.w + 120, height: RIBBON.h + 10, background: 'linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.55) 6%, rgba(0,0,0,0.55) 94%, rgba(0,0,0,0) 100%)', borderRadius: 8}} />
      <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0}}>
        <line x1={RIBBON.x} y1={ly} x2={RIBBON.x + RIBBON.w} y2={ly} stroke="rgba(245,241,232,0.35)" strokeWidth={2} />
        <line x1={RIBBON.x} y1={ly} x2={mx} y2={ly} stroke={C.gold} strokeWidth={3} />
        {ticks.map((y) => {
          const big = y % 10 === 0, mid = y % 5 === 0;
          return <line key={y} x1={X(y)} y1={ly - (big ? 10 : mid ? 6 : 3)} x2={X(y)} y2={ly + (big ? 10 : mid ? 6 : 3)} stroke={y <= yr ? C.gold : 'rgba(245,241,232,0.5)'} strokeWidth={big ? 2 : 1} />;
        })}
        {/* marker */}
        <circle cx={mx} cy={ly} r={11} fill={C.gold} opacity={0.25} />
        <circle cx={mx} cy={ly} r={6} fill="#fff6d8" stroke={C.gold} strokeWidth={2} />
      </svg>
      {ticks.filter((y) => y % 10 === 0 || y === RIBBON.y1).map((y) => (
        <div key={y} style={{position: 'absolute', left: X(y) - 40, top: ly + 14, width: 80, textAlign: 'center', fontFamily: FONT.label, fontSize: 17, letterSpacing: 2, color: y <= yr ? C.gold : 'rgba(245,241,232,0.65)'}}>{y}</div>
      ))}
      <div style={{position: 'absolute', left: mx - 60, top: ly - 36, width: 120, textAlign: 'center', fontFamily: FONT.map, fontWeight: 700, fontSize: 20, letterSpacing: 2, color: '#fff6d8', textShadow: '0 1px 2px #000, 0 2px 10px rgba(0,0,0,0.9)'}}>{Math.round(yr)}</div>
    </div>
  );
};

/* ---------- area shares of the Italian polities in 1815; spherical areas measured from italy_1815.json ---------- */
export const SHARES_1914: {power: string; label: string; pct: number; color: string}[] = [
  {power: 'twosicilies', label: 'TWO SICILIES', pct: 33.1, color: '#b47a70'},
  {power: 'sardinia', label: 'SARDINIA-PIEDMONT', pct: 24.3, color: '#6f93a8'},
  {power: 'austria', label: 'LOMBARDY–VENETIA', pct: 16.1, color: '#8c8a7a'},
  {power: 'papal', label: 'PAPAL STATES', pct: 15.4, color: '#d9c27a'},
  {power: 'duchies', label: 'TUSCANY', pct: 7.2, color: '#86a06c'},
  {power: 'duchies', label: 'PARMA', pct: 2.0, color: '#9da87a'},
  {power: 'duchies', label: 'MODENA', pct: 2.0, color: '#7f9466'},
];
export const CHART = {x: 90, y: 760, w: 760, h: 210};
export const ShareChart: React.FC<{t: number; from: number; until: number}> = ({t, from, until}) => {
  if (t < from || t > until) return null;
  const op = Math.min(1, (t - from) / 0.5, (until - t) / 0.5);
  const grow = easeOutCubic(clamp01((t - from - 0.3) / 2.2));
  const barW = CHART.w - 20, barH = 44;
  let acc = 0;
  const segs = SHARES_1914.map((s) => { const x0 = acc; acc += s.pct; return {...s, x0}; });
  const shown = grow * 100;
  return (
    <div style={{position: 'absolute', left: CHART.x, top: CHART.y, width: CHART.w, height: CHART.h, opacity: Math.max(0, op)}}>
      <div style={{position: 'absolute', inset: 0, background: 'rgba(8,8,10,0.72)', borderRadius: 6, boxShadow: '0 12px 30px rgba(0,0,0,0.5)'}} />
      <div style={{position: 'absolute', left: 10, top: 12, fontFamily: FONT.label, fontSize: 21, letterSpacing: 4, color: C.gold}}>ITALY IN 1815 — SHARE OF PENINSULA AREA</div>
      <div style={{position: 'absolute', left: 10, top: 48, width: barW, height: barH, background: 'rgba(255,255,255,0.08)', overflow: 'hidden'}}>
        {segs.map((s) => {
          const w = Math.max(0, Math.min(s.pct, shown - s.x0)) / 100 * barW;
          return <div key={s.power} style={{position: 'absolute', left: (s.x0 / 100) * barW, top: 0, width: w, height: barH, background: s.color, boxShadow: 'inset -1px 0 0 rgba(0,0,0,0.5)'}} />;
        })}
      </div>
      {segs.map((s, i) => {
        const col = i % 2, row = Math.floor(i / 2);
        const vis = clamp01((shown - s.x0 - s.pct * 0.5) / 4);
        return (
          <div key={s.power} style={{position: 'absolute', left: 14 + col * 370, top: 106 + row * 23, width: 350, height: 22, display: 'flex', alignItems: 'center', opacity: vis}}>
            <div style={{width: 16, height: 16, background: s.color, marginRight: 10, boxShadow: '0 0 0 1px rgba(0,0,0,0.6)'}} />
            <div style={{fontFamily: FONT.map, fontWeight: 700, fontSize: 16, letterSpacing: 1.5, color: '#fff', width: 150}}>{s.label}</div>
            <div style={{width: 150, height: 6, background: 'rgba(255,255,255,0.08)', marginRight: 10}}><div style={{width: `${(s.pct / 40) * 100}%`, height: 6, background: s.color}} /></div>
            <div style={{fontFamily: FONT.title, fontWeight: 700, fontSize: 18, color: C.gold, width: 50, textAlign: 'right'}}>{s.pct.toFixed(1)}%</div>
          </div>
        );
      })}
    </div>
  );
};

/* ---------- filmic grade: cool shadows, warm highlights, soft top/bottom falloff ---------- */
export const Grade: React.FC<{amount?: number}> = ({amount = 1}) => (
  <AbsoluteFill style={{pointerEvents: 'none'}}>
    <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(8,16,34,0.22) 0%, rgba(0,0,0,0) 28%, rgba(0,0,0,0) 72%, rgba(24,12,0,0.26) 100%)', opacity: amount}} />
    <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 55% 60% at 50% 45%, rgba(255,222,170,0.16) 0%, rgba(255,222,170,0) 70%)', mixBlendMode: 'soft-light', opacity: amount}} />
    <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 80% at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.28) 100%)', opacity: amount}} />
  </AbsoluteFill>
);
