import {ARCHIVE} from '../events';
import {T,E,FIRST_VO,END_VO} from '../timeline';
import type {Rect} from './labels';
export type Reserved=Rect&{t0:number;t1:number;id:string;v0:number;v1:number};
const PAD=18,LEAD=.45;
export const RIBBON_WIN={t0:FIRST_VO,t1:END_VO+1.5};
export const CHART_WIN={t0:T('S3_02','capital')-2.5,t1:END_VO+2.5};
export const reservedAt=(tSec:number):Reserved[]=>{
 const out:Reserved[]=[];
 for(const a of ARCHIVE){if(a.wall)continue;const t0=a.t-LEAD,t1=a.until+LEAD;if(tSec<t0||tSec>t1)continue;const x=a.x??1080,y=a.y??150,w=a.w??720,h=a.h??540;out.push({id:a.src,x:x-PAD,y:y-PAD,w:w+2*PAD,h:h+2*PAD,t0,t1,v0:a.t,v1:a.until});}
 if(tSec>=RIBBON_WIN.t0-LEAD&&tSec<=RIBBON_WIN.t1+LEAD)out.push({id:'ribbon',x:500,y:1002,w:920,h:78,t0:RIBBON_WIN.t0-LEAD,t1:RIBBON_WIN.t1+LEAD,v0:RIBBON_WIN.t0,v1:RIBBON_WIN.t1});
 if(tSec>=CHART_WIN.t0-LEAD&&tSec<=CHART_WIN.t1+LEAD)out.push({id:'chart',x:90-PAD,y:760-PAD,w:760+2*PAD,h:210+2*PAD,t0:CHART_WIN.t0-LEAD,t1:CHART_WIN.t1+LEAD,v0:CHART_WIN.t0,v1:CHART_WIN.t1});
 if(tSec>=FIRST_VO&&tSec<END_VO+1.5)out.push({id:'year',x:1600,y:30,w:290,h:120,t0:FIRST_VO,t1:END_VO+1.5,v0:FIRST_VO,v1:END_VO+1.5});
 return out;
};
export const reserveFade=(tSec:number,rects:Reserved[],hits:(r:Reserved)=>boolean)=>{let vis=1;for(const r of rects){if(!hits(r))continue;const inF=Math.min(1,Math.max(0,(tSec-r.t0)/.35)),outF=Math.min(1,Math.max(0,(r.t1-tSec)/.35));vis=Math.min(vis,1-Math.min(inF,outF));}return vis;};
