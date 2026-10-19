import React from 'react';
import {AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig, staticFile, OffthreadVideo, Loop, Sequence} from 'remotion';
import {C, FONT, POWER_NAME, Power} from '../theme';
import {FlagSvg} from './Flags';
import {Marker, useMap} from './WorldMap';
import {pushOut} from '../lib/labels';
import {fadeInOut, easeOutCubic, clamp01} from '../lib/anim';

/* ---------- Unit flag on the map (v5): waving cloth, no pole, soft shadow; fades in over 6 f with a small settle ---------- */
export const FlagDrop: React.FC<{lon: number; lat: number; power: Power; at: number; width?: number; label?: string; until?: number}> = ({
  lon, lat, power, at, width = 54, label, until,
}) => {
  const frame = useCurrentFrame();
  const {cam, projection, avoid} = useMap();
  const f = frame - at;
  if (f < 0) return null;
  if (until !== undefined && frame > until) return null;
  const outOp = until !== undefined ? interpolate(frame, [until - 14, until], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : 1;
  const e = easeOutCubic(clamp01(f / 7));
  const scale = 1.25 - 0.25 * e;
  const op = clamp01(f / 6) * outOp;
  // flags are anchored to the map: they grow with the zoom (reference: 26 px far → 55 px close @720p)
  const k = Math.min(1.45, Math.max(0.7, Math.pow(cam.scale / 2600, 0.55)));
  const w = width * k, h = (w * 2) / 3;
  const phase = Math.floor(frame / 5) % 3; // slow cloth flutter
  const labelOp = interpolate(f, [6, 18], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  // never sit on a country name: slide out of its rectangle
  const p = projection([lon, lat]) ?? [0, 0];
  const bh = h + (label ? 24 * k : 0);
  const moved = pushOut({x: p[0] - w / 2 - 4, y: p[1] - bh / 2 - 4, w: w + 8, h: bh + 8}, avoid);
  if (!moved) return null; // no clean spot near its territory → better no flag than a flag on a name
  const [dx, dy] = moved;
  return (
    <Marker lon={lon} lat={lat}>
      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: op, transform: `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(${scale})`}}>
        <div style={{position: 'relative', width: w, height: h, filter: `url(#flagWave${phase}) drop-shadow(${3 * k}px ${5 * k}px ${5 * k}px rgba(0,0,0,0.6))`}}>
          <FlagSvg power={power} width={w} />
          {/* cloth folds */}
          <div style={{position: 'absolute', inset: 0, background: 'repeating-linear-gradient(100deg, rgba(0,0,0,0.22) 0px, rgba(0,0,0,0) 22%, rgba(255,255,255,0.16) 36%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.2) 64%, rgba(255,255,255,0.12) 82%, rgba(0,0,0,0.18) 100%)', mixBlendMode: 'overlay'}} />
          <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(0,0,0,0.25), rgba(0,0,0,0) 18%, rgba(0,0,0,0) 85%, rgba(0,0,0,0.12))'}} />
        </div>
        {label && (
          <div
            style={{
              marginTop: 5, opacity: labelOp, fontFamily: FONT.map, fontWeight: 600, fontSize: 17 * k,
              letterSpacing: 2, color: C.white, textShadow: '0 1px 2px #000, 0 2px 8px rgba(0,0,0,0.9)', whiteSpace: 'nowrap', textTransform: 'uppercase',
            }}
          >
            {label}
          </div>
        )}
      </div>
    </Marker>
  );
};

/* ---------- Map label (place / region) ---------- */
export const MapLabel: React.FC<{
  lon: number; lat: number; text: string; at: number; size?: number; kind?: 'city' | 'region' | 'sea'; until?: number;
}> = ({lon, lat, text, at, size = 26, kind = 'city', until}) => {
  const frame = useCurrentFrame();
  const f = frame - at;
  if (f < 0) return null;
  if (until !== undefined && frame > until) return null;
  const op = interpolate(f, [0, 12], [0, 1], {extrapolateRight: 'clamp'}) * (until ? fadeInOut(f, until - at, 12, 12) : 1);
  const ty = interpolate(easeOutCubic(clamp01(f / 14)), [0, 1], [10, 0]);
  const base: React.CSSProperties = {
    opacity: op, transform: `translateY(${ty}px)`, whiteSpace: 'nowrap',
    textShadow: '0 1px 3px rgba(0,0,0,0.9), 0 0 12px rgba(0,0,0,0.6)',
  };
  if (kind === 'city')
    return (
      <Marker lon={lon} lat={lat}>
        <div style={{display: 'flex', alignItems: 'center', gap: 8, ...base}}>
          <div style={{width: 9, height: 9, borderRadius: 5, background: C.white, boxShadow: '0 0 0 3px rgba(0,0,0,0.45)'}} />
          <span style={{fontFamily: FONT.label, fontSize: size, color: C.white, letterSpacing: 1}}>{text}</span>
        </div>
      </Marker>
    );
  return (
    <Marker lon={lon} lat={lat}>
      <div
        style={{
          ...base, fontFamily: FONT.label, fontWeight: kind === 'region' ? 700 : 400, fontSize: size,
          letterSpacing: kind === 'region' ? 6 : 4, color: kind === 'region' ? 'rgba(255,255,255,0.92)' : 'rgba(200,225,255,0.8)',
          fontStyle: kind === 'sea' ? 'italic' : 'normal', textTransform: 'uppercase',
        }}
      >
        {text}
      </div>
    </Marker>
  );
};

/* ---------- Year badge (top-right, always on) ---------- */
export const YearBadge: React.FC<{year: string}> = ({year}) => (
  <div
    style={{
      position: 'absolute', top: 50, right: 90, fontFamily: FONT.map, fontSize: 78, fontWeight: 700, lineHeight: 1,
      color: '#fff', letterSpacing: 1, textShadow: '0 3px 3px rgba(0,0,0,0.7), 0 0 18px rgba(0,0,0,0.45)',
    }}
  >
    {year}
  </div>
);

/* ---------- Lower-third caption bar ---------- */
export const Caption: React.FC<{text: string; sub?: string; at: number; until: number}> = ({text, sub, at, until}) => {
  const frame = useCurrentFrame();
  if (frame < at || frame > until) return null;
  const f = frame - at;
  const op = fadeInOut(f, until - at, 10, 12);
  const w = interpolate(f, [0, 14], [0, 1], {extrapolateRight: 'clamp'});
  return (
    <div style={{position: 'absolute', left: 96, bottom: 96, opacity: op}}>
      <div style={{height: 4, width: `${w * 100}%`, background: C.gold, marginBottom: 10, minWidth: 2}} />
      <div style={{fontFamily: FONT.map, fontWeight: 700, fontSize: 36, letterSpacing: 2, color: C.white, textShadow: '0 2px 4px rgba(0,0,0,0.9), 0 0 16px rgba(0,0,0,0.6)', textTransform: 'uppercase'}}>
        {text}
      </div>
      {sub && <div style={{fontFamily: FONT.map, fontWeight: 500, fontSize: 24, letterSpacing: 1.5, color: '#f3dcc8', marginTop: 4, textShadow: '0 1px 3px #000'}}>{sub}</div>}
    </div>
  );
};

/* ---------- Archive photo in a framed card with Ken Burns ---------- */
export const ArchiveFrame: React.FC<{
  src: string; caption?: string; at: number; until: number;
  x?: number; y?: number; w?: number; h?: number; from?: 'left' | 'right' | 'bottom';
  zoom?: number; sepia?: number;
}> = ({src, caption, at, until, x = 1080, y = 150, w = 720, h = 540, from = 'right', zoom = 1.12, sepia = 0.35}) => {
  const frame = useCurrentFrame();
  if (frame < at || frame > until) return null;
  const f = frame - at;
  const len = until - at;
  const op = fadeInOut(f, len, 14, 14);
  const e = easeOutCubic(clamp01(f / 24));
  const dx = from === 'left' ? -60 * (1 - e) : from === 'right' ? 60 * (1 - e) : 0;
  const dy = from === 'bottom' ? 60 * (1 - e) : 0;
  const kb = 1 + (zoom - 1) * (f / len);
  return (
    <div
      style={{
        position: 'absolute', left: x, top: y, width: w, height: h, opacity: op,
        transform: `translate(${dx}px,${dy}px)`,
        background: '#0d0b09', padding: 10,
        boxShadow: '0 30px 60px rgba(0,0,0,0.7), inset 0 0 0 1px rgba(255,255,255,0.25)',
      }}
    >
      <div style={{width: '100%', height: '100%', overflow: 'hidden', position: 'relative', background: '#000'}}>
        <Img
          src={src.startsWith('http') ? src : staticFile(src)}
          style={{
            width: '100%', height: '100%', objectFit: 'cover',
            transform: `scale(${kb})`, transformOrigin: '50% 40%',
            filter: `sepia(${sepia}) contrast(1.05) saturate(0.9)`,
          }}
        />
        <div style={{position: 'absolute', inset: 0, boxShadow: 'inset 0 0 80px rgba(0,0,0,0.65)'}} />
      </div>
      {caption && (
        <div
          style={{
            position: 'absolute', left: 10, right: 10, bottom: 10, padding: '10px 16px',
            background: 'linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0.0))',
            fontFamily: FONT.label, fontWeight: 600, fontSize: 24, letterSpacing: 2, color: C.white, textTransform: 'uppercase',
          }}
        >
          {caption}
        </div>
      )}
    </div>
  );
};



/* ---------- Archive card over the map (v5, measured from the reference):
 *  a white rectangle grows from the card centre (7 f, ease-out) while the caption fades in, then the white wipes L→R with
 *  motion blur (3 f) revealing the picture. Thick black frame + thin inner white line; caption INSIDE the bottom of the frame. ---------- */

/* ---------- v6 archive media: real film clips (looped, flicker, gate weave) or photos with a 2.5D parallax ---------- */
const hash01 = (n: number) => { const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
export const ArchiveMedia: React.FC<{
  src: string; video?: string; f: number; len: number; sepia?: number; zoom?: number; at: number; clipSec?: number;
}> = ({src, video, f, len, sepia = 0.25, zoom = 1.1, at, clipSec = 8.5}) => {
  const {fps} = useVideoConfig();
  const p = f / Math.max(1, len);
  if (video) {
    const flicker = 0.955 + 0.045 * hash01(f) * 0.6 + 0.02 * Math.sin(f * 1.7);
    const weaveX = 1.2 * Math.sin(f * 0.9) + 0.6 * (hash01(f + 7) - 0.5), weaveY = 0.9 * Math.sin(f * 1.3 + 1) + 0.6 * (hash01(f + 3) - 0.5);
    const frames = Math.round(clipSec * fps) - 2;
    return (
      <>
        <Sequence from={at} layout="none">
          <Loop durationInFrames={frames} layout="none">
            <OffthreadVideo
              src={staticFile(video)}
              muted
              style={{width: '100%', height: '100%', objectFit: 'cover', transform: `translate(${weaveX}px, ${weaveY}px) scale(1.04)`, filter: `sepia(${sepia + 0.12}) contrast(1.1) brightness(${flicker})`}}
            />
          </Loop>
        </Sequence>
        {/* scratches + dust */}
        <div style={{position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.35, background: `linear-gradient(90deg, transparent ${(hash01(f * 3) * 100).toFixed(1)}%, rgba(255,255,255,0.25) ${(hash01(f * 3) * 100 + 0.15).toFixed(2)}%, transparent ${(hash01(f * 3) * 100 + 0.3).toFixed(2)}%)`}} />
        <div style={{position: 'absolute', left: 14, top: 12, display: 'flex', alignItems: 'center', gap: 8, padding: '4px 10px', background: 'rgba(0,0,0,0.55)', borderRadius: 3}}>
          <div style={{width: 9, height: 9, borderRadius: 5, background: '#e2574c', boxShadow: '0 0 8px #e2574c', opacity: 0.7 + 0.3 * Math.sin(f * 0.25)}} />
          <div style={{fontFamily: FONT.map, fontWeight: 700, fontSize: 13, letterSpacing: 2, color: '#fff'}}>ARCHIVE FILM</div>
        </div>
      </>
    );
  }
  // 2.5D photo: slow push-in, drift, and a settling 3D tilt; the vignette drifts opposite to the picture (parallax)
  const kb = 1 + (zoom - 1) * p;
  const dx = (p - 0.5) * 2.2, dy = (p - 0.5) * -1.2;
  return (
    <>
      <Img
        src={src.startsWith('http') ? src : staticFile(src)}
        style={{width: '100%', height: '100%', objectFit: 'cover', transform: `translate(${dx}%, ${dy}%) scale(${kb * 1.04})`, transformOrigin: '50% 40%', filter: `sepia(${sepia}) contrast(1.06) saturate(0.9)`}}
      />
      <div style={{position: 'absolute', inset: -40, transform: `translate(${-dx * 1.6}%, ${-dy * 1.6}%)`, boxShadow: 'inset 0 0 90px 30px rgba(0,0,0,0.55)', pointerEvents: 'none'}} />
    </>
  );
};

export const CardPop: React.FC<{
  src: string; video?: string; caption?: string; sub?: string; at: number; until: number; x?: number; y?: number; w?: number; h?: number; zoom?: number; sepia?: number;
}> = ({src, video, caption, sub, at, until, x = 1080, y = 150, w = 720, h = 540, zoom = 1.1, sepia = 0.25}) => {
  const frame = useCurrentFrame();
  if (frame < at || frame > until) return null;
  const f = frame - at;
  const len = until - at;
  const out = interpolate(f, [len - 10, len], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const grow = easeOutCubic(clamp01(f / 7));
  const wipe = easeOutCubic(clamp01((f - 7) / 3));
  const tilt = (x < 960 ? 1 : -1) * (5 * (1 - easeOutCubic(clamp01(f / 40))) + 1.2);
  const border = 16, capH = caption ? (sub ? 74 : 52) : border;
  const capOp = interpolate(f, [2, 9], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <div style={{position: 'absolute', left: x, top: y, width: w, height: h, opacity: out, transform: `perspective(1600px) rotateY(${tilt}deg) scale(${0.08 + 0.92 * grow})`, transformOrigin: '50% 50%'}}>
      {/* frame */}
      <div style={{position: 'absolute', inset: 0, background: '#0a0a0a', boxShadow: '0 26px 60px rgba(0,0,0,0.65), 0 4px 14px rgba(0,0,0,0.5)'}} />
      <div style={{position: 'absolute', left: border, top: border, right: border, bottom: capH, overflow: 'hidden', background: '#000', boxShadow: 'inset 0 0 0 1.5px rgba(255,255,255,0.75)'}}>
        <ArchiveMedia src={src} video={video} f={f} len={len} sepia={sepia} zoom={zoom} at={at} />
        <div style={{position: 'absolute', inset: 0, boxShadow: 'inset 0 0 70px rgba(0,0,0,0.5)', pointerEvents: 'none'}} />
        {/* white flash that wipes away to reveal the picture */}
        {wipe < 1 && (
          <div style={{position: 'absolute', inset: -10, background: '#f4f4f4', clipPath: `inset(0 0 0 ${wipe * 100}%)`, filter: `blur(${wipe * 9}px)`}} />
        )}
      </div>
      {caption && (
        <div style={{position: 'absolute', left: border, right: border, bottom: 0, height: capH, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', opacity: capOp}}>
          <div style={{fontFamily: FONT.map, fontWeight: 700, fontSize: 21, letterSpacing: 1.5, color: '#fff', textTransform: 'uppercase', whiteSpace: 'nowrap', lineHeight: 1.2}}>{caption}</div>
          {sub && <div style={{fontFamily: FONT.map, fontWeight: 600, fontSize: 17, letterSpacing: 1.2, color: '#fff', textTransform: 'uppercase', whiteSpace: 'nowrap', lineHeight: 1.2, marginTop: 1}}>{sub}</div>}
        </div>
      )}
    </div>
  );
};

/* ---------- v6: Archive on the war-room table — a photographic print placed on a lamp-lit mahogany desk (public/tex/warroom_table.jpg),
 *  seen obliquely; smaller prints and a paper tag lie around it; lamp flicker, dolly-in, defocus → focus on entry; caption typed inside the print. ---------- */
const noise01 = (n: number) => { const x = Math.sin(n * 91.17 + 11.3) * 43758.5453; return x - Math.floor(x); };
export const TableArchive: React.FC<{
  src: string; caption?: string; at: number; until: number; sides?: [string, string]; sepia?: number; w?: number; h?: number; sign?: string;
}> = ({src, caption, at, until, sides, sepia = 0.25, w = 780, h = 570, sign = 'CONGO FREE STATE'}) => {
  const frame = useCurrentFrame();
  if (frame < at || frame > until) return null;
  const f = frame - at;
  const len = until - at;
  const op = fadeInOut(f, len, 6, 12);
  const focus = easeOutCubic(clamp01(f / 30));
  const push = 1 + 0.05 * (f / Math.max(1, len));
  const place = easeOutCubic(clamp01((f - 4) / 14));            // the print is laid down onto the table
  const lift = 1 - place;                                        // 1 = still in the air
  const kb = 1.02 + 0.05 * (f / Math.max(1, len));
  const lamp = 0.93 + 0.05 * noise01(Math.floor(f / 2)) + 0.02 * Math.sin(f * 0.6);
  const typed = caption ? caption.slice(0, Math.max(0, Math.floor((f - 22) / 3))) : '';
  // table plane: the backdrop is shot ~65° from vertical → prints are foreshortened with a perspective rotateX
  const plane = (rot: number) => `perspective(2200px) rotateX(26deg) rotateZ(${rot}deg)`;
  const cx = 950, cy = 585;
  const print = (p: string, x: number, y: number, pw: number, ph: number, rot: number, bright = 0.8, delay = 0) => {
    const pl = easeOutCubic(clamp01((f - delay) / 12));
    return (
      <div style={{position: 'absolute', left: x, top: y, width: pw, height: ph, transformOrigin: '50% 50%', transform: `${plane(rot)} translateY(${-40 * (1 - pl)}px)`, opacity: pl, background: '#efe6d2', padding: 7, boxSizing: 'border-box', boxShadow: `0 ${10 + 30 * (1 - pl)}px ${24 + 40 * (1 - pl)}px rgba(0,0,0,${0.55 + 0.2 * (1 - pl)})`}}>
        <Img src={staticFile(p)} style={{width: '100%', height: '100%', objectFit: 'cover', filter: `sepia(0.55) brightness(${bright}) contrast(1.05)`}} />
      </div>
    );
  };
  return (
    <AbsoluteFill style={{opacity: op, overflow: 'hidden', background: '#070504'}}>
      <div style={{position: 'absolute', inset: 0, transform: `scale(${push})`, transformOrigin: '50% 55%', filter: focus < 1 ? `blur(${(1 - focus) * 9}px)` : undefined}}>
        <Img src={staticFile('tex/warroom_table.jpg')} style={{position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, objectFit: 'cover', filter: `brightness(${0.92 * lamp}) saturate(0.95)`}} />
        {/* lamp pool (flickers with the bulb) */}
        <div style={{position: 'absolute', inset: 0, background: `radial-gradient(ellipse 36% 44% at 30% 22%, rgba(255,196,120,${0.16 * lamp}) 0%, rgba(255,180,100,0) 70%)`, mixBlendMode: 'screen'}} />
        {/* smaller prints lying around */}
        {sides && print(sides[0], 1250, 150, 250, 180, 7, 0.7, 10)}
        {sides && print(sides[1], 520, 790, 230, 170, -9, 0.65, 16)}
        {/* the main print: a photographic paper with a warm border, laid down onto the table */}
        <div
          style={{
            position: 'absolute', left: cx - w / 2, top: cy - h / 2, width: w, height: h, padding: 16, boxSizing: 'border-box', background: '#f1e9d6',
            transformOrigin: '50% 50%', transform: `${plane(-2.5)} translateY(${-70 * lift}px) scale(${1 + 0.08 * lift})`,
            boxShadow: `0 ${14 + 50 * lift}px ${34 + 60 * lift}px rgba(0,0,0,${0.6 + 0.2 * lift}), 0 2px 6px rgba(0,0,0,0.5)`,
            filter: lift > 0 ? `blur(${lift * 2}px)` : undefined,
          }}
        >
          <div style={{position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: '#000'}}>
            <Img
              src={src.startsWith('http') ? src : staticFile(src)}
              style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${kb})`, transformOrigin: '50% 45%', filter: `sepia(${sepia + 0.1}) contrast(1.08) saturate(0.85) brightness(1.0)`}}
            />
            {/* paper sheen from the lamp + worn edges */}
            <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(115deg, rgba(255,230,190,0.16) 0%, rgba(255,255,255,0) 35%, rgba(0,0,0,0.12) 100%)', pointerEvents: 'none'}} />
            <div style={{position: 'absolute', inset: 0, boxShadow: 'inset 0 0 60px rgba(60,40,20,0.45)', pointerEvents: 'none'}} />
            {caption && <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 150, background: 'linear-gradient(rgba(0,0,0,0), rgba(0,0,0,0.6))'}} />}
            {caption && (
              <div style={{position: 'absolute', left: 30, right: 30, bottom: 30, textAlign: 'center', fontFamily: FONT.map, fontWeight: 700, fontSize: 28, letterSpacing: 2.5, color: '#fff', textTransform: 'uppercase', textShadow: '0 2px 4px #000, 0 0 16px rgba(0,0,0,0.9)', lineHeight: 1.25}}>
                {typed}
              </div>
            )}
          </div>
        </div>
        {/* paper tag with the territory name */}
        <div style={{position: 'absolute', left: cx + w / 2 - 40, top: cy + h / 2 + 18, padding: '10px 22px', background: '#e9dfc6', color: '#2a2018', fontFamily: FONT.map, fontWeight: 700, fontSize: 21, letterSpacing: 2.5, boxShadow: '0 10px 22px rgba(0,0,0,0.6)', transform: plane(-6), opacity: easeOutCubic(clamp01((f - 20) / 10))}}>
          {sign}
        </div>
        {/* vignette */}
        <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 70% at 50% 52%, rgba(0,0,0,0) 35%, rgba(0,0,0,0.35) 75%, rgba(0,0,0,0.8) 100%)', pointerEvents: 'none'}} />
      </div>
    </AbsoluteFill>
  );
};

/* ---------- Quote card: typewriter on black ---------- */
export const QuoteCard: React.FC<{text: string; author: string; source: string; at: number; until: number}> = ({
  text, author, source, at, until,
}) => {
  const frame = useCurrentFrame();
  if (frame < at || frame > until) return null;
  const f = frame - at;
  const len = until - at;
  const op = fadeInOut(f, len, 10, 18);
  const chars = Math.floor(interpolate(f, [8, Math.min(len - 70, 8 + text.length * 0.8)], [0, text.length], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}));
  const shown = text.slice(0, chars);
  const metaOp = interpolate(f, [len - 110, len - 80], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 45%, #1a1410 0%, #0a0806 60%, #040302 100%)', opacity: op, justifyContent: 'center', alignItems: 'center'}}>
      {/* floating dust */}
      {Array.from({length: 26}).map((_, i) => {
        const sx = ((i * 733) % 1920), sy = ((i * 389) % 1080);
        const px = sx + 40 * Math.sin(f / 60 + i), py = sy - (f * (0.25 + (i % 5) * 0.08)) % 1200 + 60;
        const r = 1.5 + (i % 3);
        return <div key={i} style={{position: 'absolute', left: px, top: ((py % 1200) + 1200) % 1200 - 60, width: r, height: r, borderRadius: r, background: 'rgba(230,215,190,0.55)', filter: 'blur(0.6px)'}} />;
      })}
      <div style={{width: 1360, textAlign: 'center', position: 'relative'}}>
        <div style={{fontFamily: FONT.type, fontSize: 37, lineHeight: 1.65, color: '#d8cfbd', letterSpacing: 1.5, textTransform: 'uppercase', minHeight: 170, whiteSpace: 'pre-line'}}>
          {shown}
          <span style={{opacity: Math.floor(f / 8) % 2 ? 1 : 0}}>▌</span>
        </div>
        <div style={{marginTop: 48, opacity: metaOp, fontFamily: FONT.type, fontSize: 26, color: '#a8a08f', letterSpacing: 3}}>
          {author.toUpperCase()}
          <div style={{fontSize: 22, marginTop: 8, fontStyle: 'italic', letterSpacing: 2}}>{source}</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ---------- Legend chip for a power ---------- */
export const PowerChip: React.FC<{power: Power; at: number; index: number}> = ({power, at, index}) => {
  const frame = useCurrentFrame();
  const f = frame - at;
  if (f < 0) return null;
  const op = interpolate(f, [0, 12], [0, 1], {extrapolateRight: 'clamp'});
  const tx = interpolate(easeOutCubic(clamp01(f / 16)), [0, 1], [-30, 0]);
  return (
    <div style={{position: 'absolute', left: 72, top: 60 + index * 58, opacity: op, transform: `translateX(${tx}px)`, display: 'flex', alignItems: 'center', gap: 12}}>
      <div style={{border: '1.5px solid rgba(255,255,255,0.8)', boxShadow: '0 4px 10px rgba(0,0,0,0.6)'}}>
        <FlagSvg power={power} width={48} />
      </div>
      <div style={{fontFamily: FONT.label, fontWeight: 700, fontSize: 26, letterSpacing: 3, color: C.white, textShadow: '0 2px 6px rgba(0,0,0,0.9)'}}>
        {POWER_NAME[power]}
      </div>
    </div>
  );
};

/* ---------- Big title card ---------- */
export const TitleCard: React.FC<{title: string; sub: string; at: number; until: number}> = ({title, sub, at, until}) => {
  const frame = useCurrentFrame();
  if (frame < at || frame > until) return null;
  const f = frame - at;
  const len = until - at;
  const op = fadeInOut(f, len, 18, 24);
  const e = easeOutCubic(clamp01(f / 40));
  const spread = interpolate(e, [0, 1], [18, 8]);
  const lineW = interpolate(easeOutCubic(clamp01((f - 20) / 40)), [0, 1], [0, 520]);
  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', opacity: op}}>
      <div style={{textAlign: 'center', filter: 'drop-shadow(0 6px 24px rgba(0,0,0,0.9))'}}>
        <div style={{fontFamily: FONT.title, fontWeight: 700, fontSize: 112, color: C.white, letterSpacing: spread}}>{title}</div>
        <div style={{height: 3, width: lineW, background: C.gold, margin: '18px auto'}} />
        <div style={{fontFamily: FONT.label, fontSize: 40, color: C.gold, letterSpacing: 10, textTransform: 'uppercase'}}>{sub}</div>
      </div>
    </AbsoluteFill>
  );
};

/* ---------- Film grain + letterbox polish ---------- */
export const Grain: React.FC<{amount?: number}> = ({amount = 0.08}) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{pointerEvents: 'none', mixBlendMode: 'overlay', opacity: amount}}>
      <svg width="100%" height="100%">
        <filter id={`g${frame % 7}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={frame % 7} />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#g${frame % 7})`} />
      </svg>
    </AbsoluteFill>
  );
};
