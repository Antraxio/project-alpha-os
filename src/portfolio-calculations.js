import {state} from './state.js?v=0.6.4';

export const valueOf=p=>p.cash+p.positions.reduce((s,x)=>s+x.current*x.shares,0);
export const realisedOf=p=>p.closedTrades.reduce((s,x)=>s+x.result,0);

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
