create table if not exists public.sidebets (
  id uuid primary key default gen_random_uuid(),
  draft_event_id uuid not null references public.draft_events(id) on delete cascade,
  winner_participant_id uuid not null references public.draft_participants(id) on delete cascade,
  loser_participant_id uuid not null references public.draft_participants(id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  match_id uuid references public.matches(id) on delete set null,
  notes text,
  created_by uuid references public.users(id),
  updated_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (winner_participant_id <> loser_participant_id)
);

create index if not exists sidebets_draft_event_idx
  on public.sidebets (draft_event_id);

create index if not exists sidebets_winner_idx
  on public.sidebets (winner_participant_id);

create index if not exists sidebets_loser_idx
  on public.sidebets (loser_participant_id);
