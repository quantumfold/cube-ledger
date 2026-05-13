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

-- Backfill older match-level sidebet entries into the canonical sidebets table.
-- This is safe to rerun because it skips matches that already have sidebet rows.
insert into public.sidebets (
  draft_event_id,
  winner_participant_id,
  loser_participant_id,
  amount_cents,
  match_id,
  notes,
  created_by,
  updated_by
)
select
  m.draft_event_id,
  case
    when de.format in ('Team', 'Teams Before Draft', 'Teams After Draft') and de.winning_team = player_a.team then player_a.id
    when de.format in ('Team', 'Teams Before Draft', 'Teams After Draft') and de.winning_team = player_b.team then player_b.id
    when coalesce(mr.player_a_wins, 0) > coalesce(mr.player_b_wins, 0) then player_a.id
    when coalesce(mr.player_b_wins, 0) > coalesce(mr.player_a_wins, 0) then player_b.id
  end as winner_participant_id,
  case
    when de.format in ('Team', 'Teams Before Draft', 'Teams After Draft') and de.winning_team = player_a.team then player_b.id
    when de.format in ('Team', 'Teams Before Draft', 'Teams After Draft') and de.winning_team = player_b.team then player_a.id
    when coalesce(mr.player_a_wins, 0) > coalesce(mr.player_b_wins, 0) then player_b.id
    when coalesce(mr.player_b_wins, 0) > coalesce(mr.player_a_wins, 0) then player_a.id
  end as loser_participant_id,
  m.sidebet_cents,
  m.id,
  m.notes,
  de.created_by,
  de.updated_by
from public.matches m
join public.draft_events de on de.id = m.draft_event_id
join public.draft_participants player_a on player_a.id = m.player_a_id
join public.draft_participants player_b on player_b.id = m.player_b_id
left join public.match_results mr on mr.match_id = m.id
where m.sidebet_cents > 0
  and not exists (
    select 1
    from public.sidebets existing_sidebet
    where existing_sidebet.match_id = m.id
  )
  and (
    (
      de.format in ('Team', 'Teams Before Draft', 'Teams After Draft')
      and de.winning_team is not null
      and player_a.team is distinct from player_b.team
      and (player_a.team = de.winning_team or player_b.team = de.winning_team)
    )
    or coalesce(mr.player_a_wins, 0) <> coalesce(mr.player_b_wins, 0)
  );
