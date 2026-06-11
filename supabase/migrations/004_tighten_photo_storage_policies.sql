drop policy if exists "Members can upload passport photos" on storage.objects;
create policy "Members can upload passport photos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'passport-photos'
  and name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/.+'
  and public.user_can_edit_golfer(split_part(name, '/', 1)::uuid)
);

drop policy if exists "Members can read passport photos" on storage.objects;
create policy "Members can read passport photos"
on storage.objects for select
to authenticated
using (
  bucket_id = 'passport-photos'
  and name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/.+'
  and public.user_can_edit_golfer(split_part(name, '/', 1)::uuid)
);
