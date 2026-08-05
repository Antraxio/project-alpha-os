# Project Alpha OS

Project Alpha OS is a bilingual, static decision-intelligence prototype for transparent investment ranking, portfolio fit, research governance, and execution discipline. Version 0.6.1 is a foundation refactor of the v0.6.0 behavior; it does not add investment features or change investment results.

The application uses an embedded manual model snapshot. It has no live market-data feed and must not be treated as personalized financial advice.

## Run locally

Serve the repository root with any static HTTP server, then open the shown URL. Opening `index.html` directly is not supported because browsers restrict JSON loading from `file://` pages.

```bash
python3 -m http.server 4173
```

The production files require no compilation and remain directly deployable to GitHub Pages.

## Architecture

```text
index.html / style.css        Static shell and presentation
app.js                       Browser coordination, persistence, event binding
src/
  state.js                   Runtime state and formatting helpers
  translations.js            Complete German/English UI dictionary
  scoring.js                 Opportunity Score and score helpers
  strategy-ranking.js        Portfolio-aware Strategy Score, gates, ranking
  portfolio-calculations.js  Portfolio value and whole-share sizing
  research-pipeline.js       Research records, stages, eligibility guard
  universe.js                Universe lookup and candidate selection
  data-loader.js             Split-data loading and assembly
  ui/views.js                Existing DOM view renderers
data/
  core.json                  Snapshot, rules, presets, timeline, decision copy
  portfolios.json            Portfolios, positions, and closed trades
  opportunities.json         Fully scored opportunities only
  universe.json              Global Liquid 50 universe
  research.json              Research pipeline and source-backed dossiers
```

`alpha-data.json` remains as a small compatibility manifest pointing to the split datasets. Static assets and datasets use the release version as a cache-busting query parameter.

## Persistence compatibility

The refactor preserves the existing browser storage contract:

- `alphaLanguage`
- `alphaStrategySettings`
- `alphaDecisionMode`
- `alphaManualCandidate`
- `alphaResearchTicker`

All existing view IDs and navigation targets remain unchanged.

## Investment model boundaries

- Opportunity Score is the weighted intrinsic assessment.
- Strategy Score adds affordability, target-position fit, CRV, price-zone, concentration, sector, and region effects.
- Position and diversification settings are visible preferences/warnings, not hidden rigid caps.
- Sizing uses whole shares only and respects the configured cash reserve.
- Cash remains an active competitor.
- A research record must be in the `approved` stage with every checklist item complete before the security can enter active ranking or automatic selection.
- Preliminary research never creates scores, trade setups, or buy decisions.

See [AGENTS.md](AGENTS.md) for the binding development, bilingual, data-integrity, and investment rules.

## Tests

```bash
npm test
npm install
npx playwright install chromium
npm run test:screenshots
```

The Node unit suite covers Opportunity Score, Strategy Score, preset ranking changes, whole-share sizing, automatic candidate selection, research-pending exclusion, bilingual completeness, and split-data integrity.

The Playwright workflow serves the checked-out commit locally, checks browser console/page errors, validates dynamic ranking, Universe 50 navigation, research locks, and browser persistence, and captures the existing German/English desktop, tablet, and mobile screenshots. On `main`, changed screenshots are committed by the workflow; pull requests receive artifacts without repository writes.

## Data changes

Do not invent data. Any change to prices, components, scores, sources, portfolio records, research state, or snapshot freshness must be documented and traceable. Production data is authoritative only in the logical files under `data/`.
