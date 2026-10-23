# Testing and verification

## Local checks

Run `python tools/verify_project.py`, `python -m unittest discover -s tests -v`, and `node --check` on every file under `assets/js/`. Build an empty `dist/` with `python tools/build_site.py` and confirm it contains only public HTML/assets. The local server and build tests do not prove business workflows.

## Supabase test project checklist

Create a separate test project and CUSTOMER, STAFF, and ADMIN accounts. Apply migrations `001` through `016` and the development seed, then run `tests/permission_checks.sql`.

- Verify anon and CUSTOMER cannot call `setting_json` or `log_activity` through the Data API. Confirm each role's RLS access to profiles, orders, settings, and inventory.
- Enter actual test contact details, hours, delivery zones, and payment methods as ADMIN. Confirm WEB ordering stays closed until setup is confirmed, then follows the configured schedule and temporary closure switch.
- Create an ingredient in admin and confirm one zero-quantity inventory row. Record an adjustment and confirm one movement. Receive a PO once and reject a duplicate receipt.
- Register, confirm profile trigger creates CUSTOMER, and test login/logout/reset and persistent session. Test staff invitations and role changes through the `admin-users` Edge Function.
- Place WEB orders as CUSTOMER and POS orders as STAFF. Confirm authoritative prices, availability, promotions, fees, and taxes. Reject invalid products, forged POS source, and another user's idempotency replay.
- Confirm inactive sample promotions are unavailable. Create a real promotion and test its time, usage, and amount limits.
- Upload payment proof to the private bucket, submit it, and test staff signed access. Reject a missing file, a file in another order's folder, and manual-payment verification without proof.
- Test order status transitions, inventory deduction once, customer cancellation rules, reports, Realtime subscriptions, and the `ml-sync` Edge Function.
- Verify responsive layouts at 320, 375, 390, 430, 576, 768, 992, 1200, and 1440+ widths. Keyboard-test forms and dialogs, focus visibility, and reduced motion.

Record actual outcomes in [test results](TEST-RESULTS.md). Do not count a local static check or anonymous API request as role-based end-to-end evidence.
