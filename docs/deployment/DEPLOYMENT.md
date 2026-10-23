# Deployment

1. Set `NBJ_SUPABASE_URL` and a browser-safe `NBJ_SUPABASE_PUBLISHABLE_KEY` in the build environment (or `.env.local` for local builds). Optionally set `NBJ_SITE_URL`, `NBJ_CURRENCY`, and `NBJ_CURRENCY_LOCALE`. Never put a service-role key in browser configuration.
2. Run `python tools/build_site.py`. Publish **only** the generated `dist/` directory to a static HTTPS host. The output contains HTML and browser assets, including generated `assets/js/config.js`; source files, local environment, migrations, and tools are excluded. Start with an empty `dist/` for each build.
3. Set Supabase Auth Site URL to the production HTTPS origin and allow the required confirmation/reset redirects. Configure `404.html` on the host.
4. Back up an existing database. Apply migrations `001` through `016` in order on a fresh project, or only unapplied versions on an existing project. Seed **only** a fresh development project. Check `supabase migration list --linked` before future pushes. Run `tests/permission_checks.sql` after migrating.
5. Deploy `supabase/functions/` Edge Functions. Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and any function-specific secrets in Supabase Function secrets. Test those functions with role-specific accounts.
6. Verify private Storage policies, Realtime publication, and payment-proof access. Configure HTTPS and host security headers, including CSP, Referrer-Policy, Permissions-Policy, and X-Content-Type-Options.
7. In `/admin/settings.html`, set the actual contact details, seven-day hours, timezone, preparation/delivery estimates, fees, and ordering controls. Check the explicit business confirmation and save. In `/admin/commerce-setup.html`, set actual payment instructions and delivery zones, then enable them and delivery if offered.
8. Run the [workflow checklist](../testing/TESTING.md) with CUSTOMER, STAFF, and ADMIN accounts before accepting customer orders.

## Backup and recovery

Keep migrations in source control. Back up database and critical Storage objects according to your Supabase plan. Test restoring into a separate project.
