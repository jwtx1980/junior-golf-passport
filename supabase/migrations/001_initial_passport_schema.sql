-- Junior Golf Passport initial Supabase schema.
-- Run with a dedicated Junior Golf Passport Supabase project.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  role text not null default 'owner' check (role in ('admin', 'owner', 'viewer')),
  has_ai_access boolean not null default false,
  must_change_password boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.golfers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  display_name text not null,
  headline text,
  bio text,
  home_state text,
  visibility text not null default 'public' check (visibility in ('public', 'unlisted', 'private')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.golfer_members (
  id uuid primary key default gen_random_uuid(),
  golfer_id uuid not null references public.golfers(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  member_role text not null default 'owner' check (member_role in ('owner', 'editor', 'viewer')),
  created_at timestamptz not null default now(),
  unique (golfer_id, user_id)
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text,
  state text,
  country text not null default 'United States',
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  verification_status text not null default 'manual' check (verification_status in ('manual', 'ai_suggested', 'verified', 'needs_review')),
  verification_source text not null default 'manual_admin' check (verification_source in ('google_places', 'manual_admin', 'imported', 'unknown')),
  source_place_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rounds (
  id uuid primary key default gen_random_uuid(),
  golfer_id uuid not null references public.golfers(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  played_on date,
  score integer,
  holes integer,
  tees text,
  notes text,
  story text,
  visibility text not null default 'private' check (visibility in ('public', 'unlisted', 'private')),
  is_approved boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  golfer_id uuid not null references public.golfers(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  round_id uuid references public.rounds(id) on delete set null,
  title text not null,
  entry_type text not null default 'memory' check (entry_type in ('course_played', 'round', 'achievement', 'tournament', 'memory')),
  story text,
  raw_note text,
  tags text[] not null default '{}'::text[],
  visibility text not null default 'private' check (visibility in ('public', 'unlisted', 'private')),
  is_approved boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  golfer_id uuid not null references public.golfers(id) on delete cascade,
  title text not null,
  achievement_type text,
  achieved_on date,
  course_id uuid references public.courses(id) on delete set null,
  round_id uuid references public.rounds(id) on delete set null,
  value text,
  story text,
  visibility text not null default 'private' check (visibility in ('public', 'unlisted', 'private')),
  is_approved boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  golfer_id uuid not null references public.golfers(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  event_name text not null,
  played_on date,
  division text,
  score text,
  finish text,
  result_url text,
  story text,
  visibility text not null default 'private' check (visibility in ('public', 'unlisted', 'private')),
  is_approved boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  golfer_id uuid not null references public.golfers(id) on delete cascade,
  storage_path text not null,
  caption text,
  linked_type text check (linked_type in ('round', 'memory', 'achievement', 'tournament')),
  linked_id uuid,
  visibility text not null default 'private' check (visibility in ('public', 'unlisted', 'private')),
  is_approved boolean not null default false,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  golfer_id uuid references public.golfers(id) on delete set null,
  request_type text not null check (request_type in ('draft_entry', 'parse_pasted_result')),
  model text,
  status text not null default 'pending' check (status in ('pending', 'succeeded', 'failed')),
  provider_request_id text,
  token_usage_json jsonb not null default '{}'::jsonb,
  estimated_provider_cost_micros bigint not null default 0,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  error_message text
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists golfers_touch_updated_at on public.golfers;
create trigger golfers_touch_updated_at
before update on public.golfers
for each row execute function public.touch_updated_at();

drop trigger if exists courses_touch_updated_at on public.courses;
create trigger courses_touch_updated_at
before update on public.courses
for each row execute function public.touch_updated_at();

drop trigger if exists rounds_touch_updated_at on public.rounds;
create trigger rounds_touch_updated_at
before update on public.rounds
for each row execute function public.touch_updated_at();

drop trigger if exists memories_touch_updated_at on public.memories;
create trigger memories_touch_updated_at
before update on public.memories
for each row execute function public.touch_updated_at();

drop trigger if exists achievements_touch_updated_at on public.achievements;
create trigger achievements_touch_updated_at
before update on public.achievements
for each row execute function public.touch_updated_at();

drop trigger if exists tournaments_touch_updated_at on public.tournaments;
create trigger tournaments_touch_updated_at
before update on public.tournaments
for each row execute function public.touch_updated_at();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.user_can_edit_golfer(target_golfer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.golfer_members gm
    join public.profiles p on p.id = gm.user_id
    where gm.golfer_id = target_golfer_id
      and gm.user_id = auth.uid()
      and (gm.member_role in ('owner', 'editor') or p.role = 'admin')
  );
$$;

create index if not exists golfers_slug_idx on public.golfers (slug);
create index if not exists golfer_members_user_id_idx on public.golfer_members (user_id);
create index if not exists rounds_golfer_played_on_idx on public.rounds (golfer_id, played_on desc);
create index if not exists memories_golfer_created_at_idx on public.memories (golfer_id, created_at desc);
create index if not exists achievements_golfer_created_at_idx on public.achievements (golfer_id, created_at desc);
create index if not exists tournaments_golfer_played_on_idx on public.tournaments (golfer_id, played_on desc);
create index if not exists photos_golfer_created_at_idx on public.photos (golfer_id, created_at desc);
create index if not exists ai_requests_user_created_at_idx on public.ai_requests (user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.golfers enable row level security;
alter table public.golfer_members enable row level security;
alter table public.courses enable row level security;
alter table public.rounds enable row level security;
alter table public.memories enable row level security;
alter table public.achievements enable row level security;
alter table public.tournaments enable row level security;
alter table public.photos enable row level security;
alter table public.ai_requests enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles for select
to authenticated
using (id = auth.uid());

drop policy if exists "Public can read public golfers" on public.golfers;
create policy "Public can read public golfers"
on public.golfers for select
to anon, authenticated
using (visibility in ('public', 'unlisted'));

drop policy if exists "Members can read assigned golfers" on public.golfers;
create policy "Members can read assigned golfers"
on public.golfers for select
to authenticated
using (public.user_can_edit_golfer(id));

drop policy if exists "Members can update assigned golfers" on public.golfers;
create policy "Members can update assigned golfers"
on public.golfers for update
to authenticated
using (public.user_can_edit_golfer(id))
with check (public.user_can_edit_golfer(id));

drop policy if exists "Users can read own golfer memberships" on public.golfer_members;
create policy "Users can read own golfer memberships"
on public.golfer_members for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Public can read courses" on public.courses;
create policy "Public can read courses"
on public.courses for select
to anon, authenticated
using (true);

drop policy if exists "Authenticated users can insert courses" on public.courses;
create policy "Authenticated users can insert courses"
on public.courses for insert
to authenticated
with check (true);

drop policy if exists "Members can read assigned rounds" on public.rounds;
create policy "Members can read assigned rounds"
on public.rounds for select
to authenticated
using (public.user_can_edit_golfer(golfer_id));

drop policy if exists "Public can read approved rounds" on public.rounds;
create policy "Public can read approved rounds"
on public.rounds for select
to anon, authenticated
using (visibility in ('public', 'unlisted') and is_approved = true);

drop policy if exists "Members can manage assigned rounds" on public.rounds;
create policy "Members can manage assigned rounds"
on public.rounds for all
to authenticated
using (public.user_can_edit_golfer(golfer_id))
with check (public.user_can_edit_golfer(golfer_id));

drop policy if exists "Members can read assigned memories" on public.memories;
create policy "Members can read assigned memories"
on public.memories for select
to authenticated
using (public.user_can_edit_golfer(golfer_id));

drop policy if exists "Public can read approved memories" on public.memories;
create policy "Public can read approved memories"
on public.memories for select
to anon, authenticated
using (visibility in ('public', 'unlisted') and is_approved = true);

drop policy if exists "Members can manage assigned memories" on public.memories;
create policy "Members can manage assigned memories"
on public.memories for all
to authenticated
using (public.user_can_edit_golfer(golfer_id))
with check (public.user_can_edit_golfer(golfer_id));

drop policy if exists "Members can read assigned achievements" on public.achievements;
create policy "Members can read assigned achievements"
on public.achievements for select
to authenticated
using (public.user_can_edit_golfer(golfer_id));

drop policy if exists "Public can read approved achievements" on public.achievements;
create policy "Public can read approved achievements"
on public.achievements for select
to anon, authenticated
using (visibility in ('public', 'unlisted') and is_approved = true);

drop policy if exists "Members can manage assigned achievements" on public.achievements;
create policy "Members can manage assigned achievements"
on public.achievements for all
to authenticated
using (public.user_can_edit_golfer(golfer_id))
with check (public.user_can_edit_golfer(golfer_id));

drop policy if exists "Members can read assigned tournaments" on public.tournaments;
create policy "Members can read assigned tournaments"
on public.tournaments for select
to authenticated
using (public.user_can_edit_golfer(golfer_id));

drop policy if exists "Public can read approved tournaments" on public.tournaments;
create policy "Public can read approved tournaments"
on public.tournaments for select
to anon, authenticated
using (visibility in ('public', 'unlisted') and is_approved = true);

drop policy if exists "Members can manage assigned tournaments" on public.tournaments;
create policy "Members can manage assigned tournaments"
on public.tournaments for all
to authenticated
using (public.user_can_edit_golfer(golfer_id))
with check (public.user_can_edit_golfer(golfer_id));

drop policy if exists "Members can read assigned photos" on public.photos;
create policy "Members can read assigned photos"
on public.photos for select
to authenticated
using (public.user_can_edit_golfer(golfer_id));

drop policy if exists "Public can read approved photos" on public.photos;
create policy "Public can read approved photos"
on public.photos for select
to anon, authenticated
using (visibility in ('public', 'unlisted') and is_approved = true);

drop policy if exists "Members can manage assigned photos" on public.photos;
create policy "Members can manage assigned photos"
on public.photos for all
to authenticated
using (public.user_can_edit_golfer(golfer_id))
with check (public.user_can_edit_golfer(golfer_id));

drop policy if exists "Users can read own ai requests" on public.ai_requests;
create policy "Users can read own ai requests"
on public.ai_requests for select
to authenticated
using (user_id = auth.uid());

insert into public.golfers (slug, display_name, headline, bio, home_state, visibility)
values (
  'kara',
  'Kara Walker',
  'Courses played, memories made, milestones earned.',
  'Kara''s passport is a living record of where golf has taken her: local courses, destination rounds, milestones, tournament days, and the goals still in front of her.',
  'Texas',
  'public'
)
on conflict (slug) do update
set
  display_name = excluded.display_name,
  headline = excluded.headline,
  bio = excluded.bio,
  home_state = excluded.home_state,
  visibility = excluded.visibility;

insert into public.courses (name, city, state, country, latitude, longitude, verification_status, verification_source)
values
  ('Kona Country Club', 'Kailua-Kona', 'Hawaii', 'United States', 19.562206, -155.958835, 'verified', 'imported'),
  ('Grand Bear Golf Club', 'Saucier', 'Mississippi', 'United States', 30.509089, -89.060175, 'verified', 'imported'),
  ('Pine Ridge Golf Course', 'Paris', 'Texas', 'United States', 33.6686516, -95.4827126, 'verified', 'imported'),
  ('Daingerfield Country Club', 'Daingerfield', 'Texas', 'United States', 33.024995, -94.707403, 'verified', 'imported'),
  ('Princedale Country Club', 'Pittsburg', 'Texas', 'United States', 32.9985723, -94.9541275, 'verified', 'imported'),
  ('Crossing Creeks Country Club', 'Longview', 'Texas', 'United States', 32.5444471, -94.7564489, 'verified', 'imported'),
  ('Eagle''s Bluff Country Club', 'Bullard', 'Texas', 'United States', 32.142297, -95.426395, 'verified', 'imported'),
  ('Hollytree Country Club', 'Tyler', 'Texas', 'United States', 32.2741803, -95.3179622, 'verified', 'imported'),
  ('The Championship Course at Cedar Creek Country Club', 'Kemp', 'Texas', 'United States', 32.3842039, -96.164675, 'verified', 'imported')
on conflict do nothing;

insert into storage.buckets (id, name, public)
values ('passport-photos', 'passport-photos', false)
on conflict (id) do nothing;

drop policy if exists "Members can upload passport photos" on storage.objects;
create policy "Members can upload passport photos"
on storage.objects for insert
to authenticated
with check (bucket_id = 'passport-photos');

drop policy if exists "Members can read passport photos" on storage.objects;
create policy "Members can read passport photos"
on storage.objects for select
to authenticated
using (bucket_id = 'passport-photos');
