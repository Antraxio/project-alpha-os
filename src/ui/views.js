import {$,clamp,euro,loc,locale,num,pct,state,storage} from '../state.js';
import {movement,normalisedWeights,profileName,scoreClass} from '../scoring.js';
import {computeSizing,realisedOf,valueOf} from '../portfolio-calculations.js';
import {computeModel} from '../strategy-ranking.js';
import {activeDecisionSelection,universeEntry} from '../universe.js';
import {researchRecord} from '../research-pipeline.js';
import {regionName,sectorName,t,wholeShareLabel} from '../translations.js';

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

export function applyStaticTranslations(){
  document.documentElement.lang=state.language;
  document.querySelectorAll('[data-i18n]').forEach(el=>el.textContent=t(el.dataset.i18n));
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el=>el.placeholder=t(el.dataset.i18nPlaceholder));
  document.querySelectorAll('[data-lang]').forEach(b=>b.classList.toggle('active',b.dataset.lang===state.language));
  const titles={
    dashboard:['executiveEyebrow','projectAlpha'],decision:['decisionEyebrow','decisionLab'],scanner:['scannerEyebrow','scannerTitle'],
    universe:['universeEyebrow','universeTitle'],research:['researchEyebrow','researchTitle'],
    timeline:['timelineEyebrow','timelineTitle'],portfolio:['portfolioEyebrow','portfolioTitle'],competition:['competitionEyebrow','competitionTitle'],
    journal:['journalEyebrow','journalTitle'],methodology:['methodologyEyebrow','methodologyTitle'],settings:['settingsEyebrow','settingsTitle']
  };
  $('eyebrow').textContent=t(titles[state.view][0]);$('title').textContent=t(titles[state.view][1]);
}
export function profileLabel(name){
  return t({defensive:'profileDefensive',balanced:'profileBalanced',offensive:'profileOffensive',custom:'profileCustom'}[name]);
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

export function renderExecutive(){
  const d=state.data,m=computeModel(),c=d.portfolios.chatgpt,cl=d.portfolios.claude,msft=c.positions[0],cv=valueOf(c),clv=valueOf(cl),gap=cv-clv,open=(msft.current-msft.entry)*msft.shares;
  if(!m.candidate){
    $('briefingSalutation').textContent=state.language==='de'?'Alex, heute zählt Disziplin – nicht Aktivität.':'Alex, today discipline matters more than activity.';
    $('briefingHeadline').textContent=t('noEligibleCandidate');$('briefingSummary').textContent=t('noEligibleCandidateText');
    $('briefingPoints').innerHTML=`<div class="briefing-point">${t('noEligibleCandidateText')}</div>`;$('briefingTrigger').textContent=t('noEligibleCandidateText');
    $('executiveMetrics').innerHTML=[[t('portfolioValue'),euro(cv),pct((cv/c.startCapital-1)*100)],[t('activeCash'),euro(c.cash),`${num(c.cash/cv*100,1)} % ${t('cashQuote')}`],[t('openProfit'),`+${euro(open)}`,'Microsoft'],[t('gapClaude'),`${gap>=0?'+':''}${euro(gap)}`,gap>=0?`ChatGPT ${t('leads')}`:`Claude ${t('leads')}`]].map((x,i)=>`<div class="metric-line"><span>${x[0]}</span><b class="${i===2?'positive':i===3?(gap>=0?'positive':'negative'):''}">${x[1]}</b><small>${x[2]}</small></div>`).join('');
    $('execCandidate').textContent=t('noEligibleCandidate');$('execVerdict').textContent=t('wait');$('execOS').textContent='–';$('execRAS').textContent='–';$('execGates').textContent='0/0';
    $('triggerZone').textContent=t('noEligibleCandidate');$('triggerDistance').textContent='–';$('priceZoneProgress').style.width='0%';$('execWhy').innerHTML=`<div class="why-item"><i>×</i><span>${t('noEligibleCandidateText')}</span></div>`;
    $('regimeLabel').textContent=loc(d.marketRegime.label);$('regimeScore').textContent=d.marketRegime.score;$('regimeRing').style.setProperty('--score',d.marketRegime.score);$('regimeExplanation').textContent=loc(d.marketRegime.explanation);$('regimeTrend').textContent=loc(d.marketRegime.trend);$('regimeBreadth').textContent=loc(d.marketRegime.breadth);$('regimeStance').textContent=loc(d.marketRegime.stance);
    $('microsoftFocus').innerHTML='';$('rankingFocus').innerHTML='';return;
  }
  const passed=m.gates.filter(g=>g.pass).length,dist=(m.candidate.price/m.candidate.entryHigh-1)*100,targetDist=(msft.target1/msft.current-1)*100;
  $('briefingSalutation').textContent=state.language==='de'?'Alex, heute zählt Disziplin – nicht Aktivität.':'Alex, today discipline matters more than activity.';
  $('briefingHeadline').textContent=m.allPassed?t('buyReview'):t('noNewPosition');
  $('briefingSummary').textContent=state.language==='de'
    ?`${m.candidate.name} führt die neuen Kandidaten mit ${m.candidate.customScore} Punkten an, erfüllt aber nur ${passed} von ${m.gates.length} Gates. Microsoft liegt ${num(targetDist,2)} % unter Ziel 1.`
    :`${m.candidate.name} leads new candidates with a score of ${m.candidate.customScore}, but passes only ${passed} of ${m.gates.length} gates. Microsoft is ${num(targetDist,2)}% below target 1.`;
  const points=[
    state.language==='de'?`Aktives Profil: ${profileLabel(profileName())}.`:`Active profile: ${profileLabel(profileName())}.`,
    state.language==='de'?`Cash-Vorsprung des Kandidaten: ${m.cashAdv>=0?'+':''}${m.cashAdv} Punkte.`:`Candidate advantage over cash: ${m.cashAdv>=0?'+':''}${m.cashAdv} points.`,
    state.language==='de'?`Vorgeschlagene Größe: ${wholeShareLabel(m.sizing.shares)}, ${num(m.sizing.allocationPct,1)} % des Depotwerts.`:`Suggested size: ${wholeShareLabel(m.sizing.shares)}, ${num(m.sizing.allocationPct,1)}% of portfolio value.`
  ];
  $('briefingPoints').innerHTML=points.map(x=>`<div class="briefing-point">${x}</div>`).join('');
  $('briefingTrigger').textContent=state.language==='de'
    ?`${m.candidate.name} in Preiszone, RAS höher und alle Gates erfüllt – oder Microsoft erreicht ${euro(msft.target1)}.`
    :`${m.candidate.name} enters the price zone, RAS improves and all gates pass — or Microsoft reaches ${euro(msft.target1)}.`;
  $('executiveMetrics').innerHTML=[
    [t('portfolioValue'),euro(cv),pct((cv/c.startCapital-1)*100)],
    [t('activeCash'),euro(c.cash),`${num(c.cash/cv*100,1)} % ${t('cashQuote')}`],
    [t('openProfit'),`+${euro(open)}`,'Microsoft'],
    [t('gapClaude'),`${gap>=0?'+':''}${euro(gap)}`,gap>=0?`ChatGPT ${t('leads')}`:`Claude ${t('leads')}`]
  ].map((x,i)=>`<div class="metric-line"><span>${x[0]}</span><b class="${i===2?'positive':i===3?(gap>=0?'positive':'negative'):''}">${x[1]}</b><small>${x[2]}</small></div>`).join('');
  $('execCandidate').innerHTML=`${m.candidate.name} · ${m.candidate.customScore}<span class="calculated-score-label">${state.language==='de'?'Berechneter OS':'Calculated OS'}</span>`;
  $('execVerdict').textContent=m.allPassed?t('reviewBuy'):t('wait');$('execOS').textContent=m.candidate.customScore;$('execRAS').textContent=m.ras;$('execGates').textContent=`${passed}/${m.gates.length}`;
  $('triggerZone').textContent=`${t('entryZone')} ${euro(m.candidate.entryLow)}–${euro(m.candidate.entryHigh)}`;
  const zoneLabel=m.inZone?t('insideZone'):m.candidate.price>m.candidate.entryHigh?`${num(dist,2)} % ${t('aboveZone')}`:`${num(Math.abs(dist),2)} % ${t('belowZone')}`;
  $('triggerDistance').textContent=zoneLabel;$('priceZoneProgress').style.width=`${m.inZone?100:clamp(100-Math.abs(dist)*8,10,96)}%`;
  const why=m.gates.filter(g=>!g.pass).map(g=>`${t(g.key)}: ${g.detail}`);
  $('execWhy').innerHTML=(why.length?why:[state.language==='de'?'Alle Gates erfüllt; finalen Broker-Check durchführen.':'All gates passed; perform the final broker check.']).map(w=>`<div class="why-item"><i>${why.length?'×':'✓'}</i><span>${w}</span></div>`).join('');
  $('regimeLabel').textContent=loc(d.marketRegime.label);$('regimeScore').textContent=d.marketRegime.score;$('regimeRing').style.setProperty('--score',d.marketRegime.score);
  $('regimeExplanation').textContent=loc(d.marketRegime.explanation);$('regimeTrend').textContent=loc(d.marketRegime.trend);$('regimeBreadth').textContent=loc(d.marketRegime.breadth);$('regimeStance').textContent=loc(d.marketRegime.stance);
  const progress=clamp((msft.current-msft.entry)/(msft.target1-msft.entry)*100,0,100);
  $('microsoftFocus').innerHTML=`<div class="msft-progress"><div class="msft-line"><strong>${euro(msft.current)}</strong><span>${num(targetDist,2)} % ${state.language==='de'?'bis Ziel 1':'to target 1'}</span></div><div class="distance-bar"><i style="width:${progress}%"></i></div><div class="msft-labels"><span>${t('entry')} ${euro(msft.entry)}</span><span>${t('target')} 1 ${euro(msft.target1)}</span></div></div>`;
  $('rankingFocus').innerHTML=m.opportunities.slice(0,4).map(o=>{const mv=movement(o,o.customRank);return`<div class="focus-rank"><b>#${o.customRank}</b><div><b>${o.name}</b><span>${o.ticker}</span></div><div class="score">${o.strategyScore}<small class="calculated-score-label">OS ${o.customScore}</small></div><div class="${mv.cls}">${mv.label}</div></div>`}).join('');
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
    $('candidateSelectionReason').innerHTML=x?`${t('automaticSelectionReason')}<span class="selection-explanation"><div><i>1</i><span>${x.name}: ${t('strategyScore')} ${x.strategyScore}, OS ${x.customScore}.</span></div><div><i>2</i><span>${state.language==='de'?'Microsoft wird als bestehende Position nicht als neue Chance gewertet.':'Microsoft is already held and is excluded from new-opportunity selection.'}</span></div><div><i>3</i><span>${t('autoChangesWhen')}</span></div></span>`:`<b>${t('noEligibleCandidate')}</b><span class="selection-explanation">${t('noEligibleCandidateText')}</span>`;
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
    $('scoreBreakdown').innerHTML='';$('decisionGates').innerHTML='';$('decisionVerdict').textContent=t('noEligibleCandidateText');$('actionLadder').innerHTML='';$('evidenceGrid').innerHTML='';return;
  }
  if(!selection.scored){
    renderPendingDecision(selection.universe);
    return;
  }

  $('decisionCoverageNotice').classList.remove('show');
  const x=selection.scored;
  const w=normalisedWeights();
  const automatic=selection.mode==='auto';
  $('decisionCandidate').innerHTML=`${x.name} (${x.ticker})<span class="calculated-score-label">${t('strategyScore')} ${x.strategyScore} · OS ${x.customScore}</span>`;
  $('decisionMeta').textContent=`${x.isin} · ${regionName(x.region)} · ${sectorName(x.sector)} · ${t('conviction')} ${x.conviction}`;
  $('decisionScore').textContent=x.customScore;
  $('decisionRas').textContent=automatic?m.ras:x.ras;
  $('decisionRadar').innerHTML=radarSvg(x);
  $('scoreBreakdown').innerHTML=Object.entries(x.components).map(([key,value])=>`<div class="score-row"><span>${t(key)}</span><div class="score-meter"><i style="width:${value}%"></i></div><b>${value}</b><small>${num(value*w[key],1)} P.</small></div>`).join('');

  const gates=automatic?m.gates:[
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
  $('actionLadder').innerHTML=[
    [state.language==='de'?'1 · Beobachten':'1 · Monitor',t('monitorNow'),state.language==='de'?'Score, Preiszone und Portfolio-Fit überwachen.':'Monitor score, price zone and portfolio fit.','active'],
    [state.language==='de'?'2 · Vorbereiten':'2 · Prepare',`${t('prepareAt')} ≤ ${euro(x.entryHigh)}`,state.language==='de'?'Limit, Stop und Stückzahl plausibilisieren.':'Validate limit, stop and share count.',''],
    [state.language==='de'?'3 · Ausführen':'3 · Execute',`${t('executeOnly')} ${t('allGates')}`,state.language==='de'?'Broker-App und Kosten final prüfen.':'Perform final broker-app and cost check.','']
  ].map(a=>`<div class="ladder-step ${a[3]}"><span>${a[0]}</span><b>${a[1]}</b><small>${a[2]}</small></div>`).join('');
  $('evidenceGrid').innerHTML=Object.entries(x.componentReasons).map(([key,value])=>`<div class="evidence-card"><header><span>${t(key)}</span><b>${x.components[key]}</b></header><p>${loc(value)}</p></div>`).join('');
}

export function renderScanner(){
  const m=computeModel(),q=$('search').value.trim().toLowerCase(),r=$('region').value,s=$('sector').value,c=$('conviction').value;
  const items=m.opportunities.filter(x=>(!q||[x.name,x.ticker,x.isin].some(v=>v.toLowerCase().includes(q)))&&(r==='all'||x.region===r)&&(s==='all'||x.sector===s)&&(c==='all'||x.conviction===c));
  $('resultCount').textContent=`${items.length} ${t('candidates')}`;
  $('scannerList').innerHTML=items.map(x=>{const mv=movement(x,x.customRank);return`<div class="scanner-row ${x.ticker===state.selectedTicker?'selected':''}" data-ticker="${x.ticker}"><div class="rank">#${x.customRank}</div><div class="scanner-company"><b>${x.name}</b><span>${x.ticker} · ${x.isin}</span></div><span>${regionName(x.region)}</span><span>${sectorName(x.sector)}</span><div class="strategy-score ${scoreClass(x.strategyScore)}"><b>${x.strategyScore}</b><small>${t('strategyScore')}</small><em>OS ${x.customScore}</em></div>${sparkline(x.scoreHistory)}<span class="${mv.cls}">${mv.label}</span></div>`}).join('');
  document.querySelectorAll('.scanner-row').forEach(row=>row.onclick=()=>{state.selectedTicker=row.dataset.ticker;renderScanner()});renderCandidateDetail();
}
function renderCandidateDetail(){
  const m=computeModel(),x=m.opportunities.find(o=>o.ticker===state.selectedTicker)||m.opportunities[0];
  if(!x){$('candidateDetail').innerHTML=`<div class="pending-score"><div><strong>${t('noEligibleCandidate')}</strong><span>${t('noEligibleCandidateText')}</span></div></div>`;return;}
  const sizing=computeSizing(x);
  $('candidateDetail').innerHTML=`<div class="candidate-detail-grid"><div><div class="candidate-title"><h2>${x.name} · ${x.strategyScore}<span class="calculated-score-label">${t('strategyScore')} · OS ${x.customScore}</span></h2><p>${x.ticker} · ${x.isin} · ${regionName(x.region)} · ${sectorName(x.sector)}</p></div><div class="level-grid"><div><span>${t('current').toUpperCase()}</span><b>${euro(x.price)}</b></div><div><span>RAS</span><b>${x.ticker===m.candidate?.ticker?m.ras:x.ras}</b></div><div><span>${t('entry').toUpperCase()}</span><b>${euro(x.entryLow)}–${euro(x.entryHigh)}</b></div><div><span>${t('stop').toUpperCase()}</span><b>${euro(x.stop)}</b></div><div><span>${t('target').toUpperCase()}</span><b>${euro(x.target)}</b></div><div><span>${t('suggestedShares').toUpperCase()}</span><b>${wholeShareLabel(sizing.shares)}</b></div></div></div><div class="candidate-radar">${radarSvg(x,true)}</div><div class="candidate-rationale"><div class="strategy-fit-summary"><div><span>${t('strategyScore')}</span><b>${x.strategyScore}</b></div><div><span>${t('intrinsicOS')}</span><b>${x.customScore}</b></div><div><span>${t('fitAdjustment')}</span><b class="${x.fitAdjustment>=0?'fit-positive':'fit-negative'}">${x.fitAdjustment>=0?'+':''}${num(x.fitAdjustment,1)}</b></div><div><span>${t('crv')}</span><b>${num(x.entryCrv,2)}</b></div></div><div class="fit-reasons">${x.fitReasons.map(r=>`<div class="fit-reason"><b class="${r.value>0?'fit-positive':r.value<0?'fit-negative':'fit-neutral'}">${r.value>=0?'+':''}${num(r.value,1)}</b><span>${t(r.key)}</span></div>`).join('')}</div><div class="rationale-block"><span>${t('catalyst').toUpperCase()}</span><p>${loc(x.catalystText)}</p></div><div class="rationale-block"><span>${t('risk').toUpperCase()}</span><p>${loc(x.riskText)}</p></div><div class="rationale-block"><span>${t('decision').toUpperCase()}</span><p>${x.ticker===m.candidate?.ticker&&m.allPassed?t('executeReview'):t('observe')}</p><button class="open-decision-button" data-open-decision="${x.ticker}">${t('openInDecisionLab')}</button></div></div></div>`;
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
    row.onclick=()=>{
      const record=researchRecord(row.dataset.universeTicker);
      if(record) setResearchTicker(record.ticker,true);
      else setManualDecisionTicker(row.dataset.universeTicker,true);
    };
  });
}


export function renderResearch(){
  const pipeline=state.data.researchPipeline;
  if(!pipeline) return;
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
export function renderPortfolio(){
  const p=state.data.portfolios.chatgpt,x=p.positions[0],value=valueOf(p),open=(x.current-x.entry)*x.shares,real=realisedOf(p),ifStop=(x.stop-x.entry)*x.shares,giveback=(x.current-x.stop)*x.shares,targetDist=(x.target1/x.current-1)*100;
  $('portfolioMetrics').innerHTML=[[t('portfolioValue'),euro(value),pct((value/p.startCapital-1)*100)],[t('cash'),euro(p.cash),`${num(p.cash/value*100,1)} %`],[t('unrealised'),`+${euro(open)}`,`Microsoft ${pct((x.current/x.entry-1)*100)}`],[t('realisedLabel'),euro(real),'Meta + TSMC']].map((a,i)=>`<div class="portfolio-metric"><span>${a[0]}</span><b class="${i===2?'positive':i===3?'negative':''}">${a[1]}</b><small>${a[2]}</small></div>`).join('');
  $('positionIntelligence').innerHTML=`<div class="position-head"><div><small>${t('activePosition')}</small><h2>${x.name}</h2><p>${x.ticker} · ${x.isin} · ${sectorName(x.sector)} · ${x.country}</p></div><div class="position-value"><b>${euro(x.current*x.shares)}</b><span class="positive">${pct((x.current/x.entry-1)*100)}</span></div></div><div class="position-strategy"><div class="strategy-levels"><div class="strategy-level"><span>${t('entry').toUpperCase()}</span><b>${euro(x.entry)}</b><small>${wholeShareLabel(x.shares)}</small></div><div class="strategy-level"><span>${t('stop').toUpperCase()}</span><b>${euro(x.stop)}</b><small>${state.language==='de'?'über Einstand':'above entry'}</small></div><div class="strategy-level"><span>${t('target').toUpperCase()} 1</span><b>${euro(x.target1)}</b><small>${num(targetDist,2)} %</small></div><div class="strategy-level"><span>TRAILING</span><b>${x.trailingStopPct} %</b><small>${state.language==='de'?'Restposition':'remaining position'}</small></div></div><div class="strategy-copy"><h3>${t('currentStrategy')}</h3><p>${loc(x.strategy)}</p><h3>${t('investmentThesis')}</h3><p>${loc(x.thesis)}</p></div></div>`;
  const cashPct=p.cash/value*100,invPct=100-cashPct;
  $('allocationVisuals').innerHTML=`<div class="donut-row"><div class="donut" style="background:${donutGradient([{value:cashPct,color:'var(--violet)'},{value:invPct,color:'var(--green)'}])}"><div class="donut-center"><b>${num(cashPct,0)}%</b><span>CASH</span></div></div><div class="legend-list"><div class="allocation-legend"><i style="background:var(--violet)"></i><span>${t('cash')}</span><b>${num(cashPct,1)} %</b></div><div class="allocation-legend"><i style="background:var(--green)"></i><span>Microsoft</span><b>${num(invPct,1)} %</b></div></div></div><div class="donut-row"><div class="donut" style="background:conic-gradient(var(--blue) 0 100%)"><div class="donut-center"><b>100%</b><span>USA</span></div></div><div class="legend-list"><div class="allocation-legend"><i style="background:var(--blue)"></i><span>${state.language==='de'?'Land, nur investiert':'Country, invested only'}</span><b>USA 100 %</b></div><div class="allocation-legend"><i style="background:var(--cyan)"></i><span>${state.language==='de'?'Sektor, nur investiert':'Sector, invested only'}</span><b>${sectorName('Technology')} 100 %</b></div></div></div>`;
  const marker=clamp((x.stop-x.entry)/(x.current-x.entry)*100,0,100);
  $('riskScenario').innerHTML=`<div class="risk-bar-wrap"><div class="risk-scale"><i class="risk-marker" style="left:${marker}%"></i></div><div class="risk-labels"><span>${t('entry')} ${euro(x.entry)}</span><span>${t('stop')} ${euro(x.stop)}</span><span>${t('current')} ${euro(x.current)}</span></div></div><div class="risk-numbers"><div class="risk-number"><span>${t('resultAtStop').toUpperCase()}</span><b class="positive">+${euro(ifStop)}</b><small>${state.language==='de'?'gegenüber Einstand':'versus entry'}</small></div><div class="risk-number"><span>${t('profitGiveback').toUpperCase()}</span><b class="warning-text">-${euro(giveback)}</b><small>${state.language==='de'?'vom aktuellen Kurs':'from current price'}</small></div><div class="risk-number"><span>${t('portfolioAtStop').toUpperCase()}</span><b>${euro(p.cash+x.stop*x.shares)}</b><small>${state.language==='de'?'ohne Kosten':'before costs'}</small></div><div class="risk-number"><span>${t('stopRisk').toUpperCase()}</span><b>${num(giveback/value*100,2)} %</b><small>${state.language==='de'?'des Depotwerts':'of portfolio value'}</small></div></div>`;
  const max=Math.max(...p.closedTrades.map(v=>Math.abs(v.result)));
  $('closedTrades').innerHTML=p.closedTrades.map(v=>`<div class="trade-row"><span>${new Intl.DateTimeFormat(locale()).format(new Date(v.date+'T12:00:00'))}</span><b>${v.name}</b><div class="trade-bar"><i style="width:${Math.abs(v.result)/max*100}%;background:${v.result>=0?'var(--green)':'var(--red)'}"></i></div><b class="${v.result>=0?'positive':'negative'}">${v.result>=0?'+':''}${euro(v.result)}</b><span>${v.days} ${t('days')}</span><span>${v.reason}</span></div>`).join('');
}
export function renderCompetition(){
  const arr=[state.data.portfolios.chatgpt,state.data.portfolios.claude],max=Math.max(...arr.map(valueOf));
  $('competitionCards').innerHTML=arr.map((p,i)=>{const v=valueOf(p),ret=v-p.startCapital,real=realisedOf(p);return`<article class="panel competition-card"><header><div><small>${i===0?t('mainPortfolio'):t('benchmark')}</small><h2>${p.name}</h2></div><span class="status-pill ${i===0?'neutral':'positive'}">${p.positions.length} ${p.positions.length===1?t('position'):t('positions')}</span></header><div class="portfolio-total">${euro(v)}</div><div class="${ret>=0?'positive':'negative'}">${ret>=0?'+':''}${euro(ret)} · ${pct(ret/p.startCapital*100)}</div><div class="competition-stats"><div><span>CASH</span><b>${euro(p.cash)}</b></div><div><span>${t('capitalInvested')}</span><b>${euro(p.positions.reduce((s,x)=>s+x.current*x.shares,0))}</b></div><div><span>${t('realised').toUpperCase()}</span><b class="${real>=0?'positive':'negative'}">${real>=0?'+':''}${euro(real)}</b></div></div></article>`}).join('');
  $('comparisonBars').innerHTML=arr.map(p=>`<div class="comparison-row"><b>${p.name.replace(' Benchmark','')}</b><div class="comparison-track"><i style="width:${valueOf(p)/max*100}%"></i></div><b>${euro(valueOf(p))}</b></div>`).join('');
}
export function renderJournal(){
  const items=state.language==='de'?[
    ['01.08.2026','Strategy Studio eingeführt','Score-Gewichte, Ausführungsschwellen und Portfolio-Präferenzen sind jetzt live anpassbar.','Methodik'],
    ['01.08.2026','Zweisprachige Oberfläche','Deutsch und Englisch werden vollständig im Browser gespeichert.','Review'],
    ['29.07.2026','Meta und TSMC geschlossen','Stop-Loss-Regeln ausgeführt; Verluste getrennt dokumentiert.','Verkauf'],
    ['15.07.2026','Microsoft gekauft','2 Aktien zu 337,15 €; Teilgewinnziel und Trailing-Logik definiert.','Kauf']
  ]:[
    ['01/08/2026','Strategy Studio introduced','Score weights, execution thresholds and portfolio preferences are now configurable live.','Methodology'],
    ['01/08/2026','Bilingual interface','German and English are stored persistently in the browser.','Review'],
    ['29/07/2026','Meta and TSMC closed','Stop-loss rules executed; losses documented separately.','Sale'],
    ['15/07/2026','Microsoft purchased','2 shares at €337.15; partial-profit target and trailing logic defined.','Buy']
  ];
  $('journalFeed').innerHTML=items.map(x=>`<div class="journal-entry"><time>${x[0]}</time><div><b>${x[1]}</b><p>${x[2]}</p></div><span class="status-pill neutral">${x[3]}</span></div>`).join('');
}
export function renderMethod(){
  const d=state.data,w=normalisedWeights();
  $('weightList').innerHTML=Object.entries(w).map(([k,v])=>`<div class="weight-row"><span>${t(k)}</span><div class="weight-track"><i style="width:${v*100/0.35}%"></i></div><b>${num(v*100,1)}%</b></div>`).join('');
  $('formulaList').innerHTML=[t('formulaOS'),t('formulaCash'),t('formulaSwitch'),t('formulaPrice')].map(x=>`<span>${x}</span>`).join('');
  $('ruleGrid').innerHTML=[
    [t('noRigidCaps'),loc(d.rules.positionCaps)],[t('stopLogic'),loc(d.rules.stopPolicy)],[t('crvHurdle'),`${num(state.settings.minCrv,1)}:1`],
    [t('wholeSharesOnly'),loc(d.rules.sharePolicy)],[t('cashHurdleLabel'),`${state.settings.cashHurdle} + ${state.settings.cashSafetyMargin}`],[t('activityStandard'),loc(d.rules.defaultAction)]
  ].map(x=>`<div class="rule-card"><b>${x[0]}</b><span>${x[1]}</span></div>`).join('');
}
