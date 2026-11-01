# Deployment

## Deploy the frontend with Netlify

1. Create or select the production Supabase project and copy its Project URL and publishable key. Do not use the service-role key as a frontend value.
2. In Netlify, choose **Add new site > Import an existing project**, connect this Git repository, and select the production branch. `netlify.toml` configures the build command (`python tools/build_site.py`) and publish directory (`dist`). The build also emits a Netlify `_headers` file so baseline headers are applied when publishing the generated folder directly.
3. In the Netlify site, open **Site configuration > Environment variables** and set:
   - `NBJ_SUPABASE_URL` to the Supabase Project URL.
   - `NBJ_SUPABASE_PUBLISHABLE_KEY` to the browser-safe publishable key.
   - `NBJ_SITE_URL` to the final HTTPS site origin, such as `https://your-site.netlify.app` or your custom domain.
   - Optionally, `NBJ_CURRENCY` and `NBJ_CURRENCY_LOCALE`.
4. Trigger a new deploy. Netlify builds and publishes only `dist/`; the generated `assets/js/config.js` contains the public browser configuration. To deploy manually, run the build locally and upload only the contents of `dist/`. Do not add `SUPABASE_SERVICE_ROLE_KEY` to Netlify build variables.
5. In Supabase **Authentication > URL Configuration**, set the Site URL to the exact Netlify/custom-domain HTTPS origin. Add that origin and the app's confirmation/reset callback URLs to the allowed redirect URLs. Configure your custom domain and HTTPS in Netlify if using one.

## Configure the Supabase backend

1. Back up an existing database. On a new project, apply migrations `001` through `017` in order. On an existing project, inspect `supabase migration list --linked` and apply only verified unapplied migrations; reconcile migration history before pushing if migrations were previously applied outside the CLI. Do not seed a live business project. Run `tests/permission_checks.sql` after migrating.
2. From a trusted local terminal with the Supabase CLI installed and authenticated, link the project and deploy the functions:

   ```powershell
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   npx supabase functions deploy admin-users
   npx supabase functions deploy ml-sync
   ```

3. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` as Supabase Edge Function secrets (not frontend or Netlify build variables). Add any function-specific secrets required by the function implementation. Test both functions with role-appropriate accounts.
4. Verify private Storage policies, Realtime publication, and payment-proof access. Netlify provides HTTPS; the Netlify build configuration and generated `_headers` set baseline `Referrer-Policy`, `Permissions-Policy`, and `X-Content-Type-Options` headers.

## Finish business setup and verify

1. In `/admin/settings.html`, enter the real contact details, seven-day hours, timezone, preparation/delivery estimates, fees, and ordering controls. Check the explicit business confirmation and save.
2. In `/admin/commerce-setup.html`, set the actual payment instructions and delivery zones, then enable them and delivery if offered. Review catalog, prices, and opening stock.
3. Run the [workflow checklist](../testing/TESTING.md) with CUSTOMER, STAFF, and ADMIN accounts on a separate test project before accepting customer orders.

## Backup and recovery

Keep migrations in source control. Back up database and critical Storage objects according to your Supabase plan. Test restoring into a separate project.
