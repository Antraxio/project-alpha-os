const state={data:null,view:'dashboard',selectedTicker:'ASML'};
const $=id=>document.getElementById(id);
const euro=v=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(v);
const pct=v=>`${v>=0?'+':''}${v.toFixed(2).replace('.',',')} %`;
const fmtDate=v=>new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(v));
const valueOf=p=>p.cash+p.positions.reduce((s,x)=>s+x.current*x.shares,0);
const costOf=p=>p.positions.reduce((s,x)=>s+x.entry*x.shares,0);
const realizedOf=p=>p.closedTrades.reduce((s,x)=>s+x.result,0);
const totalReturn=(p)=>valueOf(p)-p.startCapital;
const movement=x=>{
  if(x.previousRank===null)return {label:'Neu',cls:'new'};
  const d=x.previousRank-x.rank;
  if(d>0)return {label:`▲ ${d}`,cls:'up'};
  if(d<0)return {label:`▼ ${Math.abs(d)}`,cls:'down'};
  return {label:'=',cls:'flat'};
};
const scoreClass=s=>s>=85?'positive':s>=75?'warning-text':'negative';

async function loadData(){
  const r=await fetch('alpha-data.json',{cache:'no-store'});
  if(!r.ok)throw new Error('alpha-data.json konnte nicht geladen werden');
  return await r.json();
}

function renderExecutive(){
  const d=state.data,dec=d.decision,m=d.marketRegime;
  $('decisionHeadline').textContent=dec.headline;
  $('decisionVerdict').textContent=dec.verdict;
  $('decisionCandidate').textContent=`Beste neue Chance: ${dec.candidate}`;
  $('decisionSummary').textContent=dec.reasons[2]+' '+dec.reasons[3];
  $('decisionOS').textContent=dec.opportunityScore;
  $('decisionRAS').textContent=dec.ras;
  $('decisionCash').textContent=dec.cashHurdle;

  $('regimeLabel').textContent=m.label;
  $('regimeScore').textContent=m.score;
  $('regimeRing').style.setProperty('--score',m.score);
  $('regimeTrend').textContent=m.trend;
  $('regimeVolatility').textContent=m.volatility;
  $('regimeStance').textContent=m.stance;

  const c=d.portfolios.chatgpt,b=d.portfolios.claude;
  const cValue=valueOf(c),bValue=valueOf(b),gap=cValue-bValue;
  $('executiveKpis').innerHTML=[
    ['ChatGPT Depot',euro(cValue),`${pct((cValue/c.startCapital-1)*100)} seit Start`],
    ['Aktives Cash',euro(c.cash),`${(c.cash/cValue*100).toFixed(1).replace('.',',')} % des Depotwerts`],
    ['Claude Benchmark',euro(bValue),`${pct((bValue/b.startCapital-1)*100)} seit Start`],
    ['Relativer Abstand',`${gap>=0?'+':''}${euro(gap)}`,gap>=0?'ChatGPT führt':'Claude führt']
  ].map((x,i)=>`<article><span>${x[0]}</span><b class="${i===3?(gap>=0?'positive':'negative'):''}">${x[1]}</b><small>${x[2]}</small></article>`).join('');

  $('rankingPreview').innerHTML=d.opportunities.slice(0,5).map(x=>{
    const mv=movement(x);
    return `<div class="rank-row">
      <div class="rank-num">#${x.rank}</div>
      <div class="rank-company"><b>${x.name}</b><span>${x.ticker} · ${x.sector}</span></div>
      <div class="rank-score ${scoreClass(x.score)}">${x.score}</div>
      <div class="rank-move ${mv.cls}">${mv.label}</div>
    </div>`;
  }).join('');

  const msft=c.positions[0];
  const perf=(msft.current/msft.entry-1)*100;
  $('strategyCard').innerHTML=`
    <div class="strategy-block">
      <div class="strategy-price"><div><strong>${euro(msft.current)}</strong><span class="${perf>=0?'positive':'negative'}">${pct(perf)} seit Einstieg</span></div><span>${msft.shares} volle Aktien</span></div>
      <div class="strategy-steps">
        <div class="strategy-step"><div class="step-icon">1</div><div><b>Stop absichern</b><span>Thesenbruch unter ${euro(msft.stop)}</span></div><b>${euro(msft.stop)}</b></div>
        <div class="strategy-step"><div class="step-icon">2</div><div><b>Teilgewinn</b><span>Eine Aktie bei Ziel 1 verkaufen</span></div><b>${euro(msft.target1)}</b></div>
        <div class="strategy-step"><div class="step-icon">3</div><div><b>Gewinn laufen lassen</b><span>Restposition mit 5 % Trailing-Stop</span></div><b>1 Aktie</b></div>
      </div>
    </div>`;
}

function renderEngine(){
  const d=state.data;
  const x=d.opportunities.find(o=>o.ticker===d.decision.candidateTicker);
  $('engineCandidate').textContent=`${x.name} (${x.ticker})`;
  $('engineMeta').textContent=`${x.isin} · ${x.region} · ${x.sector} · Conviction ${x.conviction}`;
  $('engineScore').textContent=x.score;
  $('engineCatalyst').textContent=x.catalystText;
  $('engineRisk').textContent=x.riskText;

  const weights=d.scoreWeights;
  const labels={fundamental:'Fundamental',technical:'Technik',catalyst:'Katalysator',risk:'Risiko/CRV',macro:'Makro',diversification:'Diversifikation'};
  $('componentGrid').innerHTML=Object.entries(x.components).map(([k,v])=>`
    <div class="component-card">
      <header><span>${labels[k]}</span><b>${v}</b></header>
      <div class="meter"><i style="width:${v}%"></i></div>
      <small>${weights[k]} % Gewicht</small>
    </div>`).join('');

  const gates=[
    {name:'Absolute Schwelle',detail:`OS ${x.score} ≥ ${d.rules.opportunityThreshold}`,pass:x.score>=d.rules.opportunityThreshold},
    {name:'Cash schlagen',detail:`Vorsprung ${x.score-d.rules.cashHurdle} Punkte`,pass:(x.score-d.rules.cashHurdle)>=5},
    {name:'Besten Kandidaten schlagen',detail:`Microsoft liegt bei ${d.decision.secondBest}`,pass:x.score>=d.decision.secondBest+d.rules.switchMargin},
    {name:'Sinnvolle Positionsgröße',detail:'Volle Aktie kostet mehr als das verfügbare Cash',pass:x.price<=d.portfolios.chatgpt.cash}
  ];
  $('rasScore').textContent=d.decision.ras;
  $('rasGates').innerHTML=gates.map(g=>`<div class="gate">
    <div class="gate-icon ${g.pass?'pass':'fail'}">${g.pass?'✓':'×'}</div>
    <div><b>${g.name}</b><span>${g.detail}</span></div>
    <span>${g.pass?'Bestanden':'Nicht erfüllt'}</span>
  </div>`).join('');
  $('rasVerdict').textContent='Fazit: Absolut interessant, relativ aber noch keine dominante Kapitalverwendung. Cash behält seinen Optionalitätswert.';
  $('actionPlan').innerHTML=[
    ['Einstiegszone',`${euro(x.entryLow)}–${euro(x.entryHigh)}`,'Nur mit Limit'],
    ['Stop',euro(x.stop),'Thesen- und volatilitätsbasiert'],
    ['Ziel',euro(x.target),'CRV vor Kosten prüfen'],
    ['Heute','Keine Order','Warten auf Preis oder Score-Abstand']
  ].map(a=>`<div class="plan-card"><span>${a[0]}</span><b>${a[1]}</b><small>${a[2]}</small></div>`).join('');
}

function renderScanner(){
  const q=$('search').value.trim().toLowerCase();
  const r=$('region').value,s=$('sector').value,c=$('conviction').value;
  const items=state.data.opportunities.filter(x=>
    (!q||[x.name,x.ticker,x.isin].some(v=>v.toLowerCase().includes(q))) &&
    (r==='all'||x.region===r) && (s==='all'||x.sector===s) && (c==='all'||x.conviction===c)
  );
  $('resultCount').textContent=`${items.length} Kandidaten`;
  $('scannerTable').innerHTML=items.map(x=>{
    const mv=movement(x);
    return `<tr>
      <td><b>#${x.rank}</b></td>
      <td><button class="rank-button table-company" data-ticker="${x.ticker}"><b>${x.name}</b><small>${x.ticker} · ${x.isin}</small></button></td>
      <td>${x.region}</td><td>${x.sector}</td><td class="${scoreClass(x.score)}"><b>${x.score}</b></td>
      <td>${x.conviction}</td><td class="${mv.cls}">${mv.label}</td><td><span class="status-pill ${x.score>=85?'positive':x.score>=75?'neutral':'warning'}">${x.signal}</span></td>
    </tr>`;
  }).join('');
  document.querySelectorAll('[data-ticker]').forEach(b=>b.onclick=()=>{state.selectedTicker=b.dataset.ticker;renderCandidateDetail();});
  renderCandidateDetail();
}

function renderCandidateDetail(){
  const x=state.data.opportunities.find(o=>o.ticker===state.selectedTicker)||state.data.opportunities[0];
  const labels={fundamental:'Fundamental',technical:'Technik',catalyst:'Katalysator',risk:'Risiko/CRV',macro:'Makro',diversification:'Diversifikation'};
  $('candidateDetail').innerHTML=`
    <div class="detail-grid">
      <div>
        <div class="detail-title"><h2>${x.name} · ${x.score}</h2><p>${x.ticker} · ${x.isin} · ${x.region} · ${x.sector}</p></div>
        <div class="detail-levels">
          <div><span>KURS</span><b>${euro(x.price)}</b></div>
          <div><span>EINSTIEG</span><b>${euro(x.entryLow)}–${euro(x.entryHigh)}</b></div>
          <div><span>STOP</span><b>${euro(x.stop)}</b></div>
          <div><span>ZIEL</span><b>${euro(x.target)}</b></div>
        </div>
        <div class="engine-thesis">
          <div><small>KATALYSATOR</small><p>${x.catalystText}</p></div>
          <div><small>RISIKO</small><p>${x.riskText}</p></div>
        </div>
      </div>
      <div class="detail-components">
        ${Object.entries(x.components).map(([k,v])=>`<div class="component-card"><header><span>${labels[k]}</span><b>${v}</b></header><div class="meter"><i style="width:${v}%"></i></div></div>`).join('')}
      </div>
    </div>`;
}

function renderPortfolio(){
  const p=state.data.portfolios.chatgpt,value=valueOf(p),cost=costOf(p),unreal=value-(p.cash+cost),realized=realizedOf(p);
  $('portfolioSummary').innerHTML=[
    ['Depotwert',euro(value),pct((value/p.startCapital-1)*100)],
    ['Cash',euro(p.cash),`${(p.cash/value*100).toFixed(1).replace('.',',')} % Quote`],
    ['Unrealisiert',`${unreal>=0?'+':''}${euro(unreal)}`,'Offene Positionen'],
    ['Realisiert',`${realized>=0?'+':''}${euro(realized)}`,'Geschlossene Trades']
  ].map(x=>`<article><span>${x[0]}</span><b class="${x[1].startsWith('-')?'negative':x[0].includes('Unreal')&&unreal>0?'positive':''}">${x[1]}</b><small>${x[2]}</small></article>`).join('');

  $('positionCards').innerHTML=p.positions.map(x=>{
    const value=x.current*x.shares,perf=(x.current/x.entry-1)*100,stopResult=(x.stop-x.entry)*x.shares;
    return `<article class="panel position-card">
      <div class="position-head">
        <div><h2>${x.name}</h2><p>${x.ticker} · ${x.isin} · ${x.sector} · ${x.country}</p></div>
        <div class="position-value"><b>${euro(value)}</b><span class="${perf>=0?'positive':'negative'}">${pct(perf)}</span></div>
      </div>
      <div class="position-grid">
        <div class="position-levels">
          <div><span>EINSTIEG</span><b>${euro(x.entry)}</b></div>
          <div><span>STOP</span><b>${euro(x.stop)}</b></div>
          <div><span>ZIEL 1</span><b>${euro(x.target1)}</b></div>
          <div><span>RISIKO BIS STOP</span><b class="${stopResult>=0?'positive':'negative'}">${stopResult>=0?'+':''}${euro(stopResult)}</b></div>
          <div><span>STÜCK</span><b>${x.shares}</b></div>
          <div><span>WÄHRUNG</span><b>${x.currency}</b></div>
        </div>
        <div class="strategy-text"><b>Aktuelle Strategie</b><br>${x.strategy}<br><br><b>Investmentthese</b><br>${x.thesis}</div>
      </div>
    </article>`;
  }).join('');

  const maxAbs=Math.max(...p.closedTrades.map(t=>Math.abs(t.result)));
  $('closedTrades').innerHTML=p.closedTrades.map(t=>`<div class="trade-row">
    <span>${new Intl.DateTimeFormat('de-DE').format(new Date(t.date+'T12:00:00'))}</span>
    <b>${t.name}</b>
    <div class="trade-bar"><i style="width:${Math.abs(t.result)/maxAbs*100}%;background:${t.result>=0?'var(--green)':'var(--red)'}"></i></div>
    <b class="${t.result>=0?'positive':'negative'}">${t.result>=0?'+':''}${euro(t.result)}</b>
    <span>${t.days} Tage</span>
    <span>${t.reason}</span>
  </div>`).join('');
}

function renderCompetition(){
  const d=state.data;
  const arr=[d.portfolios.chatgpt,d.portfolios.claude];
  $('competitionCards').innerHTML=arr.map((p,i)=>{
    const value=valueOf(p),ret=value-p.startCapital,realized=realizedOf(p);
    return `<article class="panel competition-card">
      <header><div><small>${i===0?'HAUPTDEPOT':'BENCHMARK'}</small><h2>${p.name}</h2></div><span class="status-pill ${i===0?'neutral':'positive'}">${p.positions.length} Position${p.positions.length===1?'':'en'}</span></header>
      <div class="portfolio-total">${euro(value)}</div>
      <div class="${ret>=0?'positive':'negative'}">${ret>=0?'+':''}${euro(ret)} · ${pct(ret/p.startCapital*100)}</div>
      <div class="competition-stats">
        <div><span>CASH</span><b>${euro(p.cash)}</b></div>
        <div><span>INVESTIERT</span><b>${euro(p.positions.reduce((s,x)=>s+x.current*x.shares,0))}</b></div>
        <div><span>REALISIERT</span><b class="${realized>=0?'positive':'negative'}">${realized>=0?'+':''}${euro(realized)}</b></div>
      </div>
    </article>`;
  }).join('');

  const max=Math.max(...arr.map(valueOf));
  $('comparisonBars').innerHTML=arr.map(p=>`<div class="comparison-row">
    <b>${p.name.replace(' Benchmark','')}</b>
    <div class="comparison-track"><i style="width:${valueOf(p)/max*100}%"></i></div>
    <b>${euro(valueOf(p))}</b>
  </div>`).join('');
}

function renderJournal(){
  const p=state.data.portfolios.chatgpt;
  const items=[
    {date:'2026-08-01',title:'RAS als Allokations-Gate eingeführt',text:'Neue Position nur, wenn Kandidat Cash, den zweitbesten Kandidaten und eine bestehende Alternative mit Sicherheitsmarge schlägt.',type:'Methodik'},
    {date:'2026-07-29',title:'Meta und TSMC geschlossen',text:'Stop-Loss-Regeln ausgeführt. Realisierte Verluste werden separat von offenen Buchgewinnen geführt.',type:'Verkauf'},
    {date:'2026-07-15',title:'Microsoft gekauft',text:'2 volle Aktien zu 337,15 €. Teilgewinnstrategie und Trailing-Stop definiert.',type:'Kauf'}
  ];
  $('journalFeed').innerHTML=items.map(x=>`<div class="journal-entry">
    <time>${new Intl.DateTimeFormat('de-DE').format(new Date(x.date+'T12:00:00'))}</time>
    <div><b>${x.title}</b><p>${x.text}</p></div>
    <span class="status-pill ${x.type==='Kauf'?'positive':x.type==='Verkauf'?'negative':'neutral'}">${x.type}</span>
  </div>`).join('');
}

function renderMethod(){
  const d=state.data;
  const labels={fundamental:'Fundamental',technical:'Technik',catalyst:'Katalysator',risk:'Risiko/CRV',macro:'Makro',diversification:'Diversifikation'};
  $('weightList').innerHTML=Object.entries(d.scoreWeights).map(([k,v])=>`<div class="weight-row">
    <span>${labels[k]}</span><div class="weight-track"><i style="width:${v/30*100}%"></i></div><b>${v}%</b>
  </div>`).join('');
  $('ruleGrid').innerHTML=[
    ['Keine starren Positionscaps',d.rules.positionCaps],
    ['Stop-Logik',d.rules.stopPolicy],
    ['CRV-Hürde',`Mindestens ${d.rules.crvMinimum.toFixed(1).replace('.',',')}:1 vor Kosten`],
    ['Volle Stücke',d.rules.sharePolicy],
    ['Cash ist Kandidat',`Startgebot ${d.rules.cashHurdle} Punkte`],
    ['Wechselschwelle',`Herausforderer braucht ${d.rules.switchMargin} Punkte Sicherheitsmarge`]
  ].map(x=>`<div class="rule-card"><b>${x[0]}</b><span>${x[1]}</span></div>`).join('');
}

function populateFilters(){
  const d=state.data;
  [...new Set(d.opportunities.map(x=>x.region))].sort().forEach(v=>$('region').insertAdjacentHTML('beforeend',`<option>${v}</option>`));
  [...new Set(d.opportunities.map(x=>x.sector))].sort().forEach(v=>$('sector').insertAdjacentHTML('beforeend',`<option>${v}</option>`));
}

function switchView(id){
  state.view=id;
  document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===id));
  document.querySelectorAll('.nav').forEach(n=>n.classList.toggle('active',n.dataset.view===id));
  const labels={
    dashboard:['EXECUTIVE SUMMARY','Project Alpha'],
    engine:['OPPORTUNITY ENGINE','Alpha Engine'],
    scanner:['RANKED UNIVERSE','Scanner'],
    portfolio:['CAPITAL ALLOCATION','Portfolio'],
    competition:['BENCHMARK','Competition'],
    journal:['DECISION QUALITY','Journal'],
    methodology:['GOVERNANCE','Methodik']
  };
  $('eyebrow').textContent=labels[id][0];$('title').textContent=labels[id][1];
  $('sidebar').classList.remove('open');window.scrollTo({top:0,behavior:'smooth'});
}

function bind(){
  document.querySelectorAll('.nav').forEach(n=>n.onclick=()=>switchView(n.dataset.view));
  document.querySelectorAll('[data-jump]').forEach(b=>b.onclick=()=>switchView(b.dataset.jump));
  ['search','region','sector','conviction'].forEach(id=>$(id).addEventListener('input',renderScanner));
  $('menu').onclick=()=>$('sidebar').classList.toggle('open');
}

async function init(){
  try{
    state.data=await loadData();
    $('freshness').textContent=`Stand: ${fmtDate(state.data.snapshotDate)} · ${state.data.dataMode}`;
    $('systemLabel').textContent='Alpha-Modell geladen';
    populateFilters();renderExecutive();renderEngine();renderScanner();renderPortfolio();renderCompetition();renderJournal();renderMethod();bind();
  }catch(e){
    $('systemLabel').textContent='Datenfehler';
    document.body.insertAdjacentHTML('beforeend',`<div class="toast show">${e.message}</div>`);
  }
}
init();
