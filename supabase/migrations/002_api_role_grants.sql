-- Explicit API grants for projects with "Automatically expose new tables" disabled.

grant usage on schema public to anon, authenticated, service_role;

grant select on public.golfers to anon, authenticated, service_role;
grant select on public.courses to anon, authenticated, service_role;
grant select on public.rounds to anon, authenticated, service_role;
grant select on public.memories to anon, authenticated, service_role;
grant select on public.achievements to anon, authenticated, service_role;
grant select on public.tournaments to anon, authenticated, service_role;
grant select on public.photos to anon, authenticated, service_role;

grant select, insert, update, delete on public.profiles to authenticated, service_role;
grant select, insert, update, delete on public.golfers to authenticated, service_role;
grant select, insert, update, delete on public.golfer_members to authenticated, service_role;
grant select, insert, update, delete on public.courses to authenticated, service_role;
grant select, insert, update, delete on public.rounds to authenticated, service_role;
grant select, insert, update, delete on public.memories to authenticated, service_role;
grant select, insert, update, delete on public.achievements to authenticated, service_role;
grant select, insert, update, delete on public.tournaments to authenticated, service_role;
grant select, insert, update, delete on public.photos to authenticated, service_role;
grant select, insert, update, delete on public.ai_requests to authenticated, service_role;

grant usage, select on all sequences in schema public to authenticated, service_role;
