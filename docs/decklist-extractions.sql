create table if not exists public.decklist_extractions (
  id uuid primary key default gen_random_uuid(),
  deck_image_id uuid not null references public.deck_images(id) on delete cascade,
  draft_participant_id uuid not null references public.draft_participants(id) on delete cascade,
  status text not null check (status in ('pending', 'completed', 'failed')),
  raw_text text,
  parsed_cards jsonb not null default '{}'::jsonb,
  uncertain_cards jsonb not null default '[]'::jsonb,
  model text,
  error text,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now()
);

create index if not exists decklist_extractions_deck_image_idx
  on public.decklist_extractions (deck_image_id, created_at desc);

create index if not exists decklist_extractions_participant_idx
  on public.decklist_extractions (draft_participant_id, created_at desc);
