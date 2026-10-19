import {PARAS,TOTAL,COLD_OPEN,OUTRO} from '../src/timeline';
import {CAM5} from '../src/events';
for(const p of PARAS) console.log(`${p.id}\t${p.start.toFixed(2)}–${(p.start+p.duration).toFixed(2)}\t${p.duration.toFixed(2)}s`);
console.log(`COLD_OPEN ${COLD_OPEN.quote}+${COLD_OPEN.title}s; outro ${OUTRO.card}+${OUTRO.credits}s; total ${TOTAL.toFixed(2)}s (${Math.ceil(TOTAL*30)} frames)`);
console.log(`camera keys ${CAM5.length}`);
