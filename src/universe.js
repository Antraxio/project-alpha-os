import {state} from './state.js';
import {computeModel} from './strategy-ranking.js';

export function universeEntry(ticker){
  return state.data.universe.find(item=>item.ticker===ticker)||null;
}
export function modelEntry(ticker,model=computeModel()){
  return model.opportunities.find(item=>item.ticker===ticker)||null;
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
