// Prints {total, matrix:{include:[{idx, range}]}} for parallel rendering of "Main".
import {TOTAL} from '../src/timeline';
import {FPS} from '../src/theme';
const n = Math.max(1, parseInt(process.argv[2] || '10', 10));
const total = Math.ceil(TOTAL * FPS);
const size = Math.ceil(total / n);
const include: {idx: number; range: string}[] = [];
for (let i = 0; i < n; i++) {
  const a = i * size;
  const b = Math.min(total - 1, (i + 1) * size - 1);
  if (a > b) break;
  include.push({idx: i, range: `${a}-${b}`});
}
console.log(JSON.stringify({total, matrix: {include}}));
