alter table public.memories add column if not exists played_on date;

create index if not exists memories_golfer_played_on_idx
  on public.memories (golfer_id, played_on desc nulls last);
