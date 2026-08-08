# Changelog

## v0.7.5 – Price history foundation

### Added
- `src/market-data.js`: bar validation, corporate-action classification, Wilder average true range, volatility-derived stops and venue quality assessment
- price history schema: shared date axis plus one ragged series per security, with high and low alongside the close because the true range needs them
- `rules.priceValidation` with the plausibility band, split tolerance, ATR period and multiplier

### Notes
Structurally impossible bars are rejected and never reach the model. A large move is classified rather than discarded: it is attributed to a corporate action when it lands on a common split ratio, and marked for review otherwise, because an earnings surprise is real data.

Volatility must come from the primary listing, not the venue the broker quotes. Measured on Biomarin: Frankfurt shows a median daily range of 0.00 % on a median volume of 100 shares with 70 % of days quoting high = low, against 2.51 % and 1.97 million shares in the US. Expressing the result as a percentage keeps it currency-neutral, so a US-derived volatility sizes a stop on the EUR price without an exchange rate entering the calculation.

Nothing is fetched yet. No scheduled workflow, no committed prices.

## v0.7.4 – Gate calibration

### Fixed
- the cash gate was mathematically unpassable: it required a component score of 87 while the highest score in the entire scored universe is 86
- the candidate was selected by Strategy Score but judged on Opportunity Score, so a security could be disqualified by a criterion it was never selected on; candidates are now filtered by intrinsic quality first and the best portfolio fit is taken among them
- the switch gate applied even when free cash above the reserve funded the position outright, blocking diversification for as long as one strong holding existed; it now applies only when capital has to be moved

### Changed
- opportunity threshold 85 to 80, cash hurdle 82 to 78 (balanced); presets scaled accordingly

### Note
Before this change no buy signal could be produced under any market condition. The funnel now reaches 4 of 7 gates today and 6 of 7 once the pending sale frees the cash, with the price zone as the remaining substantive block.

## v0.7.3 – Risk-based position sizing

### Changed
- position size now follows the risk budget instead of a fixed share of the portfolio: the loss taken if the stop triggers is held constant, so a volatile security with a distant stop receives a smaller position
- three limits apply and the strictest wins: risk budget, maximum position size, spendable cash above the reserve
- a stop at or above the entry price yields no size at all rather than an unbounded one
- a single share that would breach the risk budget is reported, never silently proposed

### Added
- `riskBudgetPct` (1.5 % balanced, 1.0 defensive, 2.0 offensive) and `maxPositionPct` (33 / 25 / 40) as adjustable settings
- risk per trade, stop distance and the binding limit are shown in the Decision Lab and the settings preview

## v0.7.2 – Research governance made visible

### Added
- every rating now reports whether it rests on an approved dossier or on the inherited v0.6.0 exception, shown as a badge in the ranking and the Decision Lab
- a governance panel in the research status view showing migration progress and naming the securities still on the exception
- `rankingBasis()` reports the reason for eligibility, not only the verdict; `legacyMigrationProgress()` reports how far the migration has come

### Note
All ten ranked securities currently rest on the inherited exception and none on a dossier, while the five documented dossiers belong to securities that cannot yet be ranked. The application previously presented all ten as fully governed.

## v0.7.1 – Model correctness

### Fixed
- regional exposure compared a holding country against a candidate region, so every non-US region reported zero exposure; the mapping is now derived from the data itself
- the switch gate blocked the first purchase of an empty portfolio against a margin over nothing; with no incumbent it now passes
- relative attractiveness was recalculated for the top candidate but read from stored data everywhere else, so a detail view could contradict the ranking; it is now recalculated for every ranked security
- the ranking tie-break no longer falls back to the stored relative attractiveness

### Tests
- added coverage for the country-to-region mapping, the empty-portfolio switch gate and the recalculated relative attractiveness
- the v0.7.0 reference now records relative attractiveness per security

## v0.7.0 – One portfolio

### Changed
- replaced the ChatGPT/Claude portfolio competition with the single real Scalable Capital account
- removed the comparison view, its subnavigation entry and the gap-to-benchmark metric
- rebuilt the portfolio ledger with buys, sales, partial sales, fees, taxes, dividends and deposits
- anchored cash tracking to a configured date so pre-existing holdings are not deducted twice
- surfaced the unexplained 4.81 EUR gap between the derived and the broker-reported cash balance
- excluded positions without a recorded stop from the stop scenario and named them explicitly

### Data
- replaced the two model portfolios with the documented Scalable account: 51 Biomarin, 2 Microsoft, 18 NIKE B, 14 Deutsche Telekom and 1 JPMorgan Chase
- sourced every position from purchase settlements and the July account statement; no value is estimated
- updated the snapshot to 08.08.2026 11:57 with the prices reported by the broker at that time

### Tests
- replaced the v0.6.0 and v0.6.2 fixtures with a v0.7.0 reference generated from the corrected data
- added ledger coverage for partial and full sales, oversized sales, missing prices and cash reconciliation

## v0.6.7 – Operational Safety

### Added
- added a central snapshot freshness gate that fails once the snapshot exceeds `rules.maxSnapshotAgeHours`, configured at 24 hours
- added a bilingual stale-snapshot banner and header marker stating that no action may be derived
- made the model evaluation time overridable so freshness stays reproducible in automated runs

### Changed
- withdrew every buy verdict, briefing headline, and Decision Lab execution verdict while the snapshot is stale
- applied the freshness gate to manually selected Decision Lab candidates as well

### Tests
- added freshness gate coverage for fresh, stale, custom-threshold, and unparseable snapshot dates
- pinned the evaluation time in the unit suite and the Playwright run so results stay reproducible

## v0.6.6 – Portfolio Ledger

### Changed
- made confirmed portfolio transactions the source for cash, open positions, and realised results
- removed manually duplicated portfolio aggregates from the modular portfolio data
- retained the public compatibility snapshot with derived legacy fields for existing consumers
- preserved every displayed portfolio value, score, ranking, and sizing result

### Tests
- added exact ledger reconciliation tests for both competition portfolios
- added fail-closed validation for duplicate, incomplete, and unsupported transactions

## v0.6.5 – Clear History

### Changed
- replaced the mixed decision journal with a portfolio transaction history derived from confirmed portfolio data
- moved product, methodology, and strategy changes into a dedicated change log under Model & Settings
- removed the unexplained discipline score and the duplicate realised-trades panel from the portfolio overview
- added bilingual labels, responsive history layouts, and navigation for both histories

### Tests
- added browser coverage that prevents portfolio transactions and model changes from being mixed again

## v0.6.4 – Simplified Navigation

### Changed
- reduced the primary navigation to Dashboard, Portfolio, Opportunities, Analysis, and Model & Settings
- grouped the complete specialist views into contextual subnavigation without removing functionality
- reduced the Dashboard list to the three highest-priority opportunities
- replaced user-facing RAS labels with Relative Attractiveness
- restored flat select controls

### Fixed
- advanced the browser cache version for the new HTML, CSS, JavaScript module graph, and data snapshot so GitHub Pages cannot combine the new navigation shell with stale application modules

## v0.6.3 – Explainable Strategy Fit

### Changed
- separated the fixed intrinsic Opportunity Score from active strategy component weighting
- exposed component-weight fit and portfolio/execution fit for every ranked candidate
- made the active strategy visible in Scanner ranking, candidate details, and Decision Lab
- retained the v0.6.2 Strategy Scores, preset rankings, selected candidates, RAS, CRV, and whole-share sizing
- repaired the Strategy Studio CRV preview to use the calculated entry CRV instead of rendering `NaN`

### Tests
- added a committed v0.6.2 strategy-results fixture for Balanced, Defensive, and Offensive
- added unit coverage for invariant Opportunity Scores and custom Strategy Score/ranking/RAS changes
- added Playwright coverage for immediate slider updates, browser persistence, active-profile visibility, and deterministic reset

## v0.6.2 – Complete Watchlist

### Added
- expanded the Executive watchlist to all 50 governed Universe securities
- added explicit rank, company, ticker, Opportunity Score, and Conviction columns
- added direct Watchlist navigation to Decision Lab or Research Pipeline
- added desktop/iPad Playwright coverage and a 50-entry order/integrity unit test

### Preserved
- retained the existing model order for scored securities and `universeOrder` for remaining coverage
- retained all Opportunity Scores, Strategy Scores, ranking calculations, sizing, gates, RAS, research eligibility, and portfolio results
- represented unavailable Opportunity Score and Conviction values as `–` without inventing data

## v0.6.1 – Foundation refactor

### Changed
- split the browser application into state, translations, scoring, strategy-ranking, portfolio-calculation, research-pipeline, universe, data-loader, and UI-view modules
- split the monolithic data snapshot into logical core, portfolio, opportunity, universe, and research datasets without changing source values
- reduced `app.js` to browser coordination, settings, persistence, and startup
- retained static GitHub Pages deployment and all existing view/storage contracts
- added explicit v0.6.1 cache-busting across styles, scripts, and datasets
- converted browser source files to native ES modules with explicit imports and exports
- restored the complete `alpha-data.json` payload and the legacy `opportunities.json` resource

### Governance
- added repository-wide development, data-integrity, bilingual, and investment rules in `AGENTS.md`
- made research eligibility fail-closed across Universe coverage and the explicit nine-key dossier checklist
- retained preliminary research exclusion from scores, ranking, automatic selection, and executable decisions
- added bilingual zero-eligible-candidate states without synthesising a fallback candidate

### Tests and CI
- added Node unit tests for Opportunity Score, Strategy Score, preset ranking changes, whole-share sizing, automatic candidate selection, and research-pending exclusion
- added bilingual-pair and split-dataset integrity checks
- moved the Playwright program into `tests/e2e/screenshots.mjs`
- changed screenshot CI to test the checked-out pull-request commit on a local server instead of the previously deployed GitHub Pages version
- retained browser-error, dynamic-ranking, Universe 50, pending-candidate, Research Pipeline, and screenshot coverage; added browser-persistence validation
- added all-security/all-preset v0.6.0 differential fixtures, legacy resource compatibility tests, and empty-candidate tests
- added approved visual baselines with a 1.5% threshold and a manual-only baseline update workflow
- reduced pull-request workflow permissions to read-only and isolated screenshot publication in write-enabled jobs

## v0.6.0 – Research Pipeline

### Added
- research governance and approval checklist
- active research batch for AAPL, NVDA, GOOGL, AMZN and SAP
- source-backed research dossiers
- progress, confidence, blockers and stages
- verified-source links
- active-research status in Universe 50
- research context inside the Decision Lab

### Governance
- preliminary research does not create an Opportunity Score
- ranking approval remains locked until market data, technicals, trade setup and review are complete

### Tests
- assert five active research records
- assert verified source links
- assert disabled ranking-approval control
- capture Research Pipeline screenshot


## v0.5.0.1 – Navigation Hotfix

### Fixed
- Manual candidate selection now rerenders the Decision Lab before navigation.
- Universe and Scanner navigation no longer retain the previous ASML view.
- GitHub Actions candidate-navigation regression test can complete successfully.


## v0.5.0 – Universe 50 & Candidate Navigation

### Added
- Global Liquid 50 universe
- automatic/manual candidate mode
- full-universe candidate selector
- automatic-selection rationale
- research-pending Decision Lab state
- coverage, portfolio and tradability status
- ranking diagnostics versus Balanced
- cache-busting

### Tests
- exactly 50 universe rows
- Universe-to-Decision-Lab navigation
- research-pending notice
- Universe and pending-candidate screenshots


## v0.4.2 – Dynamic Ranking

### Fixed
- Scanner ranking now reacts to Strategy Studio settings.
- Position size, cash reserve and diversification settings now affect ranking rather than warnings only.
- Score-weight changes recalculate both Opportunity Score and Strategy Score.

### Added
- separate intrinsic Opportunity Score and portfolio-aware Strategy Score
- live fit adjustment and explanation
- affordability, position-size, CRV, price-zone, sector and region contributions
- ranking recalculation feedback
- automated visual and functional regression test for profile-dependent rankings


## v0.4.1 – QA Fixes

### Fixed
- mobile divider artefact in decision metrics
- ticker spacing in ranking lists
- singular/plural whole-share wording
- clipped radar labels on iPad
- ambiguity between baseline score and recalculated score

### CI
- German and English dashboard screenshots
- German and English Strategy Studio screenshots
- offensive-preset screenshot
- browser console and page-error validation
- Node.js 24-compatible official GitHub Actions


## v0.4.0 – Strategy Studio & Bilingual UI

### Added
- Strategy Studio with live sliders
- configurable score weights
- configurable execution thresholds
- configurable position sizing and diversification warnings
- defensive, balanced and offensive presets
- local browser persistence
- complete German/English language toggle
- live recalculation of ranking, OS, RAS, CRV, gates and sizing
- post-trade sector and region exposure preview

### Governance
- Position size and concentration controls are warning preferences rather than rigid caps.
- Whole-share affordability and cash reserve are explicitly included in sizing.

### Technical
- JavaScript model layer separates base data from user strategy settings.
- Historical score series remain the documented baseline; current ranking reflects the active profile.
