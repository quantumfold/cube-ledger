insert into public.users (display_name, email, google_id, profile_image_url, role)
values
  ('Lucas Siow', 'lucas.siow@example.com', 'google-lucas-siow', 'https://i.pravatar.cc/80?img=47', 'admin'),
  ('David Ledvinka', 'david.ledvinka@example.com', 'google-david-ledvinka', 'https://i.pravatar.cc/80?img=12', 'organizer'),
  ('Daniel Founier', 'daniel.founier@example.com', 'google-daniel-founier', 'https://i.pravatar.cc/80?img=33', 'player'),
  ('Jamie Naylor', 'jamie.naylor@example.com', 'google-jamie-naylor', 'https://i.pravatar.cc/80?img=5', 'player'),
  ('Tyler Longo', 'tyler.longo@example.com', 'google-tyler-longo', 'https://i.pravatar.cc/80?img=60', 'player'),
  ('Maksym Gryn', 'maksym.gryn@example.com', 'google-maksym-gryn', 'https://i.pravatar.cc/80?img=9', 'player'),
  ('Morgan McLaughlin', 'morgan.mclaughlin@example.com', 'google-morgan-mclaughlin', 'https://i.pravatar.cc/80?img=20', 'player'),
  ('Andrew Naylor', 'andrew.naylor@example.com', 'google-andrew-naylor', 'https://i.pravatar.cc/80?img=52', 'player'),
  ('Brian Liu', 'brian.liu@example.com', 'google-brian-liu', 'https://i.pravatar.cc/80?img=64', 'player'),
  ('Fadi Hirmiz', 'fadi.hirmiz@example.com', 'google-fadi-hirmiz', 'https://i.pravatar.cc/80?img=15', 'player'),
  ('Paul Dean', 'paul.dean@example.com', 'google-paul-dean', 'https://i.pravatar.cc/80?img=58', 'player'),
  ('Chris Harabas', 'chris.harabas@example.com', 'google-chris-harabas', 'https://i.pravatar.cc/80?img=3', 'player')
on conflict (email) do update set
  display_name = excluded.display_name,
  google_id = excluded.google_id,
  profile_image_url = excluded.profile_image_url,
  role = excluded.role,
  updated_at = now();
