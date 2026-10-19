import fs from 'node:fs';
import {topology} from 'topojson-server';
for (const [file, obj] of [['italy_1815','w1815'],['italy_1871','w1871']] as const) {
  const fc = JSON.parse(fs.readFileSync(`public/data/${file}.geojson`, 'utf8'));
  const topo: any = topology({[obj]: fc}, 1e5);
  fs.writeFileSync(`public/data/${file}.json`, JSON.stringify(topo));
  console.log(file, fc.features.length, 'features', fs.statSync(`public/data/${file}.json`).size, 'bytes');
}
