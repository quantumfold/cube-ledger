insert into public.users (display_name, email, google_id, profile_image_url, role)
values
  ('Lucas Siow', 'lucas.siow@gmail.com', 'google-lucas-siow', 'https://i.pravatar.cc/80?img=47', 'admin'),
  ('David Ledvinka', 'dledvinkamath@gmail.com', 'google-david-ledvinka', 'https://i.pravatar.cc/80?img=12', 'organizer'),
  ('Daniel Founier', 'tirentu@gmail.com', 'google-daniel-founier', 'https://i.pravatar.cc/80?img=33', 'organizer'),
  ('Jamie Naylor', 'jmbnaylor@gmail.com', 'google-jamie-naylor', 'https://i.pravatar.cc/80?img=5', 'organizer'),
  ('Tyler Longo', 'tylerlongo77@gmail.com', 'google-tyler-longo', 'https://i.pravatar.cc/80?img=60', 'organizer'),
  ('Maksym Gryn', 'maksg7@gmail.com', 'google-maksym-gryn', 'https://i.pravatar.cc/80?img=9', 'organizer'),
  ('Morgan McLaughlin', 'fozefy@gmail.com', 'google-morgan-mclaughlin', 'https://i.pravatar.cc/80?img=20', 'organizer'),
  ('Andrew Naylor', 'andrew.s.naylor@gmail.com', 'google-andrew-naylor', 'https://i.pravatar.cc/80?img=52', 'organizer'),
  ('Brian Liu', 'liuwk.brian@gmail.com', 'google-brian-liu', 'https://i.pravatar.cc/80?img=64', 'organizer'),
  ('Fadi Hirmiz', 'zimrih.idaf@gmail.com', 'google-fadi-hirmiz', 'https://i.pravatar.cc/80?img=15', 'organizer'),
  ('Paul Dean', 'pdean2012@gmail.com', 'google-paul-dean', 'https://i.pravatar.cc/80?img=58', 'organizer'),
  ('Chris Harabas', '13arabas@gmail.com', 'google-chris-harabas', 'https://i.pravatar.cc/80?img=3', 'organizer')
on conflict (email) do update set
  display_name = excluded.display_name,
  google_id = excluded.google_id,
  profile_image_url = excluded.profile_image_url,
  role = excluded.role,
  updated_at = now();
