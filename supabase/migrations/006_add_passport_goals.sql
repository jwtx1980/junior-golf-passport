create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  golfer_id uuid not null references public.golfers(id) on delete cascade,
  title text not null,
  description text,
  progress_label text,
  status text not null default 'active' check (status in ('active', 'paused', 'completed')),
  visibility text not null default 'private' check (visibility in ('public', 'unlisted', 'private')),
  is_approved boolean not null default false,
  sort_order integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists goals_touch_updated_at on public.goals;
create trigger goals_touch_updated_at
before update on public.goals
for each row execute function public.touch_updated_at();

create index if not exists goals_golfer_sort_order_idx on public.goals (golfer_id, sort_order, created_at desc);

alter table public.goals enable row level security;

drop policy if exists "Members can read assigned goals" on public.goals;
create policy "Members can read assigned goals"
on public.goals for select
to authenticated
using (public.user_can_edit_golfer(golfer_id));

drop policy if exists "Public can read approved goals" on public.goals;
create policy "Public can read approved goals"
on public.goals for select
to anon, authenticated
using (visibility in ('public', 'unlisted') and is_approved = true);

drop policy if exists "Members can manage assigned goals" on public.goals;
create policy "Members can manage assigned goals"
on public.goals for all
to authenticated
using (public.user_can_edit_golfer(golfer_id))
with check (public.user_can_edit_golfer(golfer_id));

grant select on public.goals to anon, authenticated, service_role;
grant select, insert, update, delete on public.goals to authenticated, service_role;

insert into public.goals (
  golfer_id,
  title,
  description,
  progress_label,
  status,
  visibility,
  is_approved,
  sort_order
)
select
  g.id,
  goal.title,
  goal.description,
  goal.progress_label,
  'active',
  'public',
  true,
  goal.sort_order
from public.golfers g
cross join (
  values
    (
      'Play all 50 states',
      'Keep adding state stamps as Kara plays new courses around the country.',
      '3 of 50 stamped',
      10
    ),
    (
      'Add more round notes and photos',
      'Turn the course log into a richer scrapbook with favorite shots, scorecards, and family memories.',
      'Scrapbook in progress',
      20
    ),
    (
      'Track scoring milestones',
      'Record personal bests, firsts, and tournament results as the golf resume grows.',
      'Ready for milestones',
      30
    )
) as goal(title, description, progress_label, sort_order)
where g.slug = 'kara'
  and not exists (
    select 1
    from public.goals existing
    where existing.golfer_id = g.id
      and existing.title = goal.title
  );
