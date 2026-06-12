-- Add marketing photo URL to courses (fetched from Google Places at course creation time)
alter table public.courses add column if not exists photo_url text;

-- Public bucket for course hero photos (landscape/clubhouse shots)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'course-photos',
  'course-photos',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

drop policy if exists "Public can read course photos" on storage.objects;
create policy "Public can read course photos"
on storage.objects for select
using (bucket_id = 'course-photos');
