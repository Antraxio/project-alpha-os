import {state} from './state.js?v=0.7.5';

export const REQUIRED_RESEARCH_CHECKLIST=Object.freeze([
  'identity','primarySources','fundamental','catalyst','risk',
  'marketData','technical','setup','review'
]);

export const LEGACY_V060_SCORED_TICKERS=Object.freeze([
  'MSFT','ASML','BKNG','NOVO-B','TSM','ENEL','HNR1','JPM','DTE','SHEL'
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

// Reports *why* a security may be ranked, not only whether it may. A ranking that rests on
// the inherited exception is not the same as one backed by an approved dossier, and the
// difference has to be visible wherever a score is shown.
export function rankingBasis(opportunity,data=state.data){
  const universe=data.universe?.find(item=>item.ticker===opportunity?.ticker);
  if(!universe||universe.coverageStatus!=='scored')return{eligible:false,basis:null,reason:'notScored'};

  const dossier=researchRecord(opportunity.ticker,data);
  if(dossier){
    return isResearchRecordComplete(dossier)
      ?{eligible:true,basis:'dossier',reason:'dossierApproved'}
      :{eligible:false,basis:null,reason:'dossierIncomplete'};
  }

  // Only the scored records inherited from the v0.6.0 snapshot may use the
  // compatibility path. Every new security must have an approved dossier. Supplying a
  // dossier supersedes the exception above, which is the migration path.
  return LEGACY_V060_SCORED_TICKERS.includes(opportunity.ticker)&&
    isCompleteLegacyScoredOpportunity(opportunity)
      ?{eligible:true,basis:'legacy',reason:'legacyInherited'}
      :{eligible:false,basis:null,reason:'noDossier'};
}

export function isRankingEligible(opportunity,data=state.data){
  return rankingBasis(opportunity,data).eligible;
}

// How far the inherited securities have been moved onto documented dossiers.
export function legacyMigrationProgress(data=state.data){
  const inherited=LEGACY_V060_SCORED_TICKERS.map(ticker=>({
    ticker,
    basis:rankingBasis(data.opportunities?.find(item=>item.ticker===ticker),data).basis
  }));
  const migrated=inherited.filter(item=>item.basis==='dossier');
  const remaining=inherited.filter(item=>item.basis==='legacy');
  return{
    total:inherited.length,
    migrated:migrated.map(item=>item.ticker),
    remaining:remaining.map(item=>item.ticker),
    complete:remaining.length===0
  };
}

export function isResearchPending(ticker,data=state.data){
  const opportunity=data.opportunities?.find(item=>item.ticker===ticker);
  return !isRankingEligible(opportunity,data);
}
