#!/usr/bin/env python3
"""Procedural, royalty-free short sound effects for the Italy benchmark."""
from pathlib import Path
import wave
import numpy as np
SR=48000
OUT=Path(__file__).resolve().parents[1]/'public/audio/sfx'
OUT.mkdir(parents=True,exist_ok=True)
rng=np.random.default_rng(1861)
def t(d):return np.arange(int(SR*d))/SR
def env(d,a,r):return np.minimum(1,t(d)/a)*np.exp(-t(d)/r)
def save(name,x):
 x=np.asarray(x,dtype=np.float64);x=np.clip(x/(np.max(np.abs(x))+1e-9)*.9,-1,1)
 with wave.open(str(OUT/f'{name}.wav'),'wb') as w:
  w.setnchannels(1);w.setsampwidth(2);w.setframerate(SR);w.writeframes((x*32767).astype('<i2').tobytes())
save('thud',(np.sin(2*np.pi*(70+30*np.exp(-t(.5)*18))*t(.5))+.3*rng.standard_normal(len(t(.5)))*np.exp(-t(.5)*60))*env(.5,.003,.12))
save('hit',(np.sin(2*np.pi*55*t(1.6))+.5*rng.standard_normal(len(t(1.6)))*np.exp(-t(1.6)*25))*env(1.6,.002,.45))
n=rng.standard_normal(len(t(1.2)));save('whoosh',np.convolve(n,np.ones(64)/64,'same')*np.sin(np.pi*t(1.2)/1.2)**2)
save('tick',rng.standard_normal(len(t(.06)))*env(.06,.001,.012))
save('key',rng.standard_normal(len(t(.09)))*env(.09,.001,.02)+.3*np.sin(2*np.pi*1800*t(.09))*env(.09,.001,.01))
save('ink',np.convolve(rng.standard_normal(len(t(1.4))),np.ones(400)/400,'same')*env(1.4,.3,.6))
d=6.;save('drone',(np.sin(2*np.pi*48*t(d))+.5*np.sin(2*np.pi*72.2*t(d))+.25*np.sin(2*np.pi*96.5*t(d)))*np.sin(np.pi*t(d)/d)**.7)
print('created',len(list(OUT.glob('*.wav'))),'SFX files at',SR,'Hz')
