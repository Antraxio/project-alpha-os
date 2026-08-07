import {clamp,euro,num,state} from './state.js?v=0.6.6';
import {opportunityScore,strategyComponentScore} from './scoring.js?v=0.6.6';
import {computeSizing,valueOf} from './portfolio-calculations.js?v=0.6.6';
import {isRankingEligible} from './research-pipeline.js?v=0.6.6';
import {wholeShareLabel} from './translations.js?v=0.6.6';

export function strategyFitFor(o,intrinsicScore,activeComponentScore,held){
  const p=state.data.portfolios.chatgpt;
  const portfolioValue=valueOf(p);
  const isHeld=held.has(o.ticker);
  const entryMid=(o.entryLow+o.entryHigh)/2;
  const entryCrv=(o.target-entryMid)/Math.max(.01,entryMid-o.stop);
  const inZone=o.price>=o.entryLow&&o.price<=o.entryHigh;
  let sizing=computeSizing(o);
  let allocationPct=sizing.allocationPct;
  let sectorPct=sizing.sectorPct;
  let regionPct=sizing.regionPct;
  let affordable=sizing.shares>=1;

  if(isHeld){
    const position=p.positions.find(x=>x.ticker===o.ticker);
    const positionValue=position.current*position.shares;
    const investedValue=p.positions.reduce((s,x)=>s+x.current*x.shares,0);
    allocationPct=positionValue/portfolioValue*100;
    sectorPct=investedValue
      ?p.positions.filter(x=>x.sector===position.sector).reduce((s,x)=>s+x.current*x.shares,0)/investedValue*100
      :0;
    regionPct=investedValue
      ?p.positions.filter(x=>x.country===position.country).reduce((s,x)=>s+x.current*x.shares,0)/investedValue*100
      :0;
    affordable=true;
    sizing={...sizing,shares:position.shares,amount:positionValue,allocationPct,sectorPct,regionPct};
  }

  const affordabilityAdj=affordable?0:-12;
  const positionAdj=affordable
    ?-Math.min(5,Math.abs(allocationPct-state.settings.targetPositionPct)*0.15)
    :0;
  const crvAdj=clamp((entryCrv-state.settings.minCrv)*2,-5,4);
  const zoneDistancePct=o.price>o.entryHigh
    ?(o.price/o.entryHigh-1)*100
    :o.price<o.entryLow
      ?(o.entryLow/o.price-1)*100
      :0;
  const priceAdj=isHeld?0:(inZone?2:-Math.min(3,zoneDistancePct));
  const concentrationAdj=-Math.min(
    4,
    Math.max(0,allocationPct-state.settings.concentrationWarningPct)*0.2
  );
  const sectorAdj=-Math.min(
    4,
    Math.max(0,sectorPct-state.settings.maxSectorExposurePct)*0.15
  );
  const regionAdj=-Math.min(
    4,
    Math.max(0,regionPct-state.settings.maxRegionExposurePct)*0.15
  );
  const portfolioFitAdjustment=
    affordabilityAdj+positionAdj+crvAdj+priceAdj+
    concentrationAdj+sectorAdj+regionAdj;
  const componentWeightAdjustment=activeComponentScore-intrinsicScore;
  const adjustment=componentWeightAdjustment+portfolioFitAdjustment;
  const strategyScore=clamp(Math.round(intrinsicScore+adjustment),0,100);

  const reasons=[
    {key:'componentWeightFit',value:componentWeightAdjustment},
    {key:'affordability',value:affordabilityAdj},
    {key:'positionFit',value:positionAdj},
    {key:'crvFit',value:crvAdj},
    {key:'priceFit',value:priceAdj},
    {key:'diversificationFit',value:concentrationAdj+sectorAdj+regionAdj}
  ];

  return{
    strategyScore,
    fitAdjustment:adjustment,
    componentWeightAdjustment,
    portfolioFitAdjustment,
    strategyComponentScore:activeComponentScore,
    fitReasons:reasons,
    entryCrv,
    inZone,
    sizing,
    allocationPct,
    sectorPct,
    regionPct,
    isHeld
  };
}
export function computeModel(){
  const held=new Set(
    state.data.portfolios.chatgpt.positions.map(x=>x.ticker)
  );

  const opportunities=state.data.opportunities.filter(o=>isRankingEligible(o)).map(o=>{
    const customScore=opportunityScore(o.components);
    const activeComponentScore=strategyComponentScore(o.components);
    const fit=strategyFitFor(o,customScore,activeComponentScore,held);
    return{...o,opportunityScore:customScore,customScore,...fit};
  }).sort((a,b)=>
    b.strategyScore-a.strategyScore ||
    b.strategyComponentScore-a.strategyComponentScore ||
    b.ras-a.ras ||
    b.customScore-a.customScore
  ).map((o,index)=>({...o,customRank:index+1}));

  const newCandidates=opportunities.filter(o=>!held.has(o.ticker));
  const candidate=newCandidates[0];
  const second=newCandidates[1];
  const heldBest=opportunities
    .filter(o=>held.has(o.ticker))
    .sort((a,b)=>b.strategyScore-a.strategyScore)[0];

  if(!candidate){
    return{
      opportunities,candidate:null,second:null,heldBest,
      sizing:null,ras:null,gates:[],allPassed:false,
      cashAdv:null,heldGap:null,inZone:false,hasEligibleCandidate:false
    };
  }

  const sizing=candidate.sizing;
  const cashAdv=candidate.strategyComponentScore-state.settings.cashHurdle;
  const secondGap=
    candidate.strategyScore-(second?.strategyScore??candidate.strategyScore);
  const heldGap=
    candidate.strategyScore-(heldBest?.strategyScore??candidate.strategyScore);
  const inZone=candidate.inZone;

  const ras=clamp(
    Math.round(
      50+
      cashAdv*3+
      secondGap*2+
      heldGap+
      (inZone?4:-5)-
      (sizing.concentrationWarning?4:0)-
      (sizing.sectorWarning?3:0)-
      (sizing.regionWarning?3:0)
    ),
    0,
    100
  );

  const gates=[
    {
      key:'scoreGate',
      pass:candidate.customScore>=state.settings.opportunityThreshold,
      detail:`${candidate.customScore} ≥ ${state.settings.opportunityThreshold}`
    },
    {
      key:'cashGate',
      pass:cashAdv>=state.settings.cashSafetyMargin,
      detail:`${cashAdv>=0?'+':''}${cashAdv} / +${state.settings.cashSafetyMargin}`
    },
    {
      key:'switchGate',
      pass:heldGap>=state.settings.switchMargin,
      detail:`${heldGap>=0?'+':''}${heldGap} / +${state.settings.switchMargin}`
    },
    {
      key:'priceGate',
      pass:inZone,
      detail:`${euro(candidate.entryLow)}–${euro(candidate.entryHigh)}`
    },
    {
      key:'crvGate',
      pass:candidate.entryCrv>=state.settings.minCrv,
      detail:`${num(candidate.entryCrv,2)} / ${num(state.settings.minCrv,1)}`
    },
    {
      key:'sizingGate',
      pass:sizing.shares>=1,
      detail:wholeShareLabel(sizing.shares)
    }
  ];

  return{
    opportunities,
    candidate,
    second,
    heldBest,
    sizing,
    ras,
    gates,
    allPassed:gates.every(g=>g.pass),
    cashAdv,
    heldGap,
    inZone,
    hasEligibleCandidate:true
  };
}
