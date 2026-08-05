function researchRecord(ticker){
  return state.data.researchPipeline?.records?.find(record=>record.ticker===ticker)||null;
}
function isResearchPending(ticker,data=state.data){
  const record=data.researchPipeline?.records?.find(item=>item.ticker===ticker);
  if(!record)return false;
  return record.stage!=='approved'||Object.values(record.checklist||{}).some(value=>value!==true);
}
function researchStageLabel(stage){
  const map={
    market_refresh_required:'marketRefreshRequired',
    technical_pending:'technicalPending',
    ready_for_review:'readyForReview',
    approved:'approved'
  };
  return t(map[stage]||stage);
}
function researchConfidenceLabel(value){
  return t(value||'medium');
}
function checklistLabel(key){
  const map={
    identity:'identityCheck',
    primarySources:'primarySourcesCheck',
    fundamental:'fundamentalCheck',
    catalyst:'catalystCheck',
    risk:'riskCheck',
    marketData:'marketDataCheck',
    technical:'technicalCheck',
    setup:'setupCheck',
    review:'reviewCheck'
  };
  return t(map[key]||key);
}
function setResearchTicker(ticker,openPage=false){
  state.selectedResearchTicker=ticker;
  localStorage.setItem('alphaResearchTicker',ticker);
  if(openPage) switchView('research');
  else renderResearch();
}
