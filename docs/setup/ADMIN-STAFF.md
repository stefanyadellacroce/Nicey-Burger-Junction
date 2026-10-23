# Administrator and Staff Setup

## Initial administrator
1. Register normally on `/register.html`; this creates a CUSTOMER account.
2. In Supabase Dashboard > Authentication > Users, copy that user's UUID.
3. In the SQL editor, run a trusted one-time promotion using the UUID (never expose this operation to the public website):
```sql
update public.profiles set role='ADMIN', active=true where id='<USER_UUID>';
```
4. Confirm exactly one matching row exists in `public.profiles`.
5. Sign out and sign back in. `/admin/dashboard.html` should now be authorized.

## Additional staff/admin users
Use `/admin/users.html`. It invokes the protected `admin-users` Edge Function. The function validates the caller as ADMIN, then uses the Supabase Admin API with the server-side service-role secret to invite/create the account and set the trusted profile role. Role changes and account status changes are logged.

Do not put `SUPABASE_SERVICE_ROLE_KEY` anywhere under `assets/`.
