import LABEL_POS from './label_pos.json';
import type {Power} from './theme';
import {T,E,P,FIRST_VO,COLD_OPEN,END_VO,OUTRO,TOTAL} from './timeline';
import type {CamKey} from './lib/anim';

export type Pt=[number,number];
export const OWNER_1815:Record<string,Power>={
 'Kingdom of Sardinia':'sardinia','Lombardy–Venetia':'austria','Duchy of Parma':'duchies','Duchy of Modena':'duchies',
 'Grand Duchy of Tuscany':'duchies','Papal States':'papal','Kingdom of the Two Sicilies':'twosicilies','Austrian Empire':'austria','France':'france','San Marino':'independent',
};
export const OWNER_1871:Record<string,Power>={'Kingdom of Italy':'italy','Austria-Hungary':'austria','France':'france','San Marino':'independent'};
export type Acq={name:string;t:number;from?:Pt;dur?:number};
export const ACQ:Acq[]=[
 {name:'Lombardy–Venetia',t:T('S2_01','Solferino'),from:[10.56,45.37],dur:2},
 {name:'Kingdom of Italy',t:T('S3_01','proclaimed'),from:[7.68,45.07],dur:3},
];
export const acqOf=(name:string)=>ACQ.find(a=>a.name===name);
export type FlagEv={lon:number;lat:number;power:Power;t:number;label?:string;w?:number;until?:number};
export const FLAGS_RAW:FlagEv[]=[
 {lon:7.68,lat:45.07,power:'sardinia',t:T('S1_01','Turin'),label:'TURIN'},
 {lon:9.19,lat:45.46,power:'austria',t:T('S1_01','Lombardy'),label:'MILAN'},
 {lon:11.25,lat:43.77,power:'duchies',t:T('S1_01','Tuscany'),label:'FLORENCE'},
 {lon:12.50,lat:41.90,power:'papal',t:T('S1_01','pope'),label:'ROME'},
 {lon:14.27,lat:40.85,power:'twosicilies',t:T('S1_01','Naples'),label:'NAPLES'},
 {lon:13.36,lat:38.12,power:'sardinia',t:T('S2_02','Marsala'),label:'MARSALA',until:E('S2_02')+0.5},
 {lon:7.68,lat:45.07,power:'italy',t:T('S3_01','proclaimed'),label:'ITALY',until:T('S3_02','Rome')+1},
 {lon:12.50,lat:41.90,power:'italy',t:T('S3_02','Rome'),label:'ROME',until:E('S3_02')+1},
];
export const FLAGS:FlagEv[]=FLAGS_RAW.map(f=>({...f,until:f.until??(f.t<T('S3_01','proclaimed')?E('S2_02')+1:E('S3_02')+1)}));
export const FLAGS_EXTRA:FlagEv[]=[];
export type LabelEv={lon:number;lat:number;text:string;t:number;until?:number;kind?:'city'|'region'|'sea';size?:number};
export const LABELS:LabelEv[]=[];
export const LIGHT_LABELS=new Set(['Kingdom of the Two Sicilies','Austrian Empire','Austria-Hungary','France']);
export type BigEv={lon:number;lat:number;text:string;t:number;until?:number;size?:number;rot?:number;minScale?:number;fit?:any;fitKey?:[string,string];label?:string};
const fit=(era:string,name:string)=>((LABEL_POS as any)[era]?.[name]??null);
const SHORT_LABEL:Record<string,string>={'Kingdom of Sardinia':'SARDINIA','Lombardy–Venetia':'LOMBARDY VENETIA','Duchy of Parma':'PARMA','Duchy of Modena':'MODENA','Grand Duchy of Tuscany':'TUSCANY','Papal States':'PAPAL STATES','Kingdom of the Two Sicilies':'TWO SICILIES','Austrian Empire':'AUSTRIAN EMPIRE','Kingdom of Italy':'KINGDOM OF ITALY'};
const big=(era:string,name:string,text:string,t:number,until:number,minScale=0):BigEv=>{const f=fit(era,name);return {lon:f?.lon??12.5,lat:f?.lat??42.5,text,label:SHORT_LABEL[name]??text,t,until,minScale,fit:f,fitKey:[era,name],size:40};};
const END_1815_LAYER=T('S3_01','proclaimed');
export const BIG:BigEv[]=[
 big('1815','Kingdom of Sardinia','KINGDOM OF SARDINIA',T('S1_01','Sardinia'),END_1815_LAYER),
 big('1815','Lombardy–Venetia','LOMBARDY–VENETIA',T('S1_01','Lombardy'),END_1815_LAYER),
 big('1815','Duchy of Parma','DUCHY OF PARMA',T('S1_01','Parma'),END_1815_LAYER),
 big('1815','Duchy of Modena','DUCHY OF MODENA',T('S1_01','Modena'),END_1815_LAYER),
 big('1815','Grand Duchy of Tuscany','TUSCANY',T('S1_01','Tuscany'),END_1815_LAYER),
 big('1815','Papal States','PAPAL STATES',T('S1_01','pope'),END_1815_LAYER),
 big('1815','Kingdom of the Two Sicilies','TWO SICILIES',T('S1_01','Naples'),END_1815_LAYER),
 big('1815','Austrian Empire','AUSTRIAN EMPIRE',T('S1_01','Austria'),END_1815_LAYER),
 big('1871','Kingdom of Italy','KINGDOM OF ITALY',T('S3_01','proclaimed'),E('S3_02')),
];
export type CityEv={lon:number;lat:number;name:string;minScale?:number;capital?:boolean;side?:'r'|'l'|'b'|'t';t?:number;until?:number};
export const CITIES:CityEv[]=[
 {lon:7.68,lat:45.07,name:'Turin',t:T('S1_01','Turin'),until:E('S1_01'),capital:true,side:'l'},
 {lon:9.19,lat:45.46,name:'Milan',t:T('S1_01','Lombardy'),until:E('S2_01'),side:'r'},
 {lon:12.32,lat:45.44,name:'Venice',t:T('S1_01','Venetia'),until:E('S2_01'),side:'r'},
 {lon:11.25,lat:43.77,name:'Florence',t:T('S1_01','Tuscany'),until:E('S1_01'),side:'l'},
 {lon:12.50,lat:41.90,name:'Rome',t:T('S1_01','pope'),until:E('S1_01'),capital:true,side:'l'},
 {lon:14.27,lat:40.85,name:'Naples',t:T('S1_01','Naples'),until:E('S1_01'),capital:true,side:'r'},
 {lon:13.36,lat:38.12,name:'Palermo',t:T('S2_02','Sicily'),until:E('S2_02'),side:'l'},
];
export type CalloutEv={lon:number;lat:number;text:string;sub?:string;t:number;until:number;dx?:number;dy?:number};
export const CALLOUTS:CalloutEv[]=[
 {lon:10.56,lat:45.37,text:'SOLFERINO',sub:'24 JUNE 1859',t:T('S2_01','Solferino'),until:E('S2_01')+0.5,dx:210,dy:-180},
 {lon:12.51,lat:41.91,text:'PORTA PIA',sub:'20 SEPTEMBER 1870',t:T('S3_02','Porta'),until:E('S3_02')-1,dx:220,dy:-180},
];
export type RouteEv={pts:Pt[];t:number;until:number;color?:string;width?:number;dashed?:boolean;drawDur?:number;head?:boolean};
export const ROUTES:RouteEv[]=[{pts:[[8.99,44.39],[12.44,37.80],[13.36,38.12],[14.27,40.85]],t:T('S2_02','Quarto'),until:E('S2_02')+0.6,color:'#ffd166',width:5,drawDur:2.2,head:true}];
export type PulseEv={lon:number;lat:number;t:number;until:number;color?:string};
export const PULSES:PulseEv[]=[
 {lon:10.56,lat:45.37,t:T('S2_01','Solferino'),until:E('S2_01')+1,color:'#ff6b4a'},
 {lon:12.86,lat:37.91,t:T('S2_02','Marsala'),until:E('S2_02')+1,color:'#ffd166'},
 {lon:12.51,lat:41.91,t:T('S3_02','Porta'),until:E('S3_02')+1,color:'#ff6b4a'},
];
export type ArcEv={src:string;video?:string;caption:string;t:number;until:number;x?:number;y?:number;w?:number;h?:number;from?:'left'|'right'|'bottom';sepia?:number;wall?:boolean;sign?:string};
const R={x:1110,y:140,w:720,h:560}, Lf={x:90,y:140,w:720,h:560}, Pt_={x:1210,y:120,w:560,h:700};
export const ARCHIVE:ArcEv[]=[
 {src:'archive/cavour.jpg',caption:'Camillo Cavour — 1850s',t:T('S2_01','Cavour')-0.2,until:E('S2_01')+0.6,...Pt_,from:'right'},
 {src:'archive/garibaldi.jpg',caption:'Giuseppe Garibaldi — c. 1867 · Alinari',t:T('S2_02','Garibaldi')-0.2,until:E('S2_02')+0.4,...Pt_,from:'left'},
 {src:'archive/victor_emmanuel_ii.jpg',caption:'Victor Emmanuel II — 1862',t:T('S3_01','Victor')-0.2,until:E('S3_01')-0.4,...Pt_,wall:true,sign:'REGNO D’ITALIA'},
 {src:'archive/clips/venice_1896.jpg',video:'archive/clips/venice_1896.mp4',caption:'Venice, Grand Canal — Lumière, 1896',t:T('S3_02','Rome')-1.2,until:E('S3_02')-0.7,...Lf,from:'left'},
];
export type QuoteEv={text:string;author:string;source:string;t:number;until:number};
export const QUOTES:QuoteEv[]=[
 {text:'“We have made Italy; now we must make Italians.”',author:'Massimo d’Azeglio',source:'Memoir, 1861',t:P('S3_02').start-6.5,until:P('S3_02').start},
];
export const YEARS:[number,string][]=[
 [FIRST_VO,'1815'],[T('S1_02','1848'),'1848'],[T('S2_01','Solferino'),'1859'],[T('S2_02','Garibaldi'),'1860'],
 [T('S3_01','proclaimed'),'1861'],[T('S3_01','Venetia'),'1866'],[T('S3_02','Rome'),'1870'],[T('S3_02','capital'),'1871'],
];
export const yearAt=(t:number)=>{let y='1815';for(const [a,b] of YEARS)if(t>=a)y=b;return y;};
const K=(t:number,lon:number,lat:number,ppd:number):CamKey=>({t,lon,lat,scale:Math.round(ppd*57.2958)});
export const CAM5:CamKey[]=[
 {t:0,lon:10,lat:42,scale:440},{t:COLD_OPEN.quote,lon:10,lat:42,scale:440},
 K(FIRST_VO+0.5,14,42,24),K(T('S1_01','Sardinia'),7.7,44.8,90),K(T('S1_01','Lombardy'),10,45.6,165),
 K(T('S1_01','Parma'),10.3,44.8,150),K(T('S1_01','Tuscany'),11.1,43.1,140),K(T('S1_01','pope'),12.5,41.8,120),
 K(T('S1_01','Naples'),14,40.5,90),K(T('S1_02','Milan'),9.2,45.5,160),K(T('S1_02','Venice'),12.3,45.4,160),
 K(T('S2_01','Cavour'),7.6,45.1,100),K(T('S2_01','Solferino'),10.56,45.37,150),K(T('S2_01','Lombardy'),10,45.5,140),
 K(T('S2_02','Quarto'),8.99,44.39,90),K(T('S2_02','Marsala'),12.44,37.8,90),K(T('S2_02','Naples'),14.27,40.85,100),
 K(T('S3_01','proclaimed'),12,42.5,40),K(T('S3_01','Venetia'),12.3,45.4,150),K(T('S3_02','Rome'),12.5,41.9,100),
 K(T('S3_02','capital'),12,42,42),{t:END_VO+1.5,lon:12,lat:42,scale:470},{t:TOTAL,lon:12,lat:42,scale:440},
];
const HOLD=(keys:CamKey[]):CamKey[]=>{const out:CamKey[]=[];for(let i=0;i<keys.length;i++){const a=keys[i],b=keys[i+1];out.push(a);if(!b)break;const dist=Math.hypot(b.lon-a.lon,b.lat-a.lat)+12*Math.abs(Math.log(b.scale/a.scale));const travel=Math.min(2.4,Math.max(1,0.8+0.05*dist));if(b.t-a.t>travel+.4&&a.scale>500)out.push({...a,t:b.t-travel});}return out;};
export const CAM4=HOLD(CAM5);
export const SFX=[
 {src:'audio/sfx/whoosh.wav',t:COLD_OPEN.quote+0.2,vol:.45},{src:'audio/sfx/hit.wav',t:COLD_OPEN.quote+1,vol:.55},
 ...FLAGS.map(f=>({src:'audio/sfx/thud.wav',t:f.t+.12,vol:.35})),
 ...YEARS.slice(1).map(y=>({src:'audio/sfx/tick.wav',t:y[0],vol:.18})),
 {src:'audio/sfx/drone.wav',t:QUOTES[0].t,vol:.35},{src:'audio/sfx/hit.wav',t:T('S3_02','Rome'),vol:.5},
];
export const MUSIC=[
 {src:'audio/music/Virtutes_Instrumenti.mp3',t:0,until:E('S1_02')+1,gain:.5,fadeIn:2,fadeOut:3},
 {src:'audio/music/Lightless_Dawn.mp3',t:T('S2_01')-1,until:E('S2_02')+2,gain:.47,fadeIn:2,fadeOut:3},
 {src:'audio/music/Impact_Lento.mp3',t:T('S3_01')-1,until:TOTAL,gain:.45,fadeIn:3,fadeOut:4},
];
