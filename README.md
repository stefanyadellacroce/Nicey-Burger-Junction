# Nicey Burger Junction

Customer storefront and staff/admin portals backed by Supabase Auth, Postgres, Storage, Realtime, and Edge Functions. `app.py` serves the browser files locally; business operations still use Supabase.

## Run locally

1. Use Python 3.9 or newer. Copy `.env.example` to `.env.local` and set `NBJ_SUPABASE_URL` and a browser-safe `NBJ_SUPABASE_PUBLISHABLE_KEY`. The local file is ignored by Git. Never use a service-role or secret key in browser configuration.
2. Run `python app.py` and open `http://127.0.0.1:8000/`. Use `python app.py --port 8080` if needed. The server generates `/assets/js/config.js` from the environment and serves only public pages and assets.
3. On a fresh Supabase project, apply migrations `001` through `016` in order, then run `supabase/seed/001_seed.sql`. On an existing project, back up data and apply only missing migrations. Do not run the development seed on a live configured business.
4. Set Auth redirect URLs, deploy Edge Functions, and create the first administrator using [deployment instructions](docs/deployment/DEPLOYMENT.md) and [administrator setup](docs/setup/ADMIN-STAFF.md).

## Business setup

Online ordering stays closed until an administrator enters the real phone, address, hours, and timezone in `/admin/settings.html`, checks the confirmation box, and enables ordering. Configure actual payment instructions and delivery zones in `/admin/commerce-setup.html`; development examples are inactive. New ingredients get a zero-quantity inventory record. Record opening stock in `/admin/inventory.html` so it has an audit movement.

The linked Supabase project's migrations `001` through `016` are recorded as applied. Migration `014` deactivated the two untouched sample promotions; migrations `015` and `016` fixed purchase-order atomicity, protected audited writes, and repaired order snapshots. Real merchant and delivery details remain for the administrator to provide.

## Publish and verify

Run `python tools/build_site.py` to create `dist/`, then publish **only** `dist/` to a static HTTPS host. Configure the `NBJ_*` variables in the build environment. The export refuses a nonempty output directory so stale files are not mixed into a release. See [deployment instructions](docs/deployment/DEPLOYMENT.md).

Run `python tools/verify_project.py`, `python -m unittest discover -s tests`, and `node --check` on JavaScript under `assets/js/`. Run [database permission checks](tests/permission_checks.sql) after migrations. Role-based ordering, RLS, Realtime, Storage, proof, and Edge Function flows still need an isolated Supabase test project and CUSTOMER, STAFF, and ADMIN accounts. See [readiness audit](docs/testing/APP-READINESS-AUDIT.md).

## Stylesheets

`assets/css/main.css` imports 11 named stylesheets in cascade order. Shared styles are in `foundation.css`; storefront, auth, and customer styles have their own files. Portal and print styles are in `portal.css` and `print.css`. Edit the relevant file and keep the import order.
