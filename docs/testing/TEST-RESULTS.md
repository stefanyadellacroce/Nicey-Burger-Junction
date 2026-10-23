# Executed Test Results

## Real-order readiness follow-up, 2026-10-23

- Live inventory audit: 1 active ADMIN, 3 active CUSTOMER accounts, 0 STAFF/MANAGER accounts, 16 active products, 24 stocked inventory items, 2 active cash methods, 0 active delivery zones, and 0 committed orders. WEB ordering remains closed pending real business confirmation.
- Both `admin-users` and `ml-sync` Edge Functions are deployed and active, but their authenticated workflows remain untested.
- A rollback-only WEB order test exposed two runtime errors in `create_order`: an untyped variant record for base products and an ambiguous variant reference in recipe snapshots. Migration `016` fixed both. Subsequent rollback-only tests successfully created a base-product order and a variant order, including item/payment/history rows, idempotent replay, status confirmation, and inventory deduction. No test order or business setting was committed.
- Migration `015` moved purchase-order header and item creation into one authenticated RPC with retry protection and removed direct browser writes that could bypass order history or stock movements. Its rollback-only functional test created one complete order and verified replay and grants. Migrations `015` and `016` were applied to the linked project and recorded in migration history.
- `tests/permission_checks.sql` **PASS** after migrations `015` and `016`. These database tests run with a privileged SQL connection and simulated `auth.uid()`; they do not replace browser tests using actual CUSTOMER, STAFF, and ADMIN sessions.
- Final local checks: project verifier **PASS** (226 paths), 7 Python tests **PASS**, JavaScript syntax checks **PASS**. A fresh `dist/` export contains 148 public files and the purchase-order RPC frontend, with no server source, local environment, migrations, or tools. Migration history `001`-`016` matches locally and remotely; final live order count is still **0**.

## Follow-up, 2026-10-23

- `python tools/verify_project.py` **PASS** (224 project paths); `python -m unittest discover -s tests -v` **PASS** (7 tests); `node --check` across `assets/js/` **PASS**. `python tools/build_site.py` exported 148 public files to `dist/`.
- Local server configuration now comes from `.env.local` or build environment. The publishable key is browser-visible by design; secret/service-role keys are rejected. The static export includes only public HTML/assets and generated browser configuration.
- Migration `013_checkout_integrity.sql` was rollback-tested and applied to the linked project. It restricts order source and idempotency replay, requires configured ordering hours and a real uploaded payment-proof object, and tightens manual-payment verification.
- Migration `014_require_business_confirmation.sql` passed a rollback-only test, was applied, and was recorded in migration history. Final live read-only query: `ordering_open=false`, `setup_confirmed=false`, and **0** active untouched sample promotions. This keeps customer WEB ordering closed until an administrator confirms real business details.
- `tests/permission_checks.sql` **PASS** on the linked database after migration `014`. Anonymous HTTP probe: public catalog **200**, store-status RPC **200**, private `setting_json` RPC **401**. `supabase migration list --linked` shows local and remote versions `001` through `014` matched.
- No isolated test project or CUSTOMER/STAFF/ADMIN test accounts are available. Auth, role-specific RLS, orders, Realtime, Storage, payment proofs, and Edge Functions have **not** been verified end to end. Real merchant and delivery details are still for an administrator to enter.

## Local follow-up, 2026-10-22

- Added `app.py` as a local HTTP entry point and split `main.css` into 11 named stylesheets while preserving their original byte order through CSS imports.
- `python -m unittest discover -s tests -p test_app.py -v` — **PASS**. Public pages, CSS, HEAD requests, and private-path rejection passed.
- `python tools/verify_project.py` — **PASS** after adding checks for `app.py` and CSS imports.
- No new CUSTOMER, STAFF, or ADMIN test accounts or isolated Supabase project were available. The live workflow status below remains unchanged.

See [the current readiness audit](APP-READINESS-AUDIT.md) for outstanding work.

Date: 2026-10-20

Executed in this workspace:

- `python tools/verify_project.py` — **PASS**. Checked the local project, including the restored `README.md` and new commerce setup page.
- `node --check` on all 69 files under `assets/js/` — **PASS**.
- `python -m py_compile tools/verify_project.py tools/check_public_api.py ml/training/train.py` — **PASS**.

Live database verification and changes:

- Before the fix, anonymous requests to `setting_json` returned HTTP 200. A read-only Postgres privilege query confirmed anonymous execution of both `setting_json` and `log_activity`.
- Applied `supabase/hotfixes/2026-10-20_revoke_internal_rpc.sql` to the linked project. It revoked browser-role execution of internal setting and audit helpers; no table data was changed.
- Applied migrations 010–012 with `supabase db query` after checking the remote schema and existing function list. Migration 010 added the atomic ingredient/stock RPC and status trigger. Migration 011 granted admin-managed delivery-zone writes, disabled three placeholder digital payment methods and two example delivery zones, and added data constraints. Migration 012 removed anonymous EXECUTE from authenticated-only RPCs and trigger functions.
- `tests/permission_checks.sql` — **PASS** against the linked project. The ingredient RPC exists, anonymous callers lack EXECUTE, authenticated callers have EXECUTE subject to its ADMIN role check, and its status trigger exists. Delivery-zone INSERT privilege, RLS, and commerce constraints were also confirmed.
- Final live counts: **0** active sample digital methods and **0** active delivery zones. They require real business setup before customer checkout can use them.
- Delivery ordering was paused in Website Settings while no real zone is active. The administrator must activate a real zone and re-enable delivery in Settings.
- After the fix, anonymous `setting_json` returns HTTP 401. Public catalog and store-status requests still return HTTP 200. Postgres reports `anon` and `authenticated` have no EXECUTE privilege on `setting_json` or `log_activity`.
- A final audit found only `check_product_availability`, `current_role`, `get_frequently_bought_together`, `get_store_status`, `is_admin`, and `is_staff` remain anonymously executable among live SECURITY DEFINER functions. The legacy recommendation helper returns aggregate product-pair counts, not customer rows.

Database and browser integration status:

- No isolated Supabase test project or CUSTOMER/STAFF/ADMIN test accounts were available, so role-based browser workflows could not be executed.
- Local Supabase could not start: Docker Desktop's engine was not running.
- The linked project has the application tables but no versions recorded in Supabase CLI migration history. Migrations 010–012 were applied directly with `db query`, so migration history needs reconciliation before future `db push` use. Live Auth, role-based RLS, order, Realtime, Storage, payment-proof, and Edge Function workflows remain unverified.
- Actual merchant payment instructions and delivery coverage must be entered by an administrator at `/admin/commerce-setup.html` before enabling those options.

Use [the testing checklist](TESTING.md) against an isolated test project before relying on the remaining workflows for production.
