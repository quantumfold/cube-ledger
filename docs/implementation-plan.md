# Cube Ledger Implementation Plan

## Product Scope

Cube Ledger tracks Magic: The Gathering Cube draft sessions, match results, deck notes, money results, and long-term playgroup statistics. It supports variable player counts, custom draft formats, manual corrections, and audit history.

## Database Schema

```sql
create table users (
  id uuid primary key default gen_random_uuid(),
  google_id text unique,
  display_name text not null,
  email text unique not null,
  profile_image_url text,
  role text not null default 'player' check (role in ('player', 'organizer', 'admin')),
  login_enabled boolean not null default true,
  show_on_leaderboard boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table draft_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_date date not null,
  format text not null check (format in ('Individual', 'Teams Before Draft', 'Teams After Draft')),
  draft_type text not null check (draft_type in ('Vintage', 'Andrew Cube', 'Morgan Cube')),
  custom_draft_type text,
  winning_team text check (winning_team in ('A', 'B')),
  default_stake_cents integer not null default 5000,
  notes text,
  created_by uuid references users(id),
  updated_by uuid references users(id),
  deleted_at timestamptz,
  deleted_by uuid references users(id),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table draft_participants (
  id uuid primary key default gen_random_uuid(),
  draft_event_id uuid not null references draft_events(id) on delete cascade,
  user_id uuid not null references users(id),
  display_name_snapshot text not null,
  seat_order integer,
  deck_archetype text,
  colors text[] not null default '{}',
  strategy text,
  deck_notes text,
  decklist text,
  team text check (team in ('A', 'B')),
  created_by uuid references users(id),
  updated_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (draft_event_id, user_id)
);

create table matches (
  id uuid primary key default gen_random_uuid(),
  draft_event_id uuid not null references draft_events(id) on delete cascade,
  round_label text,
  table_number integer,
  player_a_id uuid not null references draft_participants(id),
  player_b_id uuid not null references draft_participants(id),
  sidebet_cents integer not null default 0 check (sidebet_cents >= 0),
  sidebet_winner_participant_id uuid references draft_participants(id),
  notes text,
  created_by uuid references users(id),
  updated_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table match_results (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null unique references matches(id) on delete cascade,
  player_a_wins integer not null check (player_a_wins >= 0),
  player_b_wins integer not null check (player_b_wins >= 0),
  draws integer not null default 0 check (draws >= 0),
  created_by uuid references users(id),
  updated_by uuid references users(id),
  corrected_by uuid references users(id),
  corrected_at timestamptz,
  updated_at timestamptz not null default now()
);

create table money_results (
  id uuid primary key default gen_random_uuid(),
  draft_event_id uuid not null references draft_events(id) on delete cascade,
  draft_participant_id uuid not null references draft_participants(id),
  net_cents integer not null default 0,
  notes text,
  created_by uuid references users(id),
  updated_by uuid references users(id),
  updated_at timestamptz not null default now(),
  unique (draft_event_id, draft_participant_id)
);

create table sidebets (
  id uuid primary key default gen_random_uuid(),
  draft_event_id uuid not null references draft_events(id) on delete cascade,
  winner_participant_id uuid not null references draft_participants(id) on delete cascade,
  loser_participant_id uuid not null references draft_participants(id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  match_id uuid references matches(id) on delete set null,
  notes text,
  created_by uuid references users(id),
  updated_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (winner_participant_id <> loser_participant_id)
);

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  changed_by uuid references users(id),
  changed_at timestamptz not null default now(),
  before jsonb,
  after jsonb
);

create table deck_images (
  id uuid primary key default gen_random_uuid(),
  draft_event_id uuid not null references draft_events(id) on delete cascade,
  draft_participant_id uuid not null references draft_participants(id) on delete cascade,
  uploaded_by uuid references users(id),
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null,
  file_size_bytes integer not null check (file_size_bytes > 0 and file_size_bytes <= 2097152),
  caption text,
  created_at timestamptz not null default now(),
  updated_by uuid references users(id),
  updated_at timestamptz not null default now()
);

create index deck_images_participant_idx on deck_images (draft_participant_id, created_at);

```

## API Routes

- `GET /api/players`: list players for selectors and leaderboard filters.
- `GET /api/drafts`: list draft history with participants, standings, and money summaries.
- `POST /api/drafts`: create a draft event with participants and default money rows.
- `GET /api/drafts/:id`: draft detail, matches, standings, money, audit log.
- `PATCH /api/drafts/:id`: update draft details, participants, deck notes, match results, money results, add/remove matches, and notes.
- `DELETE /api/drafts/:id`: soft-delete a draft and record the deletion in the audit log.
- `GET /deck-images/:id`: authorize a deck image request and redirect to a fresh signed Storage URL.
- `GET /api/stats`: aggregate dashboard stats with filters.
- Future Supabase routes: `/api/audit`, role-management APIs, and richer player-management APIs.

## Main UI Screens

- Dashboard: filterable leaderboard, trends, best/worst performers, achievements, and recent drafts.
- Draft History: dense table of all drafts with date, team/individual format, draft type, winner, player count, and money pool.
- Draft Detail: event metadata, player decks, match results, final standings, money results, deck photo links, audit log, and organizer edit action.
- New Draft: fast entry flow with title/date/team-or-individual format/draft type/stake, player picker, team assignment when relevant, initial match, and sidebet.
- Player Profile: overall record, money trend, format breakdown, head-to-head records, draft history, and achievements.
- Match History: searchable table of player A/B records and notes.
- Money Summary: lifetime net, average per draft, biggest swings, and per-draft adjustments.

## Permission Model

- `player`: can view dashboard, drafts, profiles, and own historical data.
- `organizer`: can create drafts, enter results, edit draft details, and correct money/match entries.
- `admin`: full organizer permissions plus role management and audit review.
- Edits require optimistic concurrency through `draft_events.version`; conflicting edits are surfaced for manual resolution.

## Validation Rules

- Drafts require title, date, format, draft type, at least two participants, and non-negative default stake.
- Format is only `Individual`, `Teams Before Draft`, or `Teams After Draft`; draft type starts with `Vintage`, `Andrew Cube`, and `Morgan Cube`.
- Team drafts require every participant to be assigned Team A or Team B before finalizing, and may store the winning team.
- Each match requires two different participants from the same draft.
- Game win/loss/draw counts must be non-negative integers.
- Match sidebets default to no sidebet. Canonical sidebet payouts are stored in `sidebets`; match-level sidebet fields are legacy/display input only.
- Money net values may be positive, negative, or zero; all values are stored in cents.
- Draft standings and lifetime money are derived from format-specific stake rules.
- Team drafts pay each player the default stake based on the winning team, not individual match record. Sidebet payouts are tracked separately in `sidebets`.
- Individual drafts pay each match winner the draft stake. Sidebet payouts are added from `sidebets`.
- Participant display names are snapshotted to preserve history after profile changes.
- Each draft participant can have at most two uploaded deck photos. Photos are stored in the private `deck-images` Supabase Storage bucket and referenced by `deck_images.storage_path`.
- Draft deletion is soft-delete. Deleted drafts are excluded from app reads but remain available for audit review in the database.
- Statistics are derived from saved matches, participants, and money rows rather than manually stored totals.

## Seed Data

The app ships with sample players, drafts, matches, money results, archetypes, audit rows, and achievements to make the dashboard useful immediately during development.

## Step-by-Step Implementation

1. Scaffold Next.js, TypeScript, app router, shared types, and seed data.
2. Implement derived statistics for standings, leaderboard, head-to-head, money summaries, and achievements.
3. Build API routes matching the persistence contract.
4. Build dashboard filters and dense stat tables.
5. Build draft history, draft detail, and player profile screens.
6. Add new draft/result-entry UI.
7. Add Google OAuth and Supabase/Postgres persistence.
8. Add audit triggers, conflict resolution UI, and production validation.
9. Add tests for stat derivation, validation, and API mutations.
