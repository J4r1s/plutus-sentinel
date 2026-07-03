# U.S. Stock Dip Sentinel

A data-driven market regime dashboard for deciding when passive ETF allocation should remain in place, when fresh capital can rotate into single stocks, and when credit conditions require standing down completely.

This first implementation is deliberately dependency-free: a static browser dashboard plus a pure JavaScript scoring engine and Node.js tests. That keeps the business logic portable while the ingestion and persistence layers are designed in docs before they are automated.

## Project Shape

- `index.html` - static application shell.
- `src/core/sentinel.js` - pure scoring and routing engine.
- `src/app.js` - dashboard rendering and demo data wiring.
- `src/styles.css` - responsive dashboard styling.
- `src/data/sample-ledger.js` - representative historical snapshots.
- `tests/sentinel.test.js` - route and scoring coverage.
- `docs/product-requirements.md` - normalized PRS from the supplied specification.
- `docs/architecture.md` - implementation boundaries and next design decisions.
- `docs/backlog.md` - practical first milestones.

## Run Locally

Serve the dashboard locally:

```powershell
Set-Location 'C:\Users\jaris\Documents\Project - Plutus'
& 'C:\Users\jaris\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' server.mjs
```

Then open `http://localhost:4173`.

To run tests:

```powershell
npm test
```

If `npm` is not available on PATH, the tests can also be run directly with Node:

```powershell
Set-Location 'C:\Users\jaris\Documents\Project - Plutus'
& 'C:\Users\jaris\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test
```

## Publish Free With GitHub Pages

1. Push this project to a public GitHub repository.
2. In GitHub, open the repository settings.
3. Go to `Pages`.
4. Set source to `Deploy from a branch`.
5. Select branch `main` and folder `/root`.
6. Save and wait for GitHub to publish the site.

The app uses relative asset paths, so it can run from either a custom domain or a `github.io` project URL.

## Current Scope

Implemented:

- VIX, market breadth, and put/call scoring.
- High-yield credit spread circuit breaker.
- Six-route playbook matrix.
- Dashboard hero state, metric cards, score chart, and historical ledger.
- Generated ledger loading from `data/ledger.json`.
- GitHub Actions workflow for scheduled ledger updates.
- Test coverage for route priority and bracket behavior.

Not implemented yet:

- Fully automated market breadth ingestion.
- Durable database persistence beyond the generated JSON ledger.
- Private portfolio tracking or trade journal records.
