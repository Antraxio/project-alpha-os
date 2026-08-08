import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import {clone,state} from '../../src/state.js?v=0.7.1';
import {I18N} from '../../src/translations.js?v=0.7.1';
import {opportunityScore,strategyComponentScore} from '../../src/scoring.js?v=0.7.1';
import {computeSizing,costBasisOf,exposureBreakdown,focusPosition,investedOf,portfolioRisk,regionOf,unrealisedOf} from '../../src/portfolio-calculations.js?v=0.7.1';
import {computeModel} from '../../src/strategy-ranking.js?v=0.7.1';
import {activeDecisionSelection,buildWatchlist} from '../../src/universe.js?v=0.7.1';
import {isRankingEligible,LEGACY_V060_SCORED_TICKERS,REQUIRED_RESEARCH_CHECKLIST} from '../../src/research-pipeline.js?v=0.7.1';
import {cashReconciliation,derivePortfolio,derivePortfolioData} from '../../src/portfolio-ledger.js?v=0.7.1';
import {snapshotFreshness} from '../../src/freshness.js?v=0.7.1';

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
  assert.equal(after.candidate.ticker,after.opportunities.find(item=>!state.data.portfolio.positions.some(position=>position.ticker===item.ticker)).ticker);
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

test('whole-share sizing returns affordable integers and respects the cash reserve',()=>{
  const candidate=state.data.opportunities.find(x=>x.ticker==='ASML');
  const sizing=computeSizing(candidate);
  assert.equal(Number.isInteger(sizing.shares),true);
  assert.ok(sizing.amount<=sizing.spendable);
  assert.equal(sizing.shares,0,'ASML costs more than the spendable cash above the reserve');
  const affordable=computeSizing({...candidate,price:100});
  assert.ok(affordable.shares>=1);
  assert.ok(affordable.amount<=affordable.spendable);
  assert.equal(computeSizing({...candidate,price:999999}).shares,0);
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

test('automatic candidate is the highest eligible non-held security',()=>{
  assert.equal(activeDecisionSelection().scored.ticker,'NOVO-B');
  assert.equal(state.data.portfolio.positions.some(x=>x.ticker===activeDecisionSelection().scored.ticker),false);
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
