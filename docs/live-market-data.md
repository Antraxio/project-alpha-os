# Live market data — options, trade-offs and a recommendation

Status: proposal, nothing implemented. Written after the single-portfolio migration, when
every position value in the application came from a manually transcribed broker snapshot.

## Why this matters more here than in most projects

Project Alpha OS does not display prices, it *decides* on them. A price feeds the price
zone, the CRV, the whole-share sizing, the concentration and sector exposure, the Strategy
Score and finally the buy verdict. A wrong price does not produce a wrong number on screen;
it produces a wrong recommendation that looks exactly as trustworthy as a right one.

Two properties therefore matter more than latency:

1. **Provenance.** Every price must be attributable to a source and a timestamp.
2. **Fail-closed behaviour.** A price that cannot be obtained or verified must withdraw the
   decision, not fall back to a stale one. The freshness gate already implements this
   contract for the manual snapshot; live data must extend it, not bypass it.

Speed is almost irrelevant. This is a portfolio reviewed daily, not a trading system.

## The binding constraint

The application is a static GitHub Pages site. There is no server, no build step in
production and no place to keep a secret. That rules out any provider whose terms require
an API key to stay confidential, because a key shipped in client-side JavaScript is a
published key.

This constraint is architectural, not incidental — it is what makes the app cheap to run
and impossible to break at runtime. Any option that abandons it should be chosen
deliberately, not by accident.

## Options

### A. Scheduled snapshot committed to the repository — recommended

A GitHub Actions workflow runs on a schedule, fetches prices for the held and watched
tickers, writes them into `data/portfolio.json` and `data/opportunities.json`, and commits
the result. The application keeps loading static JSON and never talks to a provider.

- The API key lives in GitHub Actions secrets, never in the browser.
- Every price change is a commit: diffable, attributable, revertible. This is the strongest
  possible provenance story and fits the project's existing discipline.
- The freshness gate needs no change. It already measures snapshot age and withdraws the
  verdict when it exceeds the threshold — a failed workflow degrades exactly the way a
  stale manual snapshot does today.
- Rate limits are trivial to respect: one run per schedule, a handful of tickers.
- Cost: free tier of most providers is sufficient.

The honest downside: prices are as old as the last successful run. For a daily review with
a 24-hour freshness threshold that is adequate; for intraday decisions it is not.

### B. Browser fetches a provider directly

The page calls a quote API at load time.

- Requires a provider with a publishable key and permissive CORS. Few serious providers
  qualify, and those that do usually forbid caching or redistribution.
- The key is public by construction. Rotation becomes the only control, and abuse of the
  quota degrades the app for its only user.
- No provenance: nothing is recorded, so yesterday's decision cannot be reconstructed.
- Every reader hits the quota, including CI screenshot runs, which would also make the
  test suite non-deterministic again — the exact problem the pinned clock just solved.

Not recommended.

### C. Small proxy service

A minimal serverless function holds the key, fetches upstream and serves the browser.

- Solves the key problem and allows intraday refresh.
- Abandons the static architecture: something must be deployed, monitored and paid for, and
  the app gains a runtime dependency that can fail while the user is looking at it.
- Still no provenance unless the proxy also writes a history.

Reasonable only if intraday data becomes a genuine requirement.

### D. Broker connection

Scalable Capital has no public retail API. Screen scraping a bank session would mean
handling credentials, which is out of the question. Not viable.

## Recommendation

**Option A, with the snapshot remaining the single source of truth.**

It preserves the static architecture, keeps secrets out of the browser, gives every price a
commit for provenance, and reuses the freshness gate as the safety mechanism instead of
inventing a second one. It also degrades correctly: a provider outage produces a stale
snapshot, and a stale snapshot already withdraws every buy verdict and hides action-near
figures.

## What the implementation would have to guarantee

These are the parts that carry the risk. None of them is about fetching.

**Validation before commit.** A fetched price is not trusted because it parsed. It must be
finite, positive, denominated in the expected currency and within a plausible band of the
previous close — a 40 % jump is far more likely a provider error, a stock split or a wrong
ticker than a real move. A failed validation must abort the commit and leave the previous
snapshot in place, so the freshness gate takes over.

**Currency.** The portfolio is in EUR; Microsoft, NIKE, Biomarin and JPMorgan trade in USD.
The current data records EUR values from a German broker, which quotes the German listing.
A provider returning USD would silently change every position value by the FX rate. The
implementation must either request the same listing the broker uses, or record the FX rate
as a first-class, sourced value. **This is the single most likely source of a serious,
quiet error** and deserves more care than the fetching itself.

**Corporate actions.** A split changes the price without changing value. Without handling,
a 4-for-1 split reads as a 75 % loss and would trigger every stop. The plausibility band
above catches it as an anomaly; resolving it correctly needs an adjusted-close series or a
manual confirmation step.

**Scope.** Prices only. Scores, catalysts, risks and research stay manual and sourced. A
live feed must not become a back door for automatically generated model inputs.

**Provenance in the data.** Each price carries its source, its timestamp and its listing —
extending the `marketData` block that already exists rather than replacing it.

**The ledger stays manual.** Transactions come from broker documents. Nothing about live
prices should change that, and no automated process may write a position.

## Suggested sequence

1. Extend `marketData` to record source, timestamp and listing per price, and add a
   validation module with the plausibility band. No fetching yet — this is testable on its
   own against the current data.
2. Add the workflow for a single ticker, run it manually, inspect the commit.
3. Widen to the held positions, then to the scored universe.
4. Only then consider the index benchmark, which needs the same machinery for Dow Jones and
   S&P 500 and is currently blocked precisely because no such source exists.

## Open question for the account holder

Which listing does the broker quote for the US positions — the German venue in EUR, or the
US primary listing? The answer determines whether an FX rate is needed at all, and it
cannot be inferred from the account statement.
