import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const importDir = path.join(root, "import");

function readCsv(file) {
  const text = fs.readFileSync(path.join(importDir, file), "utf8").trim();
  const [headerLine, ...lines] = text.split(/\r?\n/);
  const headers = parseCsvLine(headerLine);
  return lines.filter(Boolean).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
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

function csvEscape(value) {
  const text = value == null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function writeCsv(file, rows, headers) {
  const body = [headers.join(","), ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(","))].join("\n");
  fs.writeFileSync(path.join(importDir, file), `${body}\n`);
}

const participants = readCsv("draft_participants.csv");
const matches = readCsv("matches.csv");
const reviewed = readCsv("sidebet_review.csv");

const participantByDraftAndName = new Map();
const participantNameByKey = new Map();
for (const participant of participants) {
  participantByDraftAndName.set(`${participant.draft_key}\t${participant.display_name}`, participant.participant_key);
  participantNameByKey.set(participant.participant_key, participant.display_name);
}

function participantKey(draftKey, displayName) {
  return participantByDraftAndName.get(`${draftKey}\t${displayName}`) ?? "";
}

function sourceMatchKey(row) {
  if (!row.inferred_match_players) return "";
  const [left, right] = row.inferred_match_players.split(/\s+vs\s+/);
  if (!left || !right) return "";
  const wanted = new Set([left, right]);
  const match = matches.find((candidate) => {
    if (candidate.draft_key !== row.draft_key) return false;
    const names = new Set([participantNameByKey.get(candidate.player_a_key), participantNameByKey.get(candidate.player_b_key)]);
    return [...wanted].every((name) => names.has(name));
  });
  return match?.match_key ?? "";
}

const sidebets = reviewed.map((row) => {
  const winnerKey = participantKey(row.draft_key, row.winner);
  const loserKey = participantKey(row.draft_key, row.loser);
  if (!winnerKey || !loserKey) {
    throw new Error(`Could not map sidebet ${row.sidebet_key}: ${row.winner} vs ${row.loser}`);
  }
  return {
    draft_key: row.draft_key,
    sidebet_key: row.sidebet_key,
    winner_key: winnerKey,
    loser_key: loserKey,
    amount_cents: row.amount_cents,
    source_match_key: sourceMatchKey(row),
    status: row.status
  };
});

writeCsv("sidebets.csv", sidebets, ["draft_key", "sidebet_key", "winner_key", "loser_key", "amount_cents", "source_match_key", "status"]);
console.log(`Synced ${sidebets.length} reviewed sidebets to ${path.join(importDir, "sidebets.csv")}`);
