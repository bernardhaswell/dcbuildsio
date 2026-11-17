# AI datacenter build-out tracker

An open dataset of AI datacenter capacity from 2024 to 2030 and beyond: gigawatts by site phase,
company, accelerator, region and US state, by year and by quarter. Every figure links to a public source.

- **Site:** served by GitHub Pages from this repository (`index.html`).
- **Data:** [`data/dc-tracker.xlsx`](data/dc-tracker.xlsx), or CSV: [`phases`](data/phases.csv),
  [`deployment`](data/deployment.csv), [`deals`](data/deals.csv), [`sources`](data/sources.csv).
  Annual and quarterly GW by chip vendor, company, region, US state and status are in [`data/pivots/`](data/pivots).

## How to read it

- One row is one **site phase**: a tranche of capacity at one place with one status and one date.
  Companies are roles on that row (developer, owner, operator, tenant, end customer), so the same
  megawatts are never counted twice.
- Capacity promised under company-level chip or cloud **agreements** with no site yet is included in
  the totals as its own rows: only the part not already at a named site is added, and its location is
  marked Estimate where no source states it.
- **MW** are kept as the source states them (IT, facility or grid). Where only one is given the other is
  derived at a PUE of 1.3 and labelled as derived.
- **Timing** follows staged ramps where sources give them. Half-years map to Q2 and Q4; year-only dates
  have no quarter; undated capacity is reported but not charted.
- `verification`: `verified` rows have a supporting quote on file; `sourced` rows have a matching public
  source without a quote on file yet. Estimates are labelled.

Files under `data/` are generated. Corrections are welcome as issues with a link to a public source.
