-- Let account-level admins manage every golfer, even before an explicit
-- golfer_members row exists.

create or replace function public.user_can_edit_golfer(target_golfer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
  or exists (
    select 1
    from public.golfer_members gm
    join public.profiles p on p.id = gm.user_id
    where gm.golfer_id = target_golfer_id
      and gm.user_id = auth.uid()
      and gm.member_role in ('owner', 'editor')
  );
$$;
