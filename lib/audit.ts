type AuditPayload = Record<string, unknown> | null;

export function summarizeAuditEntry(action: string, before: unknown, after: unknown) {
  const beforePayload = toPayload(before);
  const afterPayload = toPayload(after);

  if (action === "created" && afterPayload) {
    const details = [
      text(afterPayload.title) ? `"${text(afterPayload.title)}"` : "draft",
      text(afterPayload.format),
      text(afterPayload.draft_type) || text(afterPayload.draftType),
      numberValue(afterPayload.participant_count) ? `${numberValue(afterPayload.participant_count)} players` : ""
    ].filter(Boolean);
    return `Created ${details.join(", ")}.`;
  }

  if (action === "updated" && afterPayload) {
    const changes = [
      changedText("title", beforePayload, afterPayload),
      changedText("date", beforePayload, afterPayload, "eventDate"),
      changedText("format", beforePayload, afterPayload),
      changedText("draft type", beforePayload, afterPayload, "draftType"),
      changedText("winning team", beforePayload, afterPayload, "winningTeam"),
      changedMoney("stake", beforePayload, afterPayload, "defaultStakeCents", false),
      changedLongText("notes", beforePayload, afterPayload),
      ...participantChanges(beforePayload, afterPayload),
      ...matchChanges(beforePayload, afterPayload)
    ].filter(Boolean);
    return changes.length ? `Updated ${limitChanges(changes).join("; ")}.` : "Updated draft.";
  }

  if (action === "deleted") return "Deleted draft.";

  if (action === "deck_photo_added" && afterPayload) {
    return `Added deck photo${text(afterPayload.participant) ? ` for ${text(afterPayload.participant)}` : ""}${text(afterPayload.file_name) ? ` (${text(afterPayload.file_name)})` : ""}.`;
  }

  if (action === "deck_photo_deleted" && beforePayload) {
    return `Deleted deck photo${text(beforePayload.file_name) ? ` (${text(beforePayload.file_name)})` : ""}.`;
  }

  return humanizeAction(action);
}

function toPayload(value: unknown): AuditPayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function changedText(label: string, before: AuditPayload, after: AuditPayload, key = label) {
  const beforeValue = text(before?.[key]);
  const afterValue = text(after?.[key]);
  if (beforeValue === afterValue) return "";
  return `${label} ${beforeValue || "blank"} -> ${afterValue || "blank"}`;
}

function changedMoney(label: string, before: AuditPayload, after: AuditPayload, key: string, signed = true) {
  const beforeValue = numberValue(before?.[key]);
  const afterValue = numberValue(after?.[key]);
  if (beforeValue === afterValue) return "";
  return `${label} ${formatMoney(beforeValue, signed)} -> ${formatMoney(afterValue, signed)}`;
}

function changedLongText(label: string, before: AuditPayload, after: AuditPayload, key = label) {
  const beforeValue = text(before?.[key]);
  const afterValue = text(after?.[key]);
  if (beforeValue === afterValue) return "";
  if (!beforeValue && afterValue) return `${label} added`;
  if (beforeValue && !afterValue) return `${label} cleared`;
  return `${label} changed`;
}

function participantChanges(before: AuditPayload, after: AuditPayload) {
  const beforeParticipants = recordsById(before?.participants);
  const afterParticipants = recordsById(after?.participants);
  const changes: string[] = [];

  for (const [id, afterParticipant] of afterParticipants) {
    const beforeParticipant = beforeParticipants.get(id);
    if (!beforeParticipant) continue;
    const name = participantName(beforeParticipant, afterParticipant);
    const participantFields = [
      changedText(`${name} team`, beforeParticipant, afterParticipant, "team"),
      changedText(`${name} archetype`, beforeParticipant, afterParticipant, "deckArchetype"),
      changedColors(name, beforeParticipant, afterParticipant),
      changedLongText(`${name} strategy`, beforeParticipant, afterParticipant, "strategy"),
      changedLongText(`${name} deck notes`, beforeParticipant, afterParticipant, "deckNotes"),
      changedLongText(`${name} decklist`, beforeParticipant, afterParticipant, "decklist"),
      changedMoney(`${name} money`, beforeParticipant, afterParticipant, "moneyCents")
    ].filter(Boolean);
    changes.push(...participantFields);
  }

  return changes;
}

function matchChanges(before: AuditPayload, after: AuditPayload) {
  const beforeParticipants = recordsById(before?.participants);
  const beforeMatches = recordsById(before?.matches);
  const afterMatches = recordsById(after?.matches);
  const changes: string[] = [];

  for (const [id, afterMatch] of afterMatches) {
    const beforeMatch = beforeMatches.get(id);
    if (!beforeMatch) continue;
    const label = matchLabel(beforeMatch, beforeParticipants);
    const matchFields = [
      changedScore(label, beforeMatch, afterMatch),
      changedMoney(`${label} sidebet`, beforeMatch, afterMatch, "sidebetCents"),
      changedLongText(`${label} notes`, beforeMatch, afterMatch, "notes")
    ].filter(Boolean);
    changes.push(...matchFields);
  }

  const removedIds = arrayValue(after?.removedMatchIds).filter((id): id is string => typeof id === "string");
  for (const id of removedIds) {
    const removedMatch = beforeMatches.get(id);
    changes.push(`removed ${removedMatch ? matchLabel(removedMatch, beforeParticipants) : "match"}`);
  }

  for (const newMatch of arrayValue(after?.newMatches)) {
    if (!toPayload(newMatch)) continue;
    changes.push(`added ${matchLabel(newMatch, beforeParticipants)} ${score(newMatch)}`);
  }

  return changes;
}

function changedColors(name: string, before: AuditPayload, after: AuditPayload) {
  const beforeColors = arrayValue(before?.colors).filter((color): color is string => typeof color === "string").join("");
  const afterColors = arrayValue(after?.colors).filter((color): color is string => typeof color === "string").join("");
  if (beforeColors === afterColors) return "";
  return `${name} colors ${beforeColors || "blank"} -> ${afterColors || "blank"}`;
}

function changedScore(label: string, before: AuditPayload, after: AuditPayload) {
  const beforeScore = score(before);
  const afterScore = score(after);
  return beforeScore === afterScore ? "" : `${label} score ${beforeScore} -> ${afterScore}`;
}

function score(match: unknown) {
  const payload = toPayload(match);
  return `${numberValue(payload?.playerAWins)}-${numberValue(payload?.playerBWins)}-${numberValue(payload?.draws)}`;
}

function matchLabel(match: unknown, participants: Map<string, Record<string, unknown>>) {
  const payload = toPayload(match);
  const playerA = text(payload?.playerAId);
  const playerB = text(payload?.playerBId);
  const playerAName = participantName(participants.get(playerA) ?? null);
  const playerBName = participantName(participants.get(playerB) ?? null);
  return `${playerAName || "Player A"} vs ${playerBName || "Player B"}`;
}

function participantName(...participants: AuditPayload[]) {
  for (const participant of participants) {
    const name = text(participant?.displayNameSnapshot) || text(participant?.displayName) || text(participant?.name);
    if (name) return name;
  }
  return "Player";
}

function recordsById(value: unknown) {
  const records = new Map<string, Record<string, unknown>>();
  for (const item of arrayValue(value)) {
    const payload = toPayload(item);
    const id = text(payload?.id);
    if (payload && id) records.set(id, payload);
  }
  return records;
}

function arrayValue(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function limitChanges(changes: string[]) {
  const maxChanges = 10;
  if (changes.length <= maxChanges) return changes;
  return [...changes.slice(0, maxChanges), `${changes.length - maxChanges} more changes`];
}

function formatMoney(cents: number, signed = true) {
  const sign = signed && cents > 0 ? "+" : cents < 0 ? "-" : "";
  return `${sign}$${Math.abs(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function humanizeAction(action: string) {
  return action.replaceAll("_", " ").replace(/^\w/, (letter) => letter.toUpperCase());
}
