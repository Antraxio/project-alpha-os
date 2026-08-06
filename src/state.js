export const storage=globalThis.localStorage??{getItem:()=>null,setItem(){},removeItem(){}};
export const state={
  data:null,
  language:storage.getItem('alphaLanguage')||'de',
  settings:null,
  view:'dashboard',
  selectedTicker:'ASML',
  lastRanking:null,
  decisionMode:storage.getItem('alphaDecisionMode')||'auto',
  manualDecisionTicker:storage.getItem('alphaManualCandidate')||'ASML',
  selectedResearchTicker:storage.getItem('alphaResearchTicker')||'AAPL'
};
export const $=id=>document.getElementById(id);
export const clone=x=>JSON.parse(JSON.stringify(x));
export const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
export const loc=v=>v&&typeof v==='object'&&('de'in v||'en'in v)?(v[state.language]??v.de):v;
export const locale=()=>state.language==='de'?'de-DE':'en-GB';
export const euro=v=>new Intl.NumberFormat(locale(),{style:'currency',currency:'EUR'}).format(v);
export const pct=v=>`${v>=0?'+':''}${new Intl.NumberFormat(locale(),{minimumFractionDigits:2,maximumFractionDigits:2}).format(v)} %`;
export const num=(v,d=1)=>new Intl.NumberFormat(locale(),{minimumFractionDigits:d,maximumFractionDigits:d}).format(v);
export const dateFmt=v=>new Intl.DateTimeFormat(locale(),{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(v));
