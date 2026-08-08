import {$,clamp,euro,loc,locale,num,pct,state,storage} from '../state.js?v=0.7.5';
import {movement,opportunityWeights,profileName,scoreClass} from '../scoring.js?v=0.7.5';
import {computeSizing,costBasisOf,exposureBreakdown,focusPosition,hasStop,investedOf,portfolioRisk,realisedOf,unrealisedOf,valueOf} from '../portfolio-calculations.js?v=0.7.5';
import {computeModel} from '../strategy-ranking.js?v=0.7.5';
import {activeDecisionSelection,buildWatchlist,universeEntry} from '../universe.js?v=0.7.5';
import {legacyMigrationProgress,rankingBasis,researchRecord} from '../research-pipeline.js?v=0.7.5';
import {regionName,sectorName,t,wholeShareLabel} from '../translations.js?v=0.7.5';
import {snapshotFreshness} from '../freshness.js?v=0.7.5';

let navigateToView=()=>{};
export function setViewNavigator(navigator){navigateToView=navigator;}
function researchStageLabel(stage){
  const map={market_refresh_required:'marketRefreshRequired',technical_pending:'technicalPending',ready_for_review:'readyForReview',approved:'approved'};
  return t(map[stage]||stage);
}
function researchConfidenceLabel(value){return t(value||'medium');}
function checklistLabel(key){
  const map={identity:'identityCheck',primarySources:'primarySourcesCheck',fundamental:'fundamentalCheck',catalyst:'catalystCheck',risk:'riskCheck',marketData:'marketDataCheck',technical:'technicalCheck',setup:'setupCheck',review:'reviewCheck'};
  return t(map[key]||key);
}
function setResearchTicker(ticker,openPage=false){
  state.selectedResearchTicker=ticker;
  storage.setItem('alphaResearchTicker',ticker);
  if(openPage)navigateToView('research');else renderResearch();
}
function openUniverseSecurity(ticker){
  const record=researchRecord(ticker);
  if(record)setResearchTicker(record.ticker,true);
  else setManualDecisionTicker(ticker,true);
}
function renderDashboardWatchlist(model){
  const items=buildWatchlist(model).slice(0,3);
  $('rankingFocus').innerHTML=`<div class="watchlist-columns" aria-hidden="true"><span>${t('watchlistPosition')}</span><span>${t('security')}</span><span>OS</span><span>${t('conviction')}</span></div><div class="watchlist-ranking">${items.map(item=>`<button class="watchlist-row" type="button" data-watchlist-ticker="${item.ticker}" aria-label="${item.position}. ${item.name}, ${item.ticker}, OS ${item.opportunityScore??'–'}, ${t('conviction')} ${item.conviction??'–'}"><b class="watchlist-position">#${item.position}</b><span class="watchlist-company"><b>${item.name}</b><small>${item.ticker}</small></span><span class="watchlist-metric"><small>OS</small><b>${item.opportunityScore??'–'}</b></span><span class="watchlist-metric"><small>${t('conviction')}</small><b>${item.conviction??'–'}</b></span></button>`).join('')}</div><div class="watchlist-total">${items.length} ${t('securities')}</div>`;
  document.querySelectorAll('[data-watchlist-ticker]').forEach(row=>{
    row.onclick=()=>openUniverseSecurity(row.dataset.watchlistTicker);
  });
}

export function applyStaticTranslations(){
  document.documentElement.lang=state.language;
  document.querySelectorAll('[data-i18n]').forEach(el=>el.textContent=t(el.dataset.i18n));
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el=>el.placeholder=t(el.dataset.i18nPlaceholder));
  document.querySelectorAll('[data-lang]').forEach(b=>b.classList.toggle('active',b.dataset.lang===state.language));
  const titles={
    dashboard:['dashboardEyebrow','dashboardTitle'],decision:['analysisEyebrow','analysisTitle'],scanner:['opportunitiesEyebrow','rankingTitle'],
    universe:['opportunitiesEyebrow','universeSimpleTitle'],research:['opportunitiesEyebrow','researchStatusTitle'],
    timeline:['opportunitiesEyebrow','historyTitle'],portfolio:['depotEyebrow','depotTitle'],
    journal:['depotEyebrow','journalTitle'],methodology:['modelEyebrow','methodologyTitle'],settings:['modelEyebrow','modelSettingsTitle'],'model-history':['modelHistoryEyebrow','modelChangeHistory']
  };
  $('eyebrow').textContent=t(titles[state.view][0]);$('title').textContent=t(titles[state.view][1]);
}
export function profileLabel(name){
  return t({defensive:'profileDefensive',balanced:'profileBalanced',offensive:'profileOffensive',custom:'profileCustom'}[name]);
}
function signedFit(value){return`${value>=0?'+':''}${num(value,1)}`;}
function fitReasonRows(x){
  return x.fitReasons.map(reason=>`<div class="fit-reason"><b class="${reason.value>0?'fit-positive':reason.value<0?'fit-negative':'fit-neutral'}">${signedFit(reason.value)}</b><span>${t(reason.key)}</span></div>`).join('');
}
function strategyFitPanel(x){
  return`<div class="strategy-context-head"><span>${t('activeStrategy')}</span><b>${profileLabel(profileName())}</b></div><div class="strategy-equation"><span><small>${t('intrinsicOS')}</small><b>${x.customScore}</b></span><i>+</i><span><small>${t('componentWeightFit')}</small><b class="${x.componentWeightAdjustment>=0?'fit-positive':'fit-negative'}">${signedFit(x.componentWeightAdjustment)}</b></span><i>+</i><span><small>${t('portfolioExecutionFit')}</small><b class="${x.portfolioFitAdjustment>=0?'fit-positive':'fit-negative'}">${signedFit(x.portfolioFitAdjustment)}</b></span><i>=</i><span><small>${t('strategyScore')}</small><b>${x.strategyScore}</b></span></div><div class="fit-reasons">${fitReasonRows(x)}</div>`;
}
export function showToast(message){
  $('toast').textContent=message;$('toast').classList.add('show');clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>$('toast').classList.remove('show'),2200);
}
function radarSvg(x,compact=false){
  const keys=['fundamental','technical','catalyst','risk','macro','diversification'],cx=130,cy=130,r=compact?70:82;
  const radarLabel=k=>{
    const short={
      de:{fundamental:'Fundament',technical:'Technik',catalyst:'Katalys.',risk:'Risiko',macro:'Makro',diversification:'Divers.'},
      en:{fundamental:'Fund.',technical:'Technical',catalyst:'Catalyst',risk:'Risk',macro:'Macro',diversification:'Divers.'}
    };
    return short[state.language][k];
  };
  const point=(i,ratio=1)=>{const a=(-90+i*60)*Math.PI/180;return[cx+Math.cos(a)*r*ratio,cy+Math.sin(a)*r*ratio]};
  const poly=ratio=>keys.map((_,i)=>point(i,ratio).join(',')).join(' '),values=keys.map((k,i)=>point(i,x.components[k]/100));
  const lp=i=>{const a=(-90+i*60)*Math.PI/180,rr=r+28;return[cx+Math.cos(a)*rr,cy+Math.sin(a)*rr]};
  return`<svg class="radar-svg" viewBox="0 0 260 260">${[.25,.5,.75,1].map(v=>`<polygon class="radar-grid" points="${poly(v)}"/>`).join('')}${keys.map((_,i)=>{const[p,q]=point(i);return`<line class="radar-axis" x1="${cx}" y1="${cy}" x2="${p}" y2="${q}"/>`}).join('')}<polygon class="radar-area" points="${values.map(p=>p.join(',')).join(' ')}"/>${values.map(p=>`<circle class="radar-dot" cx="${p[0]}" cy="${p[1]}" r="3.5"/>`).join('')}${keys.map((k,i)=>{const[xp,yp]=lp(i),a=xp<cx-10?'end':xp>cx+10?'start':'middle';return`<text class="radar-label" x="${xp}" y="${yp}" text-anchor="${a}">${radarLabel(k)}</text><text class="radar-value" x="${xp}" y="${yp+12}" text-anchor="${a}">${x.components[k]}</text>`}).join('')}</svg>`;
}
function sparkline(values){
  const w=60,h=22,min=Math.min(...values)-1,max=Math.max(...values)+1,pts=values.map((v,i)=>`${i*w/(values.length-1)},${h-(v-min)/(max-min)*h}`).join(' ');
  return`<svg class="mini-spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><polyline points="${pts}"/></svg>`;
}

// Marks whether a rating rests on an approved dossier or on the inherited exception.
function basisBadge(ticker){
  const opportunity=state.data.opportunities?.find(item=>item.ticker===ticker);
  const {basis}=rankingBasis(opportunity);
  if(!basis)return'';
  const legacy=basis==='legacy';
  return`<span class="basis-badge ${legacy?'is-legacy':'is-dossier'}" title="${legacy?t('legacyBasisExplain'):t('dossierBasisExplain')}">${legacy?t('legacyBasisShort'):t('dossierBasis')}</span>`;
}

function heldExclusionText(){
  const held=state.data.portfolio.positions.map(position=>position.name);
  if(!held.length){
    return state.language==='de'
      ?'Es sind keine bestehenden Positionen vorhanden, die von der Auswahl ausgeschlossen wären.'
      :'There are no existing holdings that would be excluded from the selection.';
  }
  const names=held.join(', ');
  return state.language==='de'
    ?`${names} ${held.length===1?'wird':'werden'} als bestehende Position${held.length===1?'':'en'} nicht als neue Chance gewertet.`
    :`${names} ${held.length===1?'is':'are'} already held and ${held.length===1?'is':'are'} excluded from new-opportunity selection.`;
}

function renderPositionFocus(focus){
  if(!focus){
    $('positionFocusTicker').textContent='–';
    $('positionFocusHeadline').textContent=t('noTargetPosition');
    $('positionFocus').innerHTML='';
    return;
  }
  const stale=snapshotFreshness().isStale;
  const targetDist=(focus.target1/focus.current-1)*100;
  const span=focus.target1-focus.entry;
  const progress=clamp(span?(focus.current-focus.entry)/span*100:0,0,100);
  const distance=stale
    ?`${t('staleZoneHidden')} · ${t('staleHistoric')}`
    :`${num(targetDist,2)} % ${state.language==='de'?'bis Ziel 1':'to target 1'}`;
  $('positionFocusTicker').textContent=focus.ticker;
  $('positionFocusHeadline').textContent=t('closestToTarget');
  $('positionFocus').innerHTML=`<div class="msft-progress${stale?' is-stale':''}"><div class="msft-line"><strong>${euro(focus.current)}</strong><span>${distance}</span></div><div class="distance-bar"><i style="width:${stale?0:progress}%"></i></div><div class="msft-labels"><span>${t('entry')} ${euro(focus.entry)}</span><span>${t('target')} 1 ${euro(focus.target1)}</span></div></div>`;
}

export function renderExecutive(){
  const d=state.data,m=computeModel(),c=d.portfolio;
  const cv=valueOf(c),cost=costBasisOf(c),open=unrealisedOf(c),real=realisedOf(c),focus=focusPosition(c);
  const openLabel=c.positions.length===0
    ?t('noOpenPositions')
    :c.positions.length===1?c.positions[0].name:`${c.positions.length} ${t('positions')}`;
  const closedLabel=c.closedTrades.length
    ?`${c.closedTrades.length} ${c.closedTrades.length===1?t('closedTrade'):t('closedTradesLabel')}`
    :t('noClosedTrades');
  const metricLines=[
    [t('totalAssets'),euro(cv),`${num(c.positions.length,0)} ${t('positions')} + ${t('cash')}`,''],
    [t('activeCash'),euro(c.cash),`${num(cv?c.cash/cv*100:0,1)} % ${t('cashQuote')}`,''],
    [t('openProfit'),signedEuro(open),cost?`${pct(open/cost*100)} · ${openLabel}`:openLabel,signClass(open)],
    [t('realisedLabel'),signedEuro(real),closedLabel,signClass(real)]
  ];
  const metricsHtml=metricLines.map(x=>`<div class="metric-line"><span>${x[0]}</span><b class="${x[3]}">${x[1]}</b><small>${x[2]}</small></div>`).join('');
  renderPositionFocus(focus);
  if(!m.candidate){
    $('briefingSalutation').textContent=state.language==='de'?'Alex, heute zählt Disziplin – nicht Aktivität.':'Alex, today discipline matters more than activity.';
    $('briefingHeadline').textContent=t('noEligibleCandidate');$('briefingSummary').textContent=t('noEligibleCandidateText');
    $('briefingPoints').innerHTML=`<div class="briefing-point">${t('noEligibleCandidateText')}</div>`;$('briefingTrigger').textContent=t('noEligibleCandidateText');
    $('executiveMetrics').innerHTML=metricsHtml;
    $('execCandidate').textContent=t('noEligibleCandidate');$('execVerdict').textContent=t('wait');$('execOS').textContent='–';$('execRAS').textContent='–';$('execGates').textContent='0/0';
    $('triggerZone').textContent=t('noEligibleCandidate');$('triggerDistance').textContent='–';$('priceZoneProgress').style.width='0%';$('execWhy').innerHTML=`<div class="why-item"><i>×</i><span>${t('noEligibleCandidateText')}</span></div>`;
    $('regimeLabel').textContent=loc(d.marketRegime.label);$('regimeScore').textContent=d.marketRegime.score;$('regimeRing').style.setProperty('--score',d.marketRegime.score);$('regimeExplanation').textContent=loc(d.marketRegime.explanation);$('regimeTrend').textContent=loc(d.marketRegime.trend);$('regimeBreadth').textContent=loc(d.marketRegime.breadth);$('regimeStance').textContent=loc(d.marketRegime.stance);
    renderDashboardWatchlist(m);return;
  }
  const passed=m.gates.filter(g=>g.pass).length,dist=(m.candidate.price/m.candidate.entryHigh-1)*100;
  const focusDist=focus?(focus.target1/focus.current-1)*100:null;
  const stale=m.freshness.isStale;
  $('decisionKicker').textContent=stale?t('staleDecisionKicker'):t('todayDecision');
  $('briefingSalutation').textContent=state.language==='de'?'Alex, heute zählt Disziplin – nicht Aktivität.':'Alex, today discipline matters more than activity.';
  $('briefingHeadline').textContent=m.allPassed?t('buyReview'):t('noNewPosition');
  $('briefingSummary').textContent=state.language==='de'
    ?`${m.candidate.name} führt die neuen Kandidaten mit ${m.candidate.customScore} Punkten an, erfüllt aber nur ${passed} von ${m.gates.length} Gates.${focus?` ${focus.name} liegt ${num(focusDist,2)} % unter Ziel 1.`:''}`
    :`${m.candidate.name} leads new candidates with a score of ${m.candidate.customScore}, but passes only ${passed} of ${m.gates.length} gates.${focus?` ${focus.name} is ${num(focusDist,2)}% below target 1.`:''}`;
  const points=[
    state.language==='de'?`Aktives Profil: ${profileLabel(profileName())}.`:`Active profile: ${profileLabel(profileName())}.`,
    state.language==='de'?`Cash-Vorsprung des Kandidaten: ${m.cashAdv>=0?'+':''}${m.cashAdv} Punkte.`:`Candidate advantage over cash: ${m.cashAdv>=0?'+':''}${m.cashAdv} points.`,
    stale
      ?t('staleNoSizing')
      :state.language==='de'?`Vorgeschlagene Größe: ${wholeShareLabel(m.sizing.shares)}, ${num(m.sizing.allocationPct,1)} % des Depotwerts.`:`Suggested size: ${wholeShareLabel(m.sizing.shares)}, ${num(m.sizing.allocationPct,1)}% of portfolio value.`
  ];
  $('briefingPoints').innerHTML=points.map(x=>`<div class="briefing-point">${x}</div>`).join('');
  $('briefingTrigger').textContent=stale
    ?t('staleNoTrigger')
    :state.language==='de'
      ?`${m.candidate.name} in Preiszone, relative Attraktivität höher und alle Gates erfüllt${focus?` – oder ${focus.name} erreicht ${euro(focus.target1)}`:''}.`
      :`${m.candidate.name} enters the price zone, relative attractiveness improves and all gates pass${focus?` — or ${focus.name} reaches ${euro(focus.target1)}`:''}.`;
  $('executiveMetrics').innerHTML=metricsHtml;
  $('execCandidate').innerHTML=`${m.candidate.name} · ${m.candidate.customScore}<span class="calculated-score-label">${state.language==='de'?'Berechneter OS':'Calculated OS'}</span>`;
  $('execVerdict').textContent=m.allPassed?t('reviewBuy'):t('wait');$('execOS').textContent=m.candidate.customScore;$('execRAS').textContent=m.ras;$('execGates').textContent=`${passed}/${m.gates.length}`;
  $('triggerZone').textContent=`${t('entryZone')} ${euro(m.candidate.entryLow)}–${euro(m.candidate.entryHigh)}`;
  const zoneLabel=m.inZone?t('insideZone'):m.candidate.price>m.candidate.entryHigh?`${num(dist,2)} % ${t('aboveZone')}`:`${num(Math.abs(dist),2)} % ${t('belowZone')}`;
  $('triggerDistance').textContent=stale?t('staleZoneHidden'):zoneLabel;
  $('priceZoneProgress').style.width=stale?'0%':`${m.inZone?100:clamp(100-Math.abs(dist)*8,10,96)}%`;
  const why=m.gates.filter(g=>!g.pass).map(g=>`${t(g.key)}: ${g.detail}`);
  $('execWhy').innerHTML=(why.length?why:[state.language==='de'?'Alle Gates erfüllt; finalen Broker-Check durchführen.':'All gates passed; perform the final broker check.']).map(w=>`<div class="why-item"><i>${why.length?'×':'✓'}</i><span>${w}</span></div>`).join('');
  $('regimeLabel').textContent=loc(d.marketRegime.label);$('regimeScore').textContent=d.marketRegime.score;$('regimeRing').style.setProperty('--score',d.marketRegime.score);
  $('regimeExplanation').textContent=loc(d.marketRegime.explanation);$('regimeTrend').textContent=loc(d.marketRegime.trend);$('regimeBreadth').textContent=loc(d.marketRegime.breadth);$('regimeStance').textContent=loc(d.marketRegime.stance);
  renderDashboardWatchlist(m);
}

export function setDecisionMode(mode){
  state.decisionMode=mode;
  storage.setItem('alphaDecisionMode',mode);
  renderDecision();
}
export function setManualDecisionTicker(ticker,openLab=false){
  state.manualDecisionTicker=ticker;
  state.decisionMode='manual';
  state.selectedTicker=ticker;
  storage.setItem('alphaManualCandidate',ticker);
  storage.setItem('alphaDecisionMode','manual');

  // Render the newly selected candidate before opening the Decision Lab.
  // This fixes Universe/Scanner navigation retaining the previous ASML view.
  renderDecision();

  if(openLab){
    navigateToView('decision');
  }
}
function renderDecisionControls(selection){
  document.querySelectorAll('[data-decision-mode]').forEach(button=>{
    button.classList.toggle('active',button.dataset.decisionMode===state.decisionMode);
  });
  const select=$('decisionCandidateSelect');
  const selectedTicker=selection.universe?.ticker||selection.scored?.ticker||'';
  select.innerHTML=state.data.universe.map(item=>{
    const pending=item.coverageStatus==='research_pending'?` · ${t('researchRequired')}`:'';
    return`<option value="${item.ticker}" ${item.ticker===selectedTicker?'selected':''}>${item.name} (${item.ticker})${pending}</option>`;
  }).join('');
  select.disabled=state.decisionMode==='auto';
  if(state.decisionMode==='auto'){
    const x=selection.scored;
    $('candidateSelectionReason').innerHTML=x?`${t('automaticSelectionReason')}<span class="selection-explanation"><div><i>1</i><span>${x.name}: ${t('strategyScore')} ${x.strategyScore}, OS ${x.customScore}.</span></div><div><i>2</i><span>${heldExclusionText()}</span></div><div><i>3</i><span>${t('autoChangesWhen')}</span></div></span>`:`<b>${t('noEligibleCandidate')}</b><span class="selection-explanation">${t('noEligibleCandidateText')}</span>`;
  }else{
    $('candidateSelectionReason').textContent=t('manualSelectionReason');
  }
}
function renderPendingDecision(entry){
  $('decisionCoverageNotice').classList.add('show');
  const activeResearch=researchRecord(entry.ticker);
  $('decisionCoverageNotice').innerHTML=activeResearch
    ?`${t('researchActive')}: ${activeResearch.progress}% · ${researchStageLabel(activeResearch.stage)}<div class="research-inline"><b>${t('blocker')}</b><span>${loc(activeResearch.blocker)}</span></div>`
    :t('researchRequiredText');
  $('decisionCandidate').innerHTML=`${entry.name} (${entry.ticker})<span class="calculated-score-label">${t('researchRequired')}</span>`;
  $('decisionMeta').textContent=`${regionName(entry.region)} · ${sectorName(entry.sector)} · ${entry.exchange}`;
  $('decisionScore').textContent='–';
  $('decisionRas').textContent='–';
  $('decisionRadar').innerHTML=`<div class="pending-score"><div><strong>${t('noDecisionAvailable')}</strong><span>${t('researchRequiredText')}</span></div></div>`;
  $('scoreBreakdown').innerHTML=`<div class="pending-score"><div><strong>${t('researchRequired')}</strong><span>${state.language==='de'?'Der Titel ist Teil des Universe 50, aber noch nicht Teil des bewerteten Rankings.':'The security belongs to Universe 50 but is not yet part of the scored ranking.'}</span></div></div>`;
  $('decisionStrategyFit').innerHTML='';
  const labels=[t('scoreGate'),t('priceGate'),t('crvGate'),t('sizingGate')];
  $('decisionGates').innerHTML=labels.map(label=>`<div class="gate"><div class="gate-icon fail">…</div><div><b>${label}</b><span>${t('researchRequired')}</span></div><small>${t('open')}</small></div>`).join('');
  $('decisionVerdict').textContent=t('researchRequiredText');
  $('actionLadder').innerHTML=[
    ['1 · Research',state.language==='de'?'Daten vervollständigen':'Complete data',state.language==='de'?'Sechs Score-Komponenten recherchieren.':'Research all six score components.'],
    ['2 · Setup',state.language==='de'?'Preisplan definieren':'Define price plan',state.language==='de'?'Einstieg, Stop, Ziel und CRV festlegen.':'Define entry, stop, target and risk/reward.'],
    ['3 · Approval',state.language==='de'?'Ranking aktivieren':'Activate ranking',state.language==='de'?'Erst nach vollständiger Prüfung freigeben.':'Release only after complete validation.']
  ].map((a,i)=>`<div class="ladder-step ${i===0?'active':''}"><span>${a[0]}</span><b>${a[1]}</b><small>${a[2]}</small></div>`).join('');
  $('evidenceGrid').innerHTML=[
    [t('coverage'),t('researchRequired')],
    [state.language==='de'?'Börse':'Exchange',entry.exchange],
    [state.language==='de'?'Quellkorb':'Source basket',entry.sourceBasket],
    [t('tradeability'),t('verifyBroker')],
    [t('portfolioStatus'),entry.portfolioStatus==='held'?t('held'):t('notHeld')],
    [state.language==='de'?'Priorität':'Priority',activeResearch?`${t('researchActive')} ${activeResearch.progress}%`:(state.language==='de'?'Research-Warteschlange':'Research queue')]
  ].map(item=>`<div class="evidence-card"><header><span>${item[0]}</span></header><p>${item[1]}</p></div>`).join('');
}
export function renderDecision(){
  const selection=activeDecisionSelection();
  const m=selection.model;
  renderDecisionControls(selection);
  if(!selection.universe){
    $('decisionCoverageNotice').classList.add('show');$('decisionCoverageNotice').textContent=t('noEligibleCandidateText');
    $('decisionCandidate').textContent=t('noEligibleCandidate');$('decisionMeta').textContent='';$('decisionScore').textContent='–';$('decisionRas').textContent='–';
    $('decisionRadar').innerHTML=`<div class="pending-score"><div><strong>${t('noEligibleCandidate')}</strong><span>${t('noEligibleCandidateText')}</span></div></div>`;
    $('scoreBreakdown').innerHTML='';$('decisionStrategyFit').innerHTML='';$('decisionGates').innerHTML='';$('decisionVerdict').textContent=t('noEligibleCandidateText');$('actionLadder').innerHTML='';$('evidenceGrid').innerHTML='';return;
  }
  if(!selection.scored){
    renderPendingDecision(selection.universe);
    return;
  }

  $('decisionCoverageNotice').classList.remove('show');
  const x=selection.scored;
  const w=opportunityWeights();
  const automatic=selection.mode==='auto';
  $('decisionCandidate').innerHTML=basisBadge(x.ticker)+`${x.name} (${x.ticker})<span class="calculated-score-label">${t('activeStrategy')}: ${profileLabel(profileName())} · ${t('strategyScore')} ${x.strategyScore} · OS ${x.customScore}</span>`;
  $('decisionMeta').textContent=`${x.isin} · ${regionName(x.region)} · ${sectorName(x.sector)} · ${t('conviction')} ${x.conviction}`;
  $('decisionScore').textContent=x.customScore;
  $('decisionRas').textContent=x.ras;
  $('decisionRadar').innerHTML=radarSvg(x);
  $('scoreBreakdown').innerHTML=Object.entries(x.components).map(([key,value])=>`<div class="score-row"><span>${t(key)}</span><div class="score-meter"><i style="width:${value}%"></i></div><b>${value}</b><small>${num(value*w[key],1)} P.</small></div>`).join('');
  $('decisionStrategyFit').innerHTML=strategyFitPanel(x);

  const gates=automatic?m.gates:[
    {key:'freshnessGate',pass:!m.freshness.isStale,detail:m.freshness.dateKnown?`${num(m.freshness.ageHours,1)} h / ${num(m.freshness.maxAgeHours,0)} h`:'–'},
    {key:'scoreGate',pass:x.customScore>=state.settings.opportunityThreshold,detail:`${x.customScore} ≥ ${state.settings.opportunityThreshold}`},
    {key:'priceGate',pass:x.inZone,detail:`${euro(x.entryLow)}–${euro(x.entryHigh)}`},
    {key:'crvGate',pass:x.entryCrv>=state.settings.minCrv,detail:`${num(x.entryCrv,2)} / ${num(state.settings.minCrv,1)}`},
    {key:'sizingGate',pass:x.sizing.shares>=1,detail:wholeShareLabel(x.sizing.shares)}
  ];
  $('decisionGates').innerHTML=gates.map(g=>`<div class="gate"><div class="gate-icon ${g.pass?'pass':'fail'}">${g.pass?'✓':'×'}</div><div><b>${t(g.key)}</b><span>${g.detail}</span></div><small>${g.pass?t('passed'):t('open')}</small></div>`).join('');
  const allPassed=gates.every(g=>g.pass);
  $('decisionVerdict').textContent=allPassed
    ?(state.language==='de'?'Alle relevanten Modellgates sind erfüllt. Brokerhandelbarkeit und Kosten final prüfen.':'All relevant model gates pass. Perform the final broker and cost check.')
    :(state.language==='de'?'Mindestens ein Gate ist offen. Der Titel bleibt Beobachtungs- oder Research-Kandidat.':'At least one gate remains open. The security stays in monitoring or research status.');
  $('actionLadder').innerHTML=m.freshness.isStale
    ?`<div class="ladder-stale">${t('staleNoLadder')}</div>`
    :[
      [state.language==='de'?'1 · Beobachten':'1 · Monitor',t('monitorNow'),state.language==='de'?'Score, Preiszone und Portfolio-Fit überwachen.':'Monitor score, price zone and portfolio fit.','active'],
      [state.language==='de'?'2 · Vorbereiten':'2 · Prepare',`${t('prepareAt')} ≤ ${euro(x.entryHigh)}`,state.language==='de'?'Limit, Stop und Stückzahl plausibilisieren.':'Validate limit, stop and share count.',''],
      [state.language==='de'?'3 · Ausführen':'3 · Execute',`${t('executeOnly')} ${t('allGates')}`,state.language==='de'?'Broker-App und Kosten final prüfen.':'Perform final broker-app and cost check.','']
    ].map(a=>`<div class="ladder-step ${a[3]}"><span>${a[0]}</span><b>${a[1]}</b><small>${a[2]}</small></div>`).join('');
  $('evidenceGrid').innerHTML=Object.entries(x.componentReasons).map(([key,value])=>`<div class="evidence-card"><header><span>${t(key)}</span><b>${x.components[key]}</b></header><p>${loc(value)}</p></div>`).join('');
}

export function renderScanner(){
  const m=computeModel(),q=$('search').value.trim().toLowerCase(),r=$('region').value,s=$('sector').value,c=$('conviction').value;
  $('rankingProfile').textContent=`${t('activeStrategy')}: ${profileLabel(profileName())}`;
  const items=m.opportunities.filter(x=>(!q||[x.name,x.ticker,x.isin].some(v=>v.toLowerCase().includes(q)))&&(r==='all'||x.region===r)&&(s==='all'||x.sector===s)&&(c==='all'||x.conviction===c));
  $('resultCount').textContent=`${items.length} ${t('candidates')}`;
  $('scannerList').innerHTML=items.map(x=>{const mv=movement(x,x.customRank);return`<div class="scanner-row ${x.ticker===state.selectedTicker?'selected':''}" data-ticker="${x.ticker}" data-rank="${x.customRank}" data-opportunity-score="${x.customScore}" data-strategy-score="${x.strategyScore}"><div class="rank">#${x.customRank}</div><div class="scanner-company"><b>${x.name} ${basisBadge(x.ticker)}</b><span>${x.ticker} · ${x.isin}</span></div><span>${regionName(x.region)}</span><span>${sectorName(x.sector)}</span><div class="strategy-score ${scoreClass(x.strategyScore)}"><b>${x.strategyScore}</b><small>${t('strategyScore')}</small><em>OS ${x.customScore}</em></div>${sparkline(x.scoreHistory)}<span class="${mv.cls}">${mv.label}</span></div>`}).join('');
  document.querySelectorAll('.scanner-row').forEach(row=>row.onclick=()=>{state.selectedTicker=row.dataset.ticker;renderScanner()});renderCandidateDetail();
}
function renderCandidateDetail(){
  const m=computeModel(),x=m.opportunities.find(o=>o.ticker===state.selectedTicker)||m.opportunities[0];
  if(!x){$('candidateDetail').innerHTML=`<div class="pending-score"><div><strong>${t('noEligibleCandidate')}</strong><span>${t('noEligibleCandidateText')}</span></div></div>`;return;}
  const sizing=computeSizing(x);
  $('candidateDetail').innerHTML=`<div class="candidate-detail-grid"><div><div class="candidate-title"><h2>${x.name} ${basisBadge(x.ticker)} · ${x.strategyScore}<span class="calculated-score-label">${t('activeStrategy')}: ${profileLabel(profileName())} · ${t('strategyScore')} · OS ${x.customScore}</span></h2><p>${x.ticker} · ${x.isin} · ${regionName(x.region)} · ${sectorName(x.sector)}</p></div><div class="level-grid"><div><span>${t('current').toUpperCase()}</span><b>${euro(x.price)}</b></div><div><span>${t('relativeAttractiveness').toUpperCase()}</span><b>${x.ras}</b></div><div><span>${t('entry').toUpperCase()}</span><b>${euro(x.entryLow)}–${euro(x.entryHigh)}</b></div><div><span>${t('stop').toUpperCase()}</span><b>${euro(x.stop)}</b></div><div><span>${t('target').toUpperCase()}</span><b>${euro(x.target)}</b></div><div><span>${t('suggestedShares').toUpperCase()}</span><b>${m.freshness.isStale?'–':wholeShareLabel(sizing.shares)}</b></div><div><span>${t('riskPerTrade').toUpperCase()}</span><b>${m.freshness.isStale?'–':euro(sizing.riskAmount)}</b></div></div></div><div class="candidate-radar">${radarSvg(x,true)}</div><div class="candidate-rationale"><div class="strategy-fit-summary"><div><span>${t('strategyScore')}</span><b>${x.strategyScore}</b></div><div><span>${t('intrinsicOS')}</span><b>${x.customScore}</b></div><div><span>${t('fitAdjustment')}</span><b class="${x.fitAdjustment>=0?'fit-positive':'fit-negative'}">${signedFit(x.fitAdjustment)}</b></div><div><span>${t('crv')}</span><b>${num(x.entryCrv,2)}</b></div></div><div class="fit-reasons">${fitReasonRows(x)}</div><div class="rationale-block"><span>${t('catalyst').toUpperCase()}</span><p>${loc(x.catalystText)}</p></div><div class="rationale-block"><span>${t('risk').toUpperCase()}</span><p>${loc(x.riskText)}</p></div><div class="rationale-block"><span>${t('decision').toUpperCase()}</span><p>${x.ticker===m.candidate?.ticker&&m.allPassed?t('executeReview'):t('observe')}</p><button class="open-decision-button" data-open-decision="${x.ticker}">${t('openInDecisionLab')}</button></div></div></div>`;
  document.querySelectorAll('[data-open-decision]').forEach(button=>{
    button.onclick=()=>setManualDecisionTicker(button.dataset.openDecision,true);
  });
}


export function populateUniverseFilters(){
  const region=$('universeRegion');
  const sector=$('universeSector');
  const currentRegion=region.value||'all';
  const currentSector=sector.value||'all';
  region.innerHTML=`<option value="all">${t('allRegions')}</option>`;
  sector.innerHTML=`<option value="all">${t('allSectors')}</option>`;
  [...new Set(state.data.universe.map(item=>item.region))].sort().forEach(value=>region.insertAdjacentHTML('beforeend',`<option value="${value}">${regionName(value)}</option>`));
  [...new Set(state.data.universe.map(item=>item.sector))].sort().forEach(value=>sector.insertAdjacentHTML('beforeend',`<option value="${value}">${sectorName(value)}</option>`));
  region.value=[...region.options].some(o=>o.value===currentRegion)?currentRegion:'all';
  sector.value=[...sector.options].some(o=>o.value===currentSector)?currentSector:'all';
}
export function renderUniverse(){
  const m=computeModel();
  const scoredMap=new Map(m.opportunities.map(item=>[item.ticker,item]));
  const query=$('universeSearch').value.trim().toLowerCase();
  const coverage=$('universeCoverage').value;
  const region=$('universeRegion').value;
  const sector=$('universeSector').value;
  const items=state.data.universe.filter(item=>
    (!query||`${item.name} ${item.ticker}`.toLowerCase().includes(query))&&
    (coverage==='all'||item.coverageStatus===coverage)&&
    (region==='all'||item.region===region)&&
    (sector==='all'||item.sector===sector)
  );
  const scoredCount=state.data.universe.filter(item=>item.coverageStatus==='scored').length;
  const activeCount=state.data.universe.filter(item=>item.coverageStatus==='research_active').length;
  const pendingCount=state.data.universe.length-scoredCount-activeCount;
  $('universeMethodology').textContent=loc(state.data.universeMethodology);
  $('universeStats').innerHTML=[
    [t('totalUniverse'),state.data.universe.length],
    [t('scoredCount'),scoredCount],
    [t('activeResearch'),activeCount],
    [t('pendingCount'),pendingCount]
  ].map(item=>`<div class="universe-stat"><span>${item[0]}</span><b>${item[1]}</b></div>`).join('');
  $('universeList').innerHTML=items.map(item=>{
    const scored=scoredMap.get(item.ticker);
    const active=item.coverageStatus==='research_active';
    const coverageClass=item.coverageStatus==='scored'?'scored':active?'active':'pending';
    const coverageLabel=item.coverageStatus==='scored'?t('scored'):active?t('researchActive'):t('researchPending');
    const portfolioClass=item.portfolioStatus==='held'?'held':'not-held';
    const portfolioLabel=item.portfolioStatus==='held'?t('held'):t('notHeld');
    const tradeability=item.tradeabilityStatus==='confirmed_snapshot'?t('snapshotConfirmed'):t('verifyBroker');
    const record=researchRecord(item.ticker);
    return`<div class="universe-row" data-universe-ticker="${item.ticker}">
      <div class="universe-order">${String(item.universeOrder).padStart(2,'0')}</div>
      <div class="universe-company"><b>${item.name}</b><span>${item.ticker} · ${regionName(item.region)} · ${sectorName(item.sector)} · ${item.exchange}</span></div>
      <div><span class="coverage-badge ${coverageClass}">${coverageLabel}</span></div>
      <div class="universe-score">${scored?`<b>${scored.strategyScore}</b><span>OS ${scored.customScore}</span>`:record?`<b>${record.progress}%</b><span>${t('researchProgress')}</span>`:`<b>–</b><span>${t('researchRequired')}</span>`}</div>
      <div><span class="portfolio-badge ${portfolioClass}">${portfolioLabel}</span></div>
      <div><span class="tradeability-badge">${tradeability}</span></div>
    </div>`;
  }).join('');
  document.querySelectorAll('[data-universe-ticker]').forEach(row=>{
    row.onclick=()=>openUniverseSecurity(row.dataset.universeTicker);
  });
}


function renderGovernanceBasis(){
  const progress=legacyMigrationProgress();
  const pct=progress.total?progress.migrated.length/progress.total*100:100;
  const list=names=>names.map(ticker=>{
    const item=state.data.opportunities?.find(o=>o.ticker===ticker);
    return`<span class="governance-chip">${item?.name??ticker}</span>`;
  }).join('');
  $('governanceBasis').innerHTML=`<div class="governance-bar"><i style="width:${num(pct,0)}%"></i></div><div class="governance-rows"><div class="governance-row is-dossier"><b>${progress.migrated.length}/${progress.total}</b><span>${t('legacyMigrationProgress')}</span><div class="governance-chips">${progress.migrated.length?list(progress.migrated):'–'}</div></div><div class="governance-row is-legacy"><b>${progress.remaining.length}/${progress.total}</b><span>${t('legacyMigrationOpen')}</span><div class="governance-chips">${progress.remaining.length?list(progress.remaining):'–'}</div></div></div>${progress.complete?`<p class="governance-done">${t('legacyMigrationDone')}</p>`:`<p class="governance-warning">${t('legacyBasisExplain')}</p>`}`;
}

export function renderResearch(){
  const pipeline=state.data.researchPipeline;
  if(!pipeline) return;
  renderGovernanceBasis();
  const records=pipeline.records;
  const query=$('researchSearch').value.trim().toLowerCase();
  const stage=$('researchStageFilter').value;
  const visible=records.filter(record=>{
    const universe=universeEntry(record.ticker);
    const text=`${universe?.name||record.ticker} ${record.ticker}`.toLowerCase();
    return(!query||text.includes(query))&&(stage==='all'||record.stage===stage);
  });
  if(!records.some(record=>record.ticker===state.selectedResearchTicker)){
    state.selectedResearchTicker=records[0]?.ticker||'';
  }
  if(visible.length&&!visible.some(record=>record.ticker===state.selectedResearchTicker)){
    state.selectedResearchTicker=visible[0].ticker;
  }
  const selected=records.find(record=>record.ticker===state.selectedResearchTicker)||records[0];
  const verified=records.filter(record=>record.checklist.primarySources).length;
  const approved=records.filter(record=>record.stage==='approved').length;
  $('researchMethodology').textContent=loc(pipeline.methodology);
  $('researchHeroStats').innerHTML=[
    [t('activeResearch'),records.length],
    [t('sourceVerified'),verified],
    [t('rankingApproved'),approved]
  ].map(item=>`<div class="research-hero-stat"><span>${item[0]}</span><b>${item[1]}</b></div>`).join('');
  const stageOrder=['market_refresh_required','technical_pending','ready_for_review','approved'];
  $('researchStageStrip').innerHTML=stageOrder.map(stageKey=>{
    const count=records.filter(record=>record.stage===stageKey).length;
    return`<div class="research-stage"><span>${researchStageLabel(stageKey)}</span><b>${count}</b><small>${pipeline.batchName}</small></div>`;
  }).join('');
  $('researchQueue').innerHTML=visible.length?visible.sort((a,b)=>a.priority-b.priority).map(record=>{
    const universe=universeEntry(record.ticker);
    return`<div class="research-card ${record.ticker===selected.ticker?'active':''}" data-research-ticker="${record.ticker}">
      <div class="research-priority">#${record.priority}</div>
      <div class="research-company"><b>${universe?.name||record.ticker}</b><span>${record.ticker} · ${researchStageLabel(record.stage)}</span><small>${loc(record.blocker)}</small></div>
      <div class="research-progress"><b>${record.progress}%</b><span>${researchConfidenceLabel(record.confidence)}</span><div class="research-mini-track"><i style="width:${record.progress}%"></i></div></div>
    </div>`;
  }).join(''):`<div class="pending-score"><div><strong>${t('noResearchMatch')}</strong></div></div>`;
  document.querySelectorAll('[data-research-ticker]').forEach(card=>{
    card.onclick=()=>setResearchTicker(card.dataset.researchTicker,false);
  });
  renderResearchDossier(selected);
}
function renderResearchDossier(record){
  if(!record){
    $('researchDossier').innerHTML='';
    return;
  }
  const universe=universeEntry(record.ticker);
  const complete=Object.values(record.checklist).filter(Boolean).length;
  const total=Object.keys(record.checklist).length;
  $('researchDossier').innerHTML=`
    <div class="dossier-head">
      <div><h2>${universe?.name||record.ticker}</h2><p>${record.ticker} · ${regionName(universe?.region)} · ${sectorName(universe?.sector)} · ${universe?.exchange||''}</p></div>
      <span class="stage-badge">${researchStageLabel(record.stage)}</span>
    </div>
    <div class="dossier-progress">
      <div class="dossier-progress-head"><span>${t('researchProgress')}</span><b>${record.progress}% · ${complete}/${total}</b></div>
      <div class="dossier-track"><i style="width:${record.progress}%"></i></div>
    </div>
    <div class="dossier-summary-grid">
      <div class="dossier-summary"><span>${t('thesis')}</span><b>${loc(record.thesis)}</b></div>
      <div class="dossier-summary"><span>${t('catalyst')}</span><b>${loc(record.catalyst)}</b></div>
      <div class="dossier-summary"><span>${t('risk')}</span><b>${loc(record.riskSummary)}</b></div>
    </div>
    <div class="dossier-section">
      <h3>${t('researchFacts')}</h3>
      <div class="research-facts">${record.facts.map(fact=>`<div class="research-fact"><span>${loc(fact.label)}</span><b>${loc(fact.value)}</b><small>${loc(fact.note)}</small></div>`).join('')}</div>
    </div>
    <div class="dossier-section">
      <h3>${t('researchChecklist')}</h3>
      <div class="research-checklist">${Object.entries(record.checklist).map(([key,value])=>`<div class="research-check ${value?'complete':'open'}"><i>${value?'✓':'…'}</i><span>${checklistLabel(key)}</span></div>`).join('')}</div>
    </div>
    <div class="dossier-section">
      <h3>${t('sources')}</h3>
      <div class="research-sources">${record.sources.map(source=>`<div class="research-source"><div><b>${source.publisher}</b><span>${loc(source.title)}</span><small>${source.date} · ${source.type.replaceAll('_',' ')}</small></div><a href="${source.url}" target="_blank" rel="noopener">${t('openSource')} ↗</a></div>`).join('')}</div>
    </div>
    <div class="dossier-section">
      <h3>${t('blocker')}</h3>
      <div class="research-blocker">${loc(record.blocker)}</div>
      <div class="research-actions">
        <button class="open-lab" data-research-open-lab="${record.ticker}">${t('openInLab')}</button>
        <button class="locked" disabled>${t('promoteLocked')}</button>
      </div>
    </div>`;
  document.querySelectorAll('[data-research-open-lab]').forEach(button=>{
    button.onclick=()=>setManualDecisionTicker(button.dataset.researchOpenLab,true);
  });
}
export function renderTimeline(){
  const d=state.data,m=computeModel(),top=m.opportunities.slice(0,5),dates=d.timeline.dates,colors=['#21d4a7','#7c5cff','#f7b955','#ff6b7a','#61a5ff'];
  $('timelineLegend').innerHTML=top.map((x,i)=>`<div class="legend-item"><i class="legend-dot" style="background:${colors[i]}"></i>${x.ticker}</div>`).join('');
  const W=760,H=300,left=48,right=20,topPad=24,bottom=42,minY=70,maxY=90,xp=i=>left+i*(W-left-right)/(dates.length-1),yp=v=>topPad+(maxY-v)/(maxY-minY)*(H-topPad-bottom),grid=[70,75,80,85,90];
  $('timelineChart').innerHTML=`<svg class="timeline-svg" viewBox="0 0 ${W} ${H}">${grid.map(v=>`<line class="chart-grid-line" x1="${left}" x2="${W-right}" y1="${yp(v)}" y2="${yp(v)}"/><text class="chart-axis-label" x="8" y="${yp(v)+4}">${v}</text>`).join('')}${dates.map((v,i)=>`<text class="chart-axis-label" x="${xp(i)}" y="${H-12}" text-anchor="middle">${v}</text>`).join('')}${top.map((series,si)=>{const vals=[...series.scoreHistory.slice(0,-1),series.strategyScore],pts=vals.map((v,i)=>`${xp(i)},${yp(v)}`).join(' ');return`<polyline class="chart-path" points="${pts}" stroke="${colors[si]}"/>${vals.map((v,i)=>`<circle class="chart-point" cx="${xp(i)}" cy="${yp(v)}" r="4" fill="${colors[si]}"/>`).join('')}`}).join('')}</svg><p class="settings-help">${t('scoreHistoryNote')}</p>`;
  $('timelineEvents').innerHTML=d.timeline.events.map(e=>`<div class="timeline-event"><time>${e.date}</time><b>${e.ticker}</b><p>${loc(e.text)}</p></div>`).join('');
  $('timelineMovers').innerHTML=m.opportunities.filter(x=>movement(x,x.customRank).delta!==0).map(x=>{const mv=movement(x,x.customRank);return`<div class="mover-row"><b>${x.name}</b><span>${x.customScore}</span><span class="${mv.cls}">${mv.label}</span></div>`}).join('');
}
function donutGradient(parts){let acc=0;return`conic-gradient(${parts.map(p=>{const start=acc;acc+=p.value;return`${p.color} ${start}% ${acc}%`}).join(',')})`}
const SLICE_COLORS=['var(--green)','var(--blue)','var(--cyan)','var(--amber)','var(--violet)','var(--red)'];
const sliceColor=index=>SLICE_COLORS[index%SLICE_COLORS.length];
const signedEuro=value=>`${value>=0?'+':''}${euro(value)}`;
const signClass=value=>value>=0?'positive':'negative';
function allocationLegend(parts){
  return parts.map(part=>`<div class="allocation-legend"><i style="background:${part.color}"></i><span>${part.label}</span><b>${num(part.value,1)} %</b></div>`).join('');
}
function breakdownDonut(parts,center,legendCaption){
  const value=Number.isFinite(center?.value)?`${num(center.value,0)}%`:'–';
  return`<div class="donut-row"><div class="donut" style="background:${donutGradient(parts)}"><div class="donut-center"><b>${value}</b><span>${center?.label??'–'}</span></div></div><div class="legend-list">${legendCaption?`<div class="legend-caption">${legendCaption}</div>`:''}${allocationLegend(parts)}</div></div>`;
}
function positionCard(position){
  const value=position.current*position.shares;
  const changePct=(position.current/position.entry-1)*100;
  const targetDist=Number.isFinite(position.target1)?(position.target1/position.current-1)*100:null;
  const levels=[
    [t('entry').toUpperCase(),euro(position.entry),wholeShareLabel(position.shares)],
    ...(hasStop(position)?[[t('stop').toUpperCase(),euro(position.stop),position.stop>=position.entry
      ?(state.language==='de'?'über Einstand':'above entry')
      :(state.language==='de'?'unter Einstand':'below entry')]]:[[t('stop').toUpperCase(),'–',t('noStopRecorded')]]),
    ...(targetDist===null?[]:[[`${t('target').toUpperCase()} 1`,euro(position.target1),`${num(targetDist,2)} %`]]),
    ...(Number.isFinite(position.trailingStopPct)?[['TRAILING',`${position.trailingStopPct} %`,state.language==='de'?'Restposition':'remaining position']]:[])
  ];
  const copy=[
    ...(position.strategy?[[t('currentStrategy'),loc(position.strategy)]]:[]),
    ...(position.thesis?[[t('investmentThesis'),loc(position.thesis)]]:[])
  ];
  return`<article class="position-card"><div class="position-head"><div><h2>${position.name}</h2><p>${position.ticker}${position.isin?` · ${position.isin}`:''} · ${sectorName(position.sector)} · ${position.country}</p></div><div class="position-value"><b>${euro(value)}</b><span class="${signClass(changePct)}">${pct(changePct)}</span></div></div><div class="position-strategy"><div class="strategy-levels">${levels.map(level=>`<div class="strategy-level"><span>${level[0]}</span><b>${level[1]}</b><small>${level[2]}</small></div>`).join('')}</div>${copy.length?`<div class="strategy-copy">${copy.map(block=>`<h3>${block[0]}</h3><p>${block[1]}</p>`).join('')}</div>`:''}</div></article>`;
}

export function renderPortfolio(){
  const p=state.data.portfolio;
  const value=valueOf(p),invested=investedOf(p),cost=costBasisOf(p);
  const open=unrealisedOf(p),real=realisedOf(p),risk=portfolioRisk(p);
  const closedLabel=p.closedTrades.length?p.closedTrades.map(trade=>trade.ticker).join(' + '):t('noClosedTrades');
  const openLabel=cost
    ?`${pct(open/cost*100)} ${t('acrossPositions')}`
    :t('noOpenPositions');

  $('portfolioMetrics').innerHTML=[
    [t('totalAssets'),euro(value),cost?`${pct(open/cost*100)} ${t('acrossPositions')}`:'–',''],
    [t('cash'),euro(p.cash),value?`${num(p.cash/value*100,1)} %`:'–',''],
    [t('unrealised'),signedEuro(open),openLabel,signClass(open)],
    [t('realisedLabel'),signedEuro(real),closedLabel,signClass(real)]
  ].map(a=>`<div class="portfolio-metric"><span>${a[0]}</span><b class="${a[3]}">${a[1]}</b><small>${a[2]}</small></div>`).join('');

  if(!p.positions.length){
    $('positionIntelligence').innerHTML=`<div class="pending-score"><div><strong>${t('noOpenPositions')}</strong><span>${t('noOpenPositionsText')}</span></div></div>`;
    $('allocationVisuals').innerHTML=breakdownDonut([{label:t('cash'),value:100,color:'var(--violet)'}],{label:'CASH',value:100},'');
    $('riskScenario').innerHTML=`<div class="pending-score"><div><strong>${t('noOpenPositions')}</strong><span>${t('noOpenPositionsText')}</span></div></div>`;
    return;
  }

  $('positionIntelligence').innerHTML=`<small class="position-group-label">${p.positions.length===1?t('activePosition'):t('activePositions')}</small>${p.positions.map(positionCard).join('')}`;

  const cashPct=value?p.cash/value*100:0;
  const holdingParts=[
    ...p.positions.map((position,index)=>({
      label:position.name,
      value:value?position.current*position.shares/value*100:0,
      color:sliceColor(index)
    })),
    {label:t('cash'),value:cashPct,color:'var(--violet)'}
  ];
  const countryParts=exposureBreakdown(p.positions,'country').map((part,index)=>({label:part.name,value:part.pct,color:sliceColor(index)}));
  const sectorParts=exposureBreakdown(p.positions,'sector').map((part,index)=>({label:sectorName(part.name),value:part.pct,color:sliceColor(index)}));
  $('allocationVisuals').innerHTML=[
    breakdownDonut(holdingParts,{label:'CASH',value:cashPct},''),
    breakdownDonut(countryParts,countryParts[0],t('countryInvested')),
    breakdownDonut(sectorParts,sectorParts[0],t('sectorInvested'))
  ].join('');

  const stopped=p.positions.filter(hasStop);
  $('riskScenario').innerHTML=`<div class="risk-rows">${stopped.map(position=>{
    const span=position.current-position.entry;
    const marker=clamp(span?(position.stop-position.entry)/span*100:0,0,100);
    return`<div class="risk-bar-wrap"><div class="risk-position-label"><b>${position.name}</b></div><div class="risk-scale"><i class="risk-marker" style="left:${marker}%"></i></div><div class="risk-labels"><span>${t('entry')} ${euro(position.entry)}</span><span>${t('stop')} ${euro(position.stop)}</span><span>${t('current')} ${euro(position.current)}</span></div></div>`;
  }).join('')}${risk.uncovered?`<div class="risk-uncovered">${t('withoutStop')}: ${p.positions.filter(item=>!hasStop(item)).map(item=>item.name).join(', ')}</div>`:''}</div><div class="risk-numbers"><div class="risk-number"><span>${t('resultAtStop').toUpperCase()}</span><b class="${signClass(risk.ifStop)}">${signedEuro(risk.ifStop)}</b><small>${state.language==='de'?'gegenüber Einstand':'versus entry'} · ${risk.covered} ${t('ofPositions')} ${p.positions.length}</small></div><div class="risk-number"><span>${t('profitGiveback').toUpperCase()}</span><b class="${risk.giveback>0?'warning-text':signClass(risk.giveback)}">${signedEuro(-risk.giveback)}</b><small>${state.language==='de'?'vom aktuellen Kurs':'from current price'}</small></div><div class="risk-number"><span>${t('portfolioAtStop').toUpperCase()}</span><b>${euro(risk.valueAtStop)}</b><small>${state.language==='de'?'ohne Kosten':'before costs'}</small></div><div class="risk-number"><span>${t('stopRisk').toUpperCase()}</span><b>${value?num(risk.giveback/value*100,2):'0,00'} %</b><small>${state.language==='de'?'des Depotwerts':'of portfolio value'}</small></div></div>`;
}
export function renderJournal(){
  const p=state.data.portfolio,realised=realisedOf(p);
  $('historySummary').innerHTML=[[t('transactions'),p.positions.length+p.closedTrades.length],[t('openPositions'),p.positions.length],[t('realisedResult'),`${realised>=0?'+':''}${euro(realised)}`]].map((item,index)=>`<div class="history-summary-card"><span>${item[0]}</span><b class="${index===2?(realised>=0?'positive':'negative'):''}">${item[1]}</b></div>`).join('');
  const open=p.positions.map(position=>({date:position.openedAt,title:position.name,detail:`${wholeShareLabel(position.shares)} · ${t('entry')} ${euro(position.entry)}`,label:t('statusOpen'),result:''}));
  const closed=p.closedTrades.map(trade=>({date:trade.date,title:trade.name,detail:`${trade.ticker} · ${wholeShareLabel(trade.shares)} · ${t('proceeds')} ${euro(trade.proceeds)}${trade.reason?` · ${trade.reason}`:''}`,label:t('sale'),result:`${trade.result>=0?'+':''}${euro(trade.result)}`}));
  const entries=[...open,...closed].sort((a,b)=>String(b.date??'').localeCompare(String(a.date??'')));
  $('journalFeed').innerHTML=entries.map(entry=>`<div class="journal-entry"><time>${entry.date?new Intl.DateTimeFormat(locale()).format(new Date(`${entry.date}T12:00:00`)):'–'}</time><div><b>${entry.title}</b><p>${entry.detail}</p></div>${entry.result?`<strong class="${entry.result.startsWith('+')?'positive':'negative'}">${entry.result}</strong>`:''}<span class="status-pill neutral">${entry.label}</span></div>`).join('');
}
export function renderModelHistory(){
  $('modelHistoryFeed').innerHTML=state.data.modelChanges.map(entry=>`<div class="journal-entry"><time>${new Intl.DateTimeFormat(locale()).format(new Date(entry.date+'T12:00:00'))}</time><div><b>${loc(entry.title)}</b><p>${loc(entry.detail)}</p></div><span class="status-pill neutral">${loc(entry.category)}</span></div>`).join('');
}
export function renderMethod(){
  const d=state.data,w=opportunityWeights();
  $('weightList').innerHTML=Object.entries(w).map(([k,v])=>`<div class="weight-row"><span>${t(k)}</span><div class="weight-track"><i style="width:${v*100/0.35}%"></i></div><b>${num(v*100,1)}%</b></div>`).join('');
  $('formulaList').innerHTML=[t('formulaOS'),t('formulaCash'),t('formulaSwitch'),t('formulaPrice')].map(x=>`<span>${x}</span>`).join('');
  $('ruleGrid').innerHTML=[
    [t('noRigidCaps'),loc(d.rules.positionCaps)],[t('stopLogic'),loc(d.rules.stopPolicy)],[t('crvHurdle'),`${num(state.settings.minCrv,1)}:1`],
    [t('wholeSharesOnly'),loc(d.rules.sharePolicy)],[t('cashHurdleLabel'),`${state.settings.cashHurdle} + ${state.settings.cashSafetyMargin}`],[t('activityStandard'),loc(d.rules.defaultAction)]
  ].map(x=>`<div class="rule-card"><b>${x[0]}</b><span>${x[1]}</span></div>`).join('');
}
