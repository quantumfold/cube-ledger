alter table public.draft_events
  drop constraint if exists draft_events_format_check;

update public.draft_events
set format = 'Teams After Draft'
where format = 'Team';

alter table public.draft_events
  add constraint draft_events_format_check
  check (format in ('Individual', 'Teams Before Draft', 'Teams After Draft'));
