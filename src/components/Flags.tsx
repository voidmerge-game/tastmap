import React from 'react';
import type {Power} from '../theme';
/** Period-appropriate flags, simplified as crisp vector shapes. */
export const FlagSvg: React.FC<{power:Power;width:number;style?:React.CSSProperties}> = ({power,width,style}) => {
  const h=width*2/3, common={width,height:h,viewBox:'0 0 60 40',style:{display:'block',...style}} as const;
  switch(power){
    case 'sardinia': return <svg {...common}><rect width="60" height="40" fill="#fff"/><rect x="25" y="5" width="10" height="30" fill="#d71920"/><rect x="15" y="15" width="30" height="10" fill="#d71920"/><rect x="25" y="5" width="10" height="30" fill="none" stroke="#173b79" strokeWidth="2"/><rect x="15" y="15" width="30" height="10" fill="none" stroke="#173b79" strokeWidth="2"/></svg>;
    case 'austria': return <svg {...common}><rect width="60" height="20" fill="#111"/><rect y="20" width="60" height="20" fill="#f1c232"/></svg>;
    case 'papal': return <svg {...common}><rect width="30" height="40" fill="#ffdf00"/><rect x="30" width="30" height="40" fill="#fff"/><circle cx="45" cy="20" r="5" fill="#d5a900"/></svg>;
    case 'twosicilies': return <svg {...common}><rect width="60" height="40" fill="#fff"/><rect x="3" y="3" width="54" height="34" fill="none" stroke="#b41f2b" strokeWidth="4"/><rect x="7" y="7" width="46" height="26" fill="none" stroke="#d5ad37" strokeWidth="2"/><circle cx="30" cy="20" r="5" fill="#b41f2b"/></svg>;
    case 'france': return <svg {...common}><rect width="20" height="40" fill="#0055a4"/><rect x="20" width="20" height="40" fill="#fff"/><rect x="40" width="20" height="40" fill="#ef4135"/></svg>;
    case 'duchies': return <svg {...common}><rect width="60" height="40" fill="#86a06c"/><rect y="13" width="60" height="14" fill="#fff"/><rect y="17" width="60" height="6" fill="#b3271e"/></svg>;
    case 'italy': return <svg {...common}><rect width="20" height="40" fill="#009246"/><rect x="20" width="20" height="40" fill="#fff"/><rect x="40" width="20" height="40" fill="#ce2b37"/><rect x="25" y="12" width="10" height="16" fill="#fff" stroke="#d5ad37" strokeWidth="1"/><path d="M30 13v14M26 20h8" stroke="#ce2b37" strokeWidth="2"/></svg>;
    case 'independent': return <svg {...common}><rect width="60" height="20" fill="#69a9d1"/><rect y="20" width="60" height="20" fill="#fff"/><path d="M24 15h12v10H24z" fill="#d5ad37" stroke="#426b37" strokeWidth="2"/></svg>;
  }
};
