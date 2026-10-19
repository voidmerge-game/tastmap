import React,{useEffect,useMemo,useState} from 'react';
import {AbsoluteFill,Audio,Sequence,continueRender,delayRender,interpolate,staticFile,useCurrentFrame,useVideoConfig} from 'remotion';
import {WorldMap,Layer} from './components/WorldMap';
import {useTopo} from './lib/geo';
import {camAt,camWithDrift,prog,clamp01} from './lib/anim';
import {C,FONT,Power} from './theme';
import {FlagDrop,YearBadge,TableArchive,QuoteCard,CardPop,Grain} from './components/Ui';
import {Title3D,TimelineRibbon,ShareChart,Grade} from './components/Extras';
import {RIBBON_WIN,CHART_WIN} from './lib/reserve';
import {ensureFonts} from './lib/fonts';
import {PARAS,TOTAL,FIRST_VO,COLD_OPEN,END_VO,OUTRO,T,E,voActive} from './timeline';
import {OWNER_1815,OWNER_1871,FLAGS,FLAGS_EXTRA,LABELS,ARCHIVE,QUOTES,yearAt,CAM4,SFX,MUSIC,BIG,CITIES,CALLOUTS,ROUTES,PULSES,LIGHT_LABELS} from './events';
import {Names,City,Callout,Route,Pulse,LabelGuard} from './components/Motion';
import {MapLabel} from './components/Ui';

export const MAIN_DURATION_SEC=TOTAL;
const FILL:Record<Power,string>={sardinia:'#6f93a8',austria:'#8c8a7a',papal:'#d9c27a',twosicilies:'#b47a70',france:'#4f6f9a',duchies:'#86a06c',italy:'#6d7250',independent:'#cdb38a'};
const shade=(hex:string,name:string)=>{let h=0;for(let i=0;i<name.length;i++)h=(h*31+name.charCodeAt(i))>>>0;const k=1+(((h%1000)/1000)*2-1)*.08;const n=parseInt(hex.slice(1),16);return `rgb(${Math.min(255,Math.round(((n>>16)&255)*k))},${Math.min(255,Math.round(((n>>8)&255)*k))},${Math.min(255,Math.round((n&255)*k))})`;};

const CreditRoll:React.FC<{t0:number}> = ({t0})=>{
 const frame=useCurrentFrame(),{fps}=useVideoConfig(),t=frame/fps-t0;if(t<0)return null;
 const rows=['THE UNIFICATION OF ITALY','ATLAS-DOC KIT TEST · 1815–1871','','MAPS','Natural Earth 10m admin-1 unions · public domain','Earth imagery: NASA Blue Marble · public domain','','ARCHIVE','Camillo Cavour portrait · Wikimedia Commons · public domain','Giuseppe Garibaldi portrait · Fratelli Alinari · public domain','Victor Emmanuel II · Wikimedia Commons · public domain','Venice Grand Canal · Alexandre Promio / Lumière · 1896 · public domain','','MUSIC','Kevin MacLeod · incompetech.com · CC BY 4.0','Virtutes Instrumenti · Lightless Dawn · Impact Lento','','VOICE & SOUND','American English neural narration · word-timed with Whisper','Procedurally generated sound effects'];
 const y=interpolate(t,[0,OUTRO.credits],[1070,-rows.length*48]);
 return <AbsoluteFill style={{pointerEvents:'none'}}><div style={{position:'absolute',top:y,left:260,width:1400,textAlign:'center'}}>{rows.map((s,i)=><div key={i} style={{height:48,lineHeight:'48px',fontFamily:i===0?FONT.title:FONT.label,fontWeight:i===0||['MAPS','ARCHIVE','MUSIC','VOICE & SOUND'].includes(s)?700:400,fontSize:i===0?46:26,letterSpacing:i===0?5:2,color:['MAPS','ARCHIVE','MUSIC','VOICE & SOUND'].includes(s)?C.gold:C.white,textShadow:'0 2px 8px #000'}}>{s}</div>)}</div></AbsoluteFill>;
};

const ColdOpen:React.FC=()=>{const f=useCurrentFrame();if(f>=COLD_OPEN.quote*30)return null;const op=interpolate(f,[0,10,120,150],[0,1,1,0],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});return <AbsoluteFill style={{justifyContent:'center',alignItems:'center',opacity:op,background:'radial-gradient(ellipse at center,rgba(5,10,18,.12),rgba(5,10,18,.5))'}}><div style={{fontFamily:FONT.label,fontSize:48,fontWeight:700,letterSpacing:10,color:C.paper,textAlign:'center',textShadow:'0 4px 24px #000'}}>A PENINSULA<br/>DIVIDED</div><div style={{position:'absolute',bottom:180,fontFamily:FONT.label,fontSize:21,letterSpacing:5,color:C.gold}}>SEVEN STATES · ONE FUTURE</div></AbsoluteFill>;};

export const Main:React.FC=()=>{
 const frame=useCurrentFrame(),{fps}=useVideoConfig(),t=frame/fps;
 const [fontWait]=useState(()=>delayRender('atlas-fonts'));
 useEffect(()=>{ensureFonts().then(()=>continueRender(fontWait));},[fontWait]);
 const land=useTopo('land_world'),map1815=useTopo('italy_1815'),map1871=useTopo('italy_1871');
 const cam=camWithDrift(CAM4,t);
 const moveBlur=(()=>{const a=camAt(CAM4,t-1/fps),b=camAt(CAM4,t+1/fps);const zr=Math.abs(Math.log(b.scale/a.scale))/2;const pan=(Math.hypot(b.lon-a.lon,b.lat-a.lat)/2)*(cam.scale/57.3);return Math.min(6,Math.max(0,zr*90+pan*.022-.5));})();
 const transition=prog(frame,T('S3_01','proclaimed')*fps,(T('S3_01','proclaimed')+2.5)*fps);
 const quoteOn=QUOTES.some(q=>t>=q.t&&t<=q.until);
 const layers:Layer[]=useMemo(()=>[
  {id:'italy-1815',fc:map1815,fill:f=>shade(FILL[(OWNER_1815[f.properties.NAME]??'duchies') as Power]??'#9a988c',f.properties.NAME),stroke:'rgba(240,228,210,0.9)',strokeWidth:1.3,blend:'multiply',wash:.32,strokeOnTop:true,shadow:true,opacity:()=>.9*(1-transition)},
  {id:'italy-1871',fc:map1871,fill:f=>shade(FILL[(OWNER_1871[f.properties.NAME]??'italy') as Power]??'#6d7250',f.properties.NAME),stroke:'rgba(240,228,210,0.9)',strokeWidth:1.3,blend:'multiply',wash:.32,strokeOnTop:true,shadow:true,opacity:()=>.9*transition},
 ],[map1815,map1871,transition]);
 const atlas=prog(frame,(FIRST_VO-4)*fps,(FIRST_VO+.5)*fps);
 return <AbsoluteFill style={{background:'#050a12'}}>
  <AbsoluteFill style={moveBlur>.2?{filter:`blur(${moveBlur.toFixed(1)}px)`,transform:`scale(${1+moveBlur*.006})`}:undefined}>
   <WorldMap cam={cam} land={land} layers={layers} vignette={quoteOn?.9:.55} atlas={atlas} clouds={Math.max(0,atlas)} cloudDrift={t*.012}>
    {ROUTES.map((r,i)=><Route key={`route-${i}`} pts={r.pts} at={Math.round(r.t*fps)} until={Math.round(r.until*fps)} color={r.color} width={r.width} dashed={r.dashed} drawDur={r.drawDur} head={r.head}/>)}
    {PULSES.map((p,i)=><Pulse key={`pulse-${i}`} lon={p.lon} lat={p.lat} at={Math.round(p.t*fps)} until={Math.round(p.until*fps)} color={p.color}/>)}
    <Names fps={fps} light={LIGHT_LABELS}/>
    <LabelGuard fps={fps}>
     {CITIES.map((c,i)=><City key={`city-${i}`} lon={c.lon} lat={c.lat} name={c.name} at={Math.round((c.t??0)*fps)} until={c.until?Math.round(c.until*fps):undefined} minScale={c.minScale} capital={c.capital} side={c.side}/>)}
     {LABELS.map((l,i)=><MapLabel key={`label-${i}`} lon={l.lon} lat={l.lat} text={l.text} at={Math.round(l.t*fps)} until={l.until?Math.round(l.until*fps):undefined} kind={l.kind??'city'} size={l.size??26}/>)}
     {[...FLAGS,...FLAGS_EXTRA].map((f,i)=><FlagDrop key={`flag-${i}`} lon={f.lon} lat={f.lat} power={f.power} at={Math.round(f.t*fps)} until={f.until?Math.round(f.until*fps):undefined} label={f.label} width={f.w??72}/>)}
     {CALLOUTS.map((c,i)=><Callout key={`callout-${i}`} lon={c.lon} lat={c.lat} text={c.text} sub={c.sub} at={Math.round(c.t*fps)} until={Math.round(c.until*fps)} dx={c.dx??0} dy={c.dy??-250}/>)}
    </LabelGuard>
   </WorldMap>
  </AbsoluteFill>
  {t>=FIRST_VO&&!quoteOn&&t<END_VO+1.5&&<YearBadge year={yearAt(t)}/>}
  {!quoteOn&&<TimelineRibbon t={t} from={RIBBON_WIN.t0} until={RIBBON_WIN.t1}/>}
  <ShareChart t={t} from={CHART_WIN.t0} until={CHART_WIN.t1}/>
  {ARCHIVE.map((a,i)=>{const cap=a.caption.includes(' — ')?a.caption.split(' — ')[0]:a.caption;const sub=a.caption.includes(' — ')?a.caption.split(' — ').slice(1).join(' — '):undefined;if(a.wall){const prev=ARCHIVE[(i+ARCHIVE.length-1)%ARCHIVE.length].src,next=ARCHIVE[(i+1)%ARCHIVE.length].src;return <TableArchive key={`archive-${i}`} src={a.src} caption={a.caption} at={Math.round(a.t*fps)} until={Math.round(a.until*fps)} sides={[prev,next]} sepia={a.sepia??.25} sign={a.sign}/>;}return <CardPop key={`archive-${i}`} src={a.src} video={a.video} caption={cap} sub={sub} at={Math.round(a.t*fps)} until={Math.round(a.until*fps)} x={a.x} y={a.y} w={a.w} h={a.h} sepia={a.sepia??.25}/>;})}
  <ColdOpen/>
  <Title3D title="THE UNIFICATION OF ITALY" sub="1815 — 1871" at={Math.round(COLD_OPEN.quote*fps)} until={Math.round(FIRST_VO*fps)}/>
  {QUOTES.map((q,i)=><QuoteCard key={`quote-${i}`} text={q.text} author={q.author} source={q.source} at={Math.round(q.t*fps)} until={Math.round(q.until*fps)}/>)}
  {t>=END_VO+1.5+OUTRO.card-1&&<AbsoluteFill style={{background:'rgba(3,6,12,.62)',opacity:clamp01((t-(END_VO+1.5+OUTRO.card-1))/1.5)}}/>}
  <CreditRoll t0={END_VO+1.5+OUTRO.card}/>
  <Grade amount={.9}/><Grain amount={.06}/>
  {PARAS.map(p=><Sequence key={p.id} from={Math.round(p.start*fps)} durationInFrames={Math.round((p.duration+.3)*fps)} name={p.id}><Audio src={staticFile(p.file)} volume={1}/></Sequence>)}
  {MUSIC.map((m:any,i:number)=>{const from=Math.max(0,Math.round(m.t*fps)),dur=Math.round((m.until-m.t)*fps);return <Sequence key={`music-${i}`} from={from} durationInFrames={dur} name={`music-${i}`}><Audio src={staticFile(m.src)} startFrom={Math.round((m.offset??0)*fps)} volume={f=>{const tt=m.t+f/fps,fi=m.fadeIn?clamp01(f/(m.fadeIn*fps)):1,fo=m.fadeOut?clamp01((dur-f)/(m.fadeOut*fps)):1;return m.gain*fi*fo*(voActive(tt)?.5:1)*.9;}}/></Sequence>;})}
  {SFX.map((s:any,i:number)=><Sequence key={`sfx-${i}`} from={Math.max(0,Math.round(s.t*fps))} durationInFrames={Math.round(6.5*fps)} name={`sfx-${i}`}><Audio src={staticFile(s.src)} volume={s.vol??.5}/></Sequence>)}
 </AbsoluteFill>;
};
