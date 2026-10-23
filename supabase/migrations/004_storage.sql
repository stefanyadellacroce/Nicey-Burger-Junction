-- Storage buckets and object policies.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('brand-assets','brand-assets',true,4194304,array['image/jpeg','image/png','image/webp','image/svg+xml']),
 ('product-images','product-images',true,4194304,array['image/jpeg','image/png','image/webp']),
 ('profile-images','profile-images',false,3145728,array['image/jpeg','image/png','image/webp']),
 ('payment-proofs','payment-proofs',false,5242880,array['image/jpeg','image/png','image/webp','application/pdf']),
 ('ml-artifacts','ml-artifacts',false,52428800,array['application/octet-stream','application/json','text/csv','application/zip'])
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

-- Public buckets: anyone can read; admin controls writes.
drop policy if exists brand_assets_public_read on storage.objects;
create policy brand_assets_public_read on storage.objects for select using(bucket_id='brand-assets');
drop policy if exists brand_assets_admin_write on storage.objects;
create policy brand_assets_admin_write on storage.objects for insert to authenticated with check(bucket_id='brand-assets' and public.is_admin());
drop policy if exists brand_assets_admin_update on storage.objects;
create policy brand_assets_admin_update on storage.objects for update to authenticated using(bucket_id='brand-assets' and public.is_admin()) with check(bucket_id='brand-assets' and public.is_admin());
drop policy if exists brand_assets_admin_delete on storage.objects;
create policy brand_assets_admin_delete on storage.objects for delete to authenticated using(bucket_id='brand-assets' and public.is_admin());

drop policy if exists product_images_public_read on storage.objects;
create policy product_images_public_read on storage.objects for select using(bucket_id='product-images');
drop policy if exists product_images_admin_insert on storage.objects;
create policy product_images_admin_insert on storage.objects for insert to authenticated with check(bucket_id='product-images' and public.is_admin());
drop policy if exists product_images_admin_update on storage.objects;
create policy product_images_admin_update on storage.objects for update to authenticated using(bucket_id='product-images' and public.is_admin()) with check(bucket_id='product-images' and public.is_admin());
drop policy if exists product_images_admin_delete on storage.objects;
create policy product_images_admin_delete on storage.objects for delete to authenticated using(bucket_id='product-images' and public.is_admin());

-- Profile images: users own a folder named with their auth UUID; staff may read for customer service.
drop policy if exists profile_images_read on storage.objects;
create policy profile_images_read on storage.objects for select to authenticated using(bucket_id='profile-images' and (((storage.foldername(name))[1]=auth.uid()::text) or public.is_staff()));
drop policy if exists profile_images_insert on storage.objects;
create policy profile_images_insert on storage.objects for insert to authenticated with check(bucket_id='profile-images' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists profile_images_update on storage.objects;
create policy profile_images_update on storage.objects for update to authenticated using(bucket_id='profile-images' and (storage.foldername(name))[1]=auth.uid()::text) with check(bucket_id='profile-images' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists profile_images_delete on storage.objects;
create policy profile_images_delete on storage.objects for delete to authenticated using(bucket_id='profile-images' and (storage.foldername(name))[1]=auth.uid()::text);

-- Payment proofs: first folder is payment UUID. Customers can upload/read only proofs attached to their own payment; staff can review.
drop policy if exists payment_proofs_read on storage.objects;
create policy payment_proofs_read on storage.objects for select to authenticated using(
 bucket_id='payment-proofs' and (
   public.is_staff() or exists(select 1 from public.payments p join public.orders o on o.id=p.order_id where p.id::text=(storage.foldername(name))[1] and o.customer_id=auth.uid())
 )
);
drop policy if exists payment_proofs_insert on storage.objects;
create policy payment_proofs_insert on storage.objects for insert to authenticated with check(
 bucket_id='payment-proofs' and exists(select 1 from public.payments p join public.orders o on o.id=p.order_id where p.id::text=(storage.foldername(name))[1] and (o.customer_id=auth.uid() or public.is_staff()))
);
drop policy if exists payment_proofs_delete on storage.objects;
create policy payment_proofs_delete on storage.objects for delete to authenticated using(bucket_id='payment-proofs' and public.is_admin());

-- ML artifacts remain private; manager/admin may inspect, training sync uses service_role.
drop policy if exists ml_artifacts_staff_read on storage.objects;
create policy ml_artifacts_staff_read on storage.objects for select to authenticated using(bucket_id='ml-artifacts' and public.current_role() in ('MANAGER','ADMIN'));
drop policy if exists ml_artifacts_admin_write on storage.objects;
create policy ml_artifacts_admin_write on storage.objects for insert to authenticated with check(bucket_id='ml-artifacts' and public.is_admin());
drop policy if exists ml_artifacts_admin_update on storage.objects;
create policy ml_artifacts_admin_update on storage.objects for update to authenticated using(bucket_id='ml-artifacts' and public.is_admin()) with check(bucket_id='ml-artifacts' and public.is_admin());
drop policy if exists ml_artifacts_admin_delete on storage.objects;
create policy ml_artifacts_admin_delete on storage.objects for delete to authenticated using(bucket_id='ml-artifacts' and public.is_admin());
