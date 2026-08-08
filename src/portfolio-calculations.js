import {state} from './state.js?v=0.6.7';

export const valueOf=p=>p.cash+p.positions.reduce((s,x)=>s+x.current*x.shares,0);
export const realisedOf=p=>p.closedTrades.reduce((s,x)=>s+x.result,0);
export const investedOf=p=>p.positions.reduce((s,x)=>s+x.current*x.shares,0);
export const costBasisOf=p=>p.positions.reduce((s,x)=>s+x.entry*x.shares,0);
export const unrealisedOf=p=>p.positions.reduce((s,x)=>s+(x.current-x.entry)*x.shares,0);

export function exposureBreakdown(positions,key){
  const invested=positions.reduce((s,x)=>s+x.current*x.shares,0);
  if(!invested)return[];
  const totals=new Map();
  for(const position of positions){
    const value=position.current*position.shares;
    totals.set(position[key],(totals.get(position[key])??0)+value);
  }
  return[...totals]
    .map(([name,value])=>({name,value,pct:value/invested*100}))
    .sort((a,b)=>b.value-a.value||String(a.name).localeCompare(String(b.name)));
}

export function positionRisk(position){
  return{
    ifStop:(position.stop-position.entry)*position.shares,
    giveback:(position.current-position.stop)*position.shares,
    valueAtStop:position.stop*position.shares
  };
}

export function portfolioRisk(p){
  const risks=p.positions.map(positionRisk);
  return{
    ifStop:risks.reduce((s,x)=>s+x.ifStop,0),
    giveback:risks.reduce((s,x)=>s+x.giveback,0),
    valueAtStop:p.cash+risks.reduce((s,x)=>s+x.valueAtStop,0)
  };
}

export function focusPosition(p){
  const eligible=p.positions.filter(x=>Number.isFinite(x.target1)&&Number.isFinite(x.current)&&x.current>0);
  if(!eligible.length)return null;
  return eligible.reduce((best,x)=>x.target1/x.current<best.target1/best.current?x:best);
}

export function computeSizing(candidate){
  const p=state.data.portfolios.chatgpt,portfolio=valueOf(p);
  const reserve=portfolio*state.settings.cashReservePct/100;
  const spendable=Math.max(0,p.cash-reserve);
  const targetAmount=portfolio*state.settings.targetPositionPct/100;
  let shares=Math.floor(Math.min(targetAmount,spendable)/candidate.price);
  let aboveTarget=false;
  if(shares===0&&candidate.price<=spendable){shares=1;aboveTarget=true}
  const amount=shares*candidate.price;
  const allocationPct=portfolio?amount/portfolio*100:0;
  const currentInvested=p.positions.reduce((s,x)=>s+x.current*x.shares,0);
  const postInvested=currentInvested+amount;
  const sectorExisting=p.positions.filter(x=>x.sector===candidate.sector).reduce((s,x)=>s+x.current*x.shares,0);
  const regionExisting=p.positions.filter(x=>x.country===(candidate.region==='USA'?'USA':candidate.region)).reduce((s,x)=>s+x.current*x.shares,0);
  const sectorPct=postInvested?((sectorExisting+amount)/postInvested*100):0;
  const regionPct=postInvested?((regionExisting+amount)/postInvested*100):0;
  return{
    shares,amount,allocationPct,aboveTarget,spendable,reserve,sectorPct,regionPct,
    concentrationWarning:allocationPct>state.settings.concentrationWarningPct,
    sectorWarning:sectorPct>state.settings.maxSectorExposurePct,
    regionWarning:regionPct>state.settings.maxRegionExposurePct
  };
}
