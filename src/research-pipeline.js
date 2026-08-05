import {state} from './state.js';

export const REQUIRED_RESEARCH_CHECKLIST=Object.freeze([
  'identity','primarySources','fundamental','catalyst','risk',
  'marketData','technical','setup','review'
]);

export function researchRecord(ticker,data=state.data){
  return data.researchPipeline?.records?.find(record=>record.ticker===ticker)||null;
}

export function isResearchRecordComplete(record){
  return Boolean(
    record&&
    record.stage==='approved'&&
    REQUIRED_RESEARCH_CHECKLIST.every(key=>
      Object.prototype.hasOwnProperty.call(record.checklist||{},key)&&
      record.checklist[key]===true
    )
  );
}

function isCompleteLegacyScoredOpportunity(opportunity){
  const componentKeys=['fundamental','technical','catalyst','risk','macro','diversification'];
  const numericKeys=['price','entryLow','entryHigh','stop','target'];
  return Boolean(
    opportunity&&
    componentKeys.every(key=>Number.isFinite(opportunity.components?.[key]))&&
    numericKeys.every(key=>Number.isFinite(opportunity[key]))
  );
}

export function isRankingEligible(opportunity,data=state.data){
  const universe=data.universe?.find(item=>item.ticker===opportunity?.ticker);
  if(!universe||universe.coverageStatus!=='scored')return false;

  const dossier=researchRecord(opportunity.ticker,data);
  if(dossier)return isResearchRecordComplete(dossier);

  // v0.6.0 scored records predate dossiers. They remain eligible only when
  // their complete governed score and execution fields are present.
  return isCompleteLegacyScoredOpportunity(opportunity);
}

export function isResearchPending(ticker,data=state.data){
  const opportunity=data.opportunities?.find(item=>item.ticker===ticker);
  return !isRankingEligible(opportunity,data);
}
