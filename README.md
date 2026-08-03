# Project Alpha OS

## v0.5.0 – Strategy Studio & Bilingual UI

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


## v0.4.2 – Dynamic Ranking

Das Scanner-Ranking verwendet jetzt zwei getrennte Ebenen:

1. **Opportunity Score (OS)**  
   Bewertet die intrinsische Chance aus Fundamental, Technik, Katalysator, Risiko, Makro und Diversifikation.

2. **Strategy Score**  
   Verwendet den OS als Ausgangspunkt und berücksichtigt zusätzlich:
   - Finanzierbarkeit mit ganzen Aktien
   - gewünschte Zielpositionsgröße
   - Cashreserve
   - Mindest-CRV
   - Einstiegszone
   - Konzentrationswarnung
   - Sektorgrenze
   - Regionsgrenze

Der Scanner wird nach dem Strategy Score sortiert. Dadurch verändern auch Positions- und Diversifikationseinstellungen tatsächlich die Reihenfolge.

Der Screenshot-Workflow enthält nun einen funktionalen Regressionstest: Das defensive und das ausgewogene Profil müssen unterschiedliche Top-5-Rankings erzeugen.


## v0.5.0 – Universe 50 & Candidate Navigation

- 50 sichtbar dokumentierte Titel
- 10 vollständig bewertete Kandidaten
- 40 Research-Kandidaten ohne erfundene Scores
- automatische oder manuelle Kandidatenauswahl
- transparente Begründung der automatischen Auswahl
- Research-Pending-Ansicht im Decision Lab
- Universe-Filter nach Region, Sektor und Abdeckung
- Ranking-Diagnostik gegenüber dem ausgewogenen Standardprofil
- Cache-Busting für CSS, JavaScript und Daten
- Tests für exakt 50 Titel und Universe-to-Decision-Lab-Navigation


## v0.5.0.1 – Navigation Hotfix

- Universe-50-Klick rendert den gewählten Titel vor dem Öffnen des Decision Labs.
- Scanner-Button „Im Decision Lab öffnen“ zeigt jetzt ebenfalls sofort den gewählten Titel.
- Der automatische Workflow-Test Apple → Decision Lab kann dadurch erfolgreich abgeschlossen werden.


## v0.6.0 – Research Pipeline

### Neue Research-Governance

Ein Titel wird nicht allein aufgrund interessanter Nachrichten in das Ranking aufgenommen. Die Freigabe erfordert:

- Identität und Listing
- überprüfte Primärquellen
- Fundamentalbild
- Katalysator
- dokumentierte Risiken
- aktuellen Markt-Snapshot
- technische Analyse
- Einstiegszone, Stop und Ziel
- finales Review

### Batch 1

Aktives Research für:

- Apple
- NVIDIA
- Alphabet
- Amazon
- SAP

Die Unternehmensfakten und Quellen sind hinterlegt. Da Markt-/Technik- und Handelssetup noch nicht für alle Titel vollständig validiert sind, erzeugen diese fünf Titel bewusst noch keinen Opportunity Score und keine automatische Kaufentscheidung.

### UI

- neuer Menüpunkt Research Pipeline
- Research-Stufen und Fortschritt
- Dossiers mit These, Katalysator, Risiko und Fakten
- vollständige Freigabe-Checkliste
- klickbare Primärquellen
- sichtbarer Blocker
- gesperrte Ranking-Freigabe
- Universe 50 unterscheidet bewertet, aktives Research und Warteschlange
