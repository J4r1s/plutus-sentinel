# Architecture Notes

## Current Implementation

The initial project is a dependency-free static app with a pure core engine:

```text
sample/manual data -> src/core/sentinel.js -> browser dashboard
```

This lets us validate the scoring matrix and UI behavior before committing to providers, hosting, or a database.

## Layer Contracts

### Ingestion Interface

Future responsibility:

- Fetch VIX, breadth, equity put/call ratio, and high-yield credit spread after market close.
- Normalize units before handing data to the engine.
- Fail the full run when any required metric is unavailable or malformed.

### Core Logic Engine

Current responsibility:

- Validate required numeric inputs.
- Score individual metrics.
- Sum the aggregate score.
- Apply route priority exactly as specified.
- Return a complete immutable snapshot for presentation or persistence.

### Persistence Store

Future responsibility:

- Store one complete daily snapshot per market date.
- Preserve raw inputs, score outputs, route id, regime label, directive, and insight text.
- Enforce idempotency for repeated runs on the same date.

### Presentation Layer

Current responsibility:

- Show the latest state as the first-viewport signal.
- Render sub-metric cards, score trend, and ledger table.
- Keep the current route visually obvious without hiding raw inputs.

## Pending Technical Decisions

- Data providers for market breadth and equity-only put/call ratio.
- Local-only storage versus hosted database.
- Scheduled runner: desktop script, serverless cron, or hosted backend.
- Whether alerts should include email, push, or only dashboard state.
