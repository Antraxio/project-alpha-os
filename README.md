# Project Alpha OS

**Version v0.1.0 – Foundation**

Statisches, responsives Investment-Dashboard für das regelbasierte Alpha-Competition-Portfolio.

## Enthalten

- Dashboard mit Marktregime, Depotwert und Risikokennzahlen
- Alpha Scanner mit Suche und Filtern
- Portfolio mit Stop-Loss- und Take-Profit-Marken
- Trading Journal
- Research-Watchlist
- Keine externen Abhängigkeiten oder Build-Schritte

## Start

`index.html` im Browser öffnen. Für zuverlässiges Laden der JSON-Daten alternativ im Projektordner ausführen:

```bash
python3 -m http.server 8000
```

Dann `http://localhost:8000` öffnen.

## GitHub Pages

Den Inhalt in `Antraxio/project-alpha-os` hochladen und unter **Settings → Pages → Deploy from a branch → main / root** aktivieren.
