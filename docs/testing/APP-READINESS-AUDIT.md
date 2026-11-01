# App readiness audit

Updated: 2026-10-23

## Implemented

- `app.py` serves only public pages and assets, and generates browser configuration from `.env.local` or environment variables. `tools/build_site.py` exports a static `dist/` without source or server files.
- CSS is split into named files, with `main.css` preserving cascade order. The project verifier and local HTTP/config tests pass.
- Admins can create ingredients with inventory rows, adjust stock, configure payments and delivery zones, and edit store hours, contact details, fees, estimates, social/map links, and ordering controls.
- Migrations `010` through `016` harden internal RPC permissions and checkout behavior. The linked project's migration history records `001` through `016` as applied. Migration `017` adds a deferred database guard against committing orders without item snapshots; apply it and run the permission checks before production. Read-only permission checks passed for the linked project's applied migrations.
- Purchase orders now create header and items in one RPC, with retry protection. Direct browser updates to order totals/status and stock quantity are revoked; operational changes use audited RPCs. A rollback-only WEB order test created an order, item, payment, history, and inventory deduction after confirmation.
- Online ordering now requires an explicit admin confirmation and real phone/address. Untouched seed promotions, sample digital payment methods, and example delivery zones are inactive on the linked project.

## Remaining before production

| Priority | Item | Required action |
| --- | --- | --- |
| Blocker | Business details | Admin must enter real phone, address, hours, payment instructions, delivery coverage, fees, and minimums, and review actual stock. Then confirm setup and enable the desired ordering/fulfillment options. |
| Blocker | End-to-end tests | Create an isolated Supabase test project and CUSTOMER, STAFF, and ADMIN test accounts. Execute [workflow checklist](TESTING.md), including Auth, RLS, orders, Realtime, Storage, payment proof, and Edge Functions. |
| High | Deployment | Set production HTTPS host and Supabase Auth redirects, deploy Edge Functions and secrets, verify host headers, and publish only `dist/`. |
| Medium | Content | Review catalog, images, pricing, stock, contact text, and brand assets with the business owner. |

The linked project has one active administrator and three customers, but no dedicated test roles or staff account. Transaction tests used existing database fixtures and rolled back every write. They do not establish that browser checkout works end to end. See [executed results](TEST-RESULTS.md).
