import {state} from './state.js';

export function normalisedWeights(){
  const w=state.settings.scoreWeights,total=Object.values(w).reduce((a,b)=>a+b,0)||1;
  return Object.fromEntries(Object.entries(w).map(([k,v])=>[k,v/total]));
}
export function opportunityScore(components,weights=normalisedWeights()){
  return Math.round(
    Object.entries(components).reduce(
      (sum,[key,value])=>sum+value*(weights[key]||0),
      0
    )
  );
}
export function profileName(){
  const presets=state.data.strategyPresets;
  for(const [name,p] of Object.entries(presets))if(JSON.stringify(p)===JSON.stringify(state.settings))return name;
  return 'custom';
}
export function movement(x,rank){
  if(x.previousRank===null)return{label:state.language==='de'?'Neu':'New',cls:'new',delta:null};
  const d=x.previousRank-rank;
  if(d>0)return{label:`▲ ${d}`,cls:'up',delta:d};
  if(d<0)return{label:`▼ ${Math.abs(d)}`,cls:'down',delta:d};
  return{label:'=',cls:'flat',delta:0};
}
export function scoreClass(s){return s>=state.settings.opportunityThreshold?'positive':s>=75?'warning-text':'negative'}
