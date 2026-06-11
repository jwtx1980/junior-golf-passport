-- Seed Kara's current public passport from the static site starter data.

insert into public.rounds (
  golfer_id,
  course_id,
  notes,
  story,
  visibility,
  is_approved
)
select
  g.id,
  c.id,
  'Imported starter course from Kara''s original static passport.',
  case c.name
    when 'Kona Country Club' then 'Kara added Hawaii to the passport with a round in Kailua-Kona.'
    when 'Grand Bear Golf Club' then 'Grand Bear added Mississippi to Kara''s course collection.'
    else 'Part of Kara''s growing East Texas course collection.'
  end,
  'public',
  true
from public.golfers g
join public.courses c on c.name in (
  'Kona Country Club',
  'Grand Bear Golf Club',
  'Pine Ridge Golf Course',
  'Daingerfield Country Club',
  'Princedale Country Club',
  'Crossing Creeks Country Club',
  'Eagle''s Bluff Country Club',
  'Hollytree Country Club',
  'The Championship Course at Cedar Creek Country Club'
)
where g.slug = 'kara'
  and not exists (
    select 1
    from public.rounds r
    where r.golfer_id = g.id
      and r.course_id = c.id
  );

insert into public.memories (
  golfer_id,
  course_id,
  title,
  entry_type,
  story,
  tags,
  visibility,
  is_approved
)
select
  g.id,
  c.id,
  'Destination round at Kona Country Club',
  'course_played',
  'Kara added Hawaii to the passport with a round in Kailua-Kona, one of the map pins that makes the journey feel bigger than a scorecard.',
  array['destination round', 'hawaii', 'passport stamp'],
  'public',
  true
from public.golfers g
join public.courses c on c.name = 'Kona Country Club'
where g.slug = 'kara'
  and not exists (
    select 1 from public.memories m
    where m.golfer_id = g.id and m.title = 'Destination round at Kona Country Club'
  );

insert into public.memories (
  golfer_id,
  course_id,
  title,
  entry_type,
  story,
  tags,
  visibility,
  is_approved
)
select
  g.id,
  c.id,
  'Road-trip stamp at Grand Bear',
  'course_played',
  'Grand Bear added Mississippi to Kara''s course collection and gave the passport another state outside the Texas home base.',
  array['mississippi', 'road trip', 'passport stamp'],
  'public',
  true
from public.golfers g
join public.courses c on c.name = 'Grand Bear Golf Club'
where g.slug = 'kara'
  and not exists (
    select 1 from public.memories m
    where m.golfer_id = g.id and m.title = 'Road-trip stamp at Grand Bear'
  );

insert into public.memories (
  golfer_id,
  title,
  entry_type,
  story,
  tags,
  visibility,
  is_approved
)
select
  g.id,
  'East Texas course collection',
  'memory',
  'Seven Texas courses now sit together as the first regional chapter of Kara''s golf passport.',
  array['texas', 'course collection'],
  'public',
  true
from public.golfers g
where g.slug = 'kara'
  and not exists (
    select 1 from public.memories m
    where m.golfer_id = g.id and m.title = 'East Texas course collection'
  );
