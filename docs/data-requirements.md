# What data the model needs, and how fresh it has to be

Status: proposal. Nothing implemented. Companion to `live-market-data.md`, which covers how
prices would be fetched; this document covers *which* data the model needs at all, and
answers the question of what must be live.

## The short answer: almost nothing has to be live

The account holder raised the decisive point himself: a live feed only earns its keep if
the application can alert, and alerts are only needed if the decision has not been made in
advance. But this model *does* make the decision in advance. Every ranked security already
carries an entry zone, a stop and a target. That is a pre-commitment, and a pre-commitment
is precisely what removes the need to react.

Adding push notifications would work against the product. The application's entire design —
gates, fail-closed defaults, "discipline, not activity" — exists to stop the user trading on
impulse. A phone buzzing "ASML just entered its price zone" reintroduces exactly the
reflex the gates were built to suppress.

## The principle that resolves it

> **The application decides. The broker executes.**

Anything that would require a reaction within a day belongs at the broker as a standing
order, not in this application as a notification.

- Entry window opens intraday → **limit order** at the broker, placed when the scenario is
  approved. It fills whether or not anyone is watching.
- Stop is breached intraday → **stop order** at the broker. A push notification saying "your
  stop was hit two hours ago" is strictly worse than an order that already executed.

This keeps the application static, keeps it free of a real-time dependency it cannot
guarantee, and moves execution risk to the only system that can actually act on it.

Once the orders live at the broker, a daily snapshot is not a compromise. It is sufficient.

## What this exposes about the current portfolio

The scenario discipline the account holder wants for *new* positions is entirely absent from
the two largest *existing* ones:

| Position | Share of assets | Stop | Risk if stopped |
|---|---:|---:|---:|
| Biomarin Pharmaceutical | 37.1 % | **none** | unbounded |
| Microsoft | 11.4 % | 370.00 | 1.65 % |
| NIKE B | 8.6 % | **none** | unbounded |
| Deutsche Telekom | 5.4 % | 23.78 | 0.97 % |
| JPMorgan Chase | 4.1 % | 287.00 | 0.29 % |

**45.7 % of the portfolio has no exit plan at all**, and the three positions that do carry
risk that differs by a factor of six. That is not a data problem and no live feed fixes it.
It is the strongest argument for the scenario engine described below, applied to holdings
and not only to candidates.

## Data inventory by score component

The Opportunity Score weights six components. Each needs different inputs at a different
cadence.

### Fundamental — 30 %

| Input | Source | Changes |
|---|---|---|
| Revenue, margins, EPS, cash flow | quarterly and annual reports | 4×/year |
| Balance sheet: debt, interest cover, cash | same | 4×/year |
| Return on capital | derived | 4×/year |
| Valuation multiples | derived from price + fundamentals | daily, but only via price |

Reports are the anchor and they move four times a year. Nothing here is remotely live.
The multiples move daily only because the price does — so a daily price is enough to keep
them current.

### Technical — 25 %

| Input | Source | Changes |
|---|---|---|
| Price history (trend, moving averages, relative strength) | daily closes | daily |
| Realised volatility / ATR | derived from history | daily |
| Volume | daily | daily |

A **price history series** is the significant gap today. The application stores a single
current price per position. Without history there is no trend, no relative strength, and —
importantly — no volatility measure to size a stop.

### Catalyst — 15 %

| Input | Source | Changes |
|---|---|---|
| Next earnings date | company IR calendar | rarely |
| Regulatory and clinical events | company IR, regulator | event-driven |
| Capital markets days, product launches | company IR | rarely |

Biomarin is the live example: for a biotech, a clinical readout or an FDA decision *is* the
thesis. Those dates are known weeks ahead. A calendar entry serves this far better than any
real-time feed.

### Risk — 15 %

| Input | Source | Changes |
|---|---|---|
| Volatility, drawdown, beta | derived from price history | daily |
| Customer and geographic concentration | annual report | 1×/year |
| Litigation and regulatory exposure | filings, IR | event-driven |

### Macro — 10 %

| Input | Source | Changes |
|---|---|---|
| Policy rates, inflation, yield curve | central banks, statistics offices | monthly |
| Sector rotation | derived from index data | daily |
| Geopolitical situation | human judgement, sourced | event-driven |

Geopolitics deserves a warning. It is the input most likely to be reduced to a number
nobody can reconstruct. It should stay an explicit, sourced, dated human assessment with a
written rationale — never a scraped sentiment score.

### Diversification — 5 %

Derived entirely from the portfolio. No external data. Already implemented.

### Analyst estimates — a deliberate caveat

Consensus targets, revisions and rating changes are useful as a *catalyst and sentiment*
input. They are opinion, not fact, and they cluster: a downgrade after a fall tells you
about the analyst, not the company. If they are used at all, they belong in the catalyst
component with an explicit source and date, capped so they can never dominate a score.

## The three tiers

**Tier 1 — automated daily.** Prices, from the German listing, in EUR. One scheduled run,
committed to the repository, exactly as `live-market-data.md` describes. Extended to a
rolling history series rather than a single value, because the technical and risk components
need it. This is the only tier that should ever be automated.

**Tier 2 — event-driven, assisted but confirmed.** Quarterly figures, catalyst dates,
analyst revisions. A workflow may *fetch and stage* these, but a human confirms them into
the research dossier. The research pipeline already enforces this: a scored security needs
an approved dossier with every checklist item true.

**Tier 3 — never automated.** Scores, convictions, theses, risk narratives, the macro
assessment. These are judgements. Automating them would turn a decision-support tool into
an oracle whose reasoning nobody can audit — the opposite of what this project is for.

Note the shape: the automated tier is the smallest and least interesting one. That is the
correct shape for a system whose value is traceability.

## Transaction ingestion from PDFs

The account holder's requirement — enter the depot once, then feed each transaction as a
settlement PDF — fits the architecture well and is already proven. The Scalable settlements
parse cleanly and reliably: date, ISIN, WKN, shares, price, amount, and a reference number
that makes a natural idempotency key. Reconstructing the whole July ledger from them
matched the bank to the cent on every documented position.

Proposed flow: the PDF is dropped into an inbox folder, a workflow extracts the fields,
appends a ledger entry, and reports the new derived cash against the statement balance
using the reconciliation that already exists. A parse that fails validation must not commit.

**One hard constraint.** These documents carry the account holder's name, postal address,
IBAN, customer number and depot number. The repository is public. **The PDFs must never be
committed.** Only the extracted transaction fields may enter the repository — no document,
no identifiers. If keeping the source documents alongside the ledger is wanted, the
repository has to become private first. This is not a preference; it is the difference
between a ledger and a data leak.

## Two model gaps this analysis exposes

**Position size should follow risk, not a fixed target percentage.** Sizing currently aims
at a target share of the portfolio. Because stop distances differ, equal position sizes
produce unequal risk — demonstrably a factor of six across the three positions that have a
stop. The standard discipline is the inverse: fix the risk per trade, derive the size.

    shares = (portfolio × risk budget) ÷ (entry − stop)

With a 1 % budget on 7,580 €, a position stopped 10 % below entry is half the size of one
stopped 5 % below. The risk is then equal by construction, which is the point.

**Stops should follow volatility, not round numbers.** The current stops are hand-set. A
stop placed a fixed percentage below entry is too tight for a volatile biotech and too loose
for a utility. Deriving it from ATR makes it proportional to how the security actually
moves — and requires the price history from Tier 1.

Both are consequences of having a price history. Neither requires live data.

## Answered

**Currency.** The US positions are quoted in EUR by a German bank. **No FX handling is
needed**, and the provider must be asked for the German listing, not the US primary.

**No depot query.** The portfolio is not read from the broker. It is entered once and then
maintained from uploaded settlement documents, as described above. This is deliberate: it
keeps credentials out of the system entirely and makes every position traceable to a
document rather than to an API response nobody can reproduce later.

## Open questions

1. **Risk budget per trade.** 1 % of assets is the common default. This is a personal
   tolerance decision, not a technical one.
2. **Scenarios for the two uncovered holdings.** Biomarin and NIKE need an exit plan before
   any new position is opened. Neither can be derived without the account holder's intent:
   are these long-term convictions or positions to be exited?
3. **How far back should price history reach?** One year covers trend and volatility; five
   years would allow drawdown behaviour across a cycle at roughly five times the storage.
