# Changelog

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
