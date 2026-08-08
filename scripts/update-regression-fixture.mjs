import {readFile,writeFile} from 'node:fs/promises';
import {state,clone} from '../src/state.js?v=0.7.3';
import {computeModel} from '../src/strategy-ranking.js?v=0.7.3';

const data=JSON.parse(await readFile(new URL('../alpha-data.json',import.meta.url),'utf8'));
state.data=data;
state.referenceTime=Date.parse(data.snapshotDate)+3600000;
const result={fixtureVersion:'v0.7.0',presets:{}};
for(const preset of ['balanced','defensive','offensive']){
  state.settings=clone(data.strategyPresets[preset]);
  const model=computeModel();
  result.presets[preset]={
    securities:model.opportunities.map(item=>({
      ticker:item.ticker,opportunityScore:item.customScore,strategyScore:item.strategyScore,ras:item.ras,
      rank:item.customRank,fitAdjustment:item.fitAdjustment,crv:item.entryCrv,sizing:item.sizing
    })),
    selectedCandidate:model.candidate?.ticker??null,ras:model.ras,gates:model.gates,
    portfolioValue:data.portfolio.cash+data.portfolio.positions.reduce((sum,item)=>sum+item.current*item.shares,0)
  };
}
await writeFile(new URL('../tests/fixtures/v0.7.0-portfolio-results.json',import.meta.url),`${JSON.stringify(result,null,2)}\n`);
