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
