# Cube Ledger Implementation Plan

## Product Scope

Cube Ledger tracks Magic: The Gathering Cube draft sessions, match results, deck notes, money results, and long-term playgroup statistics. It supports variable player counts, custom draft formats, manual corrections, audit history, and offline-friendly entry.

## Database Schema

```sql
create table users (
  id uuid primary key default gen_random_uuid(),
  google_id text unique,
  display_name text not null,
  email text unique not null,
  profile_image_url text,
  role text not null default 'player' check (role in ('player', 'organizer', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table draft_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_date date not null,
  format text not null check (format in ('Individual', 'Team')),
  draft_type text not null check (draft_type in ('Vintage', 'Andrew Cube', 'Morgan Cube')),
  custom_draft_type text,
  winning_team text check (winning_team in ('A', 'B')),
  default_stake_cents integer not null default 5000,
  notes text,
  created_by uuid references users(id),
  updated_by uuid references users(id),
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
  created_at timestamptz not null default now(),
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
  created_at timestamptz not null default now()
);

create table match_results (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null unique references matches(id) on delete cascade,
  player_a_wins integer not null check (player_a_wins >= 0),
  player_b_wins integer not null check (player_b_wins >= 0),
  draws integer not null default 0 check (draws >= 0),
  corrected_by uuid references users(id),
  corrected_at timestamptz
);

create table money_results (
  id uuid primary key default gen_random_uuid(),
  draft_event_id uuid not null references draft_events(id) on delete cascade,
  draft_participant_id uuid not null references draft_participants(id),
  net_cents integer not null default 0,
  notes text,
  updated_by uuid references users(id),
  updated_at timestamptz not null default now(),
  unique (draft_event_id, draft_participant_id)
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

create table offline_mutations (
  id uuid primary key,
  client_id text not null,
  user_id uuid references users(id),
  draft_event_id uuid references draft_events(id),
  mutation_type text not null,
  payload jsonb not null,
  base_version integer,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  applied_at timestamptz
);
```

## API Routes

- `GET /api/players`: list players for selectors and leaderboard filters.
- `GET /api/drafts`: list draft history with participants, standings, and money summaries.
- `POST /api/drafts`: create a draft event with participants and default money rows.
- `GET /api/drafts/:id`: draft detail, matches, standings, money, audit log.
- `PATCH /api/drafts/:id`: update draft details, participants, deck notes, match results, money results, and notes.
- `GET /api/stats`: aggregate dashboard stats with filters.
- Future Supabase routes: `/api/sync/push`, `/api/sync/pull`, `/api/audit`, `/api/auth/callback`.

## Main UI Screens

- Dashboard: filterable KPI summary, leaderboard, best/worst performers, achievements, and recent drafts.
- Draft History: dense table of all drafts with date, team/individual format, draft type, winner, player count, and money pool.
- Draft Detail: event metadata, player decks, match results, final standings, money results, audit log, and organizer edit action.
- New Draft: fast entry flow with title/date/team-or-individual format/draft type/stake, player picker, team assignment when relevant, archetypes, matches, sidebets, and money adjustments.
- Player Profile: overall record, money trend, format breakdown, head-to-head records, draft history, and achievements.
- Match History: searchable table of player A/B records and notes.
- Money Summary: lifetime net, average per draft, biggest swings, and per-draft adjustments.

## Permission Model

- `player`: can view dashboard, drafts, profiles, and own historical data.
- `organizer`: can create drafts, enter results, edit draft details, and correct money/match entries.
- `admin`: full organizer permissions plus role management and audit review.
- Edits require optimistic concurrency through `draft_events.version`; conflicting offline edits are surfaced for manual resolution.

## Validation Rules

- Drafts require title, date, format, draft type, at least two participants, and non-negative default stake.
- Format is only `Individual` or `Team`; draft type starts with `Vintage`, `Andrew Cube`, and `Morgan Cube`.
- Team drafts require every participant to be assigned Team A or Team B before finalizing, and may store the winning team.
- Each match requires two different participants from the same draft.
- Game win/loss/draw counts must be non-negative integers.
- Match sidebets default to no sidebet. If present, sidebet amount must be non-negative and the sidebet winner must be one of the match participants.
- Money net values may be positive, negative, or zero; all values are stored in cents.
- Draft standings and lifetime money include manual money results plus match sidebet wins/losses.
- Participant display names are snapshotted to preserve history after profile changes.
- Statistics are derived from saved matches, participants, and money rows rather than manually stored totals.

## Offline Strategy

- The mobile entry flow stores pending mutations in IndexedDB/localStorage when offline.
- Each mutation includes draft id, client id, operation id, and base draft version.
- Sync pushes pending mutations when the connection returns.
- If the server version changed, the API returns a conflict showing local and remote values for review.

## Seed Data

The app ships with sample players, drafts, matches, money results, archetypes, audit rows, and achievements to make the dashboard useful immediately during development.

## Step-by-Step Implementation

1. Scaffold Next.js, TypeScript, app router, shared types, and seed data.
2. Implement derived statistics for standings, leaderboard, head-to-head, money summaries, and achievements.
3. Build API routes matching the persistence contract.
4. Build dashboard filters and dense stat tables.
5. Build draft history, draft detail, and player profile screens.
6. Add new draft/result-entry UI with offline queue indicator.
7. Add Google OAuth and Supabase/Postgres persistence.
8. Add audit triggers, conflict resolution UI, and production validation.
9. Add tests for stat derivation, validation, and API mutations.
