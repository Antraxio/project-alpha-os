
const state={data:null,language:localStorage.getItem('alphaLanguage')||'de',settings:null,view:'dashboard',selectedTicker:'ASML',profile:'balanced'};
const $=id=>document.getElementById(id);
const clone=x=>JSON.parse(JSON.stringify(x));
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const loc=v=>v&&typeof v==='object'&&('de'in v||'en'in v)?(v[state.language]??v.de):v;
const locale=()=>state.language==='de'?'de-DE':'en-GB';
const euro=v=>new Intl.NumberFormat(locale(),{style:'currency',currency:'EUR'}).format(v);
const pct=v=>`${v>=0?'+':''}${new Intl.NumberFormat(locale(),{minimumFractionDigits:2,maximumFractionDigits:2}).format(v)} %`;
const num=(v,d=1)=>new Intl.NumberFormat(locale(),{minimumFractionDigits:d,maximumFractionDigits:d}).format(v);
const dateFmt=v=>new Intl.DateTimeFormat(locale(),{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(v));
const valueOf=p=>p.cash+p.positions.reduce((s,x)=>s+x.current*x.shares,0);
const realisedOf=p=>p.closedTrades.reduce((s,x)=>s+x.result,0);

const I18N={
  de:{
    brandSubtitle:'Decision Intelligence',navExecutive:'Executive',navDecision:'Decision Lab',navScanner:'Scanner',navTimeline:'Alpha Timeline',navPortfolio:'Portfolio',navCompetition:'Competition',navJournal:'Journal',navMethodology:'Methodik',navSettings:'Strategy Studio',
    cashActive:'Cash ist eine aktive Position',osThreshold:'OS-Schwelle',cashMargin:'Cash-Marge',modelSnapshot:'MODELL-SNAPSHOT',modelDisclaimer:'Keine Live-Kursversorgung. Entscheidungen werden aus eingebetteten Daten und dem aktiven Strategieprofil abgeleitet.',
    todayDecision:'HEUTIGE ENTSCHEIDUNG',nextTrigger:'Nächster Trigger',bestNewOpportunity:'BESTE NEUE CHANCE',absoluteQuality:'absolute Qualität',relativeUse:'relative Verwendung',gates:'Gates',executionPassed:'Ausführung erfüllt',
    marketRegime:'MARKTREGIME',trend:'Trend',breadth:'Breite',stance:'Haltung',attentionToday:'Was heute Aufmerksamkeit verdient',partialProfitNear:'Teilgewinn fast erreicht',strategyLink:'Strategie →',watchlist:'WATCHLIST',largestChanges:'Größte Veränderungen',timelineLink:'Timeline →',
    explainableScore:'ERKLÄRBARER SCORE',whyNotBuy:'Warum heute nicht kaufen?',triggerLogic:'TRIGGER-LOGIK',observeToExecute:'Von Beobachten zu Ausführen',rulesBased:'Regelbasiert',reasonByComponent:'Begründung nach Score-Komponente',
    searchPlaceholder:'Unternehmen, Ticker oder ISIN',allRegions:'Alle Regionen',allSectors:'Alle Sektoren',allConvictions:'Alle Convictions',
    timelineHeadline:'Scores verändern sich – Entscheidungen folgen erst danach.',timelineIntro:'Die Timeline zeigt, welche Kandidaten an Qualität gewinnen und welche nur kurzfristig Aufmerksamkeit erzeugen.',strongestRiser:'Stärkster 7-Tage-Aufsteiger',scoreEvolution:'SCORE-ENTWICKLUNG',topFiveOverTime:'Top 5 im Zeitverlauf',movements:'BEWEGUNGEN',whatChanged:'Was hat sich geändert?',risersFallers:'Auf- und Absteiger',
    portfolioHeadline:'Risiko, Exponierung und Ausstiegslogik',manuallyConfirmed:'Manuell bestätigt',allocation:'ALLOKATION',whereCapital:'Wo liegt das Kapital?',riskPicture:'RISIKOBILD',stopScenario:'Was passiert bei Auslösen des Stops?',realised:'REALISIERT',profitsLosses:'Gewinne und Verluste',
    benchmark:'BENCHMARK',relativePerformance:'RELATIVE PERFORMANCE',competitionStatus:'Wettbewerbsstand',decisionJournal:'Entscheidungsjournal',disciplineScore:'DISZIPLIN-SCORE',disciplineText:'Die Trennung zwischen „gute Aktie“ und „beste Kapitalverwendung“ ist fest in der Methodik verankert.',
    fixedWeighting:'Feste Gewichtung',weightingExplanation:'Die Gewichte stehen vor der Bewertung fest. Das aktive Profil kann sie transparent verändern.',cashCompetitor:'Cash ist ein Wettbewerber',cashCompetitorText:'Eine neue Position muss Cash, Alternativen und das bestehende Portfolio mit Sicherheitsmarge schlagen.',governanceNotCaps:'Governance statt starre Caps',
    settingsHeadline:'Passe die Investmentlogik an – transparent und reversibel.',settingsIntro:'Alle Änderungen berechnen Ranking, Scores, Gates und Positionsvorschlag sofort neu. Sie werden nur in diesem Browser gespeichert.',
    resetDefaults:'Standard wiederherstellen',saveProfile:'Profil speichern',defensive:'Defensiv',defensiveText:'Mehr Cash, Risiko und Fundamentaldaten',balanced:'Ausgewogen',balancedText:'Alpha-2.0-Standardprofil',offensive:'Offensiv',offensiveText:'Mehr Momentum und größere Zielpositionen',
    scoreWeights:'SCORE-GEWICHTE',whatMatters:'Was zählt bei der Auswahl?',normalisedWeights:'Die Regler werden automatisch auf 100 % normalisiert.',executionRules:'AUSFÜHRUNGSREGELN',whenAction:'Wann wird aus einer Idee eine Aktion?',portfolioPreferences:'PORTFOLIO-PRÄFERENZEN',capitalAllocation:'Wie soll Kapital verteilt werden?',livePreview:'LIVE-VORSCHAU',effectOnDecision:'Auswirkung auf die Entscheidung',
    executiveEyebrow:'EXECUTIVE SUMMARY',decisionEyebrow:'DECISION INTELLIGENCE',scannerEyebrow:'RANKED UNIVERSE',timelineEyebrow:'SCORE EVOLUTION',portfolioEyebrow:'CAPITAL & RISK',competitionEyebrow:'BENCHMARK',journalEyebrow:'DECISION QUALITY',methodologyEyebrow:'GOVERNANCE',settingsEyebrow:'STRATEGY CONTROL',
    projectAlpha:'Project Alpha',decisionLab:'Decision Lab',scannerTitle:'Scanner',timelineTitle:'Alpha Timeline',portfolioTitle:'Portfolio',competitionTitle:'Competition',journalTitle:'Journal',methodologyTitle:'Methodik',settingsTitle:'Strategy Studio',
    modelLoaded:'Strategieprofil geladen',dataStand:'Stand',candidates:'Kandidaten',candidate:'Kandidat',wait:'Warten',reviewBuy:'Kauf prüfen',noNewPosition:'Keine neue Position eröffnen.',buyReview:'Kauf vorbereiten.',entryZone:'Einstiegszone',aboveZone:'über der Zone',belowZone:'unter der Zone',insideZone:'in der Zone',
    portfolioValue:'Depotwert',activeCash:'Aktives Cash',openProfit:'Offener Buchgewinn',gapClaude:'Abstand zu Claude',leads:'führt',cashQuote:'Cashquote',
    os:'Opportunity Score',ras:'Relative Advantage',crv:'CRV',suggestedShares:'Vorgeschlagene Stückzahl',wholeShares:'volle Aktien',oneShare:'eine Aktie',noShare:'keine Aktie',
    current:'Aktuell',entry:'Einstieg',stop:'Stop',target:'Ziel',conviction:'Conviction',catalyst:'Katalysator',risk:'Risiko',decision:'Entscheidung',observe:'Beobachten',executeReview:'Ausführung prüfen',
    scoreGate:'Absolute Qualität',cashGate:'Cash-Sicherheitsmarge',switchGate:'Relative Führungsposition',priceGate:'Preiszone',crvGate:'Chance/Risiko',sizingGate:'Volle-Aktien-Finanzierbarkeit',
    passed:'Bestanden',open:'Offen',fundamental:'Fundamental',technical:'Technik',macro:'Makro',diversification:'Diversifikation',
    monitorNow:'Jetzt beobachten',prepareAt:'Vorbereiten bei',executeOnly:'Nur ausführen bei',allGates:'allen Gates',weight:'Gewicht',
    sectorExposure:'Sektorexponierung',regionExposure:'Regionsexponierung',postTrade:'nach Kauf',warning:'Warnung',withinPreference:'innerhalb Präferenz',
    invested:'Investiert',cash:'Cash',unrealised:'Unrealisiert',realisedLabel:'Realisiert',activePosition:'AKTIVE POSITION',currentStrategy:'Aktuelle Strategie',investmentThesis:'Investmentthese',nextAction:'Nächste Aktion',
    resultAtStop:'Ergebnis bei Stop',profitGiveback:'Gewinn-Rückgabe',portfolioAtStop:'Depotwert bei Stop',stopRisk:'Stop-Risiko',days:'Tage',
    mainPortfolio:'HAUPTDEPOT',positions:'Positionen',position:'Position',capitalInvested:'INVESTIERT',custom:'INDIVIDUELL',standard:'STANDARD',
    saved:'Strategieprofil gespeichert.',resetDone:'Standardprofil wiederhergestellt.',presetApplied:'Profil angewendet.',localOnly:'Nur in diesem Browser gespeichert',
    settingsCandidate:'Beste neue Chance',settingsDecision:'Entscheidung',targetSize:'Zielgröße',projectedFit:'Portfolio-Fit',
    profileDefensive:'DEFENSIV',profileBalanced:'AUSGEWOGEN',profileOffensive:'OFFENSIV',profileCustom:'INDIVIDUELL',
    wholeShareAboveTarget:'Eine volle Aktie liegt über der Zielgröße, ist aber finanzierbar.',notFinanceable:'Eine volle Aktie ist nach Cashreserve nicht finanzierbar.',concentrationWarning:'Die geplante Position überschreitet die Konzentrationswarnung.',fitWarning:'Die geplante Position überschreitet eine Diversifikationswarnung.',
    scoreHistoryNote:'Historische Scores bleiben der dokumentierte Basisverlauf; das Ranking zeigt das aktive Profil.',
    formulaOS:'OS ≥ Schwelle',formulaCash:'Cash-Vorsprung ≥ Marge',formulaSwitch:'Wechselschwelle erfüllt',formulaPrice:'Preiszone bestätigt',
    noRigidCaps:'Keine starren Positionscaps',stopLogic:'Stop-Logik',crvHurdle:'CRV-Hürde',wholeSharesOnly:'Volle Stücke',cashHurdleLabel:'Cash-Hürde',activityStandard:'Aktivitätsstandard',
    riskProfile:'Risikoprofil',buy:'Kauf',sale:'Verkauf',review:'Review',method:'Methodik'
  },
  en:{
    brandSubtitle:'Decision Intelligence',navExecutive:'Executive',navDecision:'Decision Lab',navScanner:'Scanner',navTimeline:'Alpha Timeline',navPortfolio:'Portfolio',navCompetition:'Competition',navJournal:'Journal',navMethodology:'Methodology',navSettings:'Strategy Studio',
    cashActive:'Cash is an active position',osThreshold:'OS threshold',cashMargin:'Cash margin',modelSnapshot:'MODEL SNAPSHOT',modelDisclaimer:'No live market data. Decisions are derived from embedded data and the active strategy profile.',
    todayDecision:'TODAY’S DECISION',nextTrigger:'Next trigger',bestNewOpportunity:'BEST NEW OPPORTUNITY',absoluteQuality:'absolute quality',relativeUse:'relative use',gates:'Gates',executionPassed:'execution passed',
    marketRegime:'MARKET REGIME',trend:'Trend',breadth:'Breadth',stance:'Stance',attentionToday:'What deserves attention today',partialProfitNear:'Partial-profit target is close',strategyLink:'Strategy →',watchlist:'WATCHLIST',largestChanges:'Largest changes',timelineLink:'Timeline →',
    explainableScore:'EXPLAINABLE SCORE',whyNotBuy:'Why not buy today?',triggerLogic:'TRIGGER LOGIC',observeToExecute:'From observation to execution',rulesBased:'Rules-based',reasonByComponent:'Rationale by score component',
    searchPlaceholder:'Company, ticker or ISIN',allRegions:'All regions',allSectors:'All sectors',allConvictions:'All convictions',
    timelineHeadline:'Scores change first — decisions follow later.',timelineIntro:'The timeline shows which candidates are gaining quality and which merely attract short-term attention.',strongestRiser:'Strongest 7-day riser',scoreEvolution:'SCORE EVOLUTION',topFiveOverTime:'Top five over time',movements:'MOVEMENTS',whatChanged:'What changed?',risersFallers:'Risers and fallers',
    portfolioHeadline:'Risk, exposure and exit logic',manuallyConfirmed:'Manually confirmed',allocation:'ALLOCATION',whereCapital:'Where is the capital?',riskPicture:'RISK PICTURE',stopScenario:'What happens if the stop is triggered?',realised:'REALISED',profitsLosses:'Profits and losses',
    benchmark:'BENCHMARK',relativePerformance:'RELATIVE PERFORMANCE',competitionStatus:'Competition status',decisionJournal:'Decision journal',disciplineScore:'DISCIPLINE SCORE',disciplineText:'The distinction between a “good stock” and the “best use of capital” is embedded in the methodology.',
    fixedWeighting:'Fixed weighting',weightingExplanation:'Weights are defined before assessment. The active profile can adjust them transparently.',cashCompetitor:'Cash is a competitor',cashCompetitorText:'A new position must beat cash, alternatives and the existing portfolio by a safety margin.',governanceNotCaps:'Governance instead of rigid caps',
    settingsHeadline:'Adjust the investment logic — transparently and reversibly.',settingsIntro:'Every change recalculates rankings, scores, gates and position sizing immediately. Settings are stored only in this browser.',
    resetDefaults:'Restore defaults',saveProfile:'Save profile',defensive:'Defensive',defensiveText:'More cash, risk control and fundamentals',balanced:'Balanced',balancedText:'Alpha 2.0 default profile',offensive:'Offensive',offensiveText:'More momentum and larger target positions',
    scoreWeights:'SCORE WEIGHTS',whatMatters:'What matters in selection?',normalisedWeights:'Sliders are automatically normalised to 100%.',executionRules:'EXECUTION RULES',whenAction:'When does an idea become an action?',portfolioPreferences:'PORTFOLIO PREFERENCES',capitalAllocation:'How should capital be allocated?',livePreview:'LIVE PREVIEW',effectOnDecision:'Impact on the decision',
    executiveEyebrow:'EXECUTIVE SUMMARY',decisionEyebrow:'DECISION INTELLIGENCE',scannerEyebrow:'RANKED UNIVERSE',timelineEyebrow:'SCORE EVOLUTION',portfolioEyebrow:'CAPITAL & RISK',competitionEyebrow:'BENCHMARK',journalEyebrow:'DECISION QUALITY',methodologyEyebrow:'GOVERNANCE',settingsEyebrow:'STRATEGY CONTROL',
    projectAlpha:'Project Alpha',decisionLab:'Decision Lab',scannerTitle:'Scanner',timelineTitle:'Alpha Timeline',portfolioTitle:'Portfolio',competitionTitle:'Competition',journalTitle:'Journal',methodologyTitle:'Methodology',settingsTitle:'Strategy Studio',
    modelLoaded:'Strategy profile loaded',dataStand:'As of',candidates:'candidates',candidate:'Candidate',wait:'Wait',reviewBuy:'Review buy',noNewPosition:'Do not open a new position.',buyReview:'Prepare a purchase.',entryZone:'Entry zone',aboveZone:'above the zone',belowZone:'below the zone',insideZone:'inside the zone',
    portfolioValue:'Portfolio value',activeCash:'Active cash',openProfit:'Open profit',gapClaude:'Gap to Claude',leads:'leads',cashQuote:'Cash ratio',
    os:'Opportunity Score',ras:'Relative Advantage',crv:'Risk/reward',suggestedShares:'Suggested shares',wholeShares:'whole shares',oneShare:'one share',noShare:'no shares',
    current:'Current',entry:'Entry',stop:'Stop',target:'Target',conviction:'Conviction',catalyst:'Catalyst',risk:'Risk',decision:'Decision',observe:'Monitor',executeReview:'Review execution',
    scoreGate:'Absolute quality',cashGate:'Cash safety margin',switchGate:'Relative leadership',priceGate:'Price zone',crvGate:'Risk/reward',sizingGate:'Whole-share affordability',
    passed:'Passed',open:'Open',fundamental:'Fundamental',technical:'Technical',macro:'Macro',diversification:'Diversification',
    monitorNow:'Monitor now',prepareAt:'Prepare at',executeOnly:'Execute only with',allGates:'all gates',weight:'Weight',
    sectorExposure:'Sector exposure',regionExposure:'Region exposure',postTrade:'after purchase',warning:'Warning',withinPreference:'within preference',
    invested:'Invested',cash:'Cash',unrealised:'Unrealised',realisedLabel:'Realised',activePosition:'ACTIVE POSITION',currentStrategy:'Current strategy',investmentThesis:'Investment thesis',nextAction:'Next action',
    resultAtStop:'Result at stop',profitGiveback:'Profit giveback',portfolioAtStop:'Portfolio at stop',stopRisk:'Stop risk',days:'days',
    mainPortfolio:'MAIN PORTFOLIO',positions:'positions',position:'position',capitalInvested:'INVESTED',custom:'CUSTOM',standard:'STANDARD',
    saved:'Strategy profile saved.',resetDone:'Default profile restored.',presetApplied:'Profile applied.',localOnly:'Stored only in this browser',
    settingsCandidate:'Best new opportunity',settingsDecision:'Decision',targetSize:'Target size',projectedFit:'Portfolio fit',
    profileDefensive:'DEFENSIVE',profileBalanced:'BALANCED',profileOffensive:'OFFENSIVE',profileCustom:'CUSTOM',
    wholeShareAboveTarget:'One whole share exceeds the target size but remains affordable.',notFinanceable:'One whole share is not affordable after the cash reserve.',concentrationWarning:'The planned position exceeds the concentration warning.',fitWarning:'The planned position exceeds a diversification warning.',
    scoreHistoryNote:'Historical scores remain the documented baseline; the ranking reflects the active profile.',
    formulaOS:'OS ≥ threshold',formulaCash:'Cash advantage ≥ margin',formulaSwitch:'Switch threshold passed',formulaPrice:'Price zone confirmed',
    noRigidCaps:'No rigid position caps',stopLogic:'Stop logic',crvHurdle:'Risk/reward hurdle',wholeSharesOnly:'Whole shares',cashHurdleLabel:'Cash hurdle',activityStandard:'Activity standard',
    riskProfile:'Risk profile',buy:'Buy',sale:'Sale',review:'Review',method:'Methodology'
  }
};
const t=k=>I18N[state.language][k]??k;

const wholeShareLabel=count=>{
  if(state.language==='de'){
    return count===1?'1 ganze Akte':`${count} ganze Aktien`;
  }
  return count===1?'1 whole share':`${count} whole shares`;
};

const sectorMap={
  Technology:{de:'Technologie',en:'Technology'},Semiconductors:{de:'Halbleiter',en:'Semiconductors'},Consumer:{de:'Konsum',en:'Consumer'},
  Healthcare:{de:'Gesundheit',en:'Healthcare'},Utilities:{de:'Versorger',en:'Utilities'},Insurance:{de:'Versicherung',en:'Insurance'},
  Financials:{de:'Finanzen',en:'Financials'},Telecom:{de:'Telekom',en:'Telecom'},Energy:{de:'Energie',en:'Energy'}
};
const regionMap={USA:{de:'USA',en:'USA'},Europe:{de:'Europa',en:'Europe'},Asia:{de:'Asien',en:'Asia'}};
const sectorName=x=>sectorMap[x]?.[state.language]??x;
const regionName=x=>regionMap[x]?.[state.language]??x;

function normalisedWeights(){
  const w=state.settings.scoreWeights,total=Object.values(w).reduce((a,b)=>a+b,0)||1;
  return Object.fromEntries(Object.entries(w).map(([k,v])=>[k,v/total]));
}
function profileName(){
  const presets=state.data.strategyPresets;
  for(const [name,p] of Object.entries(presets))if(JSON.stringify(p)===JSON.stringify(state.settings))return name;
  return 'custom';
}
function movement(x,rank){
  if(x.previousRank===null)return{label:state.language==='de'?'Neu':'New',cls:'new',delta:null};
  const d=x.previousRank-rank;
  if(d>0)return{label:`▲ ${d}`,cls:'up',delta:d};
  if(d<0)return{label:`▼ ${Math.abs(d)}`,cls:'down',delta:d};
  return{label:'=',cls:'flat',delta:0};
}
function scoreClass(s){return s>=state.settings.opportunityThreshold?'positive':s>=75?'warning-text':'negative'}
function computeSizing(candidate){
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
function computeModel(){
  const weights=normalisedWeights(),held=new Set(state.data.portfolios.chatgpt.positions.map(x=>x.ticker));
  let opportunities=state.data.opportunities.map(o=>{
    const customScore=Math.round(Object.entries(o.components).reduce((s,[k,v])=>s+v*(weights[k]||0),0));
    const entryMid=(o.entryLow+o.entryHigh)/2;
    const crv=(o.target-entryMid)/Math.max(.01,entryMid-o.stop);
    return{...o,customScore,crv};
  }).sort((a,b)=>b.customScore-a.customScore||b.ras-a.ras).map((o,i)=>({...o,customRank:i+1}));
  const newCandidates=opportunities.filter(o=>!held.has(o.ticker));
  const candidate=newCandidates[0],second=newCandidates[1];
  const heldBest=opportunities.filter(o=>held.has(o.ticker)).sort((a,b)=>b.customScore-a.customScore)[0];
  const sizing=computeSizing(candidate);
  const cashAdv=candidate.customScore-state.settings.cashHurdle;
  const secondGap=candidate.customScore-(second?.customScore??candidate.customScore);
  const heldGap=candidate.customScore-(heldBest?.customScore??candidate.customScore);
  const inZone=candidate.price>=candidate.entryLow&&candidate.price<=candidate.entryHigh;
  const ras=clamp(Math.round(50+cashAdv*3+secondGap*2+heldGap+(inZone?4:-5)-(sizing.concentrationWarning?4:0)-(sizing.sectorWarning?3:0)-(sizing.regionWarning?3:0)),0,100);
  const gates=[
    {key:'scoreGate',pass:candidate.customScore>=state.settings.opportunityThreshold,detail:`${candidate.customScore} ≥ ${state.settings.opportunityThreshold}`},
    {key:'cashGate',pass:cashAdv>=state.settings.cashSafetyMargin,detail:`${cashAdv>=0?'+':''}${cashAdv} / +${state.settings.cashSafetyMargin}`},
    {key:'switchGate',pass:heldGap>=state.settings.switchMargin,detail:`${heldGap>=0?'+':''}${heldGap} / +${state.settings.switchMargin}`},
    {key:'priceGate',pass:inZone,detail:`${euro(candidate.entryLow)}–${euro(candidate.entryHigh)}`},
    {key:'crvGate',pass:candidate.crv>=state.settings.minCrv,detail:`${num(candidate.crv,2)} / ${num(state.settings.minCrv,1)}`},
    {key:'sizingGate',pass:sizing.shares>=1,detail:wholeShareLabel(sizing.shares)}
  ];
  const allPassed=gates.every(g=>g.pass);
  return{opportunities,candidate,second,heldBest,sizing,ras,gates,allPassed,cashAdv,heldGap,inZone};
}

function applyStaticTranslations(){
  document.documentElement.lang=state.language;
  document.querySelectorAll('[data-i18n]').forEach(el=>el.textContent=t(el.dataset.i18n));
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el=>el.placeholder=t(el.dataset.i18nPlaceholder));
  document.querySelectorAll('[data-lang]').forEach(b=>b.classList.toggle('active',b.dataset.lang===state.language));
  const titles={
    dashboard:['executiveEyebrow','projectAlpha'],decision:['decisionEyebrow','decisionLab'],scanner:['scannerEyebrow','scannerTitle'],
    timeline:['timelineEyebrow','timelineTitle'],portfolio:['portfolioEyebrow','portfolioTitle'],competition:['competitionEyebrow','competitionTitle'],
    journal:['journalEyebrow','journalTitle'],methodology:['methodologyEyebrow','methodologyTitle'],settings:['settingsEyebrow','settingsTitle']
  };
  $('eyebrow').textContent=t(titles[state.view][0]);$('title').textContent=t(titles[state.view][1]);
}
function profileLabel(name){
  return t({defensive:'profileDefensive',balanced:'profileBalanced',offensive:'profileOffensive',custom:'profileCustom'}[name]);
}
function showToast(message){
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

function renderExecutive(){
  const d=state.data,m=computeModel(),c=d.portfolios.chatgpt,cl=d.portfolios.claude,msft=c.positions[0],cv=valueOf(c),clv=valueOf(cl),gap=cv-clv,open=(msft.current-msft.entry)*msft.shares;
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
  $('rankingFocus').innerHTML=m.opportunities.slice(0,4).map(o=>{const mv=movement(o,o.customRank);return`<div class="focus-rank"><b>#${o.customRank}</b><div><b>${o.name}</b><span>${o.ticker}</span></div><div class="score">${o.customScore}</div><div class="${mv.cls}">${mv.label}</div></div>`}).join('');
}
function renderDecision(){
  const d=state.data,m=computeModel(),x=m.candidate,w=normalisedWeights();
  $('decisionCandidate').innerHTML=`${x.name} (${x.ticker})<span class="calculated-score-label">${state.language==='de'?'Berechneter OS':'Calculated OS'}</span>`;$('decisionMeta').textContent=`${x.isin} · ${regionName(x.region)} · ${sectorName(x.sector)} · ${t('conviction')} ${x.conviction}`;$('decisionScore').textContent=x.customScore;$('decisionRas').textContent=m.ras;$('decisionRadar').innerHTML=radarSvg(x);
  $('scoreBreakdown').innerHTML=Object.entries(x.components).map(([k,v])=>`<div class="score-row"><span>${t(k)}</span><div class="score-meter"><i style="width:${v}%"></i></div><b>${v}</b><small>${num(v*w[k],1)} P.</small></div>`).join('');
  $('decisionGates').innerHTML=m.gates.map(g=>`<div class="gate"><div class="gate-icon ${g.pass?'pass':'fail'}">${g.pass?'✓':'×'}</div><div><b>${t(g.key)}</b><span>${g.detail}</span></div><small>${g.pass?t('passed'):t('open')}</small></div>`).join('');
  $('decisionVerdict').textContent=m.allPassed
    ?(state.language==='de'?'Alle Modellgates sind erfüllt. Positionsgröße und Brokerhandelbarkeit final prüfen.':'All model gates pass. Perform the final position-size and broker-tradability check.')
    :(state.language==='de'?'Der Kandidat bleibt auf der Watchlist. Cash ist unter dem aktiven Profil die bessere marginale Verwendung.':'The candidate remains on the watchlist. Under the active profile, cash is the better marginal use of capital.');
  $('actionLadder').innerHTML=[
    [state.language==='de'?'1 · Beobachten':'1 · Monitor',t('monitorNow'),state.language==='de'?'Score, Preiszone und RAS überwachen.':'Monitor score, price zone and RAS.','active'],
    [state.language==='de'?'2 · Vorbereiten':'2 · Prepare',`${t('prepareAt')} ≤ ${euro(x.entryHigh)}`,state.language==='de'?'Limit, Stop und Stückzahl plausibilisieren.':'Validate limit, stop and share count.',''],
    [state.language==='de'?'3 · Ausführen':'3 · Execute',`${t('executeOnly')} ${t('allGates')}`,state.language==='de'?'Broker-App und Kosten final prüfen.':'Perform final broker-app and cost check.','']
  ].map(a=>`<div class="ladder-step ${a[3]}"><span>${a[0]}</span><b>${a[1]}</b><small>${a[2]}</small></div>`).join('');
  $('evidenceGrid').innerHTML=Object.entries(x.componentReasons).map(([k,v])=>`<div class="evidence-card"><header><span>${t(k)}</span><b>${x.components[k]}</b></header><p>${loc(v)}</p></div>`).join('');
}
function renderScanner(){
  const m=computeModel(),q=$('search').value.trim().toLowerCase(),r=$('region').value,s=$('sector').value,c=$('conviction').value;
  const items=m.opportunities.filter(x=>(!q||[x.name,x.ticker,x.isin].some(v=>v.toLowerCase().includes(q)))&&(r==='all'||x.region===r)&&(s==='all'||x.sector===s)&&(c==='all'||x.conviction===c));
  $('resultCount').textContent=`${items.length} ${t('candidates')}`;
  $('scannerList').innerHTML=items.map(x=>{const mv=movement(x,x.customRank);return`<div class="scanner-row ${x.ticker===state.selectedTicker?'selected':''}" data-ticker="${x.ticker}"><div class="rank">#${x.customRank}</div><div class="scanner-company"><b>${x.name}</b><span>${x.ticker} · ${x.isin}</span></div><span>${regionName(x.region)}</span><span>${sectorName(x.sector)}</span><div class="os ${scoreClass(x.customScore)}">${x.customScore}</div>${sparkline(x.scoreHistory)}<span class="${mv.cls}">${mv.label}</span></div>`}).join('');
  document.querySelectorAll('.scanner-row').forEach(row=>row.onclick=()=>{state.selectedTicker=row.dataset.ticker;renderScanner()});renderCandidateDetail();
}
function renderCandidateDetail(){
  const m=computeModel(),x=m.opportunities.find(o=>o.ticker===state.selectedTicker)||m.opportunities[0],sizing=computeSizing(x);
  $('candidateDetail').innerHTML=`<div class="candidate-detail-grid"><div><div class="candidate-title"><h2>${x.name} · ${x.customScore}<span class="calculated-score-label">${state.language==='de'?'Berechneter OS':'Calculated OS'}</span></h2><p>${x.ticker} · ${x.isin} · ${regionName(x.region)} · ${sectorName(x.sector)}</p></div><div class="level-grid"><div><span>${t('current').toUpperCase()}</span><b>${euro(x.price)}</b></div><div><span>RAS</span><b>${x.ticker===m.candidate.ticker?m.ras:x.ras}</b></div><div><span>${t('entry').toUpperCase()}</span><b>${euro(x.entryLow)}–${euro(x.entryHigh)}</b></div><div><span>${t('stop').toUpperCase()}</span><b>${euro(x.stop)}</b></div><div><span>${t('target').toUpperCase()}</span><b>${euro(x.target)}</b></div><div><span>${t('suggestedShares').toUpperCase()}</span><b>${wholeShareLabel(sizing.shares)}</b></div></div></div><div class="candidate-radar">${radarSvg(x,true)}</div><div class="candidate-rationale"><div class="rationale-block"><span>${t('catalyst').toUpperCase()}</span><p>${loc(x.catalystText)}</p></div><div class="rationale-block"><span>${t('risk').toUpperCase()}</span><p>${loc(x.riskText)}</p></div><div class="rationale-block"><span>${t('decision').toUpperCase()}</span><p>${x.ticker===m.candidate.ticker&&m.allPassed?t('executeReview'):t('observe')}</p></div></div></div>`;
}
function renderTimeline(){
  const d=state.data,m=computeModel(),top=m.opportunities.slice(0,5),dates=d.timeline.dates,colors=['#21d4a7','#7c5cff','#f7b955','#ff6b7a','#61a5ff'];
  $('timelineLegend').innerHTML=top.map((x,i)=>`<div class="legend-item"><i class="legend-dot" style="background:${colors[i]}"></i>${x.ticker}</div>`).join('');
  const W=760,H=300,left=48,right=20,topPad=24,bottom=42,minY=70,maxY=90,xp=i=>left+i*(W-left-right)/(dates.length-1),yp=v=>topPad+(maxY-v)/(maxY-minY)*(H-topPad-bottom),grid=[70,75,80,85,90];
  $('timelineChart').innerHTML=`<svg class="timeline-svg" viewBox="0 0 ${W} ${H}">${grid.map(v=>`<line class="chart-grid-line" x1="${left}" x2="${W-right}" y1="${yp(v)}" y2="${yp(v)}"/><text class="chart-axis-label" x="8" y="${yp(v)+4}">${v}</text>`).join('')}${dates.map((v,i)=>`<text class="chart-axis-label" x="${xp(i)}" y="${H-12}" text-anchor="middle">${v}</text>`).join('')}${top.map((series,si)=>{const vals=[...series.scoreHistory.slice(0,-1),series.customScore],pts=vals.map((v,i)=>`${xp(i)},${yp(v)}`).join(' ');return`<polyline class="chart-path" points="${pts}" stroke="${colors[si]}"/>${vals.map((v,i)=>`<circle class="chart-point" cx="${xp(i)}" cy="${yp(v)}" r="4" fill="${colors[si]}"/>`).join('')}`}).join('')}</svg><p class="settings-help">${t('scoreHistoryNote')}</p>`;
  $('timelineEvents').innerHTML=d.timeline.events.map(e=>`<div class="timeline-event"><time>${e.date}</time><b>${e.ticker}</b><p>${loc(e.text)}</p></div>`).join('');
  $('timelineMovers').innerHTML=m.opportunities.filter(x=>movement(x,x.customRank).delta!==0).map(x=>{const mv=movement(x,x.customRank);return`<div class="mover-row"><b>${x.name}</b><span>${x.customScore}</span><span class="${mv.cls}">${mv.label}</span></div>`}).join('');
}
function donutGradient(parts){let acc=0;return`conic-gradient(${parts.map(p=>{const start=acc;acc+=p.value;return`${p.color} ${start}% ${acc}%`}).join(',')})`}
function renderPortfolio(){
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
function renderCompetition(){
  const arr=[state.data.portfolios.chatgpt,state.data.portfolios.claude],max=Math.max(...arr.map(valueOf));
  $('competitionCards').innerHTML=arr.map((p,i)=>{const v=valueOf(p),ret=v-p.startCapital,real=realisedOf(p);return`<article class="panel competition-card"><header><div><small>${i===0?t('mainPortfolio'):t('benchmark')}</small><h2>${p.name}</h2></div><span class="status-pill ${i===0?'neutral':'positive'}">${p.positions.length} ${p.positions.length===1?t('position'):t('positions')}</span></header><div class="portfolio-total">${euro(v)}</div><div class="${ret>=0?'positive':'negative'}">${ret>=0?'+':''}${euro(ret)} · ${pct(ret/p.startCapital*100)}</div><div class="competition-stats"><div><span>CASH</span><b>${euro(p.cash)}</b></div><div><span>${t('capitalInvested')}</span><b>${euro(p.positions.reduce((s,x)=>s+x.current*x.shares,0))}</b></div><div><span>${t('realised').toUpperCase()}</span><b class="${real>=0?'positive':'negative'}">${real>=0?'+':''}${euro(real)}</b></div></div></article>`}).join('');
  $('comparisonBars').innerHTML=arr.map(p=>`<div class="comparison-row"><b>${p.name.replace(' Benchmark','')}</b><div class="comparison-track"><i style="width:${valueOf(p)/max*100}%"></i></div><b>${euro(valueOf(p))}</b></div>`).join('');
}
function renderJournal(){
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
function renderMethod(){
  const d=state.data,w=normalisedWeights();
  $('weightList').innerHTML=Object.entries(w).map(([k,v])=>`<div class="weight-row"><span>${t(k)}</span><div class="weight-track"><i style="width:${v*100/0.35}%"></i></div><b>${num(v*100,1)}%</b></div>`).join('');
  $('formulaList').innerHTML=[t('formulaOS'),t('formulaCash'),t('formulaSwitch'),t('formulaPrice')].map(x=>`<span>${x}</span>`).join('');
  $('ruleGrid').innerHTML=[
    [t('noRigidCaps'),loc(d.rules.positionCaps)],[t('stopLogic'),loc(d.rules.stopPolicy)],[t('crvHurdle'),`${num(state.settings.minCrv,1)}:1`],
    [t('wholeSharesOnly'),loc(d.rules.sharePolicy)],[t('cashHurdleLabel'),`${state.settings.cashHurdle} + ${state.settings.cashSafetyMargin}`],[t('activityStandard'),loc(d.rules.defaultAction)]
  ].map(x=>`<div class="rule-card"><b>${x[0]}</b><span>${x[1]}</span></div>`).join('');
}

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
    ['targetPositionPct',5,60,1,'Target initial position as % of portfolio','Zielgröße der Erstposition in %'],
    ['concentrationWarningPct',20,80,1,'Warning level for a single position','Warnschwelle für eine Einzelposition'],
    ['cashReservePct',0,60,1,'Desired cash reserve after a purchase','Gewünschte Cashreserve nach Kauf'],
    ['maxSectorExposurePct',20,100,1,'Warning level for sector exposure','Warnschwelle für Sektorexponierung'],
    ['maxRegionExposurePct',20,100,1,'Warning level for regional exposure','Warnschwelle für Regionenexponierung']
  ]
};
function controlLabel(def){return state.language==='de'?def[5]:def[4]}
function renderControl(container,def,path){
  const[key,min,max,step]=def,value=path==='scoreWeights'?state.settings.scoreWeights[key]:state.settings[key],unit=key==='minCrv'?':1':key.includes('Pct')?'%':'';
  return`<div class="slider-control"><div class="slider-head"><div><b>${controlLabel(def)}</b><span>${key==='diversification'?(state.language==='de'?'Verändert die Gewichtung im Score.':'Changes the score weighting.'):(state.language==='de'?'Wirkt sofort auf das Modell.':'Updates the model immediately.')}</span></div><span class="slider-value" id="value-${key}">${num(value,key==='minCrv'?1:0)}${unit}</span></div><div class="slider-row"><span>${min}</span><input type="range" min="${min}" max="${max}" step="${step}" value="${value}" data-setting="${key}" data-path="${path}"><span>${max}</span></div></div>`;
}
function renderSettings(){
  $('weightControls').innerHTML=controlDefs.weights.map(d=>renderControl('weightControls',d,'scoreWeights')).join('');
  $('ruleControls').innerHTML=controlDefs.rules.map(d=>renderControl('ruleControls',d,'root')).join('');
  $('portfolioControls').innerHTML=controlDefs.portfolio.map(d=>renderControl('portfolioControls',d,'root')).join('');
  document.querySelectorAll('input[data-setting]').forEach(input=>input.addEventListener('input',e=>{
    const key=e.target.dataset.setting,path=e.target.dataset.path,value=Number(e.target.value);
    if(path==='scoreWeights')state.settings.scoreWeights[key]=value;else state.settings[key]=value;
    localStorage.setItem('alphaStrategySettings',JSON.stringify(state.settings));
    const unit=key==='minCrv'?':1':key.includes('Pct')?'%':'';
    $(`value-${key}`).textContent=`${num(value,key==='minCrv'?1:0)}${unit}`;
    renderModelViews();renderSettingsPreview();updateProfileUI();
  }));
  renderSettingsPreview();updateProfileUI();
}
function renderSettingsPreview(){
  const m=computeModel(),p=profileName(),warnings=[];
  if(m.sizing.aboveTarget)warnings.push(t('wholeShareAboveTarget'));
  if(m.sizing.shares===0)warnings.push(t('notFinanceable'));
  if(m.sizing.concentrationWarning)warnings.push(t('concentrationWarning'));
  if(m.sizing.sectorWarning||m.sizing.regionWarning)warnings.push(t('fitWarning'));
  $('customBadge').textContent=profileLabel(p);$('customBadge').classList.toggle('custom-indicator',p==='custom');
  $('weightTotal').textContent='100%';
  $('settingsPreview').innerHTML=`<div class="preview-decision"><span>${t('settingsCandidate')}</span><strong>${m.candidate.name} · ${m.candidate.customScore}</strong><small>${m.allPassed?t('buyReview'):t('noNewPosition')}</small></div><div class="preview-grid"><div><span>RAS</span><b>${m.ras}</b><small>${m.cashAdv>=0?'+':''}${m.cashAdv} vs. Cash</small></div><div><span>${t('crv')}</span><b>${num(m.candidate.crv,2)}</b><small>Min. ${num(state.settings.minCrv,1)}</small></div><div><span>${t('suggestedShares')}</span><b>${m.sizing.shares}</b><small>${num(m.sizing.allocationPct,1)} %</small></div><div><span>${t('sectorExposure')}</span><b>${num(m.sizing.sectorPct,1)} %</b><small>${t('postTrade')}</small></div><div><span>${t('regionExposure')}</span><b>${num(m.sizing.regionPct,1)} %</b><small>${t('postTrade')}</small></div><div><span>${t('gates')}</span><b>${m.gates.filter(g=>g.pass).length}/${m.gates.length}</b><small>${m.allPassed?t('passed'):t('open')}</small></div></div>${warnings.map(w=>`<div class="preview-warning">${w}</div>`).join('')}<div class="settings-ranking">${m.opportunities.slice(0,5).map(o=>`<div class="settings-rank-row"><b>#${o.customRank}</b><span>${o.name}</span><strong>${o.customScore}</strong></div>`).join('')}</div>`;
}
function updateProfileUI(){
  const p=profileName();$('profileBadge').textContent=profileLabel(p);$('sideThreshold').textContent=state.settings.opportunityThreshold;$('sideCashMargin').textContent=`+${state.settings.cashSafetyMargin}`;
  document.querySelectorAll('[data-preset]').forEach(b=>b.classList.toggle('active',b.dataset.preset===p));
}
function renderModelViews(){
  renderExecutive();renderDecision();renderScanner();renderTimeline();renderPortfolio();renderCompetition();renderJournal();renderMethod();
}
function switchView(id){
  state.view=id;document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===id));document.querySelectorAll('.nav').forEach(n=>n.classList.toggle('active',n.dataset.view===id));
  applyStaticTranslations();$('sidebar').classList.remove('open');window.scrollTo({top:0,behavior:'smooth'});
}
function saveSettings(){localStorage.setItem('alphaStrategySettings',JSON.stringify(state.settings));showToast(`${t('saved')} ${t('localOnly')}`)}
function setPreset(name){state.settings=clone(state.data.strategyPresets[name]);state.profile=name;localStorage.setItem('alphaStrategySettings',JSON.stringify(state.settings));renderAll();showToast(t('presetApplied'))}
function resetSettings(){state.settings=clone(state.data.strategyDefaults);localStorage.removeItem('alphaStrategySettings');renderAll();showToast(t('resetDone'))}
function setLanguage(lang){state.language=lang;localStorage.setItem('alphaLanguage',lang);renderAll()}
function populateFilters(){
  const r=$('region'),s=$('sector');r.innerHTML=`<option value="all">${t('allRegions')}</option>`;s.innerHTML=`<option value="all">${t('allSectors')}</option>`;
  [...new Set(state.data.opportunities.map(x=>x.region))].sort().forEach(v=>r.insertAdjacentHTML('beforeend',`<option value="${v}">${regionName(v)}</option>`));
  [...new Set(state.data.opportunities.map(x=>x.sector))].sort().forEach(v=>s.insertAdjacentHTML('beforeend',`<option value="${v}">${sectorName(v)}</option>`));
}
function renderAll(){
  applyStaticTranslations();populateFilters();renderModelViews();renderSettings();updateProfileUI();
  $('freshness').textContent=`${t('dataStand')}: ${dateFmt(state.data.snapshotDate)} · ${loc(state.data.dataMode)}`;$('systemLabel').textContent=t('modelLoaded');
}
function bind(){
  document.querySelectorAll('.nav').forEach(n=>n.onclick=()=>switchView(n.dataset.view));document.querySelectorAll('[data-jump]').forEach(b=>b.onclick=()=>switchView(b.dataset.jump));
  ['search','region','sector','conviction'].forEach(id=>$(id).addEventListener('input',renderScanner));$('menu').onclick=()=>$('sidebar').classList.toggle('open');
  document.querySelectorAll('[data-lang]').forEach(b=>b.onclick=()=>setLanguage(b.dataset.lang));document.querySelectorAll('[data-preset]').forEach(b=>b.onclick=()=>setPreset(b.dataset.preset));
  $('resetSettings').onclick=resetSettings;$('saveSettings').onclick=saveSettings;
}
async function init(){
  try{
    const r=await fetch('alpha-data.json',{cache:'no-store'});if(!r.ok)throw new Error('alpha-data.json');state.data=await r.json();
    const saved=localStorage.getItem('alphaStrategySettings');state.settings=saved?{...clone(state.data.strategyDefaults),...JSON.parse(saved),scoreWeights:{...state.data.strategyDefaults.scoreWeights,...JSON.parse(saved).scoreWeights}}:clone(state.data.strategyDefaults);
    bind();renderAll();
  }catch(e){$('systemLabel').textContent='Data error';document.body.insertAdjacentHTML('beforeend',`<div class="toast show">${e.message}</div>`)}
}
init();
