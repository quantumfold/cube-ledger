alter table public.users
  add column if not exists login_enabled boolean not null default true,
  add column if not exists show_on_leaderboard boolean not null default true;

insert into public.users (display_name, email, google_id, profile_image_url, role, login_enabled, show_on_leaderboard)
values
  ('Kyle Duncan', 'legacy-kyle-duncan@cube-ledger.local', null, null, 'player', false, false),
  ('Marc Anderson', 'legacy-marc-anderson@cube-ledger.local', null, null, 'player', false, false),
  ('Vincent Thibault', 'legacy-vincent-thibault@cube-ledger.local', null, null, 'player', false, false),
  ('Josh Palmer', 'legacy-josh-palmer@cube-ledger.local', null, null, 'player', false, false),
  ('Daniel Nuffer', 'legacy-daniel-nuffer@cube-ledger.local', null, null, 'player', false, false),
  ('Omar Beldon', 'legacy-omar-beldon@cube-ledger.local', null, null, 'player', false, false),
  ('David Caplan', 'legacy-david-caplan@cube-ledger.local', null, null, 'player', false, false),
  ('Ben Rubin', 'legacy-ben-rubin@cube-ledger.local', null, null, 'player', false, false)
on conflict (email) do update set
  display_name = excluded.display_name,
  google_id = excluded.google_id,
  profile_image_url = excluded.profile_image_url,
  role = excluded.role,
  login_enabled = excluded.login_enabled,
  show_on_leaderboard = excluded.show_on_leaderboard,
  updated_at = now();
