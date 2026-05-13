type AuditPayload = Record<string, unknown> | null;

export function summarizeAuditEntry(action: string, before: unknown, after: unknown) {
  const beforePayload = toPayload(before);
  const afterPayload = toPayload(after);

  if (action === "created" && afterPayload) {
    const title = text(afterPayload.title);
    const format = text(afterPayload.format);
    const count = numberValue(afterPayload.participant_count);
    return `Created${title ? ` "${title}"` : " draft"}${format ? ` as ${format}` : ""}${count ? ` with ${count} players` : ""}.`;
  }

  if (action === "updated" && afterPayload) {
    const changes = [
      changedText("title", beforePayload, afterPayload),
      changedText("date", beforePayload, afterPayload, "eventDate"),
      changedText("format", beforePayload, afterPayload),
      changedText("draft type", beforePayload, afterPayload, "draftType"),
      changedText("winning team", beforePayload, afterPayload, "winningTeam"),
      changedMoney("stake", beforePayload, afterPayload, "defaultStakeCents"),
      changedCount("participants", beforePayload, afterPayload),
      changedCount("matches", beforePayload, afterPayload),
      addedCount("new match", afterPayload, "newMatches"),
      removedCount("match", afterPayload, "removedMatchIds")
    ].filter(Boolean);
    return changes.length ? `Updated ${changes.join("; ")}.` : "Updated draft.";
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

function changedMoney(label: string, before: AuditPayload, after: AuditPayload, key: string) {
  const beforeValue = numberValue(before?.[key]);
  const afterValue = numberValue(after?.[key]);
  if (beforeValue === afterValue) return "";
  return `${label} ${formatMoney(beforeValue)} -> ${formatMoney(afterValue)}`;
}

function changedCount(label: string, before: AuditPayload, after: AuditPayload) {
  const beforeCount = Array.isArray(before?.[label]) ? before?.[label].length : 0;
  const afterCount = Array.isArray(after?.[label]) ? after?.[label].length : 0;
  if (beforeCount === afterCount) return "";
  return `${label} ${beforeCount} -> ${afterCount}`;
}

function addedCount(label: string, after: AuditPayload, key: string) {
  const count = Array.isArray(after?.[key]) ? after?.[key].length : 0;
  return count ? `added ${count} ${label}${count === 1 ? "" : "es"}` : "";
}

function removedCount(label: string, after: AuditPayload, key: string) {
  const count = Array.isArray(after?.[key]) ? after?.[key].length : 0;
  return count ? `removed ${count} ${label}${count === 1 ? "" : "es"}` : "";
}

function formatMoney(cents: number) {
  const sign = cents > 0 ? "+" : cents < 0 ? "-" : "";
  return `${sign}$${Math.abs(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function humanizeAction(action: string) {
  return action.replaceAll("_", " ").replace(/^\w/, (letter) => letter.toUpperCase());
}
