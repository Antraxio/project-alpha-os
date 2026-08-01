# Project Alpha OS

## v0.4.1 – Strategy Studio & Bilingual UI

### Neue Kernfunktionen

1. **Strategy Studio mit Schiebereglern**
   - Gewichtung von Fundamental, Technik, Katalysator, Risiko, Makro und Diversifikation
   - Opportunity-Schwelle
   - Cash-Hürde und Sicherheitsmarge
   - Wechselschwelle
   - Mindest-CRV
   - Zielgröße einer Erstposition
   - Konzentrationswarnung
   - gewünschte Cashreserve
   - Warnschwellen für Sektor- und Regionenexponierung

2. **Live-Neuberechnung**
   - Ranking und Opportunity Scores
   - Relative Advantage Score
   - Kaufgates
   - CRV
   - Stückzahl bei ausschließlich vollen Aktien
   - projizierte Sektor- und Regionenexponierung
   - Executive Briefing und Entscheidung

3. **Strategie-Presets**
   - Defensiv
   - Ausgewogen
   - Offensiv
   - individuelles Profil

4. **Deutsch / Englisch**
   - Umschaltung oben rechts
   - statische und dynamische Inhalte werden übersetzt
   - Sprache und Strategieprofil werden lokal im Browser gespeichert

### Wichtige Governance

Positions- und Diversifikationsregler sind Präferenzen und Warnschwellen, keine automatisch erzwungenen starren Caps. Das entspricht Alpha 2.0: Freiraum bleibt erlaubt, Konzentration benötigt aber eine sichtbare Begründung.

### Datenstatus

Das Tool arbeitet weiterhin mit einem manuellen Modell-Snapshot und nicht mit Live-Marktdaten.


## v0.4.1 QA-Korrekturen

- mobile Trennlinien in der Entscheidungskarte korrigiert
- Ticker in Rankings optisch vom Unternehmensnamen getrennt
- deutsche Stückzahl exakt:
  - 1 ganze Akte
  - 2 ganze Aktien
- englische Stückzahl:
  - 1 whole share
  - 2 whole shares
- Radar-Beschriftungen verkürzt und gegen Abschneiden geschützt
- dynamisch berechnete Scores als „Berechneter OS“ beziehungsweise „Calculated OS“ gekennzeichnet
- Screenshot-Workflow um Deutsch, Englisch, Strategy Studio und Offensiv-Preset erweitert
- Screenshot-Workflow prüft Browser-Konsole und JavaScript-Laufzeitfehler
