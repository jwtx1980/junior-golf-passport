-- Publish all of Kara's existing entries so they appear on her public passport
update public.rounds
  set visibility = 'public', is_approved = true
  where golfer_id = (select id from public.golfers where slug = 'kara');

update public.memories
  set visibility = 'public', is_approved = true
  where golfer_id = (select id from public.golfers where slug = 'kara');

update public.achievements
  set visibility = 'public', is_approved = true
  where golfer_id = (select id from public.golfers where slug = 'kara');

update public.tournaments
  set visibility = 'public', is_approved = true
  where golfer_id = (select id from public.golfers where slug = 'kara');
