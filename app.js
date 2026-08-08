import {$,clone,dateFmt,euro,loc,num,state,storage} from './src/state.js?v=0.7.5';
import {profileName} from './src/scoring.js?v=0.7.5';
import {computeModel} from './src/strategy-ranking.js?v=0.7.5';
import {regionName,sectorName,t} from './src/translations.js?v=0.7.5';
import {loadAlphaData} from './src/data-loader.js?v=0.7.5';
import {snapshotFreshness} from './src/freshness.js?v=0.7.5';
import {applyStaticTranslations,populateUniverseFilters,profileLabel,renderDecision,renderExecutive,renderJournal,renderMethod,renderModelHistory,renderPortfolio,renderResearch,renderScanner,renderTimeline,renderUniverse,setDecisionMode,setManualDecisionTicker,setViewNavigator,showToast} from './src/ui/views.js?v=0.7.5';

const controlDefs={
  weights:[
    ['fundamental',0,50,1,'Fundamental quality','Fundamentale Qualität'],
    ['technical',0,50,1,'Technical momentum','Technisches Momentum'],
    ['catalyst',0,40,1,'Event and earnings catalysts','Ereignis- und Ergebniskatalysatoren'],
    ['risk',0,40,1,'Risk and reward quality','Risiko- und CRV-Qualität'],
    ['macro',0,30,1,'Market and macro fit','Markt- und Makro-Fit'],
    ['diversification',0,30,1,'Portfolio diversification effect','Diversifikationseffekt']
  ],
  rules:[
    ['opportunityThreshold',70,95,1,'Minimum Opportunity Score','Mindest-Opportunity-Score'],
    ['cashHurdle',60,95,1,'Implicit score assigned to cash','Impliziter Score für Cash'],
    ['cashSafetyMargin',0,12,1,'Required advantage over cash','Geforderter Vorsprung gegenüber Cash'],
    ['switchMargin',0,12,1,'Required advantage over existing holdings','Geforderter Vorsprung gegenüber Bestand'],
    ['minCrv',1,4,.1,'Minimum risk/reward ratio','Mindest-Chance-Risiko-Verhältnis']
  ],
  portfolio:[
    ['riskBudgetPct',0.25,4,.25,'Maximum loss per trade as % of total assets','Maximaler Verlust je Trade in % des Vermögens'],
    ['maxPositionPct',5,60,1,'Hard cap for a single position','Harte Obergrenze für eine Einzelposition'],
    ['targetPositionPct',5,60,1,'Preferred position weight for the strategy fit','Bevorzugtes Positionsgewicht für den Strategie-Fit'],
    ['concentrationWarningPct',20,80,1,'Warning level for a single position','Warnschwelle für eine Einzelposition'],
    ['cashReservePct',0,60,1,'Desired cash reserve after a purchase','Gewünschte Cashreserve nach Kauf'],
    ['maxSectorExposurePct',20,100,1,'Warning level for sector exposure','Warnschwelle für Sektorexponierung'],
    ['maxRegionExposurePct',20,100,1,'Warning level for regional exposure','Warnschwelle für Regionenexponierung']
  ]
};
const viewGroups={
  dashboard:{root:'dashboard',items:[]},
  portfolio:{root:'portfolio',items:[['portfolio','subnavOverview'],['journal','subnavHistory']]},
  opportunities:{root:'scanner',items:[['scanner','subnavRanking'],['universe','subnavUniverse'],['research','subnavResearch'],['timeline','subnavTimeline']]},
  analysis:{root:'decision',items:[]},
  model:{root:'settings',items:[['settings','subnavStrategy'],['methodology','subnavMethodology'],['model-history','subnavModelHistory']]}
};
const groupByView=Object.fromEntries(Object.entries(viewGroups).flatMap(([group,config])=>[[config.root,group],...config.items.map(([view])=>[view,group])]));
function controlLabel(def){return state.language==='de'?def[5]:def[4]}
function renderControl(def,path){
  const[key,min,max,step]=def,value=path==='scoreWeights'?state.settings.scoreWeights[key]:state.settings[key],unit=key==='minCrv'?':1':key.includes('Pct')?'%':'';
  return`<div class="slider-control"><div class="slider-head"><div><b>${controlLabel(def)}</b><span>${key==='diversification'?(state.language==='de'?'Verändert die Gewichtung im Score.':'Changes the score weighting.'):(state.language==='de'?'Wirkt sofort auf das Modell.':'Updates the model immediately.')}</span></div><span class="slider-value" id="value-${key}">${num(value,key==='minCrv'?1:0)}${unit}</span></div><div class="slider-row"><span>${min}</span><input type="range" min="${min}" max="${max}" step="${step}" value="${value}" data-setting="${key}" data-path="${path}"><span>${max}</span></div></div>`;
}
function renderSettings(){
  $('weightControls').innerHTML=controlDefs.weights.map(d=>renderControl(d,'scoreWeights')).join('');
  $('ruleControls').innerHTML=controlDefs.rules.map(d=>renderControl(d,'root')).join('');
  $('portfolioControls').innerHTML=controlDefs.portfolio.map(d=>renderControl(d,'root')).join('');
  document.querySelectorAll('input[data-setting]').forEach(input=>input.addEventListener('input',e=>{
    const key=e.target.dataset.setting,path=e.target.dataset.path,value=Number(e.target.value);
    if(path==='scoreWeights')state.settings.scoreWeights[key]=value;else state.settings[key]=value;
    storage.setItem('alphaStrategySettings',JSON.stringify(state.settings));
    const unit=key==='minCrv'?':1':key.includes('Pct')?'%':'';
    $(`value-${key}`).textContent=`${num(value,key==='minCrv'?1:0)}${unit}`;
    const previousOrder=state.lastRanking;
    renderModelViews();renderSettingsPreview();updateProfileUI();
    const newOrder=computeModel().opportunities.map(o=>o.ticker).join('|');
    if(previousOrder!==null){
      showToast(previousOrder===newOrder?t('rankingUnchanged'):t('rankChanged'));
    }
    state.lastRanking=newOrder;
  }));
  renderSettingsPreview();updateProfileUI();
}

function modelWithSettings(settings){
  const previous=state.settings;
  state.settings=clone(settings);
  const model=computeModel();
  state.settings=previous;
  return model;
}
function rankingDiagnostics(currentModel){
  const baseline=modelWithSettings(state.data.strategyPresets.balanced);
  const baselineRanks=new Map(baseline.opportunities.map(item=>[item.ticker,item.customRank]));
  return currentModel.opportunities.slice(0,10).map(item=>({
    ...item,
    baselineRank:baselineRanks.get(item.ticker),
    rankDelta:(baselineRanks.get(item.ticker)||item.customRank)-item.customRank
  }));
}
function renderSettingsPreview(){
  const m=computeModel(),p=profileName(),warnings=[];
  if(!m.candidate){
    $('customBadge').textContent=profileLabel(p);$('customBadge').classList.toggle('custom-indicator',p==='custom');$('weightTotal').textContent='100%';
    $('settingsPreview').innerHTML=`<div class="pending-score"><div><strong>${t('noEligibleCandidate')}</strong><span>${t('noEligibleCandidateText')}</span></div></div>`;return;
  }
  if(m.sizing.aboveRiskBudget)warnings.push(t('oneShareAboveRiskBudget'));
  if(m.sizing.cappedByPosition)warnings.push(t('cappedByPosition'));
  if(m.sizing.cappedByCash)warnings.push(t('cappedByCash'));
  if(m.sizing.shares===0)warnings.push(t('notFinanceable'));
  if(m.sizing.concentrationWarning)warnings.push(t('concentrationWarning'));
  if(m.sizing.sectorWarning||m.sizing.regionWarning)warnings.push(t('fitWarning'));
  $('customBadge').textContent=profileLabel(p);$('customBadge').classList.toggle('custom-indicator',p==='custom');
  $('weightTotal').textContent='100%';
  $('settingsPreview').innerHTML=`<div class="preview-decision" data-settings-candidate="${m.candidate.ticker}"><span>${t('settingsCandidate')} · ${t('activeStrategy')} ${profileLabel(p)}</span><strong>${m.candidate.name} · ${m.candidate.strategyScore}</strong><small>${t('strategyScore')} · OS ${m.candidate.customScore} · ${t('fitAdjustment')} ${m.candidate.fitAdjustment>=0?'+':''}${num(m.candidate.fitAdjustment,1)} · ${m.allPassed?t('buyReview'):t('noNewPosition')}</small></div><div class="preview-grid"><div><span>${t('relativeAttractiveness')}</span><b>${m.ras}</b><small>${m.cashAdv>=0?'+':''}${m.cashAdv} vs. Cash</small></div><div><span>${t('crv')}</span><b>${num(m.candidate.entryCrv,2)}</b><small>Min. ${num(state.settings.minCrv,1)}</small></div><div><span>${t('suggestedShares')}</span><b>${m.sizing.shares}</b><small>${num(m.sizing.allocationPct,1)} %</small></div><div><span>${t('riskPerTrade')}</span><b>${euro(m.sizing.riskAmount)}</b><small>${num(m.sizing.riskPct,2)} % · ${t('stopDistance')} ${num(m.sizing.stopDistancePct,1)} %</small></div><div><span>${t('sectorExposure')}</span><b>${num(m.sizing.sectorPct,1)} %</b><small>${t('postTrade')}</small></div><div><span>${t('regionExposure')}</span><b>${num(m.sizing.regionPct,1)} %</b><small>${t('postTrade')}</small></div><div><span>${t('gates')}</span><b>${m.gates.filter(g=>g.pass).length}/${m.gates.length}</b><small>${m.allPassed?t('passed'):t('open')}</small></div></div>${warnings.map(w=>`<div class="preview-warning">${w}</div>`).join('')}<div class="settings-ranking">${m.opportunities.slice(0,5).map(o=>`<div class="settings-rank-row" data-settings-rank-ticker="${o.ticker}" data-rank="${o.customRank}" data-opportunity-score="${o.customScore}" data-strategy-score="${o.strategyScore}"><b>#${o.customRank}</b><span>${o.name}<small class="calculated-score-label">OS ${o.customScore} · ${t('fitAdjustment')} ${o.fitAdjustment>=0?'+':''}${num(o.fitAdjustment,1)}</small></span><strong>${o.strategyScore}</strong></div>`).join('')}</div>
  <div class="ranking-diagnostic">
    <div class="diagnostic-head"><b>${t('rankingDiagnostics')}</b><span>${t('versusBalanced')}</span></div>
    ${rankingDiagnostics(m).map(item=>{
      const cls=item.rankDelta>0?'rank-delta-up':item.rankDelta<0?'rank-delta-down':'rank-delta-flat';
      const delta=item.rankDelta>0?`▲ ${item.rankDelta}`:item.rankDelta<0?`▼ ${Math.abs(item.rankDelta)}`:'=';
      return`<div class="diagnostic-row"><b>#${item.customRank}</b><span>${item.name}</span><span>${t('baselineRank')} #${item.baselineRank}</span><strong class="${cls}">${delta}</strong></div>`;
    }).join('')}
  </div>`;
}
function updateProfileUI(){
  const p=profileName();$('profileBadge').textContent=profileLabel(p);$('sideThreshold').textContent=state.settings.opportunityThreshold;$('sideCashMargin').textContent=`+${state.settings.cashSafetyMargin}`;
  document.querySelectorAll('[data-preset]').forEach(b=>b.classList.toggle('active',b.dataset.preset===p));
}
function renderModelViews(){
  renderExecutive();renderDecision();renderScanner();renderUniverse();renderResearch();renderTimeline();renderPortfolio();renderJournal();renderMethod();renderModelHistory();
}
function switchView(id){
  const group=groupByView[id]||'dashboard';
  state.view=id;document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===id));document.querySelectorAll('.nav').forEach(n=>n.classList.toggle('active',n.dataset.group===group));
  const items=viewGroups[group].items;
  $('sectionNav').innerHTML=items.map(([view,label])=>`<button type="button" class="${view===id?'active':''}" data-subview="${view}">${t(label)}</button>`).join('');
  $('sectionNav').classList.toggle('show',items.length>0);
  document.querySelectorAll('[data-subview]').forEach(button=>button.onclick=()=>switchView(button.dataset.subview));
  applyStaticTranslations();$('sidebar').classList.remove('open');window.scrollTo({top:0,behavior:'smooth'});
}
setViewNavigator(switchView);
function saveSettings(){storage.setItem('alphaStrategySettings',JSON.stringify(state.settings));showToast(`${t('saved')} ${t('localOnly')}`)}
function setPreset(name){state.settings=clone(state.data.strategyPresets[name]);storage.setItem('alphaStrategySettings',JSON.stringify(state.settings));renderAll();showToast(t('presetApplied'))}
function resetSettings(){state.settings=clone(state.data.strategyDefaults);storage.removeItem('alphaStrategySettings');renderAll();showToast(t('resetDone'))}
function setLanguage(lang){state.language=lang;storage.setItem('alphaLanguage',lang);renderAll()}
function populateFilters(){
  const r=$('region'),s=$('sector');r.innerHTML=`<option value="all">${t('allRegions')}</option>`;s.innerHTML=`<option value="all">${t('allSectors')}</option>`;
  [...new Set(state.data.opportunities.map(x=>x.region))].sort().forEach(v=>r.insertAdjacentHTML('beforeend',`<option value="${v}">${regionName(v)}</option>`));
  [...new Set(state.data.opportunities.map(x=>x.sector))].sort().forEach(v=>s.insertAdjacentHTML('beforeend',`<option value="${v}">${sectorName(v)}</option>`));  populateUniverseFilters();
}
function renderAll(){
  applyStaticTranslations();populateFilters();renderModelViews();renderSettings();updateProfileUI();switchView(state.view);
  const freshness=snapshotFreshness();
  $('freshness').textContent=`${t('dataStand')}: ${dateFmt(state.data.snapshotDate)} · ${loc(state.data.dataMode)}${freshness.isStale?` · ${t('staleSnapshot')}`:''}`;
  $('freshness').classList.toggle('stale',freshness.isStale);
  $('staleBanner').hidden=!freshness.isStale;
  $('staleBanner').textContent=freshness.isStale?t('staleSnapshotWarning'):'';
  $('systemLabel').textContent=t('modelLoaded');
  state.lastRanking=computeModel().opportunities.map(o=>o.ticker).join('|');
}
function bind(){
  document.querySelectorAll('.nav').forEach(n=>n.onclick=()=>switchView(n.dataset.view));document.querySelectorAll('[data-jump]').forEach(b=>b.onclick=()=>switchView(b.dataset.jump));
  ['search','region','sector','conviction'].forEach(id=>$(id).addEventListener('input',renderScanner));$('menu').onclick=()=>$('sidebar').classList.toggle('open');
  document.querySelectorAll('[data-lang]').forEach(b=>b.onclick=()=>setLanguage(b.dataset.lang));document.querySelectorAll('[data-preset]').forEach(b=>b.onclick=()=>setPreset(b.dataset.preset));
  $('resetSettings').onclick=resetSettings;$('saveSettings').onclick=saveSettings;
  document.querySelectorAll('[data-decision-mode]').forEach(button=>{
    button.onclick=()=>setDecisionMode(button.dataset.decisionMode);
  });
  $('decisionCandidateSelect').onchange=event=>setManualDecisionTicker(event.target.value,false);
  ['universeSearch','universeCoverage','universeRegion','universeSector'].forEach(id=>{
    $(id).addEventListener('input',renderUniverse);
  });
  ['researchSearch','researchStageFilter'].forEach(id=>{
    $(id).addEventListener('input',renderResearch);
  });
}
async function init(){
  try{
    state.data=await loadAlphaData();
    const saved=storage.getItem('alphaStrategySettings');state.settings=saved?{...clone(state.data.strategyDefaults),...JSON.parse(saved),scoreWeights:{...state.data.strategyDefaults.scoreWeights,...JSON.parse(saved).scoreWeights}}:clone(state.data.strategyDefaults);
    bind();renderAll();
  }catch(e){$('systemLabel').textContent='Data error';document.body.insertAdjacentHTML('beforeend',`<div class="toast show">${e.message}</div>`)}
}
init();
