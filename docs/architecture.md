# Architecture Notes

## Current Implementation

The project is a dependency-free static app with a pure core engine and a scheduled ledger updater:

```text
public market sources -> scripts/update-ledger.mjs -> data/ledger.json -> src/core/sentinel.js -> browser dashboard
```

The browser dashboard reads `data/ledger.json`. If that file cannot be fetched, it falls back to packaged sample data in `src/data/sample-ledger.js` so local file previews still work.

## Layer Contracts

### Ingestion Interface

Current responsibility:

- Fetch VIX, breadth, equity put/call ratio, and high-yield credit spread after market close.
- Normalize units before handing data to the engine.
- Fail the full run when any required metric is unavailable or malformed.
- Reject fetched market-stat payloads with missing, zero, out-of-range, or structurally unexpected values.
- Use manual overrides only for fetch failures, not for successfully fetched but invalid payloads.

Current sources:

- VIX: Cboe VIX historical CSV.
- Market breadth: Barchart `$S5TH`, S&P 500 stocks above the 200-day average.
- Equity-only put/call: Cboe Daily Market Statistics `EQUITY PUT/CALL RATIO`.
- High-yield credit spread: FRED `BAMLH0A0HYM2`.

Current validation:

- Cboe put/call must parse to a finite value greater than 0 and no greater than 10.
- Barchart breadth must parse to a finite value greater than 0 and no greater than 100.
- All metrics must pass freshness checks before a ledger write.
- Parser failures abort the run and leave the existing ledger untouched.

### Core Logic Engine

Current responsibility:

- Validate required numeric inputs.
- Score individual metrics.
- Sum the aggregate score.
- Apply route priority exactly as specified.
- Return a complete immutable snapshot for presentation or persistence.

### Persistence Store

Current responsibility:

- Store one complete daily snapshot per market date.
- Preserve raw inputs and per-metric source metadata.
- Enforce idempotency for repeated runs on the same date.
- Replace packaged sample rows with sourced rows once live ingestion starts.

### Presentation Layer

Current responsibility:

- Show the latest state as the first-viewport signal.
- Render sub-metric cards, score trend, and ledger table.
- Keep the current route visually obvious without hiding raw inputs.

## Pending Technical Decisions

- Local-only storage versus hosted database.
- Whether public-page parsing should be replaced with licensed APIs once the product depends on longer-term reliability.
- Whether alerts should include email, push, or only dashboard state.

## Test Coverage

The test suite covers:

- All sentinel route branches and scoring boundaries.
- Missing required input metrics.
- Cboe put/call parser behavior for valid, missing, zero, and oversized values.
- Barchart breadth parser behavior for valid, missing, zero, and above-100 values.
- Invalid manual fallback values.

Run:

```text
node --test
```
