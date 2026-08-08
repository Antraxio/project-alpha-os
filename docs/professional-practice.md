# What professionals do, and what of it is worth copying

Status: research summary and recommendation. Nothing implemented.

The brief was to get as close as possible to how institutions, fund managers and family
offices work. The honest finding is that the distance is smaller than it looks, and it is
not where most people assume.

## What the professional stack actually costs

| Platform | Reported cost per seat per year |
|---|---|
| Bloomberg Terminal | ~$31,980 (large banks negotiate to $18,000–24,000) |
| LSEG Workspace | ~$22,000, stripped-down from ~$3,600 |
| FactSet | ~$12,000 typical, $4,000–50,000 by package |

Neither LSEG nor FactSet publishes list pricing, so these are reported ranges rather than
quotes.

It is worth being precise about *what that money buys*, because most of it is irrelevant
here:

- **Breadth across asset classes.** Fixed income, FX, derivatives, commodities, private
  markets. A portfolio of five listed equities uses almost none of it.
- **Latency and depth of book.** Matters for execution at size. Irrelevant when buying one
  share of Microsoft.
- **The messaging network.** Bloomberg's chat is arguably the real product — it is where
  institutional flow is negotiated. It cannot be bought into as a private investor, and it
  has no retail equivalent.
- **Compliance and audit infrastructure.** A regulatory requirement, not an edge.

Almost none of that produces better stock selection. It produces faster, broader and
auditable *operations* for an organisation.

## The uncomfortable finding

Family offices — the closest institutional analogue to a private investor — are not
distinguished by their tooling either. **65 % still run on spreadsheets**, and while 63 %
want AI in reporting, only 29 % use it; the bottleneck is consistently reported as the data
layer, not the analytics.

The purpose-built platforms in that segment — Addepar, FundCount, Asset Vantage, Aleta,
SEI Archway — are overwhelmingly **consolidated reporting and accounting** tools. They
answer "what do I own, what is it worth, what did it earn, what do I owe in tax" across
custodians and asset classes. They are not stock-selection engines.

That is the pattern worth absorbing: **institutions invest in bookkeeping rigour, not in
prediction.** The expensive infrastructure exists to make positions, costs and results
incontestable. Project Alpha OS has already been pushed in exactly that direction — a
transaction ledger derived from source documents, cash reconciled against the bank, an
unexplained 4.81 € gap left visible rather than smoothed away. That *is* the institutional
practice, implemented at a scale of five positions.

## What actually separates professionals

Four disciplines, none of which costs anything.

### 1. An Investment Policy Statement

A written document fixing objectives, risk tolerance, time horizon, constraints, asset
allocation, benchmark, rebalancing rules and — critically — **maximum position size**. It
is agreed in advance, in calm conditions, and it governs behaviour when conditions are not
calm.

This is the single highest-value thing to adopt, and it is free. Much of the application's
settings screen is already an IPS in disguise: opportunity threshold, cash hurdle, safety
margin, switch margin, minimum CRV, target position, concentration warning, cash reserve,
sector and region limits. What is missing is that it is not written down as a *commitment*
with a stated rationale and a review date — it is a set of sliders that can be moved when
they become inconvenient.

### 2. A risk budget, not a size target

Institutions monitor positions against a risk budget and rebalance on breach. The
application currently sizes by target *share of portfolio*, which produces unequal risk
because stop distances differ. The measured spread across the three positions that have a
stop is a factor of six, and 45.7 % of the portfolio has no stop at all.

### 3. Separation of decision from execution, with a written record

An investment committee documents the thesis, the disconfirming evidence and the exit
condition *before* committing, precisely so the reasoning can be judged later independently
of the outcome. Oversight and risk management are treated as duties distinct from the
investing itself.

The application's research pipeline already implements this: a security cannot be ranked
without an approved dossier whose checklist is complete, and preliminary research can never
create a score or a trade setup. This is genuinely institutional practice, and it is
already in place.

### 4. Post-trade review

Professionals attribute results to decisions, not to luck, and review the reasoning. The
four closed July trades — two stop-losses, two trailing stops, −144.16 € net — are recorded
but never examined. A structured review of what the thesis said versus what happened is the
cheapest improvement available.

## What a private investor should *not* copy

- **Benchmark hugging.** Career risk makes professionals cling to an index. A private
  investor has no such constraint and should not import it.
- **Quarterly performance pressure.** It drives short holding periods and forced selling.
- **Chasing breadth.** A five-position portfolio does not need cross-asset coverage; it
  needs depth on five names.

And the structural advantage worth naming: **no redemption pressure, no tracking-error
constraint, no career risk.** A fund manager who is right in three years but wrong for
eighteen months may not survive to be right. A private investor can hold. That is a real
edge, and it is only available to those who have written down in advance what they intend
to hold and why — which loops back to the IPS.

## What is practically adoptable, ranked

### Free, high value

**SEC EDGAR APIs.** Official, structured XBRL company facts, full-text filing search, **no
API key, no sign-up, no billing** — the only requirements are a User-Agent header and
staying under 10 requests per second. This is genuinely institutional-grade primary-source
data. It covers US issuers and foreign private issuers that file 20-F, which includes ASML,
Novo Nordisk, Shell and TotalEnergies among the watchlist names. It does **not** cover
Deutsche Telekom, Enel or Hannover Rück, which need their own IR pages.

**Company investor-relations pages.** Reports and earnings calendars at the primary source,
which the project's rules already require.

**Central bank and statistics offices.** Rates and inflation for the macro component.

### Modest cost, meaningful value

Retail terminals such as TIKR and Koyfin deliver a large share of the fundamental research
capability at a small fraction of terminal pricing; TIKR sources its fundamentals and
estimates from S&P Global's Capital IQ, the same underlying data institutions use. The
practical caveat for this project is **API access**: Koyfin does not offer a user-facing
API, so it serves as a research surface rather than a pipeline. If automation matters more
than the interface, an API-first vendor is the better fit.

### Not worth it

A terminal seat. The cost is four times the entire portfolio.

## Recommendation

Adopt the process, not the stack. In order:

1. **Write the Investment Policy Statement.** Turn the settings into a stated commitment
   with a rationale and a review date. Free, immediate, and the thing professionals would
   say matters most.
2. **Switch to risk-based sizing** and give Biomarin and NIKE an exit plan. This is the
   largest measurable gap in the current portfolio.
3. **Add the post-trade review** for the four closed trades.
4. **Wire EDGAR** for the covered names as the Tier 2 fundamentals source. Free, official,
   no key — it fits the static architecture without any secret to protect.
5. **Consider a paid fundamentals subscription** only once 1–4 are in place, and only if the
   gap is genuinely data and not process.

The sequence matters. Buying data before fixing process is how family offices end up with
65 % of them still on spreadsheets: the tooling arrives before the discipline that would
make it useful.

## Sources

- [Bloomberg Terminal Cost 2026](https://godeldiscount.com/blog/bloomberg-terminal-cost-2026)
- [Bloomberg Terminal Cost in 2026: Price + Waste — Abloomify](https://www.abloomify.com/blog/bloomberg-terminal-cost)
- [Best Bloomberg Terminal Alternatives in 2026 — PageCrawl](https://pagecrawl.io/blog/bloomberg-terminal-alternatives)
- [14 Investment Management Software for Family Offices in 2026 — Asora](https://www.asora.com/blog/investment-management-software-for-family-office)
- [Family Office Technology: AI, Wealth & Succession in 2026 — Aleta](https://aleta.io/knowledge-hub/family-office-technology-guide)
- [4 Best Family Office Portfolio Management Software Solutions — FundCount](https://fundcount.com/family-office-portfolio-management-software-solutions/)
- [Elements of an Investment Policy Statement for Institutional Investors — CFA Institute](https://rpc.cfainstitute.org/sites/default/files/-/media/documents/article/position-paper/investment-policy-statement-institutional-investors.pdf)
- [Investment Committee Best Practice — Partners Capital](https://partners-cap.com/insights/investment-committee-best-practice/)
- [University of California Investment Policy Statement](https://regents.universityofcalifornia.edu/regmeet/feb16/i3attach.pdf)
- [EDGAR Application Programming Interfaces — SEC.gov](https://www.sec.gov/search-filings/edgar-application-programming-interfaces)
- [Free SEC EDGAR API Guide](https://tldrfiling.com/blog/free-sec-edgar-api-guide/)
- [7 Top TIKR Alternatives for Retail Investors in 2026 — Gainify](https://www.gainify.io/blog/tikr-alternatives)
- [Best Koyfin Alternative for Equity Research in 2026 — TrendSpider](https://trendspider.com/learning-center/koyfin-alternative/)
