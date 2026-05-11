import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const root = process.cwd();
const importDir = path.join(root, "import");
const dryRun = !process.argv.includes("--write");
const cleanupPartial = process.argv.includes("--cleanup-partial");

function loadEnv() {
  const envPath = path.join(root, ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index < 0) continue;
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (quoted && char === '"' && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (!quoted && char === ",") {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
}

function readCsv(file) {
  const text = fs.readFileSync(path.join(importDir, file), "utf8").trim();
  const [headerLine, ...lines] = text.split(/\r?\n/);
  const headers = parseCsvLine(headerLine);
  return lines.filter(Boolean).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
}

function chunk(rows, size) {
  const chunks = [];
  for (let index = 0; index < rows.length; index += size) chunks.push(rows.slice(index, index + size));
  return chunks;
}

function parseInteger(value) {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed)) throw new Error(`Invalid integer value: ${value}`);
  return parsed;
}

async function requireNoError(result, label) {
  const resolved = await result;
  if (resolved.error) throw new Error(`${label}: ${resolved.error.message}`);
  return resolved.data;
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
});

const importedUsers = readCsv("imported_users.csv");
const draftEvents = readCsv("draft_events.csv");
const draftParticipants = readCsv("draft_participants.csv");
const matches = readCsv("matches.csv");
const matchResults = readCsv("match_results.csv");
const moneyResults = readCsv("money_results.csv");
const sidebets = readCsv("sidebets.csv");

const legacyTitles = draftEvents.map((draft) => draft.title);
const existingDrafts = await requireNoError(
  supabase.from("draft_events").select("id, title").in("title", legacyTitles),
  "Check existing legacy drafts"
);

if (cleanupPartial) {
  if (!existingDrafts?.length) {
    console.log("No existing legacy drafts found to clean up.");
    process.exit(0);
  }
  await requireNoError(
    supabase.from("draft_events").delete().in("id", existingDrafts.map((draft) => draft.id)),
    "Clean up existing legacy drafts"
  );
  console.log(`Deleted ${existingDrafts.length} existing legacy draft rows. Related participant/match rows should cascade.`);
  process.exit(0);
}

if (existingDrafts?.length) {
  throw new Error(`Refusing to import because these drafts already exist: ${existingDrafts.map((draft) => draft.title).join(", ")}`);
}

const existingUsers = await requireNoError(
  supabase.from("users").select("id, display_name, email"),
  "Fetch users"
);

const usersByDisplayName = new Map(existingUsers.map((user) => [user.display_name, user]));
const usersByEmail = new Map(existingUsers.map((user) => [user.email, user]));
const missingImportedUsers = importedUsers.filter((user) => !usersByEmail.has(user.email));
const participantNames = [...new Set(draftParticipants.map((participant) => participant.display_name))];
const missingParticipantNames = participantNames.filter((name) => !usersByDisplayName.has(name) && !missingImportedUsers.some((user) => user.display_name === name));

if (missingParticipantNames.length) {
  throw new Error(`Missing user accounts for: ${missingParticipantNames.join(", ")}`);
}

console.log(`${dryRun ? "Dry run" : "Import"} summary:`);
console.log(`- imported users to create: ${missingImportedUsers.length}`);
console.log(`- draft events: ${draftEvents.length}`);
console.log(`- participants: ${draftParticipants.length}`);
console.log(`- matches: ${matches.length}`);
console.log(`- match results: ${matchResults.length}`);
console.log(`- money results: ${moneyResults.length}`);
console.log(`- sidebets: ${sidebets.length}`);

if (dryRun) {
  console.log("Dry run only. Re-run with --write to insert rows.");
  process.exit(0);
}

if (missingImportedUsers.length) {
  await requireNoError(
    supabase.from("users").upsert(
      missingImportedUsers.map((user) => ({
        display_name: user.display_name,
        email: user.email,
        google_id: user.google_id || null,
        profile_image_url: null,
        role: user.role,
        login_enabled: user.login_enabled === "true",
        show_on_leaderboard: user.show_on_leaderboard === "true"
      })),
      { onConflict: "email" }
    ),
    "Upsert imported users"
  );
}

const refreshedUsers = await requireNoError(
  supabase.from("users").select("id, display_name, email"),
  "Refresh users"
);
const refreshedByDisplayName = new Map(refreshedUsers.map((user) => [user.display_name, user]));
const lucas = refreshedByDisplayName.get("Lucas Siow") ?? refreshedUsers[0];
if (!lucas) throw new Error("Could not find a created_by user");

const draftRows = draftEvents.map((draft) => ({
  title: draft.title,
  event_date: draft.event_date,
  format: draft.format,
  draft_type: draft.draft_type,
  winning_team: draft.winning_team || null,
  default_stake_cents: parseInteger(draft.default_stake_cents),
  notes: draft.notes,
  created_by: lucas.id,
  updated_by: lucas.id
}));

const insertedDrafts = await requireNoError(
  supabase.from("draft_events").insert(draftRows).select("id, title"),
  "Insert draft events"
);
const draftIdByKey = new Map();
for (const draft of draftEvents) {
  const inserted = insertedDrafts.find((row) => row.title === draft.title);
  if (!inserted) throw new Error(`Could not map inserted draft ${draft.title}`);
  draftIdByKey.set(draft.draft_key, inserted.id);
}

const participantRows = draftParticipants.map((participant) => {
  const user = refreshedByDisplayName.get(participant.display_name);
  if (!user) throw new Error(`Could not map participant ${participant.display_name}`);
  return {
    draft_event_id: draftIdByKey.get(participant.draft_key),
    user_id: user.id,
    display_name_snapshot: participant.display_name,
    seat_order: parseInteger(participant.seat_order),
    deck_archetype: "",
    colors: [],
    strategy: "",
    deck_notes: "",
    decklist: null,
    team: participant.team || null,
    created_by: lucas.id,
    updated_by: lucas.id,
    participant_key: participant.participant_key
  };
});

const participantIdByKey = new Map();
for (const rows of chunk(participantRows, 200)) {
  const inserted = await requireNoError(
    supabase
      .from("draft_participants")
      .insert(rows.map(({ participant_key, ...row }) => row))
      .select("id, draft_event_id, user_id, display_name_snapshot"),
    "Insert draft participants"
  );
  for (const insertedRow of inserted) {
    const source = rows.find((row) => row.draft_event_id === insertedRow.draft_event_id && row.display_name_snapshot === insertedRow.display_name_snapshot);
    if (!source) throw new Error(`Could not map inserted participant ${insertedRow.display_name_snapshot}`);
    participantIdByKey.set(source.participant_key, insertedRow.id);
  }
}

const matchRows = matches.map((match) => ({
  draft_event_id: draftIdByKey.get(match.draft_key),
  round_label: match.round_label,
  table_number: match.table_number ? parseInteger(match.table_number) : null,
  player_a_id: participantIdByKey.get(match.player_a_key),
  player_b_id: participantIdByKey.get(match.player_b_key),
  sidebet_cents: parseInteger(match.sidebet_cents || "0"),
  sidebet_winner_participant_id: match.sidebet_winner_key ? participantIdByKey.get(match.sidebet_winner_key) : null,
  notes: match.notes || null,
  created_by: lucas.id,
  updated_by: lucas.id,
  match_key: match.match_key
}));

const matchIdByKey = new Map();
for (const rows of chunk(matchRows, 200)) {
  const inserted = await requireNoError(
    supabase
      .from("matches")
      .insert(rows.map(({ match_key, ...row }) => row))
      .select("id, draft_event_id, player_a_id, player_b_id, round_label"),
    "Insert matches"
  );
  for (const insertedRow of inserted) {
    const source = rows.find((row) =>
      row.draft_event_id === insertedRow.draft_event_id &&
      row.player_a_id === insertedRow.player_a_id &&
      row.player_b_id === insertedRow.player_b_id &&
      row.round_label === insertedRow.round_label
    );
    if (!source) throw new Error(`Could not map inserted match ${insertedRow.id}`);
    matchIdByKey.set(source.match_key, insertedRow.id);
  }
}

for (const rows of chunk(matchResults, 200)) {
  await requireNoError(
    supabase.from("match_results").insert(rows.map((result) => ({
      match_id: matchIdByKey.get(result.match_key),
      player_a_wins: parseInteger(result.player_a_wins),
      player_b_wins: parseInteger(result.player_b_wins),
      draws: parseInteger(result.draws),
      created_by: lucas.id,
      updated_by: lucas.id,
      corrected_by: lucas.id,
      corrected_at: new Date().toISOString()
    }))),
    "Insert match results"
  );
}

for (const rows of chunk(moneyResults, 200)) {
  await requireNoError(
    supabase.from("money_results").insert(rows.map((result) => ({
      draft_event_id: draftIdByKey.get(result.draft_key),
      draft_participant_id: participantIdByKey.get(result.participant_key),
      net_cents: parseInteger(result.net_cents),
      notes: result.notes || null,
      created_by: lucas.id,
      updated_by: lucas.id
    }))),
    "Insert money results"
  );
}

for (const rows of chunk(sidebets, 200)) {
  await requireNoError(
    supabase.from("sidebets").insert(rows.map((sidebet) => ({
      draft_event_id: draftIdByKey.get(sidebet.draft_key),
      winner_participant_id: participantIdByKey.get(sidebet.winner_key),
      loser_participant_id: participantIdByKey.get(sidebet.loser_key),
      amount_cents: parseInteger(sidebet.amount_cents),
      match_id: sidebet.source_match_key ? matchIdByKey.get(sidebet.source_match_key) : null,
      notes: sidebet.status || null,
      created_by: lucas.id,
      updated_by: lucas.id
    }))),
    "Insert sidebets"
  );
}

await requireNoError(
  supabase.from("audit_log").insert(insertedDrafts.map((draft) => ({
    entity_type: "DraftEvent",
    entity_id: draft.id,
    action: "legacy_imported",
    changed_by: lucas.id,
    after: { title: draft.title, import: "Draft Records CSV" }
  }))),
  "Insert audit logs"
);

console.log("Import complete.");
