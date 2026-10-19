import React from 'react';
import {AbsoluteFill} from 'remotion';
import {FONT,C} from './theme';
/** Small 15-second composition kept for quick pipeline smoke tests. */
export const Demo:React.FC=()=> <AbsoluteFill style={{justifyContent:'center',alignItems:'center',background:'#050a12',color:C.gold,fontFamily:FONT.title,fontSize:72,letterSpacing:8}}>ATLAS-DOC · ITALY</AbsoluteFill>;
