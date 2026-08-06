# Project Alpha OS development rules

These rules apply to every change in this repository.

## Codex task workflow

When asked to take the next GitHub Issue task, Codex must:

1. Select the newest open issue carrying `codex-ready`. Do not infer readiness from the title or body.
2. Read the complete issue and stop for clarification if requirements, safety constraints, or acceptance criteria are ambiguous or contradictory.
3. Replace `codex-ready` with `codex-working` before changing code. If the labels cannot be updated, stop and report the blocker.
4. Create a separate `agent/<short-task-name>` branch from the current `main`; never implement directly on `main`.
5. Keep the change within the issue's scope and non-goals, and follow every repository rule in this file.
6. Run the relevant automated checks named in the issue plus any checks required by the affected code.
7. Commit and push only task-related files, then open a draft pull request against `main`. Link the issue with `Closes #<issue>` in the PR body and report the tests and their results.
8. Replace `codex-working` with `codex-review` after the draft PR is available. Use `blocked` instead if progress requires clarification or unavailable access, and explain the blocker on the issue or PR.
9. Never merge the pull request, enable auto-merge, push directly to `main`, or mark the task `done`. A human reviewer owns approval, merge, and the final `done` status.

Status definitions and transition rules are documented in [`.github/CODEX_WORKFLOW.md`](.github/CODEX_WORKFLOW.md).

## Development and architecture

- Keep the application deployable as static files on GitHub Pages. Do not require a server-side runtime or a build step for production.
- Keep domain logic in `src/` modules and DOM rendering in `src/ui/`. `app.js` is the browser coordinator, not a second domain layer.
- Preserve existing view identifiers, navigation behavior, local-storage keys, and URL-relative asset paths unless a migration is explicitly approved.
- Add or update automated tests whenever scoring, ranking, sizing, selection, persistence, data loading, or research eligibility changes.
- Treat browser-console errors, page errors, missing translations, and screenshot regressions as release blockers.
- Use `src/version.js` as the browser build/cache version and keep release metadata in `data/core.json` and `package.json` aligned.

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
- Research eligibility is fail-closed. Universe status must be `scored`; `research_pending` and `research_active` are never rankable. Any dossier must be explicitly `approved` and contain all required keys (`identity`, `primarySources`, `fundamental`, `catalyst`, `risk`, `marketData`, `technical`, `setup`, `review`) set to literal `true`.
- Complete v0.6.0 `scored` opportunities without dossiers are the only legacy compatibility path. They require all six numeric score components plus numeric price, entry range, stop, and target fields.
- Preliminary research facts must not generate component scores, trade setups, rankings, or buy decisions.
- Manual analysis of a research-pending security must remain visibly marked as pending and must not imply an executable decision.
- Preserve explainability: every score, gate, ranking change, and sizing result must be reproducible from checked-in data and active settings.
