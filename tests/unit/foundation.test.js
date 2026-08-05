const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');
const domainFiles = [
  'src/state.js',
  'src/translations.js',
  'src/scoring.js',
  'src/portfolio-calculations.js',
  'src/research-pipeline.js',
  'src/strategy-ranking.js',
  'src/universe.js'
];

function loadData() {
  return Object.assign({}, ...['core', 'portfolios', 'opportunities', 'universe', 'research']
    .map(name => JSON.parse(fs.readFileSync(path.join(root, `data/${name}.json`), 'utf8'))));
}

function runtime() {
  const context = vm.createContext({
    Intl,
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} }
  });
  for (const file of domainFiles) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
  }
  const data = loadData();
  vm.runInContext(`state.data=${JSON.stringify(data)};state.settings=clone(state.data.strategyDefaults)`, context);
  return { context, data, evaluate: expression => vm.runInContext(expression, context) };
}

test('Opportunity Score reproduces the documented balanced calculation', () => {
  const { evaluate } = runtime();
  assert.equal(evaluate("opportunityScore(state.data.opportunities.find(x=>x.ticker==='ASML').components)"), 84);
});

test('Strategy Score reproduces the balanced portfolio-fit result', () => {
  const { evaluate } = runtime();
  assert.equal(evaluate("computeModel().opportunities.find(x=>x.ticker==='ASML').strategyScore"), 84);
});

test('presets produce their established ranking changes', () => {
  const { evaluate } = runtime();
  const balanced = evaluate("state.settings=clone(state.data.strategyPresets.balanced);computeModel().opportunities.slice(0,5).map(x=>x.ticker).join('|')");
  const defensive = evaluate("state.settings=clone(state.data.strategyPresets.defensive);computeModel().opportunities.slice(0,5).map(x=>x.ticker).join('|')");
  const offensive = evaluate("state.settings=clone(state.data.strategyPresets.offensive);computeModel().opportunities.slice(0,5).map(x=>x.ticker).join('|')");
  assert.equal(balanced, 'ASML|MSFT|NOVO-B|HNR1|ENEL');
  assert.equal(defensive, 'NOVO-B|ENEL|HNR1|MSFT|DTE');
  assert.equal(offensive, 'ASML|MSFT|NOVO-B|TSM|ENEL');
});

test('whole-share sizing returns only affordable integer shares', () => {
  const { evaluate } = runtime();
  const sizing = JSON.parse(evaluate("JSON.stringify(computeSizing(state.data.opportunities.find(x=>x.ticker==='ASML')))"));
  assert.equal(sizing.shares, 1);
  assert.equal(Number.isInteger(sizing.shares), true);
  assert.ok(sizing.amount <= sizing.spendable);
  assert.equal(evaluate("computeSizing({...state.data.opportunities[0],price:999999}).shares"), 0);
});

test('automatic candidate selection chooses the highest eligible non-held security', () => {
  const { evaluate } = runtime();
  assert.equal(evaluate('activeDecisionSelection().scored.ticker'), 'ASML');
  assert.equal(evaluate("state.data.portfolios.chatgpt.positions.some(x=>x.ticker===activeDecisionSelection().scored.ticker)"), false);
});

test('research-pending securities are excluded from ranking and auto-selection', () => {
  const { evaluate } = runtime();
  evaluate("state.data.opportunities.push({...clone(state.data.opportunities[0]),ticker:'AAPL',name:'Test-only pending fixture',components:{fundamental:100,technical:100,catalyst:100,risk:100,macro:100,diversification:100}})");
  assert.equal(evaluate("computeModel().opportunities.some(x=>x.ticker==='AAPL')"), false);
  assert.notEqual(evaluate('activeDecisionSelection().scored.ticker'), 'AAPL');
});

test('German and English translation/data pairs remain complete', () => {
  const { evaluate, data } = runtime();
  const de = JSON.parse(evaluate('JSON.stringify(Object.keys(I18N.de).sort())'));
  const en = JSON.parse(evaluate('JSON.stringify(Object.keys(I18N.en).sort())'));
  assert.deepEqual(de, en);
  function walk(value) {
    if (!value || typeof value !== 'object') return;
    if ('de' in value || 'en' in value) {
      assert.equal(typeof value.de, 'string');
      assert.equal(typeof value.en, 'string');
    }
    Object.values(value).forEach(walk);
  }
  walk(data);
});

test('split datasets retain the complete governed universe', () => {
  const data = loadData();
  assert.equal(data.universe.length, 50);
  assert.equal(data.opportunities.length, 10);
  assert.equal(data.researchPipeline.records.length, 5);
});
