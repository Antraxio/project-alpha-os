import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import {clone,state} from '../../src/state.js?v=0.7.5';
import {I18N} from '../../src/translations.js?v=0.7.5';
import {opportunityScore,strategyComponentScore} from '../../src/scoring.js?v=0.7.5';
import {computeSizing,costBasisOf,exposureBreakdown,focusPosition,investedOf,portfolioRisk,regionOf,unrealisedOf} from '../../src/portfolio-calculations.js?v=0.7.5';
import {computeModel} from '../../src/strategy-ranking.js?v=0.7.5';
import {activeDecisionSelection,buildWatchlist} from '../../src/universe.js?v=0.7.5';
import {isRankingEligible,LEGACY_V060_SCORED_TICKERS,legacyMigrationProgress,rankingBasis,REQUIRED_RESEARCH_CHECKLIST} from '../../src/research-pipeline.js?v=0.7.5';
import {cashReconciliation,derivePortfolio,derivePortfolioData} from '../../src/portfolio-ledger.js?v=0.7.5';
import {snapshotFreshness} from '../../src/freshness.js?v=0.7.5';
import {averageTrueRange,stopFromAtrPct,trueRange,validateBar,validateSeries,venueQuality,volatilityStop} from '../../src/market-data.js?v=0.7.5';

const root=new URL('../../',import.meta.url);
const readJson=async path=>JSON.parse(await readFile(new URL(path,root),'utf8'));
const originalData=await readJson('alpha-data.json');

function reset(preset='balanced'){
  state.data=clone(originalData);
  state.settings=clone(state.data.strategyPresets[preset]);
  state.decisionMode='auto';
  state.referenceTime=Date.parse(state.data.snapshotDate)+3600000;
}

test.beforeEach(()=>reset());

test('Opportunity and Strategy Scores reproduce the balanced calculation',()=>{
  const asml=state.data.opportunities.find(x=>x.ticker==='ASML');
  assert.equal(opportunityScore(asml.components),84);
  assert.equal(computeModel().opportunities.find(x=>x.ticker==='ASML').strategyScore,72);
});

test('all scored securities across all presets retain the committed v0.7.0 strategy results',async()=>{
  const fixture=await readJson('tests/fixtures/v0.7.0-portfolio-results.json');
  for(const preset of ['balanced','defensive','offensive']){
    reset(preset);
    const model=computeModel();
    const expected=fixture.presets[preset];
    assert.deepEqual(model.opportunities.map(item=>[item.ticker,item.strategyScore,item.customRank,item.ras]),expected.securities.map(item=>[item.ticker,item.strategyScore,item.rank,item.ras]),preset);
    assert.equal(model.candidate?.ticker??null,expected.selectedCandidate,preset);
    assert.equal(model.ras,expected.ras,preset);
    assert.deepEqual(model.gates.map(gate=>[gate.key,gate.pass]),expected.gates.map(gate=>[gate.key,gate.pass]),preset);
  }
});

test('portfolio sizing and CRV remain identical to the committed v0.7.0 differential fixture',async()=>{
  const fixture=await readJson('tests/fixtures/v0.7.0-portfolio-results.json');
  for(const preset of ['balanced','defensive','offensive']){
    reset(preset);
    const actual=computeModel().opportunities.map(item=>({ticker:item.ticker,crv:item.entryCrv,sizing:item.sizing}));
    const expected=fixture.presets[preset].securities.map(item=>({ticker:item.ticker,crv:item.crv,sizing:item.sizing}));
    assert.deepEqual(actual,expected,preset);
  }
});

test('Opportunity Scores stay intrinsic and unchanged across all strategy presets',()=>{
  reset('balanced');
  const baseline=Object.fromEntries(computeModel().opportunities.map(item=>[item.ticker,item.customScore]));
  for(const preset of ['defensive','offensive']){
    reset(preset);
    assert.deepEqual(Object.fromEntries(computeModel().opportunities.map(item=>[item.ticker,item.customScore])),baseline,preset);
  }
});

test('Strategy Score exposes component and portfolio fit without changing its result',()=>{
  reset('defensive');
  const novo=computeModel().opportunities.find(item=>item.ticker==='NOVO-B');
  assert.equal(opportunityScore(novo.components),79);
  assert.equal(strategyComponentScore(novo.components),80);
  assert.equal(novo.componentWeightAdjustment,1);
  assert.equal(novo.portfolioFitAdjustment,-13.736716919579452);
  assert.equal(novo.fitAdjustment,novo.componentWeightAdjustment+novo.portfolioFitAdjustment);
  assert.equal(novo.strategyScore,Math.round(novo.customScore+novo.fitAdjustment));
  assert.deepEqual(novo.fitReasons.map(reason=>reason.key),['componentWeightFit','affordability','positionFit','crvFit','priceFit','diversificationFit']);
});

test('a custom component-weight change updates Strategy Score, ranking and RAS but not Opportunity Score',()=>{
  const before=computeModel();
  const opportunityScores=Object.fromEntries(before.opportunities.map(item=>[item.ticker,item.customScore]));
  state.settings.scoreWeights.technical=0;
  const after=computeModel();
  assert.deepEqual(Object.fromEntries(after.opportunities.map(item=>[item.ticker,item.customScore])),opportunityScores);
  assert.notDeepEqual(after.opportunities.map(item=>item.ticker),before.opportunities.map(item=>item.ticker));
  assert.notEqual(after.opportunities.find(item=>item.ticker==='NOVO-B').strategyScore,before.opportunities.find(item=>item.ticker==='NOVO-B').strategyScore);
  assert.notEqual(after.ras,before.ras);
  const eligible=after.opportunities.filter(item=>!state.data.portfolio.positions.some(position=>position.ticker===item.ticker)&&item.customScore>=state.settings.opportunityThreshold);
  assert.equal(after.candidate.ticker,eligible[0].ticker);
});

test('presets retain established ranking changes',()=>{
  const orders={};
  for(const preset of ['balanced','defensive','offensive']){reset(preset);orders[preset]=computeModel().opportunities.slice(0,5).map(x=>x.ticker).join('|');}
  assert.deepEqual(orders,{balanced:'MSFT|NOVO-B|HNR1|JPM|ASML',defensive:'MSFT|DTE|JPM|ASML|NOVO-B',offensive:'MSFT|ASML|NOVO-B|JPM|TSM'});
});

test('watchlist exposes all 50 securities without changing ranked order or inventing scores',()=>{
  const model=computeModel();
  const watchlist=buildWatchlist(model);
  assert.equal(watchlist.length,50);
  assert.deepEqual(watchlist.slice(0,model.opportunities.length).map(item=>item.ticker),model.opportunities.map(item=>item.ticker));
  assert.deepEqual(watchlist.slice(model.opportunities.length).map(item=>item.ticker),state.data.universe.filter(item=>!model.opportunities.some(ranked=>ranked.ticker===item.ticker)).sort((a,b)=>a.universeOrder-b.universeOrder).map(item=>item.ticker));
  assert.ok(watchlist.every((item,index)=>item.position===index+1));
  assert.ok(watchlist.slice(0,model.opportunities.length).every(item=>Number.isFinite(item.opportunityScore)&&item.conviction));
  assert.ok(watchlist.slice(model.opportunities.length).every(item=>item.opportunityScore===null&&item.conviction===null));
});

test('position size follows the risk budget, capped by position size and spendable cash',()=>{
  const candidate=state.data.opportunities.find(x=>x.ticker==='ASML');
  const sizing=computeSizing(candidate);
  assert.equal(Number.isInteger(sizing.shares),true);
  assert.ok(sizing.amount<=sizing.spendable);
  assert.equal(sizing.cappedByCash,true,'the cash reserve currently binds before the risk budget');

  // With ample cash the risk budget is what limits the size, and the loss taken at the
  // stop stays at the budget regardless of how far away the stop sits.
  state.data.portfolio.cash=60000;
  const budget=state.settings.riskBudgetPct;
  for(const stopDistance of [0.05,0.1,0.2,0.3]){
    const probe={...candidate,price:100,stop:100*(1-stopDistance)};
    const result=computeSizing(probe);
    const portfolio=state.data.portfolio.cash+state.data.portfolio.positions.reduce((sum,item)=>sum+item.current*item.shares,0);
    const allowed=portfolio*budget/100;
    assert.ok(result.riskAmount<=allowed+1e-9,`stop ${stopDistance}`);
    assert.ok(result.riskAmount>allowed-result.riskPerShare,`stop ${stopDistance} should use the budget`);
    assert.ok(result.allocationPct<=state.settings.maxPositionPct+1e-9,`stop ${stopDistance} must respect the cap`);
  }

  // A wider stop must never produce a larger position than a tighter one.
  const tight=computeSizing({...candidate,price:100,stop:95});
  const wide=computeSizing({...candidate,price:100,stop:70});
  assert.ok(wide.shares<tight.shares,'a distant stop must reduce the position');
});

test('sizing fails closed when the stop cannot bound the loss',()=>{
  state.data.portfolio.cash=60000;
  const candidate=state.data.opportunities.find(x=>x.ticker==='ASML');
  for(const stop of [candidate.price,candidate.price+10]){
    const sizing=computeSizing({...candidate,stop});
    assert.equal(sizing.shares,0,'a stop at or above the entry yields no size');
    assert.equal(sizing.riskAmount,0);
    assert.equal(sizing.aboveRiskBudget,false);
  }
});

test('the maximum position caps a very tight stop before the risk budget does',()=>{
  state.data.portfolio.cash=60000;
  const candidate=state.data.opportunities.find(x=>x.ticker==='ASML');
  const sizing=computeSizing({...candidate,price:100,stop:99.5});
  assert.equal(sizing.cappedByPosition,true);
  assert.ok(sizing.allocationPct<=state.settings.maxPositionPct+1e-9);
  assert.ok(sizing.riskAmount<state.settings.riskBudgetPct/100*(state.data.portfolio.cash+state.data.portfolio.positions.reduce((s,i)=>s+i.current*i.shares,0)));
});

test('portfolio ledger reproduces the documented Scalable positions and cash',async()=>{
  const source=await readJson('data/portfolio.json');
  assert.ok(!('cash' in source.portfolio)&&!('positions' in source.portfolio)&&!('closedTrades' in source.portfolio));
  const derived=derivePortfolioData(source).portfolio;
  assert.equal(derived.cash,2534.42);
  assert.deepEqual(derived.positions.map(item=>[item.ticker,item.shares,item.entry]),[
    ['BMRN',51,86.42],['MSFT',2,337.15],['NKE',18,82.57],['DTE',14,26.42],['JPM',1,300.3]
  ]);
  assert.deepEqual(derived.closedTrades.map(item=>[item.ticker,item.result]),[['TTE',21.84],['SHEL',5.6],['TSM',-88],['META',-83.6]]);
  assert.deepEqual(derived.cashFlow,{deposited:4000,withdrawn:0,fees:25.69,taxes:3.64,income:6.47});
  const reconciliation=cashReconciliation(derived);
  assert.equal(reconciliation.reported,2529.61);
  assert.equal(reconciliation.difference,4.81);
  assert.equal(reconciliation.reconciled,false,'the open 4.81 EUR gap to the bank must stay visible');
});

test('portfolio ledger rejects duplicate, incomplete, and unsupported transactions',()=>{
  const buy={id:'buy-1',type:'BUY',date:'2026-01-01',ticker:'TEST',shares:1,amount:100};
  const base={name:'Test',marketData:{prices:{TEST:100}},transactions:[buy]};
  assert.throws(()=>derivePortfolio({...base,transactions:[buy,{...buy}]}),/transaction id/);
  assert.throws(()=>derivePortfolio({...base,transactions:[{...buy,id:'bad',shares:0}]}),/shares/);
  assert.throws(()=>derivePortfolio({...base,transactions:[{...buy,id:'bad',amount:0}]}),/amount/);
  assert.throws(()=>derivePortfolio({...base,transactions:[{id:'bad',type:'TRANSFER',amount:10}]}),/ledger type/);
  assert.throws(()=>derivePortfolio({name:'X',marketData:{prices:{}},transactions:[buy]}),/Missing market price/);
});

test('a sale may never exceed the held shares and reduces the pooled cost proportionally',()=>{
  const prices={marketData:{prices:{TEST:100}}};
  const buys=[
    {id:'b1',type:'BUY',date:'2026-01-01',ticker:'TEST',shares:2,amount:200},
    {id:'b2',type:'BUY',date:'2026-01-02',ticker:'TEST',shares:2,amount:300}
  ];
  assert.throws(()=>derivePortfolio({...prices,transactions:[...buys,{id:'s',type:'SELL',date:'2026-01-03',ticker:'TEST',shares:5,amount:100}]}),/ledger sale/);
  const partial=derivePortfolio({...prices,transactions:[...buys,{id:'s',type:'SELL',date:'2026-01-03',ticker:'TEST',shares:1,amount:150}]});
  assert.equal(partial.positions[0].shares,3);
  assert.equal(partial.positions[0].entry,125);
  assert.equal(partial.closedTrades[0].cost,125);
  assert.equal(partial.closedTrades[0].result,25);
  const full=derivePortfolio({...prices,transactions:[...buys,{id:'s',type:'SELL',date:'2026-01-03',ticker:'TEST',shares:4,amount:600}]});
  assert.deepEqual(full.positions,[]);
  assert.equal(full.closedTrades[0].result,100);
});

test('cash is tracked only from the configured date and reconciled against the bank',()=>{
  const portfolio=derivePortfolio({
    cashTrackedFrom:'2026-07-01',
    marketData:{prices:{TEST:10},reportedCash:95},
    transactions:[
      {id:'old',type:'BUY',date:'2024-05-01',ticker:'TEST',shares:5,amount:500},
      {id:'open',type:'OPENING_CASH',date:'2026-07-01',amount:100},
      {id:'fee',type:'FEE',date:'2026-07-02',amount:1}
    ]
  });
  assert.equal(portfolio.cash,99);
  assert.equal(portfolio.positions[0].shares,5);
  const reconciliation=cashReconciliation(portfolio);
  assert.equal(reconciliation.reported,95);
  assert.equal(reconciliation.difference,4);
  assert.equal(reconciliation.reconciled,false);
});

test('automatic candidate is the best fit among securities that clear the quality threshold',()=>{
  const selection=activeDecisionSelection().scored;
  assert.equal(selection.ticker,'ASML');
  assert.equal(state.data.portfolio.positions.some(x=>x.ticker===selection.ticker),false);
  assert.ok(selection.customScore>=state.settings.opportunityThreshold,'the candidate must clear the intrinsic bar it is judged by');

  // Novo Nordisk carries the better portfolio fit but misses the quality bar, so selecting
  // purely by Strategy Score would nominate a candidate its own score gate rejects.
  const model=computeModel();
  const novo=model.opportunities.find(item=>item.ticker==='NOVO-B');
  const asml=model.opportunities.find(item=>item.ticker==='ASML');
  assert.ok(novo.strategyScore>asml.strategyScore,'the rejected security still ranks higher on fit');
  assert.ok(novo.customScore<state.settings.opportunityThreshold);
});

test('with nothing above the quality bar the ranking is used unchanged and the gate reports it',()=>{
  state.settings.opportunityThreshold=99;
  const model=computeModel();
  assert.ok(model.candidate,'a candidate is still nominated so the shortfall stays visible');
  assert.equal(model.gates.find(gate=>gate.key==='scoreGate').pass,false);
  assert.equal(model.allPassed,false);
});

test('the switch gate applies only when capital has to be moved',()=>{
  const withoutCash=computeModel();
  const gate=withoutCash.gates.find(item=>item.key==='switchGate');
  assert.equal(gate.pass,false,'with too little free cash the candidate must beat the incumbent');
  assert.ok(/\d/.test(gate.detail));

  // Free cash above the reserve funds the position outright, so nothing is displaced and
  // the question the gate asks does not arise.
  state.data.portfolio.cash=60000;
  const funded=computeModel();
  const open=funded.gates.find(item=>item.key==='switchGate');
  assert.equal(open.pass,true);
  assert.ok(!/\d/.test(open.detail),'the detail states the reason instead of a numeric margin');
  assert.ok(funded.sizing.amount<=funded.sizing.spendable);
});

function addSyntheticOpportunity(ticker){
  state.data.opportunities.push({...clone(state.data.opportunities[0]),ticker,name:`Test ${ticker}`});
  return state.data.opportunities.at(-1);
}

test('Universe-only pending security without a dossier is fail-closed',()=>{
  const item=addSyntheticOpportunity('PEND');
  state.data.universe.push({...clone(state.data.universe[0]),ticker:'PEND',coverageStatus:'research_pending',portfolioStatus:'not_held'});
  assert.equal(isRankingEligible(item),false);assert.equal(computeModel().opportunities.some(x=>x.ticker==='PEND'),false);
});

test('new scored security without a dossier is fail-closed',()=>{
  const item=addSyntheticOpportunity('NEW');
  state.data.universe.push({...clone(state.data.universe[0]),ticker:'NEW',coverageStatus:'scored',portfolioStatus:'not_held'});
  assert.equal(isRankingEligible(item),false);
  assert.equal(computeModel().opportunities.some(x=>x.ticker==='NEW'),false);
});

test('only the explicitly inherited v0.6.0 scored securities use the legacy path',()=>{
  assert.deepEqual(state.data.opportunities.map(item=>item.ticker),LEGACY_V060_SCORED_TICKERS);
  assert.ok(state.data.opportunities.every(item=>isRankingEligible(item)));
});

test('research_active coverage is fail-closed even with an approved dossier',()=>{
  const item=addSyntheticOpportunity('ACTIVE');
  state.data.universe.push({...clone(state.data.universe[0]),ticker:'ACTIVE',coverageStatus:'research_active',portfolioStatus:'not_held'});
  state.data.researchPipeline.records.push({ticker:'ACTIVE',stage:'approved',checklist:Object.fromEntries(REQUIRED_RESEARCH_CHECKLIST.map(key=>[key,true]))});
  assert.equal(isRankingEligible(item),false);
});

test('approved dossier with a missing or false required checklist value is fail-closed',()=>{
  for(const [ticker,mutation] of [['MISS',checklist=>delete checklist.review],['FALSE',checklist=>{checklist.review=false;}]]){
    const item=addSyntheticOpportunity(ticker);
    state.data.universe.push({...clone(state.data.universe[0]),ticker,coverageStatus:'scored',portfolioStatus:'not_held'});
    const checklist=Object.fromEntries(REQUIRED_RESEARCH_CHECKLIST.map(key=>[key,true]));mutation(checklist);
    state.data.researchPipeline.records.push({ticker,stage:'approved',checklist});
    assert.equal(isRankingEligible(item),false,ticker);
  }
});

test('a complete dossier is still excluded unless its stage is approved',()=>{
  const item=addSyntheticOpportunity('REVIEW');
  state.data.universe.push({...clone(state.data.universe[0]),ticker:'REVIEW',coverageStatus:'scored',portfolioStatus:'not_held'});
  state.data.researchPipeline.records.push({ticker:'REVIEW',stage:'ready_for_review',checklist:Object.fromEntries(REQUIRED_RESEARCH_CHECKLIST.map(key=>[key,true]))});
  assert.equal(isRankingEligible(item),false);
});

test('only a fully complete approved dossier is eligible',()=>{
  const item=addSyntheticOpportunity('READY');
  state.data.universe.push({...clone(state.data.universe[0]),ticker:'READY',coverageStatus:'scored',portfolioStatus:'not_held'});
  state.data.researchPipeline.records.push({ticker:'READY',stage:'approved',checklist:Object.fromEntries(REQUIRED_RESEARCH_CHECKLIST.map(key=>[key,true]))});
  assert.equal(isRankingEligible(item),true);
});

test('zero eligible non-held candidates returns a valid empty model without fallback',()=>{
  state.data.portfolio.positions=state.data.opportunities.map(item=>({ticker:item.ticker,name:item.name,sector:item.sector,country:item.country,current:item.price,entry:item.price,shares:1}));
  const model=computeModel();
  assert.equal(model.candidate,null);assert.equal(model.sizing,null);assert.equal(model.ras,null);assert.deepEqual(model.gates,[]);assert.equal(model.hasEligibleCandidate,false);
  assert.equal(activeDecisionSelection().scored,null);assert.equal(activeDecisionSelection().universe,null);
});

test('an entirely ineligible non-held universe leaves only held securities and no candidate',()=>{
  const held=new Set(state.data.portfolio.positions.map(item=>item.ticker));
  state.data.universe.forEach(item=>{if(!held.has(item.ticker))item.coverageStatus='research_pending';});
  const model=computeModel();
  assert.equal(model.candidate,null);assert.ok(model.opportunities.every(item=>held.has(item.ticker)));
});

test('German and English translation and data pairs are complete',()=>{
  assert.deepEqual(Object.keys(I18N.de).sort(),Object.keys(I18N.en).sort());
  const walk=value=>{if(!value||typeof value!=='object')return;if('de'in value||'en'in value){assert.equal(typeof value.de,'string');assert.equal(typeof value.en,'string');}Object.values(value).forEach(walk);};
  walk(state.data);
});

test('legacy resources retain their public schemas',async()=>{
  const modular=Object.assign({},...await Promise.all(['core','portfolio','opportunities','universe','research'].map(name=>readJson(`data/${name}.json`))));
  assert.deepEqual(await readJson('alpha-data.json'),derivePortfolioData(modular));
  const legacy=await readJson('opportunities.json');
  assert.equal(legacy.version,'0.1.1');assert.ok(Array.isArray(legacy.opportunities));assert.ok(legacy.opportunities.length>0);
  assert.equal(state.data.universe.length,50);assert.equal(state.data.opportunities.length,10);assert.equal(state.data.researchPipeline.records.length,5);
});

test('a snapshot within the configured age passes the freshness gate',()=>{
  const model=computeModel();
  const gate=model.gates.find(item=>item.key==='freshnessGate');
  assert.equal(model.freshness.isStale,false);
  assert.equal(gate.pass,true);
});

test('a stale snapshot fails the freshness gate and blocks every buy verdict',()=>{
  for(const preset of ['balanced','defensive','offensive']){
    reset(preset);
    state.referenceTime=Date.parse(state.data.snapshotDate)+25*3600000;
    const model=computeModel();
    assert.equal(model.freshness.isStale,true,preset);
    assert.equal(model.gates.find(item=>item.key==='freshnessGate').pass,false,preset);
    assert.equal(model.allPassed,false,preset);
  }
});

test('the freshness gate uses the configured rule and fails closed on an unusable snapshot date',()=>{
  state.data.rules.maxSnapshotAgeHours=72;
  state.referenceTime=Date.parse(state.data.snapshotDate)+48*3600000;
  assert.equal(snapshotFreshness().isStale,false);
  state.data.snapshotDate='not-a-date';
  const unusable=snapshotFreshness();
  assert.equal(unusable.dateKnown,false);
  assert.equal(unusable.isStale,true);
  assert.equal(computeModel().allPassed,false);
});

test('a snapshot dated in the future is never treated as fresh',()=>{
  state.referenceTime=Date.parse(state.data.snapshotDate)-3600000;
  const ahead=snapshotFreshness();
  assert.equal(ahead.future,true);
  assert.equal(ahead.isStale,true);
  const model=computeModel();
  assert.equal(model.gates.find(gate=>gate.key==='freshnessGate').pass,false);
  assert.equal(model.allPassed,false);
});

test('only a finite positive age threshold can report a fresh snapshot',()=>{
  for(const invalid of [0,-1,Number.NaN,Number.POSITIVE_INFINITY,'24',null,undefined]){
    state.data.rules.maxSnapshotAgeHours=invalid;
    state.referenceTime=Date.parse(state.data.snapshotDate)+3600000;
    const result=snapshotFreshness();
    assert.equal(result.thresholdValid,false,String(invalid));
    assert.equal(result.isStale,true,String(invalid));
    assert.equal(result.maxAgeHours,null,String(invalid));
    assert.equal(computeModel().allPassed,false,String(invalid));
    assert.equal(computeModel().gates.find(gate=>gate.key==='freshnessGate').detail,'\u2013',String(invalid));
  }
});

test('an unusable evaluation time fails closed instead of reporting an age',()=>{
  state.referenceTime=Number.NaN;
  const result=snapshotFreshness(state.data,Number.NaN);
  assert.equal(result.dateKnown,false);
  assert.equal(result.ageHours,null);
  assert.equal(result.isStale,true);
});

test('portfolio aggregates cover zero, one and several positions without relying on the first entry',()=>{
  const p=state.data.portfolio;
  assert.equal(Math.round(unrealisedOf(p)*100),-219204);
  assert.equal(Math.round(investedOf(p)*100),504612);
  assert.equal(Math.round(costBasisOf(p)*100),723816);
  const empty={cash:2500,startCapital:2500,positions:[],closedTrades:[]};
  assert.equal(unrealisedOf(empty),0);
  assert.equal(investedOf(empty),0);
  assert.deepEqual(exposureBreakdown(empty.positions,'country'),[]);
  assert.equal(focusPosition(empty),null);
  assert.deepEqual(portfolioRisk(empty),{ifStop:0,giveback:0,valueAtStop:2500,covered:0,uncovered:0});
});

test('exposure breakdown is data driven and sorted by value across every position',()=>{
  const p=state.data.portfolio;
  const countries=exposureBreakdown(p.positions,'country');
  assert.deepEqual(countries.map(item=>item.name),['USA','Germany']);
  assert.equal(Math.round(countries[0].pct*100)/100,91.95);
  assert.equal(Math.round(countries.reduce((sum,item)=>sum+item.pct,0)),100);
  const sectors=exposureBreakdown(p.positions,'sector');
  assert.deepEqual(sectors.map(item=>item.name),['Healthcare','Technology','Consumer','Telecom','Financials']);
  assert.equal(Math.round(sectors.reduce((sum,item)=>sum+item.pct,0)),100);
});

test('focus position and aggregated risk use every position, not positions[0]',()=>{
  const p=state.data.portfolio;
  assert.equal(focusPosition(p).ticker,'MSFT');
  const risk=portfolioRisk(p);
  assert.equal(risk.covered,3,'only Microsoft, Telekom and JPMorgan carry a recorded stop');
  assert.equal(risk.uncovered,2,'Biomarin and NIKE have no stop and must not be counted as covered');
  assert.equal(Math.round(risk.ifStop*100),Math.round(((370-337.15)*2+(23.78-26.42)*14+(287-300.3))*100));
  assert.equal(focusPosition({positions:[{ticker:'X',current:10}]}),null);
});

test('regional exposure maps a holding country onto the candidate region',()=>{
  assert.equal(regionOf('Germany'),'Europe');
  assert.equal(regionOf('Netherlands'),'Europe');
  assert.equal(regionOf('Taiwan'),'Asia');
  assert.equal(regionOf('USA'),'USA');
  assert.equal(regionOf('Atlantis'),'Atlantis','an unmapped country falls back to itself rather than vanishing');
  // Deutsche Telekom is the only European holding. Before the fix a European candidate
  // compared "Germany" against "Europe", saw no match and reported zero exposure.
  const asml=computeModel().opportunities.find(item=>item.ticker==='ASML');
  assert.equal(asml.region,'Europe');
  assert.ok(asml.sizing.regionPct>0,'a European candidate must see the German holding');
  const telekom=state.data.portfolio.positions.find(item=>item.ticker==='DTE');
  const invested=state.data.portfolio.positions.reduce((sum,item)=>sum+item.current*item.shares,0);
  const share=telekom.current*telekom.shares;
  assert.equal(Math.round(asml.sizing.regionPct*100)/100,Math.round((share+asml.sizing.amount)/(invested+asml.sizing.amount)*10000)/100);
});

test('the switch gate passes when there is no holding to beat',()=>{
  const held=computeModel().gates.find(gate=>gate.key==='switchGate');
  assert.equal(held.pass,false,'with holdings the candidate must still clear the margin');
  state.data.portfolio.positions=[];
  const empty=computeModel();
  const gate=empty.gates.find(gate=>gate.key==='switchGate');
  assert.equal(gate.pass,true,'an empty portfolio has no incumbent to beat');
  assert.ok(!/\d/.test(gate.detail),'the detail states the absence instead of a numeric margin');
});

test('relative attractiveness is recalculated for every security and never read from stored data',()=>{
  const model=computeModel();
  assert.equal(model.ras,model.candidate.ras,'the model RAS is the candidate RAS, not a second calculation');
  assert.ok(model.opportunities.every(item=>Number.isFinite(item.ras)));
  const stored=Object.fromEntries(originalData.opportunities.map(item=>[item.ticker,item.ras]));
  assert.ok(model.opportunities.some(item=>item.ras!==stored[item.ticker]),'the calculated value must be able to differ from the stored one');
  const before=model.opportunities.find(item=>item.ticker==='NOVO-B').ras;
  state.settings.cashHurdle=state.settings.cashHurdle-5;
  const after=computeModel().opportunities.find(item=>item.ticker==='NOVO-B').ras;
  assert.notEqual(after,before,'RAS must follow the active settings');
});

test('every ranked security reports whether it rests on a dossier or on the inherited exception',()=>{
  const model=computeModel();
  assert.ok(model.opportunities.length>0);
  for(const item of model.opportunities){
    const basis=rankingBasis(item);
    assert.equal(basis.eligible,true,item.ticker);
    assert.ok(['dossier','legacy'].includes(basis.basis),item.ticker);
  }
  // The current data set is entirely inherited: every ranked security is on the exception
  // and every documented dossier belongs to a security that cannot yet be ranked.
  const progress=legacyMigrationProgress();
  assert.equal(progress.total,LEGACY_V060_SCORED_TICKERS.length);
  assert.equal(progress.migrated.length,0);
  assert.equal(progress.remaining.length,progress.total);
  assert.equal(progress.complete,false);
});

test('supplying an approved dossier supersedes the inherited exception',()=>{
  const before=rankingBasis(state.data.opportunities.find(item=>item.ticker==='MSFT'));
  assert.equal(before.basis,'legacy');
  const checklist=Object.fromEntries(REQUIRED_RESEARCH_CHECKLIST.map(key=>[key,true]));
  state.data.researchPipeline.records.push({ticker:'MSFT',stage:'approved',checklist});
  const after=rankingBasis(state.data.opportunities.find(item=>item.ticker==='MSFT'));
  assert.equal(after.basis,'dossier');
  assert.equal(after.eligible,true);
  const progress=legacyMigrationProgress();
  assert.deepEqual(progress.migrated,['MSFT']);
  assert.equal(progress.remaining.includes('MSFT'),false);
});

test('an incomplete dossier withdraws the inherited exception rather than falling back to it',()=>{
  const checklist=Object.fromEntries(REQUIRED_RESEARCH_CHECKLIST.map(key=>[key,true]));
  checklist.review=false;
  state.data.researchPipeline.records.push({ticker:'MSFT',stage:'approved',checklist});
  const basis=rankingBasis(state.data.opportunities.find(item=>item.ticker==='MSFT'));
  assert.equal(basis.eligible,false,'a started but unfinished dossier must fail closed');
  assert.equal(basis.basis,null);
  assert.equal(basis.reason,'dossierIncomplete');
  assert.equal(isRankingEligible(state.data.opportunities.find(item=>item.ticker==='MSFT')),false);
  assert.equal(computeModel().opportunities.some(item=>item.ticker==='MSFT'),false);
});

// Synthetic bars with a known Wilder ATR, cross-checked against an independent calculation.
const SYNTHETIC_BARS=[
  {high:102,low:99,close:100.5},{high:100.5,low:98.5,close:99.5},{high:101,low:99,close:100},
  {high:103.5,low:101.5,close:102.5},{high:102,low:99,close:100.5},{high:102.5,low:100.5,close:101.5},
  {high:105,low:103,close:104},{high:103.5,low:101.5,close:102.5},{high:104,low:101,close:102.5},
  {high:106.5,low:104.5,close:105.5},{high:105,low:103,close:104},{high:105.5,low:103.5,close:104.5},
  {high:108,low:105,close:106.5},{high:106.5,low:104.5,close:105.5},{high:107,low:105,close:106},
  {high:109.5,low:107.5,close:108.5},{high:108,low:105,close:106.5},{high:108.5,low:106.5,close:107.5},
  {high:111,low:109,close:110},{high:109.5,low:107.5,close:108.5}
];

test('true range accounts for the overnight gap, not only the intraday span',()=>{
  assert.equal(trueRange({high:102,low:100,close:101},undefined),2);
  assert.equal(trueRange({high:102,low:100,close:101},90),12,'a gap up must widen the range');
  assert.equal(trueRange({high:102,low:100,close:101},110),10,'a gap down must widen it too');
  // This is why a quote-only venue still yields a non-zero ATR: the gap survives even when
  // high equals low.
  assert.equal(trueRange({high:100,low:100,close:100},95),5);
});

test('average true range reproduces an independently calculated Wilder value',()=>{
  const atr=averageTrueRange(SYNTHETIC_BARS,14);
  assert.equal(Math.round(atr*1e10)/1e10,2.7937611295);
  assert.equal(averageTrueRange(SYNTHETIC_BARS.slice(0,14),14),null,'too short must yield null, not a guess');
  assert.equal(averageTrueRange([],14),null);
  assert.equal(averageTrueRange(SYNTHETIC_BARS,0),null);
});

test('a volatility stop is only derived when the inputs allow it',()=>{
  const atr=averageTrueRange(SYNTHETIC_BARS,14);
  assert.equal(Math.round(volatilityStop(120,atr,2.5)*1e10)/1e10,113.0155971762);
  assert.ok(volatilityStop(120,atr,2.5)<120);
  for(const [price,value,multiplier] of [[0,atr,2.5],[120,0,2.5],[120,atr,0],[120,Number.NaN,2.5],[Number.NaN,atr,2.5]]){
    assert.equal(volatilityStop(price,value,multiplier),null);
  }
  assert.equal(volatilityStop(10,100,2.5),null,'a stop below zero is no stop');
});

test('a percentage stop is currency neutral so a US volatility can size a EUR stop',()=>{
  // 2.77 % measured on the US listing, applied to the EUR price of the German listing.
  const stop=stopFromAtrPct(55.20,2.77,2.5);
  assert.equal(Math.round(stop*100)/100,51.38);
  assert.equal(Math.round((55.20-stop)/55.20*10000)/100,6.93);
  assert.equal(stopFromAtrPct(55.20,0,2.5),null);
  assert.equal(stopFromAtrPct(55.20,50,2.5),null,'an implausible width yields no stop rather than a negative one');
});

test('a quote-only venue is reported as unusable for volatility',()=>{
  const traded=SYNTHETIC_BARS.map(bar=>({...bar,volume:1000}));
  assert.equal(venueQuality(traded).tradable,true);
  assert.equal(venueQuality(traded).flatPct,0);
  // Seventy per cent of Frankfurt bars for Biomarin quote high = low on a median volume of
  // one hundred shares.
  const quoted=SYNTHETIC_BARS.map((bar,index)=>index%10<7?{high:bar.close,low:bar.close,close:bar.close,volume:0}:{...bar,volume:100});
  const quality=venueQuality(quoted);
  assert.equal(quality.flatPct,70);
  assert.equal(quality.zeroVolumePct,70);
  assert.equal(quality.tradable,false);
  assert.equal(venueQuality([]).tradable,false);
});

test('bars are rejected only when structurally impossible and large moves are classified',()=>{
  const config={maxDailyMovePct:25,splitTolerancePct:2,atrPeriod:14,atrMultiplier:2.5};
  assert.equal(validateBar({high:102,low:100,close:101},{previousClose:100,config}).severity,'ok');
  for(const bad of [{high:102,low:100,close:0},{high:100,low:102,close:101},{high:102,low:100,close:103},{high:102,low:100,close:'x'}]){
    assert.equal(validateBar(bad,{previousClose:100,config}).severity,'reject',JSON.stringify(bad));
  }
  assert.equal(validateBar({high:102,low:100,close:101},{previousClose:100,currency:'USD',expectedCurrency:'EUR',config}).severity,'reject');

  // A halving lands on a 2:1 split ratio and must not be read as a market collapse.
  const split=validateBar({high:51,low:49,close:50},{previousClose:100,config});
  assert.equal(split.severity,'corporateAction');
  assert.equal(split.ratio,1/2);

  // A large move that matches no split ratio is real until a human says otherwise.
  const drop=validateBar({high:66,low:64,close:65},{previousClose:100,config});
  assert.equal(drop.severity,'review');
  assert.equal(Math.round(drop.movePct),-35);
});

test('a series reports its findings and stays usable unless a bar is impossible',()=>{
  const history={
    dates:['2026-08-03','2026-08-04','2026-08-05'],
    currency:'EUR',
    series:{TEST:{firstIndex:0,high:[102,103,104],low:[100,101,102],close:[101,102,103]}}
  };
  const clean=validateSeries(history,'TEST',{expectedCurrency:'EUR'});
  assert.equal(clean.bars,3);
  assert.equal(clean.findings.length,0);
  assert.equal(clean.usable,true);

  history.series.TEST.close[2]=500;
  const broken=validateSeries(history,'TEST',{expectedCurrency:'EUR'});
  assert.equal(broken.usable,false,'a close outside its own high-low range makes the series unusable');
  assert.equal(broken.rejected,1);
  assert.equal(validateSeries(history,'MISSING').bars,0);
});
