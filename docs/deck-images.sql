create table if not exists public.deck_images (
  id uuid primary key default gen_random_uuid(),
  draft_event_id uuid not null references public.draft_events(id) on delete cascade,
  draft_participant_id uuid not null references public.draft_participants(id) on delete cascade,
  uploaded_by uuid references public.users(id),
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null,
  file_size_bytes integer not null check (file_size_bytes > 0 and file_size_bytes <= 2097152),
  caption text,
  created_at timestamptz not null default now()
);

create index if not exists deck_images_participant_idx
  on public.deck_images (draft_participant_id, created_at);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'deck-images',
  'deck-images',
  false,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
