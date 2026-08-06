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
  version.js                 Single browser build/cache version
  ui/views.js                Existing DOM view renderers
data/
  core.json                  Snapshot, rules, presets, timeline, decision copy
  portfolios.json            Portfolios, positions, and closed trades
  opportunities.json         Fully scored opportunities only
  universe.json              Global Liquid 50 universe
  research.json              Research pipeline and source-backed dossiers
```

`data/manifest.json` describes the modular resources. The public `alpha-data.json` remains a complete v0.6-compatible payload, and the historic `opportunities.json` endpoint retains its v0.1.1 schema for existing consumers. Run `npm run build:data` after changing modular data; CI verifies that the compatibility payload is current. Static assets and datasets use the release version as a cache-busting query parameter.

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
- `research_pending` and `research_active` Universe records are always excluded. A dossier, when present, must be `approved` and contain every required checklist key set to literal `true`. Complete v0.6.0 `scored` records without dossiers retain their governed legacy approval.
- Preliminary research never creates scores, trade setups, or buy decisions.

See [AGENTS.md](AGENTS.md) for the binding development, bilingual, data-integrity, and investment rules.

## Codex Task Workflow

1. Open a new issue with the **Codex task** template and complete every required field.
2. Add `codex-ready` when the task is unambiguous and ready to start.
3. Ask Codex to process the newest open `codex-ready` issue.
4. Review the resulting draft PR; Codex never merges it automatically.

The labels and allowed status transitions are described in [`.github/CODEX_WORKFLOW.md`](.github/CODEX_WORKFLOW.md).

## Tests

```bash
npm test
npm ci
npm run test:syntax
npx playwright install chromium
npm run test:screenshots
```

The Node suite compares every scored security under Balanced, Defensive, and Offensive against the committed v0.6.0 model fixture. It also covers score formulae, rankings, gates, RAS, whole-share sizing, automatic selection, fail-closed research states, zero candidates, bilingual completeness, and both legacy resource schemas.

The Playwright workflow serves the checked-out commit locally, checks browser console/page errors, validates dynamic ranking, Universe 50 navigation, research locks, and browser persistence, and compares approved German/English desktop, tablet, and mobile baselines. A 1.5% pixel mismatch is the documented failure threshold. Pull-request validation is read-only. Baselines can only be replaced through the explicit `update_baselines` manual workflow input; screenshot publication on `main` is a separate write-enabled job.

## Data changes

Do not invent data. Any change to prices, components, scores, sources, portfolio records, research state, or snapshot freshness must be documented and traceable. Production data is authoritative only in the logical files under `data/`. The duplicated top-level `scoreWeights` field is retained solely for v0.6 compatibility; `strategyDefaults.scoreWeights` remains authoritative.
