alter table public.users
  add column if not exists login_enabled boolean not null default true,
  add column if not exists show_on_leaderboard boolean not null default true;

insert into public.users (display_name, email, google_id, profile_image_url, role, login_enabled, show_on_leaderboard)
values
  ('Lucas Siow', 'lucas.siow@gmail.com', 'google-lucas-siow', 'https://i.pravatar.cc/80?img=47', 'admin', true, true),
  ('David Ledvinka', 'dledvinkamath@gmail.com', 'google-david-ledvinka', 'https://i.pravatar.cc/80?img=12', 'organizer', true, true),
  ('Daniel Founier', 'tirentu@gmail.com', 'google-daniel-founier', 'https://i.pravatar.cc/80?img=33', 'organizer', true, true),
  ('Jamie Naylor', 'jmbnaylor@gmail.com', 'google-jamie-naylor', 'https://i.pravatar.cc/80?img=5', 'organizer', true, true),
  ('Tyler Longo', 'tylerlongo77@gmail.com', 'google-tyler-longo', 'https://i.pravatar.cc/80?img=60', 'organizer', true, true),
  ('Maksym Gryn', 'maksg7@gmail.com', 'google-maksym-gryn', 'https://i.pravatar.cc/80?img=9', 'organizer', true, true),
  ('Morgan McLaughlin', 'fozefy@gmail.com', 'google-morgan-mclaughlin', 'https://i.pravatar.cc/80?img=20', 'organizer', true, true),
  ('Andrew Naylor', 'andrew.s.naylor@gmail.com', 'google-andrew-naylor', 'https://i.pravatar.cc/80?img=52', 'organizer', true, true),
  ('Brian Liu', 'liuwk.brian@gmail.com', 'google-brian-liu', 'https://i.pravatar.cc/80?img=64', 'organizer', true, true),
  ('Fadi Hirmiz', 'zimrih.idaf@gmail.com', 'google-fadi-hirmiz', 'https://i.pravatar.cc/80?img=15', 'organizer', true, true),
  ('Paul Dean', 'pdean2012@gmail.com', 'google-paul-dean', 'https://i.pravatar.cc/80?img=58', 'organizer', true, true),
  ('Chris Harabas', '13arabas@gmail.com', 'google-chris-harabas', 'https://i.pravatar.cc/80?img=3', 'organizer', true, true)
on conflict (email) do update set
  display_name = excluded.display_name,
  google_id = excluded.google_id,
  profile_image_url = excluded.profile_image_url,
  role = excluded.role,
  login_enabled = excluded.login_enabled,
  show_on_leaderboard = excluded.show_on_leaderboard,
  updated_at = now();
