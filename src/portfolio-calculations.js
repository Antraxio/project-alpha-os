import {state} from './state.js?v=0.7.3';

// A holding records its country ("Germany"), a candidate its region ("Europe"). Comparing
// the two directly made every non-US region read as zero exposure. The mapping is derived
// from the data itself, where each scored and universe security carries both fields, so a
// new country needs no code change.
const regionCache=new WeakMap();
export function countryRegions(data=state.data){
  if(!data)return new Map();
  const cached=regionCache.get(data);
  if(cached)return cached;
  const map=new Map();
  for(const item of [...(data.opportunities??[]),...(data.universe??[])]){
    if(item.country&&item.region&&!map.has(item.country))map.set(item.country,item.region);
  }
  regionCache.set(data,map);
  return map;
}
export const regionOf=(country,data=state.data)=>countryRegions(data).get(country)??country;

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

export const hasStop=position=>Number.isFinite(position.stop);

export function positionRisk(position){
  if(!hasStop(position))return{ifStop:0,giveback:0,valueAtStop:position.current*position.shares,covered:false};
  return{
    ifStop:(position.stop-position.entry)*position.shares,
    giveback:(position.current-position.stop)*position.shares,
    valueAtStop:position.stop*position.shares,
    covered:true
  };
}

// Positions without a recorded stop cannot contribute a stop scenario. They are valued at
// the current price instead of being silently treated as if a stop existed, and the count
// of uncovered positions is reported so the gap stays visible.
export function portfolioRisk(p){
  const risks=p.positions.map(positionRisk);
  return{
    ifStop:risks.reduce((s,x)=>s+x.ifStop,0),
    giveback:risks.reduce((s,x)=>s+x.giveback,0),
    valueAtStop:p.cash+risks.reduce((s,x)=>s+x.valueAtStop,0),
    covered:risks.filter(x=>x.covered).length,
    uncovered:risks.filter(x=>!x.covered).length
  };
}

export function focusPosition(p){
  const eligible=p.positions.filter(x=>Number.isFinite(x.target1)&&Number.isFinite(x.current)&&x.current>0);
  if(!eligible.length)return null;
  return eligible.reduce((best,x)=>x.target1/x.current<best.target1/best.current?x:best);
}

// Size follows risk, not a fixed share of the portfolio. The loss taken if the stop
// triggers is held constant at riskBudgetPct of total assets, so a volatile security with
// a distant stop receives a smaller position than a quiet one. Three limits apply and the
// strictest wins: the risk budget, the maximum position size, and the spendable cash above
// the reserve. A stop at or above the entry price yields no size at all rather than an
// infinite one.
export function computeSizing(candidate){
  const p=state.data.portfolio,portfolio=valueOf(p);
  const reserve=portfolio*state.settings.cashReservePct/100;
  const spendable=Math.max(0,p.cash-reserve);
  const riskBudget=portfolio*(state.settings.riskBudgetPct??0)/100;
  const riskPerShare=candidate.price-candidate.stop;
  const budgetAmount=riskPerShare>0?riskBudget/riskPerShare*candidate.price:0;
  const capAmount=portfolio*(state.settings.maxPositionPct??state.settings.targetPositionPct)/100;
  const allowed=Math.min(budgetAmount,capAmount,spendable);
  let shares=Math.floor(allowed/candidate.price);

  // A single share that would breach the risk budget is reported, never silently proposed.
  const oneShareAffordable=candidate.price<=Math.min(capAmount,spendable);
  const aboveRiskBudget=shares===0&&oneShareAffordable&&riskPerShare>0;
  const cappedByPosition=budgetAmount>capAmount&&capAmount<=spendable;
  const cappedByCash=Math.min(budgetAmount,capAmount)>spendable;
  const amount=shares*candidate.price;
  const allocationPct=portfolio?amount/portfolio*100:0;
  const currentInvested=p.positions.reduce((s,x)=>s+x.current*x.shares,0);
  const postInvested=currentInvested+amount;
  const sectorExisting=p.positions.filter(x=>x.sector===candidate.sector).reduce((s,x)=>s+x.current*x.shares,0);
  const regionExisting=p.positions.filter(x=>regionOf(x.country)===candidate.region).reduce((s,x)=>s+x.current*x.shares,0);
  const sectorPct=postInvested?((sectorExisting+amount)/postInvested*100):0;
  const regionPct=postInvested?((regionExisting+amount)/postInvested*100):0;
  const riskAmount=riskPerShare>0?riskPerShare*shares:0;
  return{
    shares,amount,allocationPct,spendable,reserve,sectorPct,regionPct,
    riskBudget,riskPerShare,riskAmount,
    riskPct:portfolio?riskAmount/portfolio*100:0,
    stopDistancePct:candidate.price?riskPerShare/candidate.price*100:0,
    aboveRiskBudget,cappedByPosition,cappedByCash,
    concentrationWarning:allocationPct>state.settings.concentrationWarningPct,
    sectorWarning:sectorPct>state.settings.maxSectorExposurePct,
    regionWarning:regionPct>state.settings.maxRegionExposurePct
  };
}
