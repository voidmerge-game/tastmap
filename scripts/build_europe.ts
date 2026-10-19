/** Build public/data/europe_1884.json: European great powers c.1884 from Natural Earth 50m modern countries
 *  (unions + a few half-plane clips for partitioned Poland). Object name: w1884. */
import fs from 'fs';
import {feature} from 'topojson-client';
import {topology} from 'topojson-server';
import pc from 'polygon-clipping';

const topo = JSON.parse(fs.readFileSync('public/data/countries50.json', 'utf8'));
const fc = feature(topo, topo.objects.countries) as any;
const geomOf = (name: string) => {
  const f = fc.features.find((f: any) => f.properties.name === name);
  if (!f) { console.warn('missing', name); return [] as any; }
  const g = f.geometry; return g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
};
const box = (lo0: number, la0: number, lo1: number, la1: number) => [[[[lo0, la0], [lo1, la0], [lo1, la1], [lo0, la1], [lo0, la0]]]];
const clip = (g: any, b: any) => pc.intersection(g, b);
const uni = (...gs: any[]) => gs.reduce((a, g) => (g.length ? (a ? pc.union(a, g) : g) : a), null as any);

const POL = geomOf('Poland');
const polW = clip(POL, box(10, 45, 18.6, 56));                 // Prussian partition (west)
const polS = clip(POL, box(18.6, 45, 26, 50.4));               // Galicia (Austrian)
const polE = pc.difference(POL, pc.union(polW, polS) as any);  // Congress Poland (Russian)

const UNITS: [string, string, any][] = [
  ['Britain', 'britain', uni(geomOf('United Kingdom'), geomOf('Ireland'))],
  ['France', 'france', clip(geomOf('France'), box(-6, 41, 10, 52))],
  ['Germany', 'germany', uni(geomOf('Germany'), polW, clip(geomOf('Russia'), box(19.5, 54.2, 23, 55.4)))],
  ['Austria-Hungary', 'austria', uni(geomOf('Austria'), geomOf('Hungary'), geomOf('Czechia'), geomOf('Slovakia'), geomOf('Slovenia'), geomOf('Croatia'), geomOf('Bosnia and Herz.'), polS)],
  ['Italy', 'italy', geomOf('Italy')],
  ['Spain', 'spain', clip(geomOf('Spain'), box(-10, 35, 5, 44))],
  ['Portugal', 'portugal', clip(geomOf('Portugal'), box(-10, 36, 0, 43))],
  ['Belgium', 'belgium', geomOf('Belgium')],
  ['Netherlands', 'neutral', clip(geomOf('Netherlands'), box(3, 50, 8, 54))],
  ['Switzerland', 'neutral', geomOf('Switzerland')],
  ['Denmark', 'neutral', geomOf('Denmark')],
  ['Sweden-Norway', 'neutral', uni(geomOf('Sweden'), geomOf('Norway'))],
  ['Ottoman Empire', 'ottoman', uni(geomOf('Turkey'), geomOf('Syria'), geomOf('Lebanon'), geomOf('Israel'), geomOf('Palestine'), geomOf('Jordan'), geomOf('Iraq'), geomOf('Albania'), geomOf('Macedonia'), geomOf('Kosovo'), clip(geomOf('Greece'), box(20, 40.3, 27, 42)), clip(geomOf('Bulgaria'), box(22, 41, 29, 42.1)))],
  ['Greece', 'neutral', clip(geomOf('Greece'), box(19, 34, 27, 40.3))],
  ['Romania', 'neutral', geomOf('Romania')],
  ['Serbia', 'neutral', geomOf('Serbia')],
  ['Bulgaria', 'neutral', clip(geomOf('Bulgaria'), box(22, 42.1, 29, 45))],
  ['Montenegro', 'neutral', geomOf('Montenegro')],
  ['Russia', 'russia', uni(clip(geomOf('Russia'), box(23, 40, 60, 72)), geomOf('Finland'), geomOf('Estonia'), geomOf('Latvia'), geomOf('Lithuania'), geomOf('Belarus'), geomOf('Ukraine'), geomOf('Moldova'), polE)],
];
// d3 spherical winding: outer rings clockwise, holes counter-clockwise (polygon-clipping emits the opposite)
const ringArea = (r: number[][]) => { let a = 0; for (let i = 0; i < r.length - 1; i++) a += r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1]; return a / 2; };
const rewind = (mp: number[][][][]) => mp.map((poly) => poly.map((ring, i) => { const ccw = ringArea(ring) > 0; const wantCCW = i > 0; return ccw === wantCCW ? ring : [...ring].reverse(); }));
const features = UNITS.map(([NAME, SUBJECTO, mp]) => ({type: 'Feature', properties: {NAME, SUBJECTO}, geometry: {type: 'MultiPolygon', coordinates: rewind(mp as any)}}));
const t: any = topology({w1884: {type: 'FeatureCollection', features}}, 1e5);
fs.writeFileSync('public/data/europe_1884.json', JSON.stringify(t));
console.log('features', features.length, 'bytes', fs.statSync('public/data/europe_1884.json').size);
