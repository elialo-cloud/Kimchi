# Kimchi → Cloudflare Pages + D1

The app now has a Cloudflare Pages Functions API and a D1-backed cloud sync layer. The existing calculator remains intact; the sync client is injected by `functions/_middleware.js`.

## 1. Create the Pages project

Cloudflare Dashboard → Workers & Pages → Create application → Pages → Connect to Git.

Repository: `elialo-cloud/Kimchi`

Use:
- Production branch: `main`
- Build command: leave blank
- Build output directory: `/` (repository root)

## 2. Create the D1 database

Workers & Pages → D1 → Create database.

Suggested name: `kimchi-db`

Then open the database's SQL editor and run the contents of `schema.sql`.

## 3. Bind D1 to Pages

Open the Pages project → Settings → Bindings → Add → D1 database.

Use:
- Variable name: `DB`
- D1 database: `kimchi-db`

Redeploy after adding the binding.

## 4. Protect only the sync API

The recipe site can remain public, while personal saved data is protected.

Zero Trust → Access → Applications → Create new application → Self-hosted/private.

Create the application for the Pages hostname/path:
- `YOUR-PAGES-DOMAIN/api/sync/*`

Create an **Allow** policy for your own email address. Access supports protecting specific paths, so the public recipe pages do not need to be behind login.

## 5. Test

Open the Pages site and log in through Access when the app tries to sync. Create a test batch under **Praktiskt → Mina satser**.

Refresh the page or open the site on another device. The batch should appear there as well.

## What is synced

- Fermenteringsdagbok / batches
- Inköpslista
- Sparade recept

The timer intentionally remains local to the device so starting a timer on one device does not unexpectedly replace a timer on another device.
