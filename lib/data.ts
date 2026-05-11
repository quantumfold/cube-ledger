import { drafts as seedDrafts, players as seedPlayers } from "@/lib/seed";
import { DeckImage, DraftEvent, Player } from "@/lib/types";
import { DbDeckImage, mapDeckImage, mapDraft, mapPlayer } from "@/lib/supabase/mappers";
import { getSupabaseAdminClient, getSupabaseServerClient } from "@/lib/supabase/server";

const draftSelect = `
  *,
  draft_participants (*),
  matches (*, match_results (*)),
  money_results (*),
  sidebets (*)
`;

export async function getPlayers(): Promise<Player[]> {
  const supabase = getSupabaseAdminClient() ?? getSupabaseServerClient();
  if (!supabase) return seedPlayers;

  const { data, error } = await supabase.from("users").select("*").order("display_name");
  if (error) return fallbackPlayers();
  if (data) return data.map(mapPlayer);
  return [];
}

export async function getDrafts(): Promise<DraftEvent[]> {
  const supabase = getSupabaseAdminClient() ?? getSupabaseServerClient();
  if (!supabase) return seedDrafts;

  let { data, error } = await supabase.from("draft_events").select(draftSelect).is("deleted_at", null).order("event_date", { ascending: false });
  if (error && isMissingSoftDeleteColumn(error.message)) {
    const retry = await supabase.from("draft_events").select(draftSelect).order("event_date", { ascending: false });
    data = retry.data;
    error = retry.error;
  }
  if (error) return fallbackDrafts();
  if (data) {
    const drafts = data.map(mapDraft);
    const draftIds = drafts.map((draft) => draft.id);
    const [auditLogs, deckImages] = await Promise.all([getAuditLogsForDrafts(draftIds), getDeckImagesForDrafts(draftIds)]);
    return drafts.map((draft) => attachDeckImages({ ...draft, auditLog: auditLogs.get(draft.id) ?? [] }, deckImages));
  }
  return [];
}

export async function getDraft(id: string): Promise<DraftEvent | undefined> {
  const supabase = getSupabaseAdminClient() ?? getSupabaseServerClient();
  if (!supabase) return seedDrafts.find((draft) => draft.id === id);

  let { data, error } = await supabase.from("draft_events").select(draftSelect).eq("id", id).is("deleted_at", null).single();
  if (error && isMissingSoftDeleteColumn(error.message)) {
    const retry = await supabase.from("draft_events").select(draftSelect).eq("id", id).single();
    data = retry.data;
    error = retry.error;
  }
  if (error || !data) return fallbackDrafts().find((draft) => draft.id === id);
  const draft = mapDraft(data);
  const [auditLogs, deckImages] = await Promise.all([getAuditLogsForDrafts([draft.id]), getDeckImagesForDrafts([draft.id])]);
  return attachDeckImages({ ...draft, auditLog: auditLogs.get(draft.id) ?? [] }, deckImages);
}

function fallbackPlayers() {
  return process.env.NODE_ENV === "production" ? [] : seedPlayers;
}

function fallbackDrafts() {
  return process.env.NODE_ENV === "production" ? [] : seedDrafts;
}

function isMissingSoftDeleteColumn(message: string) {
  return message.includes("deleted_at") || message.includes("schema cache");
}

function attachDeckImages(draft: DraftEvent, imagesByParticipantId: Map<string, DeckImage[]>) {
  return {
    ...draft,
    participants: draft.participants.map((participant) => ({
      ...participant,
      deckImages: imagesByParticipantId.get(participant.id) ?? []
    }))
  };
}

async function getDeckImagesForDrafts(draftIds: string[]) {
  const supabase = getSupabaseAdminClient() ?? getSupabaseServerClient();
  const images = new Map<string, DeckImage[]>();
  if (!supabase || !draftIds.length) return images;

  const { data, error } = await supabase
    .from("deck_images")
    .select("*")
    .in("draft_event_id", draftIds)
    .order("created_at", { ascending: true });

  if (error || !data) return images;

  const admin = getSupabaseAdminClient();
  const rows = data as DbDeckImage[];
  const signedUrls = admin
    ? await Promise.all(rows.map((row) => admin.storage.from("deck-images").createSignedUrl(row.storage_path, 60 * 60)))
    : [];

  rows.forEach((row, index) => {
    const image = mapDeckImage({
      ...row,
      signed_url: signedUrls[index]?.data?.signedUrl ?? null
    });
    const current = images.get(image.participantId) ?? [];
    current.push(image);
    images.set(image.participantId, current);
  });

  return images;
}

async function getAuditLogsForDrafts(draftIds: string[]) {
  const supabase = getSupabaseAdminClient() ?? getSupabaseServerClient();
  const logs = new Map<string, DraftEvent["auditLog"]>();
  if (!supabase || !draftIds.length) return logs;

  const { data } = await supabase
    .from("audit_log")
    .select("*")
    .eq("entity_type", "DraftEvent")
    .in("entity_id", draftIds)
    .order("changed_at", { ascending: false });

  for (const entry of data ?? []) {
    const current = logs.get(entry.entity_id) ?? [];
    current.push({
      id: entry.id,
      entityType: entry.entity_type,
      entityId: entry.entity_id,
      action: entry.action,
      changedBy: entry.changed_by,
      changedAt: entry.changed_at,
      summary: typeof entry.after === "object" && entry.after ? JSON.stringify(entry.after) : entry.action
    });
    logs.set(entry.entity_id, current);
  }

  return logs;
}
