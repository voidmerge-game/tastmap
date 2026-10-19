import {useEffect, useState} from 'react';
import {continueRender, delayRender, staticFile} from 'remotion';
import * as topojson from 'topojson-client';
import type {Topology, GeometryCollection} from 'topojson-specification';
import type {FeatureCollection, Geometry} from 'geojson';

export type FC = FeatureCollection<Geometry, Record<string, any>>;

const cache: Record<string, FC> = {};

/** Load a TopoJSON file from /public/data and convert to GeoJSON FeatureCollection. */
export const useTopo = (name: string): FC | null => {
  const [data, setData] = useState<FC | null>(cache[name] ?? null);
  const [handle] = useState(() => (cache[name] ? null : delayRender(`topo:${name}`)));
  useEffect(() => {
    if (cache[name]) {
      setData(cache[name]);
      return;
    }
    fetch(staticFile(`data/${name}.json`))
      .then((r) => r.json())
      .then((topo: Topology) => {
        const key = Object.keys(topo.objects)[0];
        const fc = topojson.feature(topo, topo.objects[key] as GeometryCollection) as unknown as FC;
        cache[name] = fc;
        setData(fc);
        if (handle !== null) continueRender(handle);
      })
      .catch((e) => {
        console.error(e);
        if (handle !== null) continueRender(handle);
      });
  }, [name, handle]);
  return data;
};

/** Build a lookup of features by a property value */
export const byProp = (fc: FC | null, prop: string) => {
  const m = new Map<string, FC['features'][number][]>();
  fc?.features.forEach((f) => {
    const k = String(f.properties?.[prop] ?? '');
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(f);
  });
  return m;
};
