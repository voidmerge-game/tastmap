import React, {createContext, useContext, useMemo} from 'react';
import type {Rect} from '../lib/labels';
import {geoOrthographic, geoPath, geoGraticule10, geoDistance, geoArea, GeoProjection} from 'd3-geo';
import {AbsoluteFill} from 'remotion';
import {C, W, H} from '../theme';
import type {FC} from '../lib/geo';
import type {Feature, Geometry} from 'geojson';
import {EarthGlobe} from './EarthGlobe';

export type Cam = {lon: number; lat: number; scale: number};

export type Layer = {
  id: string;
  fc: FC | null;
  fill?: (f: Feature<Geometry, any>) => string | null;
  stroke?: string;
  strokeWidth?: number;
  opacity?: (f: Feature<Geometry, any>) => number;
  /** 0..1 reveal radius from feature centroid (ink-spread). 1 = fully shown, undefined = always full */
  reveal?: (f: Feature<Geometry, any>) => number | undefined;
  /** optional geographic origin [lon,lat] for the reveal wave (defaults to feature centroid) */
  revealFrom?: (f: Feature<Geometry, any>) => [number, number] | undefined;
  /** optional per-feature stroke override */
  strokeFn?: (f: Feature<Geometry, any>) => string | undefined;
  filter?: (f: Feature<Geometry, any>) => boolean;
  glow?: boolean;
  /** CSS blend mode for the fill pass (e.g. 'multiply' over the relief) */
  blend?: string;
  /** draw all strokes in a second pass above every fill of this layer */
  strokeOnTop?: boolean;
  /** paper-cutout drop shadow under each feature (v4 look) */
  shadow?: boolean;
  /** per-feature extra emphasis 0..1: darker outline + stronger shadow (recently acquired) */
  emphasis?: (f: Feature<Geometry, any>) => number;
  /** v5: opacity of an additional normal-blend colour wash drawn under the blend pass (keeps relief, adds body) */
  wash?: number;
};

type Ctx = {projection: GeoProjection; cam: Cam; visible: (lon: number, lat: number) => boolean};
const MapCtx = createContext<Ctx | null>(null);
/** screen rectangles that flags / city labels must stay clear of (country names) */
export const AvoidCtx = createContext<Rect[]>([]);
export const useMap = () => {
  const c = useContext(MapCtx);
  if (!c) throw new Error('useMap outside WorldMap');
  const avoid = useContext(AvoidCtx);
  return {...c, avoid};
};

export const WorldMap: React.FC<{
  cam: Cam;
  land: FC | null;
  layers?: Layer[];
  children?: React.ReactNode;
  showGraticule?: boolean;
  /** 0..1 darkness of vignette */
  vignette?: number;
  /** draw satellite/relief texture (default true) */
  raster?: boolean;
  /** 0 = satellite globe, 1 = atlas style (vector ocean + shaded relief + opaque fills) */
  atlas?: number;
  /** cloud layer opacity 0..1 (v5) */
  clouds?: number;
  /** cloud drift in degrees of longitude (v5) */
  cloudDrift?: number;
}> = ({cam, land, layers = [], children, showGraticule = true, vignette = 0.55, raster = true, atlas = 0, clouds = 0, cloudDrift = 0}) => {
  const projection = useMemo(
    () =>
      geoOrthographic()
        .translate([W / 2, H / 2])
        .scale(cam.scale)
        .rotate([-cam.lon, -cam.lat, 0])
        .clipAngle(90)
        .precision(0.3),
    [cam.lon, cam.lat, cam.scale],
  );
  const path = useMemo(() => geoPath(projection), [projection]);
  const graticule = useMemo(() => path(geoGraticule10()) ?? '', [path]);
  const sphere = path({type: 'Sphere'}) ?? '';
  const landPath = useMemo(() => (land ? path(land) ?? '' : ''), [land, path]);
  // only sizeable landmasses get the coastal water glow (tiny islands would become blurry dots)
  const bigLand = useMemo(() => (land ? {type: 'FeatureCollection', features: land.features.filter((f) => geoArea(f as any) > 0.0012)} as FC : null), [land]);
  const bigLandPath = useMemo(() => (bigLand ? path(bigLand as any) ?? '' : ''), [bigLand, path]);
  const visible = (lon: number, lat: number) => geoDistance([lon, lat], [cam.lon, cam.lat]) < Math.PI / 2 - 0.02;
  const r = cam.scale;
  const cx = W / 2, cy = H / 2;

  return (
    <MapCtx.Provider value={{projection, cam, visible}}>
      <AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 40%, ${C.oceanLight} 0%, ${C.ocean} 55%, #050d16 100%)`}}>
        {/* ---- v6 realistic earth (Blue Marble + relief lighting + ocean specular + clouds + atmosphere) ---- */}
        {raster && <EarthGlobe cam={cam} params={{cloudDrift, cloudK: clouds * (0.8 - 0.45 * Math.min(1, Math.max(0, (cam.scale - 1400) / 1600))), shadowK: 0.45}} />}
        <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
          <defs>
            <radialGradient id="atmo" cx="50%" cy="50%" r="50%">
              <stop offset="80%" stopColor="#6fb3ff" stopOpacity="0" />
              <stop offset="100%" stopColor="#6fb3ff" stopOpacity="0.55" />
            </radialGradient>
            <radialGradient id="oceanG" cx="38%" cy="32%" r="75%">
              <stop offset="0%" stopColor="#2a5f88" />
              <stop offset="60%" stopColor="#12395a" />
              <stop offset="100%" stopColor="#081a2a" />
            </radialGradient>
            <radialGradient id="shade" cx="35%" cy="30%" r="80%">
              <stop offset="0%" stopColor="#fff" stopOpacity="0.10" />
              <stop offset="55%" stopColor="#000" stopOpacity="0" />
              <stop offset="100%" stopColor="#000" stopOpacity="0.62" />
            </radialGradient>
            <linearGradient id="landG" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={C.land} />
              <stop offset="100%" stopColor={C.landDark} />
            </linearGradient>
            <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="innerShadow">
              <feGaussianBlur stdDeviation="2.5" />
            </filter>
            <filter id="cutShadow" x="-10%" y="-10%" width="130%" height="130%">
              <feGaussianBlur stdDeviation="5" />
            </filter>
            {[0, 1, 2].map((i) => (
              <filter key={i} id={`flagWave${i}`} x="-10%" y="-20%" width="120%" height="140%">
                <feTurbulence type="fractalNoise" baseFrequency="0.03 0.07" numOctaves="2" seed={3 + i * 7} result="n" />
                <feDisplacementMap in="SourceGraphic" in2="n" scale="6" xChannelSelector="R" yChannelSelector="G" />
              </filter>
            ))}
            <clipPath id="sphereClip"><path d={sphere} /></clipPath>
            <pattern id="paperNoise" width="6" height="6" patternUnits="userSpaceOnUse">
              <rect width="6" height="6" fill="rgba(0,0,0,0)" />
              <circle cx="1" cy="1" r="0.6" fill="rgba(0,0,0,0.05)" />
              <circle cx="4" cy="3.5" r="0.5" fill="rgba(255,255,255,0.05)" />
            </pattern>
          </defs>

          {/* atmosphere halo */}
          <circle cx={cx} cy={cy} r={r * 1.06} fill="url(#atmo)" opacity={1 - 0.5 * atlas} />
          {/* ocean sphere (vector fallback when no raster) */}
          {!raster && <path d={sphere} fill="url(#oceanG)" />}
          <g clipPath="url(#sphereClip)">
            {showGraticule && atlas < 1 && <path d={graticule} fill="none" stroke={C.graticule} strokeWidth={1} opacity={1 - atlas} />}
            {!raster && <path d={landPath} fill="#000" opacity={0.35} transform="translate(3,4)" filter="url(#innerShadow)" />}
            {!raster && <path d={landPath} fill="url(#landG)" stroke={C.landShade} strokeWidth={0.8} />}
            {!raster && <path d={landPath} fill="url(#paperNoise)" />}
            {raster && atlas < 1 && <path d={landPath} fill="none" stroke="rgba(255,245,220,0.28)" strokeWidth={1.1} opacity={1 - atlas} />}

            {layers.map((L) => {
              if (!L.fc) return null;
              const items = L.fc.features.map((f, i) => {
                if (L.filter && !L.filter(f)) return null;
                const d = path(f);
                if (!d) return null;
                const fill = L.fill ? L.fill(f) : null;
                const op = L.opacity ? L.opacity(f) : 1;
                if (op <= 0) return null;
                const rev = L.reveal ? L.reveal(f) : undefined;
                let clip: string | undefined;
                let clipEl: React.ReactNode = null;
                if (rev !== undefined && rev < 1) {
                  if (rev <= 0) return null;
                  let [ccx, ccy] = path.centroid(f);
                  const org = L.revealFrom ? L.revealFrom(f) : undefined;
                  if (org) {
                    const pp = projection(org);
                    if (pp) { ccx = pp[0]; ccy = pp[1]; }
                  }
                  const b = path.bounds(f);
                  const far = Math.max(
                    Math.hypot(b[0][0] - ccx, b[0][1] - ccy), Math.hypot(b[1][0] - ccx, b[1][1] - ccy),
                    Math.hypot(b[0][0] - ccx, b[1][1] - ccy), Math.hypot(b[1][0] - ccx, b[0][1] - ccy));
                  const R = far * rev + 1;
                  const id = `rv-${L.id}-${i}`;
                  clip = `url(#${id})`;
                  clipEl = (
                    <clipPath id={id}>
                      <circle cx={ccx} cy={ccy} r={R} />
                    </clipPath>
                  );
                }
                const stroke = (L.strokeFn && L.strokeFn(f)) ?? L.stroke ?? 'none';
                const em = L.emphasis ? L.emphasis(f) : 0;
                return {i, d, fill, op, clip, clipEl, stroke, em};
              }).filter(Boolean) as {i: number; d: string; fill: string | null; op: number; clip?: string; clipEl: React.ReactNode; stroke: string; em: number}[];
              return (
                <g key={L.id} filter={L.glow ? 'url(#softGlow)' : undefined}>
                  {L.shadow && items.map((it) => (
                    <g key={`sh${it.i}`} opacity={it.op * (0.38 + 0.4 * it.em)} clipPath={it.clip}>
                      <path d={it.d} fill="#000" transform={`translate(${3 + 5 * it.em},${5 + 7 * it.em})`} filter="url(#cutShadow)" />
                    </g>
                  ))}
                  {L.wash && L.wash > 0 && (
                    <g>
                      {items.map((it) => (
                        <g key={`w${it.i}`} opacity={it.op * (L.wash ?? 0)} clipPath={it.clip}>
                          <path d={it.d} fill={it.fill ?? 'none'} />
                        </g>
                      ))}
                    </g>
                  )}
                  <g style={{mixBlendMode: (L.blend as any) ?? 'normal'}}>
                    {items.map((it) => (
                      <g key={it.i} opacity={it.op} clipPath={it.clip}>
                        {it.clipEl}
                        <path d={it.d} fill={it.fill ?? 'none'} stroke={L.strokeOnTop ? 'none' : it.stroke} strokeWidth={L.strokeWidth ?? 1} strokeLinejoin="round" />
                      </g>
                    ))}
                  </g>
                  {L.strokeOnTop && items.map((it) => (
                    <g key={`s${it.i}`} opacity={it.op} clipPath={it.clip}>
                      {/* v5.5: every territory gets a clearly visible two-tone border — dark edge + light line (reads as a distinct piece) */}
                      <path d={it.d} fill="none" stroke="rgba(22,17,12,0.78)" strokeWidth={(L.strokeWidth ?? 1) + 2.2} strokeLinejoin="round" strokeLinecap="round" />
                      <path d={it.d} fill="none" stroke={it.stroke} strokeWidth={L.strokeWidth ?? 1} strokeLinejoin="round" strokeLinecap="round" />
                      {it.em > 0 && <path d={it.d} fill="none" stroke="#231a12" strokeWidth={(L.strokeWidth ?? 1) + 2.2} strokeLinejoin="round" strokeLinecap="round" opacity={it.em} />}
                    </g>
                  ))}
                </g>
              );
            })}
            {/* crisp coastline in atlas mode */}
            {atlas > 0 && <path d={landPath} fill="none" stroke="rgba(255,240,225,0.18)" strokeWidth={1} opacity={atlas} />}
            {/* lighting */}
            <path d={sphere} fill="url(#shade)" opacity={raster ? 0.12 : 1} />
          </g>
          {/* limb */}
          <path d={sphere} fill="none" stroke="rgba(160,200,255,0.35)" strokeWidth={2} />
        </svg>
        {children}
        {/* vignette */}
        <AbsoluteFill
          style={{
            pointerEvents: 'none',
            background: `radial-gradient(ellipse at center, rgba(0,0,0,0) 45%, rgba(0,0,0,${vignette}) 100%)`,
          }}
        />
      </AbsoluteFill>
    </MapCtx.Provider>
  );
};

/** Place children at a geographic coordinate (hidden when on the far side of the globe). */
export const Marker: React.FC<{lon: number; lat: number; children: React.ReactNode; anchor?: 'center' | 'bottom'}> = ({
  lon, lat, children, anchor = 'center',
}) => {
  const {projection, visible} = useMap();
  if (!visible(lon, lat)) return null;
  const p = projection([lon, lat]);
  if (!p) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: p[0],
        top: p[1],
        transform: anchor === 'center' ? 'translate(-50%,-50%)' : 'translate(-50%,-100%)',
      }}
    >
      {children}
    </div>
  );
};
