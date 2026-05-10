alter table public.draft_events
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references public.users(id);

alter table public.draft_participants
  add column if not exists created_by uuid references public.users(id),
  add column if not exists updated_by uuid references public.users(id),
  add column if not exists updated_at timestamptz not null default now();

alter table public.matches
  add column if not exists created_by uuid references public.users(id),
  add column if not exists updated_by uuid references public.users(id),
  add column if not exists updated_at timestamptz not null default now();

alter table public.match_results
  add column if not exists created_by uuid references public.users(id),
  add column if not exists updated_by uuid references public.users(id),
  add column if not exists updated_at timestamptz not null default now();

alter table public.money_results
  add column if not exists created_by uuid references public.users(id);

alter table public.deck_images
  add column if not exists updated_by uuid references public.users(id),
  add column if not exists updated_at timestamptz not null default now();

create index if not exists draft_events_active_idx
  on public.draft_events (event_date desc)
  where deleted_at is null;
