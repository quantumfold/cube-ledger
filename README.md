# Cube Ledger

Cube Ledger is a private Magic: The Gathering Cube draft tracker for a playgroup. It records draft events, match results, sidebets, deck notes, money results, audit history, and long-term player stats.

The app is built with Next.js, Supabase, and Google OAuth. Pages are hidden behind login, and authenticated users are matched to player accounts by email.

## Features

- Google login through Supabase Auth
- Private dashboard visible only to logged-in users
- Draft creation with variable player counts
- Individual or team draft format
- Draft type options: Vintage, Andrew Cube, Morgan Cube
- Team assignment and winning team for team drafts
- Match result entry with wins, losses, draws, notes, and optional sidebets
- Manual money tracking per player
- Deck archetype, colors, strategy notes, deck notes, and optional decklists
- Up to two uploaded deck photos per player per draft
- Draft history table with edit and detail links
- Draft detail pages with standings, matches, decklists, money results, and audit log
- Audit log entries showing who submitted each draft change
- Player profile page with selectable player, stats, graphs, draft history, format performance, and head-to-head records
- Dashboard line graphs for match win percentage and money over time
- Dashboard filters, leaderboard, recent draft history, and last-12-month achievements
- Last-12-month achievements for best/worst win rate and most money won/lost

## Tech Stack

- Next.js App Router
- React
- TypeScript
- Supabase Postgres
- Supabase Auth with Google OAuth
- Vercel hosting
- Lucide icons

## Local Setup

Install dependencies:

```bash
npm install
```

Create `.env.local` in the project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_publishable_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

Run the local dev server:

```bash
npm run dev
```

Open the app at the local URL printed by Next.js, usually [http://localhost:3000](http://localhost:3000).

## Supabase Setup

1. Create a Supabase project.
2. Open the Supabase SQL Editor.
3. Create the tables from the schema in [docs/implementation-plan.md](docs/implementation-plan.md).
4. Run [docs/seed-players.sql](docs/seed-players.sql) to create the playgroup player accounts.
5. Run [docs/deck-images.sql](docs/deck-images.sql) to create the deck photo metadata table and private `deck-images` Storage bucket.
6. Run [docs/data-safety-upgrades.sql](docs/data-safety-upgrades.sql) to add soft-delete and edit metadata columns.
7. Confirm the `users.email` values match the Google accounts players will use to log in.

The `deck-images` bucket is private. The app creates short-lived signed URLs when draft detail pages are loaded, so deck photos are not public files.

The main tables are:

- `users`: player accounts, Google identity metadata, email, profile image, and role
- `draft_events`: one row per draft, including date, format, draft type, stake, notes, creator, updater, and version
- `draft_participants`: players in a draft, including historical display name snapshot, team, deck archetype, colors, notes, and decklist
- `matches`: match pairings, sidebet amount, sidebet winner, and notes
- `match_results`: game wins, losses, draws, and correction metadata
- `money_results`: manually entered net money result per draft participant
- `audit_log`: meaningful draft changes with submitter, timestamp, before state, and after state
- `deck_images`: metadata for uploaded deck photos stored in the private Supabase Storage bucket

## Deck Photos

Deck photos are stored in Supabase Storage, not directly in Postgres.

- Maximum 2 photos per draft participant
- Maximum 2 MB per uploaded photo
- Supported upload types: JPEG, PNG, WebP
- Browser-side compression resizes photos before upload
- Photo metadata is stored in `deck_images`
- Photo files are stored in the private `deck-images` bucket
- Draft detail pages show `Deck photo 1` and `Deck photo 2` links beside each player's decklist
- Deck photo links use `/deck-images/:id`, which checks the app session and redirects to a fresh signed Storage URL
- Uploading or deleting a deck photo creates an audit log entry for the draft

## Google Auth Setup

In Supabase:

1. Go to Authentication > Providers.
2. Enable Google.
3. Add the Google OAuth Client ID and Client Secret.
4. Copy the Supabase callback URL shown in the Google provider settings.

In Google Cloud Console:

1. Create or open a Google Cloud project.
2. Go to APIs & Services > Credentials.
3. Create an OAuth Client ID for a Web application.
4. Add the Supabase callback URL as an Authorized redirect URI.
5. Copy the Client ID and Client Secret back into Supabase.

Important: Google blocks login from embedded browsers in some apps. Test login from Safari, Chrome, or another full browser.

## Vercel Hosting

1. Push this repository to GitHub.
2. In Vercel, import the GitHub repository.
3. Add these environment variables in Vercel Project Settings:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_publishable_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

4. Deploy the project.
5. After changing environment variables, redeploy the project from Vercel Deployments.
6. In Supabase Authentication > URL Configuration, set:

```text
Site URL: https://your-vercel-domain.vercel.app
Redirect URLs:
https://your-vercel-domain.vercel.app/auth/callback
```

7. In Google Cloud Console, add the same production callback URL as an Authorized redirect URI.

For the current production project, the live site is:

```text
https://cube-ledger.vercel.app
```

## Common Commands

```bash
npm run dev
npm run build
npm test
npm run start
```

`npm run build` should pass before deploying. Existing warnings about raw `<img>` tags are non-blocking and can be cleaned up later by moving those images to Next.js `<Image />`.

## Permissions

- `player`: can view private draft and stats data.
- `organizer`: can create and edit drafts.
- `admin`: full organizer access plus administrative role assignment.

The current seed makes Lucas Siow an admin and everyone else an organizer.

## Notes For Production

- Keep `SUPABASE_SERVICE_ROLE_KEY` private. Only store it in `.env.local` and Vercel environment variables.
- Do not expose the service role key in browser code.
- Deck photo uploads require `SUPABASE_SERVICE_ROLE_KEY` to be set in Vercel.
- Draft deletion is soft-delete: deleted drafts are hidden from the app, but audit history is retained.
- If Row Level Security is enabled later, add policies that allow authenticated playgroup members to read data and organizers/admins to write draft data.
- Stats are derived from saved draft, participant, match, and money rows rather than stored as manual totals.
