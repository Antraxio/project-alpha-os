# Project Alpha OS development rules

These rules apply to every change in this repository.

## Development and architecture

- Keep the application deployable as static files on GitHub Pages. Do not require a server-side runtime or a build step for production.
- Keep domain logic in `src/` modules and DOM rendering in `src/ui/`. `app.js` is the browser coordinator, not a second domain layer.
- Preserve existing view identifiers, navigation behavior, local-storage keys, and URL-relative asset paths unless a migration is explicitly approved.
- Add or update automated tests whenever scoring, ranking, sizing, selection, persistence, data loading, or research eligibility changes.
- Treat browser-console errors, page errors, missing translations, and screenshot regressions as release blockers.
- Use the version in `data/core.json` for the release and apply the same version to static asset/data cache-busting parameters.

## Data integrity

- Never invent market prices, scores, fundamentals, catalysts, risks, sources, portfolio transactions, or research completion.
- Preserve source provenance and snapshot dates. A stale or incomplete fact must be labelled or excluded, never silently presented as current.
- Keep logical datasets separate under `data/`; do not duplicate authoritative investment records across files.
- Numeric changes that alter an Opportunity Score, Strategy Score, ranking, gate, or portfolio result require an explicit source/reason and regression coverage.
- Research fixtures used only by tests must never be written into production data.

## Bilingual content / Zweisprachigkeit

- User-visible content must remain complete in German and English. Add both variants in the same change.
- German and English must express the same investment meaning; neither language may add stronger certainty or omit a qualification.
- Preserve the browser language key `alphaLanguage` and the `de`/`en` values.
- Do not ship untranslated keys, placeholder copy, or language-specific broken layouts.

## Investment and research governance

- Project Alpha OS is a decision-support model snapshot, not live market data and not personalized financial advice.
- Opportunity Score measures intrinsic opportunity from the documented components. Strategy Score adds portfolio and execution fit. Do not conflate them.
- Cash remains an active competitor. Whole-share affordability, cash reserve, CRV, price zone, and relative hurdles must remain explicit.
- Position and diversification limits are warning preferences, not hidden hard caps, unless product requirements explicitly change this rule.
- A security with incomplete research, an unapproved research stage, or any open approval-checklist item must not enter the active ranking or automatic candidate selection.
- Preliminary research facts must not generate component scores, trade setups, rankings, or buy decisions.
- Manual analysis of a research-pending security must remain visibly marked as pending and must not imply an executable decision.
- Preserve explainability: every score, gate, ranking change, and sizing result must be reproducible from checked-in data and active settings.
