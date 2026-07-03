# Deployment Notes

## Current Recommended Host

Use GitHub Pages for the first public version. The app is static and does not require a backend or build step.

## GitHub Pages Setup

1. Create a public GitHub repository.
2. Push the project to the `main` branch.
3. Open repository `Settings`.
4. Open `Pages`.
5. Choose `Deploy from a branch`.
6. Select branch `main`.
7. Select folder `/root`.
8. Save.

GitHub will publish the dashboard at a `github.io` URL after the first Pages build finishes.

## Later Hosting Considerations

Keep GitHub Pages while the app only shows public market-signal data. Revisit hosting when any of these become active:

- Private portfolio tracking.
- Trade journal records.
- User accounts.
- Database-backed daily ingestion.
- Authenticated exports or imports.

Those features will likely need an application host and database instead of static hosting alone.

## Daily Ledger Automation

The repository includes a GitHub Actions workflow at `.github/workflows/update-ledger.yml`.

The workflow:

- Runs manually through `workflow_dispatch`.
- Runs on weekdays at `23:30 UTC`, safely after the normal U.S. cash-market close.
- Executes `node scripts/update-ledger.mjs`.
- Commits `data/ledger.json` only when every required metric is fetched and validated.
- Exits without changing the ledger when a configured source is stale, malformed, missing, zero, or out of range.

Current data-source state:

- VIX: Cboe historical VIX CSV.
- Equity put/call: Cboe Daily Market Statistics page. The updater reads the published `EQUITY PUT/CALL RATIO` value and requires it to be finite, greater than 0, and no greater than 10.
- High-yield credit spread: FRED `BAMLH0A0HYM2`.
- Market breadth: Barchart `$S5TH`, S&P 500 stocks above the 200-day average. The updater reads the published breadth value and requires it to be finite, greater than 0, and no greater than 100.

The update script is intentionally atomic. If any parser fails, any source is stale, or any required value is missing, the run exits without modifying the ledger. Scheduled GitHub runs are configured to no-op only on stale sources so the automation can stay enabled while publication timing varies.

Manual overrides in `data/manual-overrides.json` are reserved for source fetch failures. If a source can be reached but returns an unexpected shape or invalid value, the run must fail so the parser or source decision can be reviewed.

Public-page providers are acceptable for the early free version, but they are less durable than formal APIs. If the project becomes user-facing or depends on long-term history, replace public-page parsing with a licensed API source or keep the generated ledger as the durable record of daily snapshots.

## Verification Commands

Before committing source or parser changes, run:

```text
node --check scripts/update-ledger.mjs
node --test
node scripts/update-ledger.mjs --dry-run
```
