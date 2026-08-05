const state={
  data:null,
  language:localStorage.getItem('alphaLanguage')||'de',
  settings:null,
  view:'dashboard',
  selectedTicker:'ASML',
  profile:'balanced',
  lastRanking:null,
  decisionMode:localStorage.getItem('alphaDecisionMode')||'auto',
  manualDecisionTicker:localStorage.getItem('alphaManualCandidate')||'ASML',
  selectedResearchTicker:localStorage.getItem('alphaResearchTicker')||'AAPL'
};
const $=id=>document.getElementById(id);
const clone=x=>JSON.parse(JSON.stringify(x));
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const loc=v=>v&&typeof v==='object'&&('de'in v||'en'in v)?(v[state.language]??v.de):v;
const locale=()=>state.language==='de'?'de-DE':'en-GB';
const euro=v=>new Intl.NumberFormat(locale(),{style:'currency',currency:'EUR'}).format(v);
const pct=v=>`${v>=0?'+':''}${new Intl.NumberFormat(locale(),{minimumFractionDigits:2,maximumFractionDigits:2}).format(v)} %`;
const num=(v,d=1)=>new Intl.NumberFormat(locale(),{minimumFractionDigits:d,maximumFractionDigits:d}).format(v);
const dateFmt=v=>new Intl.DateTimeFormat(locale(),{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(v));
