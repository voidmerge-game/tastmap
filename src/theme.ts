export const W = 1920;
export const H = 1080;
export const FPS = 30;
export const C = {
  ocean:'#0b1d2e', oceanLight:'#163a57', land:'#b9a77d', landDark:'#8f7d57', landShade:'#6f6042',
  border:'rgba(40,30,15,0.55)', graticule:'rgba(255,255,255,0.06)', ink:'#1a1410', paper:'#efe6d2',
  gold:'#d6b36a', red:'#b3271e', white:'#f5f1e8', shadow:'rgba(0,0,0,0.55)',
  sardinia:'#6f93a8', austria:'#8c8a7a', papal:'#d9c27a', twosicilies:'#b47a70', france:'#4f6f9a',
  duchies:'#86a06c', italy:'#6d7250', independent:'#cdb38a',
};
export type Power = 'sardinia'|'austria'|'papal'|'twosicilies'|'france'|'duchies'|'italy'|'independent';
export const POWER_NAME: Record<Power,string> = {
  sardinia:'SARDINIA-PIEDMONT', austria:'AUSTRIA', papal:'PAPAL STATES', twosicilies:'TWO SICILIES',
  france:'FRANCE', duchies:'ITALIAN DUCHIES', italy:'KINGDOM OF ITALY', independent:'SAN MARINO',
};
export const FONT = {title:'Cinzel',label:'Barlow Condensed',map:'Montserrat',type:'Special Elite',body:'Barlow'};
