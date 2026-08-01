const state={data:null,view:'dashboard'};
const euro=v=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(v);
const pct=v=>`${v>=0?'+':''}${v.toFixed(2).replace('.',',')} %`;
const cls=s=>s==='Strong Buy'||s==='Buy'?'positive':s==='Watch'?'neutral':'warning';

async function load(){
  const r=await fetch('opportunities.json',{cache:'no-store'});
  if(!r.ok) throw new Error('Daten konnten nicht geladen werden');
  return await r.json();
}

function formatSnapshot(value){
  const d=new Date(value);
  return new Intl.DateTimeFormat('de-DE',{
    day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'
  }).format(d);
}

function renderDashboard(){
  const d=state.data,m=d.marketRegime,p=d.portfolio;
  regimeLabel.textContent=m.label;
  regimeScore.textContent=m.score;
  regimeRing.style.setProperty('--score',m.score);
  regimeTrend.textContent=m.trend;
  regimeVolatility.textContent=m.volatility;
  regimePositioning.textContent=m.positioning;

  const invested=p.reduce((s,x)=>s+x.entry*x.shares,0);
  const current=p.reduce((s,x)=>s+x.current*x.shares,0);
  const absolute=current-invested;
  const performance=(current/invested-1)*100;
  const available=Math.max(0,d.budget-invested);
  const cashQuote=available/d.budget*100;

  portfolioValue.textContent=euro(current);
  portfolioPerformance.textContent=`${pct(performance)} seit Einstieg`;
  portfolioPerformance.className=performance>=0?'positive':'negative';
  absolutePnL.textContent=`Absolut: ${absolute>=0?'+':''}${euro(absolute)}`;
  invested.textContent=euro(invested);
  cash.textContent=euro(available);
  positions.textContent=p.length;
  cashRatio.textContent=`${cashQuote.toFixed(1).replace('.',',')} %`;

  topOpportunities.innerHTML=d.opportunities.slice().sort((a,b)=>b.score-a.score).slice(0,4).map(x=>`
    <div class="opportunity">
      <div class="company">
        <div class="ticker">${x.ticker}</div>
        <div><b>${x.name}</b><span>${x.catalyst}</span></div>
      </div>
      <div class="score"><span>Score ${x.score}</span><div><i style="width:${x.score}%"></i></div></div>
      <div class="price"><b>${euro(x.price)}</b><span class="${x.change>=0?'positive':'negative'}">${pct(x.change)}</span></div>
      <i class="pill ${cls(x.signal)}">${x.signal}</i>
    </div>`).join('');
}

function renderScanner(){
  const q=search.value.trim().toLowerCase();
  const sec=sector.value,sig=signal.value;
  const items=state.data.opportunities
    .filter(x=>!q||x.name.toLowerCase().includes(q)||x.ticker.toLowerCase().includes(q))
    .filter(x=>sec==='all'||x.sector===sec)
    .filter(x=>sig==='all'||x.signal===sig)
    .sort((a,b)=>b.score-a.score);

  resultCount.textContent=`${items.length} Treffer`;
  scannerGrid.innerHTML=items.length?items.map(x=>`
    <article class="panel scanner-card">
      <div class="scanner-top"><div class="ticker">${x.ticker}</div><i class="pill ${cls(x.signal)}">${x.signal}</i></div>
      <h3>${x.name}</h3><div class="sector">${x.sector}</div>
      <div class="card-stats">
        <div><span>OPPORTUNITY SCORE</span><b class="score-big">${x.score}<small>/100</small></b></div>
        <div><span>KURS / VERÄNDERUNG</span><b>${euro(x.price)}</b><b class="${x.change>=0?'positive':'negative'}">${pct(x.change)}</b></div>
        <div><span>RISIKO</span><b>${x.risk}</b></div>
        <div><span>HORIZONT</span><b>${x.horizon}</b></div>
      </div>
      <div class="catalyst"><b>Katalysator:</b> ${x.catalyst}</div>
    </article>`).join(''):`<article class="panel scanner-card"><h3>Keine Treffer</h3><div class="sector">Filter bitte anpassen.</div></article>`;
}

function renderPortfolio(){
  portfolioTable.innerHTML=state.data.portfolio.map(x=>{
    const perf=(x.current/x.entry-1)*100;
    const status=x.current<=x.stop?'Stop prüfen':x.current>=x.target?'Ziel erreicht':'Aktiv';
    const c=status==='Aktiv'?'positive':status==='Ziel erreicht'?'neutral':'warning';
    return `<tr>
      <td><b>${x.name}</b><small>${x.ticker} · ${x.thesis}</small></td>
      <td>${x.shares}</td><td>${euro(x.entry)}</td><td>${euro(x.current)}</td>
      <td class="${perf>=0?'positive':'negative'}"><b>${pct(perf)}</b></td>
      <td>${euro(x.stop)}</td><td>${euro(x.target)}</td><td><i class="pill ${c}">${status}</i></td>
    </tr>`;
  }).join('');
}

function renderJournal(){
  journalFeed.innerHTML=state.data.journal.map(x=>{
    const date=new Date(x.date+'T12:00:00');
    const label=new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'short'}).format(date).toUpperCase();
    const c=x.type==='Kauf'?'positive':'neutral';
    return `<div class="entry"><div>${label}</div><p><b>${x.title}</b><span>${x.text}</span></p><i class="pill ${c}">${x.type}</i></div>`;
  }).join('');
}

function renderResearch(){
  researchGrid.innerHTML=state.data.opportunities.map(x=>`
    <article class="panel research-card">
      <header><div><h3>${x.name}</h3><p>${x.ticker} · ${x.sector}</p></div><i class="pill ${cls(x.signal)}">${x.score}</i></header>
      <p><b>Investment-Katalysator:</b> ${x.catalyst}. Beobachtungshorizont: ${x.horizon}.</p>
      <div class="tags"><span class="tag">Risiko: ${x.risk}</span><span class="tag">${x.signal}</span><span class="tag">Score ${x.score}</span></div>
    </article>`).join('');
}

function populateFilters(){
  [...new Set(state.data.opportunities.map(x=>x.sector))].sort().forEach(s=>{
    sector.insertAdjacentHTML('beforeend',`<option value="${s}">${s}</option>`);
  });
}

function switchView(id){
  state.view=id;
  document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===id));
  document.querySelectorAll('.nav').forEach(n=>n.classList.toggle('active',n.dataset.view===id));
  const labels={
    dashboard:['INVESTMENT COMMAND CENTER','Dashboard'],
    scanner:['OPPORTUNITY ENGINE','Alpha Scanner'],
    portfolio:['CAPITAL ALLOCATION','Portfolio'],
    journal:['DECISION QUALITY','Trading Journal'],
    research:['RESEARCH PIPELINE','Research']
  };
  eyebrow.textContent=labels[id][0];
  title.textContent=labels[id][1];
  sidebar.classList.remove('open');
  window.scrollTo({top:0,behavior:'smooth'});
}

function toastMsg(text){
  toast.textContent=text;toast.classList.add('show');
  clearTimeout(toastMsg.t);toastMsg.t=setTimeout(()=>toast.classList.remove('show'),2200);
}

function bind(){
  document.querySelectorAll('.nav').forEach(n=>n.onclick=()=>switchView(n.dataset.view));
  document.querySelectorAll('[data-jump]').forEach(b=>b.onclick=()=>switchView(b.dataset.jump));
  [search,sector,signal].forEach(el=>el.addEventListener('input',renderScanner));
  menu.onclick=()=>sidebar.classList.toggle('open');
  addEntry.onclick=()=>{
    state.data.journal.unshift({
      date:new Date().toISOString().slice(0,10),
      title:'Neuer Review-Eintrag',
      text:'Platzhalter angelegt. Persistente Speicherung folgt in v0.2.',
      type:'Review'
    });
    renderJournal();toastMsg('Journal-Eintrag angelegt');
  };
}

async function init(){
  try{
    state.data=await load();
    freshness.textContent=`Stand: ${formatSnapshot(state.data.snapshotDate)} · ${state.data.dataMode}`;
    systemLabel.textContent='Snapshot geladen';
    populateFilters();
    renderDashboard();renderScanner();renderPortfolio();renderJournal();renderResearch();bind();
  }catch(err){
    freshness.textContent='Daten konnten nicht geladen werden';
    systemLabel.textContent='Fehler';
    systemLabel.parentElement.querySelector('i').style.background='var(--danger)';
    document.body.insertAdjacentHTML('beforeend','<div class="toast show">Fehler beim Laden von opportunities.json</div>');
  }
}
init();
