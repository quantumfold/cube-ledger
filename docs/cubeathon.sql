create table if not exists public.cubeathon_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_date date not null,
  notes text,
  created_by uuid references public.users(id),
  updated_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cubeathon_results (
  id uuid primary key default gen_random_uuid(),
  cubeathon_event_id uuid not null references public.cubeathon_events(id) on delete cascade,
  user_id uuid not null references public.users(id),
  display_name_snapshot text not null,
  money_cents integer not null default 0,
  ranking integer not null check (ranking > 0),
  match_wins integer not null default 0 check (match_wins >= 0),
  matches_played integer not null default 0 check (matches_played >= 0 and matches_played >= match_wins),
  notes text,
  created_by uuid references public.users(id),
  updated_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cubeathon_event_id, user_id)
);

create index if not exists cubeathon_events_date_idx
  on public.cubeathon_events (event_date desc);

create index if not exists cubeathon_results_event_idx
  on public.cubeathon_results (cubeathon_event_id);

create index if not exists cubeathon_results_user_idx
  on public.cubeathon_results (user_id);
