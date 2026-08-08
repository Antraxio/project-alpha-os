import {state} from './state.js?v=0.6.7';
import {computeModel} from './strategy-ranking.js?v=0.6.7';

export function universeEntry(ticker){
  return state.data.universe.find(item=>item.ticker===ticker)||null;
}
export function modelEntry(ticker,model=computeModel()){
  return model.opportunities.find(item=>item.ticker===ticker)||null;
}
export function buildWatchlist(model=computeModel(),data=state.data){
  const rankedTickers=new Set(model.opportunities.map(item=>item.ticker));
  const ranked=model.opportunities.map((item,index)=>({
    position:index+1,
    ticker:item.ticker,
    name:item.name,
    opportunityScore:item.customScore,
    conviction:item.conviction,
    coverageStatus:'scored'
  }));
  const remaining=data.universe
    .filter(item=>!rankedTickers.has(item.ticker))
    .sort((a,b)=>a.universeOrder-b.universeOrder)
    .map((item,index)=>({
      position:ranked.length+index+1,
      ticker:item.ticker,
      name:item.name,
      opportunityScore:null,
      conviction:null,
      coverageStatus:item.coverageStatus
    }));
  return[...ranked,...remaining].slice(0,50);
}
export function activeDecisionSelection(){
  const model=computeModel();
  if(state.decisionMode==='manual'){
    const universe=universeEntry(state.manualDecisionTicker);
    return{mode:'manual',universe,scored:universe?modelEntry(universe.ticker,model):null,model};
  }
  const scored=model.candidate;
  return{mode:'auto',universe:scored?universeEntry(scored.ticker):null,scored,model};
}
