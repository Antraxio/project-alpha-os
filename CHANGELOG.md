# Changelog

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
