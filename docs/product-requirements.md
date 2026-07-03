# Product Requirements Specification

Project: U.S. Stock Dip Sentinel  
Document Version: 1.2  
Status: Complete Functional Specification

## Product Overview

Retail and active individual investors often mismanage capital allocation during equity market contractions. The sentinel addresses three failure modes:

- Premature capital exhaustion from buying minor corrections too early.
- Analysis paralysis during genuine high-signal capitulations.
- Asset allocation confusion about when to pause passive index ETF allocation and rotate fresh capital into individual stocks.

The product is a macroeconomic sentiment engine that identifies rare windows where equity market fear has detached from underlying corporate credit health. It calculates an aggregate score from behavioral and structural indicators, then applies a credit overlay that can force a full stand-down state.

## Architecture Boundaries

The system must preserve four separable layers:

- Ingestion Interface: daily end-of-day retrieval from independent public data nodes after U.S. cash market close.
- Core Logic Engine: pure, stateless scoring and routing calculator.
- Persistence Store: chronological ledger of raw inputs, calculated scores, regime labels, and exact directive text.
- Presentation Layer: visual dashboard for current state, metric cards, charting, and historical log review.

## Input Metrics

Three metrics contribute to an aggregate sentiment score from 0 to 12:

- VIX expected equity volatility.
- S&P 500 market breadth, measured as percent of constituents above the 200-day moving average.
- Equity-only put/call ratio.

High-yield corporate credit spread is a separate master override.

## Scoring

### VIX

- `< 18.00`: 0 points.
- `18.00-24.99`: 1 point.
- `25.00-34.99`: 2 points.
- `35.00-45.00`: 3 points.
- `> 45.00`: 4 points.

### Market Breadth

- `> 65.0%`: 0 points.
- `50.0-65.0%`: 1 point.
- `40.0-49.9%`: 2 points.
- `25.0-39.9%`: 3 points.
- `< 25.0%`: 4 points.

### Equity Put/Call Ratio

- `< 0.75`: 0 points.
- `0.75-0.99`: 1 point.
- `1.00-1.15`: 2 points.
- `1.16-1.30`: 3 points.
- `> 1.30`: 4 points.

### Credit Circuit Breaker

- Spread `<= 4.5%`: normal operation.
- Spread `> 4.5%`: unoverrideable lock-out; force systemic crash output and void dip-buying operations.

## Routing Matrix

Routes must be evaluated in this order:

1. Credit Emergency: spread `> 4.5%`.
2. Broad Capitulation: spread `<= 4.5%` and aggregate score `>= 8`.
3. Liquidity Flash Crash: spread `<= 4.5%`, VIX score plus put/call score `>= 6`, and breadth score `<= 1`.
4. Stealth Liquidation: spread `<= 4.5%`, breadth score `>= 3`, and VIX score plus put/call score `<= 3`.
5. High Complacency: spread `<= 4.5%` and aggregate score `<= 3`.
6. Standard Annual Buying Window: spread `<= 4.5%` and aggregate score from 4 to 7 without triggering routes 3 or 4.

## Presentation Requirements

The dashboard must include:

- A dynamic hero alert banner with route-specific colors and the strategic directive.
- A responsive four-card metric grid with metric name, live value, point output, and contextual badge.
- An aggregate sentiment chart with a fixed 0-12 Y-axis.
- A descending chronological ledger of all saved daily snapshots.

## Safeguards

- Daily historical writes must be atomic. Parser failures abort the full run.
- The ledger must never record partial datasets or default null/zero fallbacks.
- Ingestion must execute once daily after official market close and data publication.

## Fetched Data Verification Requirements

Fetched market data must be treated as untrusted until it passes validation. A successful network response is not enough to accept a metric.

Each daily ingestion run must verify:

- Presence: every required metric is present in the retrieved source payload.
- Numeric shape: each metric resolves to a finite number.
- Domain range: values that are structurally impossible or operationally suspicious must be rejected before scoring.
- Freshness: the source observation date must be within the accepted publication window for that metric.
- Completeness: a snapshot may be persisted only when all required metrics are valid.
- Traceability: persisted snapshots must identify the source and observation date used for each metric.

Current domain validation rules:

- VIX must be a finite positive number.
- S&P 500 200-day breadth must be greater than 0% and no greater than 100%.
- Equity-only put/call ratio must be greater than 0 and within a plausible upper bound.
- High-yield credit spread must be a finite positive percentage.

If a source is unavailable because it cannot be reached, an explicitly maintained manual override may be used only when it also passes the same shape, range, freshness, and traceability checks.

If a source is reachable but returns a missing, zero, malformed, stale, or unexpected value, the ingestion run must fail loudly and leave the existing ledger unchanged. This failure mode is intentional so source changes can be detected, investigated, and fixed rather than silently masked.

Verification coverage must include tests for valid data, missing values, zero values, out-of-range values, malformed payloads, and invalid manual overrides.
