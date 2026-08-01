const state={data:null,view:'dashboard',selectedTicker:'ASML'};
const $=id=>document.getElementById(id);
const euro=v=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(v);
const pct=v=>`${v>=0?'+':''}${v.toFixed(2).replace('.',',')} %`;
const fmtDate=v=>new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(v));
const valueOf=p=>p.cash+p.positions.reduce((s,x)=>s+x.current*x.shares,0);
const costOf=p=>p.positions.reduce((s,x)=>s+x.entry*x.shares,0);
const realizedOf=p=>p.closedTrades.reduce((s,x)=>s+x.result,0);
const movement=x=>{
  if(x.previousRank===null)return {label:'Neu',cls:'new',delta:null};
  const d=x.previousRank-x.rank;
  if(d>0)return {label:`▲ ${d}`,cls:'up',delta:d};
  if(d<0)return {label:`▼ ${Math.abs(d)}`,cls:'down',delta:d};
  return {label:'=',cls:'flat',delta:0};
};
const scoreClass=s=>s>=85?'positive':s>=75?'warning-text':'negative';
const labels={fundamental:'Fundamental',technical:'Technik',catalyst:'Katalysator',risk:'Risiko/CRV',macro:'Makro',diversification:'Diversifikation'};
const colors=['#21d4a7','#7c5cff','#f7b955','#ff6b7a','#61a5ff'];

async function loadData(){
  const r=await fetch('alpha-data.json',{cache:'no-store'});
  if(!r.ok)throw new Error('alpha-data.json konnte nicht geladen werden');
  return await r.json();
}

function radarSvg(x,compact=false){
  const keys=['fundamental','technical','catalyst','risk','macro','diversification'];
  const cx=130,cy=130,r=compact?78:88;
  const point=(i,ratio=1)=>{
    const a=(-90+i*60)*Math.PI/180;
    return [cx+Math.cos(a)*r*ratio,cy+Math.sin(a)*r*ratio];
  };
  const poly=ratio=>keys.map((_,i)=>point(i,ratio).join(',')).join(' ');
  const values=keys.map((k,i)=>point(i,x.components[k]/100));
  const labelPoint=i=>{
    const a=(-90+i*60)*Math.PI/180;
    const rr=r+28;
    return [cx+Math.cos(a)*rr,cy+Math.sin(a)*rr];
  };
  return `<svg class="radar-svg" viewBox="0 0 260 260" role="img" aria-label="Score-Radar ${x.name}">
    ${[.25,.5,.75,1].map(v=>`<polygon class="radar-grid" points="${poly(v)}"/>`).join('')}
    ${keys.map((_,i)=>{const [px,py]=point(i);return `<line class="radar-axis" x1="${cx}" y1="${cy}" x2="${px}" y2="${py}"/>`}).join('')}
    <polygon class="radar-area" points="${values.map(p=>p.join(',')).join(' ')}"/>
    ${values.map((p,i)=>`<circle class="radar-dot" cx="${p[0]}" cy="${p[1]}" r="3.5"/>`).join('')}
    ${keys.map((k,i)=>{const [lx,ly]=labelPoint(i); const anchor=lx<cx-10?'end':lx>cx+10?'start':'middle'; return `<text class="radar-label" x="${lx}" y="${ly}" text-anchor="${anchor}">${labels[k]}</text><text class="radar-value" x="${lx}" y="${ly+12}" text-anchor="${anchor}">${x.components[k]}</text>`}).join('')}
  </svg>`;
}

function sparkline(values){
  const w=60,h=22,min=Math.min(...values)-1,max=Math.max(...values)+1;
  const pts=values.map((v,i)=>`${i*(w/(values.length-1))},${h-((v-min)/(max-min))*h}`).join(' ');
  return `<svg class="mini-spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><polyline points="${pts}"/></svg>`;
}

function renderExecutive(){
  const d=state.data,b=d.dailyBriefing,dec=d.decision,m=d.marketRegime,c=d.portfolios.chatgpt,cl=d.portfolios.claude;
  $('briefingSalutation').textContent=b.salutation;
  $('briefingSummary').textContent=b.summary;
  $('briefingHeadline').textContent=b.headline;
  $('briefingTrigger').textContent=b.nextTrigger;
  $('briefingPoints').innerHTML=b.keyPoints.map(x=>`<div class="briefing-point">${x}</div>`).join('');

  const cv=valueOf(c),clv=valueOf(cl),gap=cv-clv,unreal=c.positions.reduce((s,x)=>s+(x.current-x.entry)*x.shares,0);
  $('executiveMetrics').innerHTML=[
    ['ChatGPT Depot',euro(cv),pct((cv/c.startCapital-1)*100)],
    ['Aktives Cash',euro(c.cash),`${(c.cash/cv*100).toFixed(1).replace('.',',')} % Quote`],
    ['Offener Buchgewinn',`+${euro(unreal)}`,'Microsoft'],
    ['Abstand zu Claude',`${gap>=0?'+':''}${euro(gap)}`,gap>=0?'ChatGPT führt':'Claude führt']
  ].map((x,i)=>`<div class="metric-line"><span>${x[0]}</span><b class="${i===2?'positive':i===3?(gap>=0?'positive':'negative'):''}">${x[1]}</b><small>${x[2]}</small></div>`).join('');

  const x=d.opportunities.find(o=>o.ticker===dec.candidateTicker);
  const passed=dec.gates.filter(g=>g.pass).length;
  $('execCandidate').textContent=`${x.name} · ${x.score}`;
  $('execOS').textContent=x.score;$('execRAS').textContent=x.ras;$('execGates').textContent=`${passed}/${dec.gates.length}`;
  const dist=(x.price/x.entryHigh-1)*100;
  $('triggerZone').textContent=`Einstiegszone ${euro(x.entryLow)}–${euro(x.entryHigh)}`;
  $('triggerDistance').textContent=`${dist.toFixed(2).replace('.',',')} % zu hoch`;
  $('priceZoneProgress').style.width=`${Math.max(10,Math.min(100,100-dist*8))}%`;
  $('execWhy').innerHTML=dec.whyNotBuy.map(w=>`<div class="why-item"><i>×</i><span>${w}</span></div>`).join('');

  $('regimeLabel').textContent=m.label;$('regimeScore').textContent=m.score;$('regimeRing').style.setProperty('--score',m.score);
  $('regimeExplanation').textContent=m.explanation;$('regimeTrend').textContent=m.trend;$('regimeBreadth').textContent=m.breadth;$('regimeStance').textContent=m.stance;

  const msft=c.positions[0],targetDistance=(msft.target1/msft.current-1)*100,progress=Math.min(100,((msft.current-msft.entry)/(msft.target1-msft.entry))*100);
  $('microsoftFocus').innerHTML=`<div class="msft-progress">
    <div class="msft-line"><strong>${euro(msft.current)}</strong><span>${targetDistance.toFixed(2).replace('.',',')} % bis Ziel 1</span></div>
    <div class="distance-bar"><i style="width:${progress}%"></i></div>
    <div class="msft-labels"><span>Einstieg ${euro(msft.entry)}</span><span>Ziel 1 ${euro(msft.target1)}</span></div>
  </div>`;
  $('rankingFocus').innerHTML=d.opportunities.filter(o=>movement(o).delta!==0).slice(0,4).map(o=>{
    const mv=movement(o);return `<div class="focus-rank"><b>#${o.rank}</b><div><b>${o.name}</b><span>${o.ticker}</span></div><div class="score">${o.score}</div><div class="${mv.cls}">${mv.label}</div></div>`;
  }).join('');
}

function renderDecisionLab(){
  const d=state.data,x=d.opportunities.find(o=>o.ticker===d.decision.candidateTicker);
  $('decisionCandidate').textContent=`${x.name} (${x.ticker})`;
  $('decisionMeta').textContent=`${x.isin} · ${x.region} · ${x.sector} · Conviction ${x.conviction}`;
  $('decisionScore').textContent=x.score;$('decisionRas').textContent=x.ras;
  $('decisionRadar').innerHTML=radarSvg(x);
  $('scoreBreakdown').innerHTML=Object.entries(x.components).map(([k,v])=>{
    const weight=d.scoreWeights[k],contribution=v*weight/100;
    return `<div class="score-row"><span>${labels[k]}</span><div class="score-meter"><i style="width:${v}%"></i></div><b>${v}</b><small>${contribution.toFixed(1).replace('.',',')} P.</small></div>`;
  }).join('');
  $('decisionGates').innerHTML=d.decision.gates.map(g=>`<div class="gate">
    <div class="gate-icon ${g.pass?'pass':'fail'}">${g.pass?'✓':'×'}</div>
    <div><b>${g.name}</b><span>${g.detail}</span></div>
    <small>${g.pass?'Bestanden':'Offen'}</small>
  </div>`).join('');
  $('decisionVerdict').textContent='Fazit: ASML ist beobachtungswürdig, aber weder Preis noch relativer Vorsprung rechtfertigen heute eine Order. Cash bleibt die bessere marginale Verwendung.';
  $('actionLadder').innerHTML=[
    ['1 · Beobachten','Jetzt aktiv','Score und Preiszone überwachen.','active'],
    ['2 · Vorbereiten','Bei ≤ 805 €','Limit, Stop und Stückzahl final plausibilisieren.',''],
    ['3 · Ausführen','Nur bei RAS ≥ 65','Order erst nach allen Gates und App-Check.','']
  ].map(x=>`<div class="ladder-step ${x[3]}"><span>${x[0]}</span><b>${x[1]}</b><small>${x[2]}</small></div>`).join('');
  $('evidenceGrid').innerHTML=Object.entries(x.componentReasons).map(([k,v])=>`<div class="evidence-card"><header><span>${labels[k]}</span><b>${x.components[k]}</b></header><p>${v}</p></div>`).join('');
}

function renderScanner(){
  const d=state.data,q=$('search').value.trim().toLowerCase(),r=$('region').value,s=$('sector').value,c=$('conviction').value;
  const items=d.opportunities.filter(x=>(!q||[x.name,x.ticker,x.isin].some(v=>v.toLowerCase().includes(q)))&&(r==='all'||x.region===r)&&(s==='all'||x.sector===s)&&(c==='all'||x.conviction===c));
  $('resultCount').textContent=`${items.length} Kandidaten`;
  $('scannerList').innerHTML=items.map(x=>{
    const mv=movement(x);
    return `<div class="scanner-row ${x.ticker===state.selectedTicker?'selected':''}" data-ticker="${x.ticker}">
      <div class="rank">#${x.rank}</div>
      <div class="scanner-company"><b>${x.name}</b><span>${x.ticker} · ${x.isin}</span></div>
      <span>${x.region}</span><span>${x.sector}</span>
      <div class="os ${scoreClass(x.score)}">${x.score}</div>
      ${sparkline(x.scoreHistory)}
      <span class="${mv.cls}">${mv.label}</span>
    </div>`;
  }).join('');
  document.querySelectorAll('.scanner-row').forEach(row=>row.onclick=()=>{state.selectedTicker=row.dataset.ticker;renderScanner();});
  renderCandidateDetail();
}

function renderCandidateDetail(){
  const x=state.data.opportunities.find(o=>o.ticker===state.selectedTicker)||state.data.opportunities[0];
  $('candidateDetail').innerHTML=`<div class="candidate-detail-grid">
    <div>
      <div class="candidate-title"><h2>${x.name} · ${x.score}</h2><p>${x.ticker} · ${x.isin} · ${x.region} · ${x.sector}</p></div>
      <div class="level-grid">
        <div><span>KURS</span><b>${euro(x.price)}</b></div><div><span>RAS</span><b>${x.ras}</b></div>
        <div><span>EINSTIEG</span><b>${euro(x.entryLow)}–${euro(x.entryHigh)}</b></div><div><span>STOP</span><b>${euro(x.stop)}</b></div>
        <div><span>ZIEL</span><b>${euro(x.target)}</b></div><div><span>CONVICTION</span><b>${x.conviction}</b></div>
      </div>
    </div>
    <div class="candidate-radar">${radarSvg(x,true)}</div>
    <div class="candidate-rationale">
      <div class="rationale-block"><span>KATALYSATOR</span><p>${x.catalystText}</p></div>
      <div class="rationale-block"><span>RISIKO</span><p>${x.riskText}</p></div>
      <div class="rationale-block"><span>ENTSCHEIDUNG</span><p>${x.score>=85&&x.ras>=65?'Ausführung prüfen':'Beobachten; absolute und relative Hürden noch nicht vollständig erfüllt.'}</p></div>
    </div>
  </div>`;
}

function renderTimeline(){
  const d=state.data,top=d.opportunities.slice(0,5),dates=d.timeline.dates;
  $('timelineLegend').innerHTML=top.map((x,i)=>`<div class="legend-item"><i class="legend-dot" style="background:${colors[i]}"></i>${x.ticker}</div>`).join('');
  const W=760,H=300,left=48,right=20,topPad=24,bottom=42,minY=70,maxY=90;
  const xPos=i=>left+i*((W-left-right)/(dates.length-1));
  const yPos=v=>topPad+(maxY-v)/(maxY-minY)*(H-topPad-bottom);
  const grid=[70,75,80,85,90];
  $('timelineChart').innerHTML=`<svg class="timeline-svg" viewBox="0 0 ${W} ${H}">
    ${grid.map(v=>`<line class="chart-grid-line" x1="${left}" x2="${W-right}" y1="${yPos(v)}" y2="${yPos(v)}"/><text class="chart-axis-label" x="8" y="${yPos(v)+4}">${v}</text>`).join('')}
    ${dates.map((v,i)=>`<text class="chart-axis-label" x="${xPos(i)}" y="${H-12}" text-anchor="middle">${v}</text>`).join('')}
    ${top.map((series,si)=>{
      const pts=series.scoreHistory.map((v,i)=>`${xPos(i)},${yPos(v)}`).join(' ');
      return `<polyline class="chart-path" points="${pts}" stroke="${colors[si]}"/>${series.scoreHistory.map((v,i)=>`<circle class="chart-point" cx="${xPos(i)}" cy="${yPos(v)}" r="4" fill="${colors[si]}"/>`).join('')}`;
    }).join('')}
  </svg>`;
  $('timelineEvents').innerHTML=d.timeline.events.map(e=>`<div class="timeline-event"><time>${e.date}</time><b>${e.ticker}</b><p>${e.text}</p></div>`).join('');
  $('timelineMovers').innerHTML=d.opportunities.filter(x=>movement(x).delta!==0).map(x=>{const mv=movement(x);return `<div class="mover-row"><b>${x.name}</b><span>${x.score}</span><span class="${mv.cls}">${mv.label}</span></div>`}).join('');
}

function donutGradient(parts){
  let acc=0;
  return `conic-gradient(${parts.map(p=>{const start=acc;acc+=p.value;return `${p.color} ${start}% ${acc}%`}).join(',')})`;
}

function renderPortfolio(){
  const p=state.data.portfolios.chatgpt,x=p.positions[0],value=valueOf(p),open=(x.current-x.entry)*x.shares,realized=realizedOf(p);
  const ifStop=(x.stop-x.entry)*x.shares,giveback=(x.current-x.stop)*x.shares,targetDistance=(x.target1/x.current-1)*100;
  $('portfolioMetrics').innerHTML=[
    ['Depotwert',euro(value),pct((value/p.startCapital-1)*100)],
    ['Cash',euro(p.cash),`${(p.cash/value*100).toFixed(1).replace('.',',')} % Quote`],
    ['Offener Gewinn',`+${euro(open)}`,`${pct((x.current/x.entry-1)*100)} Microsoft`],
    ['Realisiert',euro(realized),'Meta + TSMC']
  ].map((m,i)=>`<div class="portfolio-metric"><span>${m[0]}</span><b class="${i===2?'positive':i===3?'negative':''}">${m[1]}</b><small>${m[2]}</small></div>`).join('');

  $('positionIntelligence').innerHTML=`<div class="position-head">
    <div><small>AKTIVE POSITION</small><h2>${x.name}</h2><p>${x.ticker} · ${x.isin} · ${x.sector} · ${x.country}</p></div>
    <div class="position-value"><b>${euro(x.current*x.shares)}</b><span class="positive">${pct((x.current/x.entry-1)*100)}</span></div>
  </div>
  <div class="position-strategy">
    <div class="strategy-levels">
      <div class="strategy-level"><span>EINSTIEG</span><b>${euro(x.entry)}</b><small>${x.shares} Aktien</small></div>
      <div class="strategy-level"><span>STOP</span><b>${euro(x.stop)}</b><small>über Einstand</small></div>
      <div class="strategy-level"><span>ZIEL 1</span><b>${euro(x.target1)}</b><small>${targetDistance.toFixed(2).replace('.',',')} % entfernt</small></div>
      <div class="strategy-level"><span>TRAILING</span><b>${x.trailingStopPct} %</b><small>für Restposition</small></div>
    </div>
    <div class="strategy-copy"><h3>Aktuelle Strategie</h3><p>${x.strategy}</p><div class="next-action"><b>Nächste Aktion</b><p>Limit-Verkauf für eine Aktie am Ziel 1 vorbereiten; Stop unverändert überwachen.</p></div></div>
  </div>`;

  const cashPct=p.cash/value*100,investedPct=100-cashPct;
  $('allocationVisuals').innerHTML=`
    <div class="donut-row">
      <div class="donut" style="background:${donutGradient([{value:cashPct,color:'var(--violet)'},{value:investedPct,color:'var(--green)'}])}">
        <div class="donut-center"><b>${cashPct.toFixed(0)}%</b><span>CASH</span></div>
      </div>
      <div class="legend-list">
        <div class="allocation-legend"><i style="background:var(--violet)"></i><span>Cash</span><b>${cashPct.toFixed(1).replace('.',',')} %</b></div>
        <div class="allocation-legend"><i style="background:var(--green)"></i><span>Microsoft</span><b>${investedPct.toFixed(1).replace('.',',')} %</b></div>
      </div>
    </div>
    <div class="donut-row">
      <div class="donut" style="background:conic-gradient(var(--blue) 0 100%)"><div class="donut-center"><b>100%</b><span>USA</span></div></div>
      <div class="legend-list">
        <div class="allocation-legend"><i style="background:var(--blue)"></i><span>Land, nur investiert</span><b>USA 100 %</b></div>
        <div class="allocation-legend"><i style="background:var(--cyan)"></i><span>Sektor, nur investiert</span><b>Tech 100 %</b></div>
      </div>
    </div>`;

  const marker=((x.stop-x.entry)/(x.current-x.entry))*100;
  $('riskScenario').innerHTML=`<div class="risk-bar-wrap">
    <div class="risk-scale"><i class="risk-marker" style="left:${Math.max(0,Math.min(100,marker))}%"></i></div>
    <div class="risk-labels"><span>Einstand ${euro(x.entry)}</span><span>Stop ${euro(x.stop)}</span><span>Aktuell ${euro(x.current)}</span></div>
  </div>
  <div class="risk-numbers">
    <div class="risk-number"><span>ERGEBNIS BEI STOP</span><b class="positive">+${euro(ifStop)}</b><small>gegenüber Einstand</small></div>
    <div class="risk-number"><span>GEWINN-RÜCKGABE</span><b class="warning-text">-${euro(giveback)}</b><small>vom aktuellen Kurs bis Stop</small></div>
    <div class="risk-number"><span>DEPOTWERT BEI STOP</span><b>${euro(p.cash+x.stop*x.shares)}</b><small>ohne Slippage und Kosten</small></div>
    <div class="risk-number"><span>STOP-RISIKO</span><b>${(giveback/value*100).toFixed(2).replace('.',',')} %</b><small>des aktuellen Depotwerts</small></div>
  </div>`;

  const maxAbs=Math.max(...p.closedTrades.map(t=>Math.abs(t.result)));
  $('closedTrades').innerHTML=p.closedTrades.map(t=>`<div class="trade-row">
    <span>${new Intl.DateTimeFormat('de-DE').format(new Date(t.date+'T12:00:00'))}</span><b>${t.name}</b>
    <div class="trade-bar"><i style="width:${Math.abs(t.result)/maxAbs*100}%;background:${t.result>=0?'var(--green)':'var(--red)'}"></i></div>
    <b class="${t.result>=0?'positive':'negative'}">${t.result>=0?'+':''}${euro(t.result)}</b><span>${t.days} Tage</span><span>${t.reason}</span>
  </div>`).join('');
}

function renderCompetition(){
  const arr=[state.data.portfolios.chatgpt,state.data.portfolios.claude];
  $('competitionCards').innerHTML=arr.map((p,i)=>{
    const v=valueOf(p),ret=v-p.startCapital,real=realizedOf(p);
    return `<article class="panel competition-card"><header><div><small>${i===0?'HAUPTDEPOT':'BENCHMARK'}</small><h2>${p.name}</h2></div><span class="status-pill ${i===0?'neutral':'positive'}">${p.positions.length} Position${p.positions.length===1?'':'en'}</span></header>
      <div class="portfolio-total">${euro(v)}</div><div class="${ret>=0?'positive':'negative'}">${ret>=0?'+':''}${euro(ret)} · ${pct(ret/p.startCapital*100)}</div>
      <div class="competition-stats"><div><span>CASH</span><b>${euro(p.cash)}</b></div><div><span>INVESTIERT</span><b>${euro(p.positions.reduce((s,x)=>s+x.current*x.shares,0))}</b></div><div><span>REALISIERT</span><b class="${real>=0?'positive':'negative'}">${real>=0?'+':''}${euro(real)}</b></div></div>
    </article>`;
  }).join('');
  const max=Math.max(...arr.map(valueOf));
  $('comparisonBars').innerHTML=arr.map(p=>`<div class="comparison-row"><b>${p.name.replace(' Benchmark','')}</b><div class="comparison-track"><i style="width:${valueOf(p)/max*100}%"></i></div><b>${euro(valueOf(p))}</b></div>`).join('');
}

function renderJournal(){
  const items=[
    {date:'2026-08-01',title:'Decision Engine erweitert',text:'Entscheidungen werden jetzt über Score, RAS, Preiszone und Portfolio-Fit erklärt.',type:'Methodik'},
    {date:'2026-08-01',title:'ASML erreicht Schwelle 85',text:'Keine Order: Cash-Marge, Führungsabstand und Preiszone sind nicht erfüllt.',type:'Review'},
    {date:'2026-07-29',title:'Meta und TSMC geschlossen',text:'Stop-Loss-Regeln ausgeführt. Verluste realisiert und getrennt vom offenen Microsoft-Gewinn geführt.',type:'Verkauf'},
    {date:'2026-07-15',title:'Microsoft gekauft',text:'2 Aktien zu 337,15 €. Teilgewinnziel und Trailing-Logik definiert.',type:'Kauf'}
  ];
  $('journalFeed').innerHTML=items.map(x=>`<div class="journal-entry"><time>${new Intl.DateTimeFormat('de-DE').format(new Date(x.date+'T12:00:00'))}</time><div><b>${x.title}</b><p>${x.text}</p></div><span class="status-pill ${x.type==='Kauf'?'positive':x.type==='Verkauf'?'negative':'neutral'}">${x.type}</span></div>`).join('');
}

function renderMethod(){
  const d=state.data;
  $('weightList').innerHTML=Object.entries(d.scoreWeights).map(([k,v])=>`<div class="weight-row"><span>${labels[k]}</span><div class="weight-track"><i style="width:${v/30*100}%"></i></div><b>${v}%</b></div>`).join('');
  $('ruleGrid').innerHTML=[
    ['Keine starren Positionscaps',d.rules.positionCaps],['Stop-Logik',d.rules.stopPolicy],
    ['CRV-Hürde',`Mindestens ${d.rules.crvMinimum.toFixed(1).replace('.',',')}:1 vor Kosten.`],['Volle Stücke',d.rules.sharePolicy],
    ['Cash-Hürde',`Score ${d.rules.cashHurdle} plus ${d.rules.cashSafetyMargin} Punkte Sicherheitsmarge.`],['Aktivitätsstandard',d.rules.defaultAction]
  ].map(x=>`<div class="rule-card"><b>${x[0]}</b><span>${x[1]}</span></div>`).join('');
}

function populateFilters(){
  const d=state.data;
  [...new Set(d.opportunities.map(x=>x.region))].sort().forEach(v=>$('region').insertAdjacentHTML('beforeend',`<option>${v}</option>`));
  [...new Set(d.opportunities.map(x=>x.sector))].sort().forEach(v=>$('sector').insertAdjacentHTML('beforeend',`<option>${v}</option>`));
}

function switchView(id){
  state.view=id;document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===id));document.querySelectorAll('.nav').forEach(n=>n.classList.toggle('active',n.dataset.view===id));
  const titles={dashboard:['EXECUTIVE SUMMARY','Project Alpha'],decision:['DECISION INTELLIGENCE','Decision Lab'],scanner:['RANKED UNIVERSE','Scanner'],timeline:['SCORE EVOLUTION','Alpha Timeline'],portfolio:['CAPITAL & RISK','Portfolio'],competition:['BENCHMARK','Competition'],journal:['DECISION QUALITY','Journal'],methodology:['GOVERNANCE','Methodik']};
  $('eyebrow').textContent=titles[id][0];$('title').textContent=titles[id][1];$('sidebar').classList.remove('open');window.scrollTo({top:0,behavior:'smooth'});
}

function bind(){
  document.querySelectorAll('.nav').forEach(n=>n.onclick=()=>switchView(n.dataset.view));document.querySelectorAll('[data-jump]').forEach(b=>b.onclick=()=>switchView(b.dataset.jump));
  ['search','region','sector','conviction'].forEach(id=>$(id).addEventListener('input',renderScanner));$('menu').onclick=()=>$('sidebar').classList.toggle('open');
}

async function init(){
  try{
    state.data=await loadData();$('freshness').textContent=`Stand: ${fmtDate(state.data.snapshotDate)} · ${state.data.dataMode}`;$('systemLabel').textContent='Decision Engine geladen';
    populateFilters();renderExecutive();renderDecisionLab();renderScanner();renderTimeline();renderPortfolio();renderCompetition();renderJournal();renderMethod();bind();
  }catch(e){$('systemLabel').textContent='Datenfehler';document.body.insertAdjacentHTML('beforeend',`<div class="toast show">${e.message}</div>`);}
}
init();
