# Backlog

## Milestone 1: Deterministic Engine and Static Dashboard

- Complete pure scoring engine.
- Cover all six routing branches with tests.
- Build a dashboard with hero alert, metric cards, chart, and ledger.
- Keep sample data clearly separated from future live ingestion.

Status: complete for first pass.

## Milestone 2: Durable Local Ledger

- Define snapshot schema.
- Add JSON or SQLite persistence.
- Add idempotent upsert by market date.
- Enforce atomic writes when one or more metric parsers fail.

Status: complete for JSON ledger first pass.

## Milestone 3: Data Ingestion Prototype

- Select public or paid sources for all four metrics.
- Implement source-specific fetchers behind a common interface.
- Normalize units and timestamps.
- Add parser tests with recorded fixtures.

Status: complete for public-source prototype.

Current notes:

- VIX, market breadth, equity put/call, and high-yield spread sources are wired into the scheduled updater.
- Parser validation rejects missing, zero, malformed, and out-of-range market statistics.
- Public-page parsing remains a reliability risk; revisit licensed APIs if the dashboard becomes operationally important.

## Milestone 4: Scheduler and Operations

- Run once daily after U.S. market close and data publication.
- Record run status separately from market snapshots.
- Surface ingestion failures in the UI.

Status: partially complete.

Completed:

- Weekday GitHub Actions schedule.
- Manual workflow trigger.
- Atomic ledger commit when validation passes.

Remaining:

- Separate run-status log.
- User-visible ingestion failure state.

## Milestone 5: Production Dashboard

- Replace demo ledger with persisted data.
- Add date filters and export.
- Add multi-timeframe chart controls.
- Add optional notification channel for regime changes.

## Future Direction: Personal Investing Workspace

Keep these ideas visible when making architecture decisions, but do not treat them as active requirements yet.

- Portfolio tracking for a simple list of holdings, allocation, and cost basis.
- Trade journal for recording buys, sells, thesis notes, and post-trade reflections.
- Clear separation between public market-signal data and private personal investing data.
- Export/import support so personal records are never trapped in the app.
- A future backend or database only after the static sentinel and daily ledger are stable.

## Architecture Reminder

Near-term work should avoid choices that make private features hard later:

- Keep the core sentinel engine pure and independent from UI and storage.
- Store market snapshots in a format that could later be read by either a static site or a backend.
- Do not mix sample/public market data with personal portfolio or journal records.
- Prefer small, replaceable modules over a large framework migration too early.
