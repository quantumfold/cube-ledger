import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const matchesPath = "/Users/lucassiow/Downloads/Draft-Records-Matches.csv";
const recordsPath = "/Users/lucassiow/Downloads/Draft-Records-R.csv";
const outDir = path.join(root, "import");
const ignoredDraftIds = new Set([59, 76]);
const defaultEventDate = "2024-01-01";
const importedInactiveUsers = [
  ["Kyle Duncan", "legacy-kyle-duncan@cube-ledger.local"],
  ["Marc Anderson", "legacy-marc-anderson@cube-ledger.local"],
  ["Vincent Thibault", "legacy-vincent-thibault@cube-ledger.local"],
  ["Josh Palmer", "legacy-josh-palmer@cube-ledger.local"],
  ["Daniel Nuffer", "legacy-daniel-nuffer@cube-ledger.local"],
  ["Omar Beldon", "legacy-omar-beldon@cube-ledger.local"],
  ["David Caplan", "legacy-david-caplan@cube-ledger.local"],
  ["Ben Rubin", "legacy-ben-rubin@cube-ledger.local"]
];

const nameMap = new Map([
  ["Lucas", "Lucas Siow"],
  ["David", "David Ledvinka"],
  ["Daniel", "Daniel Founier"],
  ["Jamie", "Jamie Naylor"],
  ["Tyler", "Tyler Longo"],
  ["Maksym", "Maksym Gryn"],
  ["Morgan", "Morgan McLaughlin"],
  ["Andrew", "Andrew Naylor"],
  ["Andew", "Andrew Naylor"],
  ["Brian", "Brian Liu"],
  ["Bryan", "Brian Liu"],
  ["Fadi", "Fadi Hirmiz"],
  ["Paul", "Paul Dean"],
  ["Chris", "Chris Harabas"],
  ["ch", "Chris Harabas"],
  ["kd", "Kyle Duncan"],
  ["ma", "Marc Anderson"],
  ["v", "Vincent Thibault"],
  ["jp", "Josh Palmer"],
  ["Josh", "Josh Palmer"],
  ["ds", "Daniel Nuffer"],
  ["Omar", "Omar Beldon"],
  ["cap", "David Caplan"],
  ["rubin", "Ben Rubin"]
]);

function readCsv(file) {
  const text = fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "").trim();
  const [headerLine, ...lines] = text.split(/\r?\n/);
  const headers = headerLine.split(",");
  return lines.filter(Boolean).map((line) => {
    const values = line.split(",");
    return Object.fromEntries(headers.map((header, index) => [header || `extra_${index}`, values[index] ?? ""]));
  });
}

function csvEscape(value) {
  const text = value == null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function writeCsv(file, rows, headers) {
  const body = [headers.join(","), ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(","))].join("\n");
  fs.writeFileSync(path.join(outDir, file), `${body}\n`);
}

function normalizeName(name) {
  return nameMap.get(name) ?? name;
}

function cents(dollars) {
  return Math.round(Number(dollars) * 100);
}

function draftTypeFor(matchRows) {
  if (matchRows.some((row) => row.Morgan_Cube === "1")) return "Morgan Cube";
  if (matchRows.some((row) => row.Naylor_Cube === "1")) return "Andrew Cube";
  return "Vintage";
}

function formatFor(matchRows) {
  const labels = matchRows.map((row) => row.extra_8).filter(Boolean);
  if (labels.some((label) => /no teams|individual/i.test(label))) return "Individual";
  return "Teams After Draft";
}

function resultForDraft(draftId, winnerIsA) {
  const winnerGames = 2;
  const loserGames = draftId % 2 === 0 ? 1 : 0;
  return winnerIsA
    ? { player_a_wins: winnerGames, player_b_wins: loserGames, draws: 0 }
    : { player_a_wins: loserGames, player_b_wins: winnerGames, draws: 0 };
}

const matchRows = readCsv(matchesPath);
const recordRows = readCsv(recordsPath);
const matchesByDraft = new Map();
const recordsByDraft = new Map();

for (const row of matchRows) {
  const draftId = Number(row.draft);
  if (ignoredDraftIds.has(draftId)) continue;
  const current = matchesByDraft.get(draftId) ?? [];
  current.push(row);
  matchesByDraft.set(draftId, current);
}

for (const row of recordRows) {
  const draftId = Number(row.draft);
  if (ignoredDraftIds.has(draftId)) continue;
  const current = recordsByDraft.get(draftId) ?? [];
  current.push(row);
  recordsByDraft.set(draftId, current);
}

const draftIds = [...new Set([...matchesByDraft.keys(), ...recordsByDraft.keys()])].sort((a, b) => a - b);
const events = [];
const participants = [];
const matches = [];
const matchResults = [];
const moneyResults = [];
const sidebets = [];
const sidebetReview = [];
const warnings = [];

for (const draftId of draftIds) {
  const draftMatchRows = matchesByDraft.get(draftId) ?? [];
  const draftRecordRows = recordsByDraft.get(draftId) ?? [];
  const format = formatFor(draftMatchRows);
  const draftKey = `legacy-${draftId}`;
  const nonSidebetRecords = draftRecordRows.filter((row) => row.sb !== "1");
  const sidebetRecords = draftRecordRows.filter((row) => row.sb === "1");
  const nonZeroBaseAmounts = nonSidebetRecords.map((row) => Math.abs(Number(row.won))).filter((value) => value > 0);
  const defaultStakeDollars = nonZeroBaseAmounts.length ? Math.min(...nonZeroBaseAmounts) : 0;
  const teamATokens = new Set(nonSidebetRecords.filter((row) => Number(row.won) > 0).map((row) => row.player));
  const teamBTokens = new Set(nonSidebetRecords.filter((row) => Number(row.won) < 0).map((row) => row.player));
  const participantTokens = new Set([
    ...draftMatchRows.flatMap((row) => [row.p1, row.p2]),
    ...draftRecordRows.map((row) => row.player)
  ]);

  const isTie = nonSidebetRecords.length > 0 && nonSidebetRecords.every((row) => Number(row.won) === 0);
  events.push({
    legacy_draft_id: draftId,
    draft_key: draftKey,
    title: `Legacy Draft ${draftId}`,
    event_date: defaultEventDate,
    format,
    draft_type: draftTypeFor(draftMatchRows),
    winning_team: format === "Individual" || isTie ? "" : "A",
    default_stake_cents: cents(defaultStakeDollars),
    notes: [
      "Imported from Draft-Records-Matches.csv and Draft-Records-R.csv.",
      isTie ? "Money record was $0 for all players; treated as tied draft with no winning team." : "",
      draftMatchRows.some((row) => row.extra_7) ? `Source label: ${[...new Set(draftMatchRows.map((row) => row.extra_7).filter(Boolean))].join("; ")}` : ""
    ].filter(Boolean).join(" ")
  });

  let seat = 1;
  const participantByToken = new Map();
  const participantByDisplayName = new Map();
  for (const token of [...participantTokens].filter(Boolean).sort((a, b) => normalizeName(a).localeCompare(normalizeName(b)))) {
    const displayName = normalizeName(token);
    const participantKey = participantByDisplayName.get(displayName) ?? `${draftKey}-${displayName.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-").replaceAll(/^-|-$/g, "")}`;
    participantByDisplayName.set(displayName, participantKey);
    if (!nameMap.has(token)) warnings.push(`Draft ${draftId}: unknown player token "${token}" needs a user mapping before upload.`);
    participantByToken.set(token, participantKey);
    if (participants.some((participant) => participant.participant_key === participantKey)) continue;
    const aliasTokens = [...participantTokens].filter((candidate) => normalizeName(candidate) === displayName);
    participants.push({
      draft_key: draftKey,
      participant_key: participantKey,
      player_token: aliasTokens.join("|"),
      display_name: displayName,
      seat_order: seat++,
      team: format === "Individual" ? "" : aliasTokens.some((alias) => teamATokens.has(alias)) ? "A" : aliasTokens.some((alias) => teamBTokens.has(alias)) ? "B" : ""
    });
  }

  for (const [index, row] of draftMatchRows.entries()) {
    const p1 = participantByToken.get(row.p1);
    const p2 = participantByToken.get(row.p2);
    if (!p1 || !p2 || p1 === p2) {
      warnings.push(`Draft ${draftId}: skipped invalid self-match ${row.p1} vs ${row.p2}.`);
      continue;
    }
    const p1Won = Number(row.result1) > Number(row.result2);
    const result = resultForDraft(draftId, p1Won);
    const matchKey = `${draftKey}-match-${index + 1}`;
    matches.push({
      draft_key: draftKey,
      match_key: matchKey,
      round_label: `Match ${index + 1}`,
      table_number: "",
      player_a_key: p1,
      player_b_key: p2,
      sidebet_cents: 0,
      sidebet_winner_key: "",
      notes: ""
    });
    matchResults.push({ match_key: matchKey, ...result });
  }

  for (const row of draftRecordRows) {
    if (row.sb === "1") continue;
    const participantKey = participantByToken.get(row.player) ?? `${draftKey}-${row.player.toLowerCase()}`;
    const existing = moneyResults.find((result) => result.draft_key === draftKey && result.participant_key === participantKey);
    if (existing) {
      existing.net_cents += cents(row.won);
      existing.notes = existing.notes ? `${existing.notes}; aggregated duplicate source row` : "Aggregated duplicate source row";
    } else {
      moneyResults.push({
        draft_key: draftKey,
        participant_key: participantKey,
        net_cents: cents(row.won),
        notes: ""
      });
    }
  }

  const positiveSidebets = sidebetRecords.filter((row) => Number(row.won) > 0);
  const negativeSidebets = sidebetRecords.filter((row) => Number(row.won) < 0);
  const usedNegativeSidebets = new Set();
  for (const [sidebetIndex, win] of positiveSidebets.entries()) {
    const amount = Number(win.won);
    const losers = negativeSidebets.filter((row, index) => !usedNegativeSidebets.has(index) && Math.abs(Number(row.won)) === amount);
    const loserCandidates = losers.map((loser) => ({
      loser,
      originalIndex: negativeSidebets.indexOf(loser),
      candidateMatchIndex: draftMatchRows.findIndex((row) => new Set([row.p1, row.p2]).has(win.player) && new Set([row.p1, row.p2]).has(loser.player))
    }));
    const matchedCandidates = loserCandidates.filter((candidate) => candidate.candidateMatchIndex >= 0);
    const selected = matchedCandidates[0] ?? loserCandidates[0] ?? null;
    if (selected) usedNegativeSidebets.add(selected.originalIndex);
    const matchedRow = selected?.candidateMatchIndex != null && selected.candidateMatchIndex >= 0 ? draftMatchRows[selected.candidateMatchIndex] : null;
    const sidebetKey = `${draftKey}-sidebet-${sidebetIndex + 1}`;
    const status = selected
      ? matchedRow
        ? "matched to source match"
        : losers.length > 1
          ? "paired by amount and source order"
          : "paired by amount"
      : "unpaired";

    sidebets.push({
      draft_key: draftKey,
      sidebet_key: sidebetKey,
      winner_key: participantByToken.get(win.player) ?? "",
      loser_key: selected ? participantByToken.get(selected.loser.player) ?? "" : "",
      amount_cents: cents(amount),
      source_match_key: matchedRow ? `${draftKey}-match-${selected.candidateMatchIndex + 1}` : "",
      status
    });

    sidebetReview.push({
      legacy_draft_id: draftId,
      draft_key: draftKey,
      sidebet_key: sidebetKey,
      winner: normalizeName(win.player),
      loser: selected ? normalizeName(selected.loser.player) : "",
      amount_cents: cents(amount),
      inferred_match_players: matchedRow ? `${normalizeName(matchedRow.p1)} vs ${normalizeName(matchedRow.p2)}` : "",
      status
    });
  }
}

writeCsv("draft_events.csv", events, ["legacy_draft_id", "draft_key", "title", "event_date", "format", "draft_type", "winning_team", "default_stake_cents", "notes"]);
writeCsv(
  "imported_users.csv",
  importedInactiveUsers.map(([displayName, email]) => ({
    display_name: displayName,
    email,
    google_id: "",
    role: "player",
    login_enabled: "false",
    show_on_leaderboard: "false"
  })),
  ["display_name", "email", "google_id", "role", "login_enabled", "show_on_leaderboard"]
);
writeCsv("draft_participants.csv", participants, ["draft_key", "participant_key", "player_token", "display_name", "seat_order", "team"]);
writeCsv("matches.csv", matches, ["draft_key", "match_key", "round_label", "table_number", "player_a_key", "player_b_key", "sidebet_cents", "sidebet_winner_key", "notes"]);
writeCsv("match_results.csv", matchResults, ["match_key", "player_a_wins", "player_b_wins", "draws"]);
writeCsv("money_results.csv", moneyResults, ["draft_key", "participant_key", "net_cents", "notes"]);
writeCsv("sidebets.csv", sidebets, ["draft_key", "sidebet_key", "winner_key", "loser_key", "amount_cents", "source_match_key", "status"]);
writeCsv("sidebet_review.csv", sidebetReview, ["legacy_draft_id", "draft_key", "sidebet_key", "winner", "loser", "amount_cents", "inferred_match_players", "status"]);

const missingMatchDrafts = [...recordsByDraft.keys()].filter((draftId) => !matchesByDraft.has(draftId)).sort((a, b) => a - b);
const missingMoneyDrafts = [...matchesByDraft.keys()].filter((draftId) => !recordsByDraft.has(draftId)).sort((a, b) => a - b);
const report = `# Draft Records Import Review

Generated from:
- ${matchesPath}
- ${recordsPath}

Ignored draft IDs: ${[...ignoredDraftIds].sort((a, b) => a - b).join(", ")}

## Output Files

- draft_events.csv: one draft row; event_date is set to ${defaultEventDate} for every imported draft.
- imported_users.csv: inactive user accounts for legacy-only players, excluding Chris Harabas because he already exists.
- draft_participants.csv: one row per player per draft, with inferred team A/B for team drafts.
- matches.csv: one row per match, keyed to draft_participants by participant_key.
- match_results.csv: one row per match result. Odd draft IDs were converted to 2-0; even draft IDs were converted to 2-1.
- money_results.csv: one net money result per non-sidebet record row.
- sidebets.csv: one row per sidebet winner/loser pair, so a player can have multiple sidebets in the same draft.
- sidebet_review.csv: human-readable sidebet pairs inferred from equal and opposite sb rows, including optional source-match attachment.

If you manually edit sidebet_review.csv, run:

\`\`\`bash
node scripts/sync-reviewed-sidebets.mjs
\`\`\`

That updates sidebets.csv without regenerating or overwriting the reviewed file.

## Counts

- Draft events: ${events.length}
- Participants: ${participants.length}
- Matches: ${matches.length}
- Money results: ${moneyResults.length}
- Sidebets: ${sidebets.length}

## Remaining Review

- Sidebets are separated from match rows in the source. ${sidebetReview.filter((row) => row.status === "matched to source match").length} attach cleanly to a source match; ${sidebetReview.filter((row) => row.status !== "matched to source match").length} are preserved as standalone sidebet rows.
${warnings.length ? "- Unknown player tokens must either be added to users or mapped to existing users." : "- Player aliases are fully mapped."}

## Draft Coverage

- Records with no match rows: ${missingMatchDrafts.join(", ") || "none"}
- Match rows with no money records: ${missingMoneyDrafts.join(", ") || "none"}

## Warnings

${warnings.length ? [...new Set(warnings)].map((warning) => `- ${warning}`).join("\n") : "- none"}
`;

fs.writeFileSync(path.join(outDir, "README.md"), report);
console.log(`Wrote normalized import files to ${outDir}`);
