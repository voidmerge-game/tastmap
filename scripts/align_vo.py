#!/usr/bin/env python3
"""Whisper-small.en word alignment for generated benchmark narration."""
import json, subprocess
from pathlib import Path
import numpy as np
import imageio_ffmpeg
from faster_whisper import WhisperModel
from mutagen.mp3 import MP3


def decode_16k_mono(path):
    proc=subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(),'-v','error','-i',str(path),'-f','s16le','-acodec','pcm_s16le','-ar','16000','-ac','1','pipe:1'],check=True,stdout=subprocess.PIPE)
    return np.frombuffer(proc.stdout,dtype='<i2').astype(np.float32)/32768.0
ROOT=Path(__file__).resolve().parents[1]
chunks=json.loads((ROOT/'script/vo_chunks.json').read_text())
model=WhisperModel('small.en',device='cpu',compute_type='int8')
out=[]
for p in chunks:
    f=ROOT/'public/audio/vo/p'/f"{p['id']}.mp3"
    audio=decode_16k_mono(f)
    segs,info=model.transcribe(audio,language='en',word_timestamps=True,vad_filter=False,beam_size=5)
    words=[]
    for seg in segs:
        for w in (seg.words or []):
            words.append({'w':w.word.strip(),'s':round(float(w.start),2),'e':round(float(w.end),2)})
    duration=round(float(MP3(f).info.length),2)
    out.append({'id':p['id'],'file':f.relative_to(ROOT/'public').as_posix(),'duration':duration,'text':p['text'],'words':words})
    print(p['id'],duration,'s',len(words),'words',flush=True)
(ROOT/'public/audio/vo/paragraphs.json').write_text(json.dumps(out,ensure_ascii=False,indent=1))
(ROOT/'script/whisper_alignment.txt').write_text('\n'.join(f"{x['id']}: {len(x['words'])} words / {x['duration']} s" for x in out)+'\n')
