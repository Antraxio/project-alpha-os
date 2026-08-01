const state={data:null,view:'dashboard'};
const euro=v=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(v);
const pct=v=>`${v>=0?'+':''}${v.toFixed(2).replace('.',',')} %`;
const cls=s=>s==='Strong Buy'||s==='Buy'?'positive':s==='Watch'?'neutral':'warning';

async function load(){
  try{const r=await fetch('opportunities.json');if(!r.ok)throw 0;return await r.json();}
  catch{return {
    marketRegime:{label:'Risk-on mit erhöhter Volatilität',score:68,trend:'Positiv',volatility:'Erhöht'},budget:2500,
    portfolio:[{ticker:'MSFT',name:'Microsoft',shares:2,entry:421.30,current:428.60,stop:379.17,target:475},{ticker:'TSM',name:'TSMC',shares:2,entry:179.80,current:176.40,stop:161.82,target:205}],
    opportunities:[
      {ticker:'MSFT',name:'Microsoft',sector:'Technology',price:428.60,change:1.8,score:91,signal:'Strong Buy',catalyst:'Cloud- und AI-Wachstum',risk:'Medium',horizon:'4–8 Wochen'},
      {ticker:'TSM',name:'TSMC',sector:'Semiconductors',price:176.40,change:-.7,score:87,signal:'Buy',catalyst:'AI-Chip-Nachfrage',risk:'Medium',horizon:'3–6 Wochen'},
      {ticker:'NOVO-B',name:'Novo Nordisk',sector:'Healthcare',price:468.20,change:2.2,score:82,signal:'Watch',catalyst:'Adipositas-Pipeline',risk:'Medium',horizon:'6–12 Wochen'},
      {ticker:'ENEL',name:'Enel',sector:'Utilities',price:7.18,change:.4,score:76,signal:'Watch',catalyst:'Zins- und Dividendenprofil',risk:'Low',horizon:'8–16 Wochen'},
      {ticker:'HNR1',name:'Hannover Rück',sector:'Insurance',price:259.40,change:-.2,score:73,signal:'Hold',catalyst:'Prämienzyklus',risk:'Low',horizon:'8–12 Wochen'}]};}
}

function dashboard(){
 const d=state.data,m=d.marketRegime,p=d.portfolio,o=d.opportunities;
 regimeLabel.textContent=m.label;regimeScore.textContent=m.score;regimeRing.style.setProperty('--score',m.score);regimeTrend.textContent=m.trend;regimeVolatility.textContent=m.volatility;
 const inv=p.reduce((s,x)=>s+x.entry*x.shares,0),cur=p.reduce((s,x)=>s+x.current*x.shares,0),perf=(cur/inv-1)*100;
 portfolioValue.textContent=euro(cur);portfolioPerformance.textContent=`${pct(perf)} seit Einstieg`;portfolioPerformance.className=perf>=0?'positive':'negative';invested.textContent=euro(inv);cash.textContent=euro(Math.max(0,d.budget-inv));positions.textContent=p.length;
 topOpportunities.innerHTML=o.slice().sort((a,b)=>b.score-a.score).slice(0,4).map(x=>`<div class="opportunity"><div class="company"><div class="ticker">${x.ticker}</div><div><b>${x.name}</b><span>${x.catalyst}</span></div></div><div class="score"><span>Score ${x.score}</span><div><i style="width:${x.score}%"></i></div></div><div class="price"><b>${euro(x.price)}</b><span class="${x.change>=0?'positive':'negative'}">${pct(x.change)}</span></div><span class="pill ${cls(x.signal)}">${x.signal}</span></div>`).join('');
}

function scanner(){
 const q=search.value.toLowerCase().trim(),sec=sector.value,sig=signal.value;
 const rows=state.data.opportunities.filter(x=>(!q||x.name.toLowerCase().includes(q)||x.ticker.toLowerCase().includes(q))&&(sec==='all'||x.sector===sec)&&(sig==='all'||x.signal===sig)).sort((a,b)=>b.score-a.score);
 scannerGrid.innerHTML=rows.length?rows.map(x=>`<article class="panel scanner-card"><div class="scanner-top"><div class="ticker">${x.ticker}</div><span class="pill ${cls(x.signal)}">${x.signal}</span></div><h3>${x.name}</h3><div class="sector">${x.sector}</div><div class="card-stats"><div><span>OPPORTUNITY SCORE</span><b class="score-big">${x.score}<small>/100</small></b></div><div><span>KURS / VERÄNDERUNG</span><b>${euro(x.price)}</b><b class="${x.change>=0?'positive':'negative'}">${pct(x.change)}</b></div><div><span>RISIKO</span><b>${x.risk}</b></div><div><span>HORIZONT</span><b>${x.horizon}</b></div></div><div class="catalyst"><b>Katalysator:</b> ${x.catalyst}</div></article>`).join(''):'<article class="panel scanner-card"><h3>Keine Treffer</h3><p class="sector">Filter bitte anpassen.</p></article>';
}

function portfolio(){
 portfolioTable.innerHTML=state.data.portfolio.map(x=>{const p=(x.current/x.entry-1)*100,status=x.current<=x.stop?'Stop prüfen':x.current>=x.target?'Ziel erreicht':'Aktiv',c=status==='Aktiv'?'positive':status==='Ziel erreicht'?'neutral':'warning';return `<tr><td><b>${x.name}</b><small>${x.ticker}</small></td><td>${x.shares}</td><td>${euro(x.entry)}</td><td>${euro(x.current)}</td><td class="${p>=0?'positive':'negative'}"><b>${pct(p)}</b></td><td>${euro(x.stop)}</td><td>${euro(x.target)}</td><td><span class="pill ${c}">${status}</span></td></tr>`}).join('');
}

function research(){
 researchGrid.innerHTML=state.data.opportunities.map(x=>`<article class="panel research-card"><header><div><h3>${x.name}</h3><p>${x.ticker} · ${x.sector}</p></div><span class="pill ${cls(x.signal)}">${x.score}</span></header><p><b>Investment-Katalysator:</b> ${x.catalyst}. Erwarteter Beobachtungshorizont: ${x.horizon}.</p><div class="tags"><span class="tag">Risiko: ${x.risk}</span><span class="tag">${x.signal}</span><span class="tag">Score ${x.score}</span></div></article>`).join('');
}

function switchView(id){
 document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===id));document.querySelectorAll('.nav').forEach(n=>n.classList.toggle('active',n.dataset.view===id));
 const names={dashboard:['INVESTMENT COMMAND CENTER','Dashboard'],scanner:['OPPORTUNITY ENGINE','Alpha Scanner'],portfolio:['CAPITAL ALLOCATION','Portfolio'],journal:['DECISION QUALITY','Trading Journal'],research:['RESEARCH PIPELINE','Research']};eyebrow.textContent=names[id][0];title.textContent=names[id][1];sidebar.classList.remove('open');scrollTo({top:0,behavior:'smooth'});
}
function toastMsg(t){toast.textContent=t;toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),2200)}
function bind(){
 document.querySelectorAll('.nav').forEach(n=>n.onclick=()=>switchView(n.dataset.view));document.querySelectorAll('[data-jump]').forEach(n=>n.onclick=()=>switchView(n.dataset.jump));
 [search,sector,signal].forEach(x=>x.addEventListener('input',scanner));menu.onclick=()=>sidebar.classList.toggle('open');
 addEntry.onclick=()=>{journalFeed.insertAdjacentHTML('afterbegin','<div class="entry"><div>HEUTE</div><p><b>Neuer Review-Eintrag</b><span>Platzhalter angelegt. In v0.2 folgt ein vollständiges Eingabeformular mit Speicherung.</span></p><i class="pill neutral">Entwurf</i></div>');toastMsg('Journal-Eintrag angelegt')};
}
async function init(){state.data=await load();[...new Set(state.data.opportunities.map(x=>x.sector))].sort().forEach(s=>sector.insertAdjacentHTML('beforeend',`<option>${s}</option>`));dashboard();scanner();portfolio();research();bind()}
init();
