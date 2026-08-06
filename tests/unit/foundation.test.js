import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import {clone,state} from '../../src/state.js';
import {I18N} from '../../src/translations.js';
import {opportunityScore} from '../../src/scoring.js';
import {computeSizing} from '../../src/portfolio-calculations.js';
import {computeModel} from '../../src/strategy-ranking.js';
import {activeDecisionSelection} from '../../src/universe.js';
import {isRankingEligible,LEGACY_V060_SCORED_TICKERS,REQUIRED_RESEARCH_CHECKLIST} from '../../src/research-pipeline.js';

const root=new URL('../../',import.meta.url);
const readJson=async path=>JSON.parse(await readFile(new URL(path,root),'utf8'));
const originalData=await readJson('alpha-data.json');

function reset(preset='balanced'){
  state.data=clone(originalData);
  state.settings=clone(state.data.strategyPresets[preset]);
  state.decisionMode='auto';
}

test.beforeEach(()=>reset());

test('Opportunity and Strategy Scores reproduce the balanced calculation',()=>{
  const asml=state.data.opportunities.find(x=>x.ticker==='ASML');
  assert.equal(opportunityScore(asml.components),84);
  assert.equal(computeModel().opportunities.find(x=>x.ticker==='ASML').strategyScore,84);
});

test('all scored securities across all presets match the committed v0.6.0 fixture',async()=>{
  const fixture=await readJson('tests/fixtures/v0.6.0-model-results.json');
  for(const preset of ['balanced','defensive','offensive']){
    reset(preset);
    const model=computeModel();
    const actual={
      securities:model.opportunities.map(item=>({ticker:item.ticker,opportunityScore:item.customScore,strategyScore:item.strategyScore,rank:item.customRank,fitAdjustment:item.fitAdjustment,crv:item.entryCrv,sizing:item.sizing})),
      selectedCandidate:model.candidate?.ticker??null,ras:model.ras,gates:model.gates,
      portfolioValue:state.data.portfolios.chatgpt.cash+state.data.portfolios.chatgpt.positions.reduce((sum,item)=>sum+item.current*item.shares,0)
    };
    assert.deepEqual(actual,fixture.presets[preset],preset);
  }
});

test('presets retain established ranking changes',()=>{
  const orders={};
  for(const preset of ['balanced','defensive','offensive']){reset(preset);orders[preset]=computeModel().opportunities.slice(0,5).map(x=>x.ticker).join('|');}
  assert.deepEqual(orders,{balanced:'ASML|MSFT|NOVO-B|HNR1|ENEL',defensive:'NOVO-B|ENEL|HNR1|MSFT|DTE',offensive:'ASML|MSFT|NOVO-B|TSM|ENEL'});
});

test('whole-share sizing returns affordable integers',()=>{
  const candidate=state.data.opportunities.find(x=>x.ticker==='ASML');
  const sizing=computeSizing(candidate);
  assert.equal(sizing.shares,1);assert.equal(Number.isInteger(sizing.shares),true);assert.ok(sizing.amount<=sizing.spendable);
  assert.equal(computeSizing({...candidate,price:999999}).shares,0);
});

test('automatic candidate is the highest eligible non-held security',()=>{
  assert.equal(activeDecisionSelection().scored.ticker,'ASML');
  assert.equal(state.data.portfolios.chatgpt.positions.some(x=>x.ticker===activeDecisionSelection().scored.ticker),false);
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
  state.data.portfolios.chatgpt.positions=state.data.opportunities.map(item=>({ticker:item.ticker,name:item.name,sector:item.sector,country:item.country,current:item.price,entry:item.price,shares:1}));
  const model=computeModel();
  assert.equal(model.candidate,null);assert.equal(model.sizing,null);assert.equal(model.ras,null);assert.deepEqual(model.gates,[]);assert.equal(model.hasEligibleCandidate,false);
  assert.equal(activeDecisionSelection().scored,null);assert.equal(activeDecisionSelection().universe,null);
});

test('an entirely ineligible non-held universe leaves only held securities and no candidate',()=>{
  const held=new Set(state.data.portfolios.chatgpt.positions.map(item=>item.ticker));
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
  const modular=Object.assign({},...await Promise.all(['core','portfolios','opportunities','universe','research'].map(name=>readJson(`data/${name}.json`))));
  assert.deepEqual(await readJson('alpha-data.json'),modular);
  const legacy=await readJson('opportunities.json');
  assert.equal(legacy.version,'0.1.1');assert.ok(Array.isArray(legacy.opportunities));assert.ok(legacy.opportunities.length>0);
  assert.equal(state.data.universe.length,50);assert.equal(state.data.opportunities.length,10);assert.equal(state.data.researchPipeline.records.length,5);
});
