import {readFile,writeFile} from 'node:fs/promises';
import {state,clone} from '../src/state.js';
import {computeModel} from '../src/strategy-ranking.js';

const data=JSON.parse(await readFile(new URL('../alpha-data.json',import.meta.url),'utf8'));
state.data=data;
const result={fixtureVersion:'v0.6.0',presets:{}};
for(const preset of ['balanced','defensive','offensive']){
  state.settings=clone(data.strategyPresets[preset]);
  const model=computeModel();
  result.presets[preset]={
    securities:model.opportunities.map(item=>({
      ticker:item.ticker,opportunityScore:item.customScore,strategyScore:item.strategyScore,
      rank:item.customRank,fitAdjustment:item.fitAdjustment,crv:item.entryCrv,sizing:item.sizing
    })),
    selectedCandidate:model.candidate?.ticker??null,ras:model.ras,gates:model.gates,
    portfolioValue:data.portfolios.chatgpt.cash+data.portfolios.chatgpt.positions.reduce((sum,item)=>sum+item.current*item.shares,0)
  };
}
await writeFile(new URL('../tests/fixtures/v0.6.0-model-results.json',import.meta.url),`${JSON.stringify(result,null,2)}\n`);
