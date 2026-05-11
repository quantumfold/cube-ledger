# Draft Records Import Review

Generated from:
- /Users/lucassiow/Downloads/Draft-Records-Matches.csv
- /Users/lucassiow/Downloads/Draft-Records-R.csv

Ignored draft IDs: 59, 76

## Output Files

- draft_events.csv: one draft row; event_date is set to 2024-01-01 for every imported draft.
- imported_users.csv: inactive user accounts for legacy-only players, excluding Chris Harabas because he already exists.
- draft_participants.csv: one row per player per draft, with inferred team A/B for team drafts.
- matches.csv: one row per match, keyed to draft_participants by participant_key.
- match_results.csv: one row per match result. Odd draft IDs were converted to 2-0; even draft IDs were converted to 2-1.
- money_results.csv: one net money result per non-sidebet record row.
- sidebets.csv: one row per sidebet winner/loser pair, so a player can have multiple sidebets in the same draft.
- sidebet_review.csv: human-readable sidebet pairs inferred from equal and opposite sb rows, including optional source-match attachment.

If you manually edit sidebet_review.csv, run:

```bash
node scripts/sync-reviewed-sidebets.mjs
```

That updates sidebets.csv without regenerating or overwriting the reviewed file.

## Counts

- Draft events: 76
- Participants: 538
- Matches: 727
- Money results: 468
- Sidebets: 30

## Remaining Review

- Sidebets are separated from match rows in the source. 18 attach cleanly to a source match; 12 are preserved as standalone sidebet rows.
- Unknown player tokens must either be added to users or mapped to existing users.

## Draft Coverage

- Records with no match rows: 45
- Match rows with no money records: 53, 54, 55, 56, 57, 58, 60, 77, 78

## Warnings

- Draft 8: skipped invalid self-match Lucas vs Lucas.
- Draft 69: skipped invalid self-match Lucas vs Lucas.
