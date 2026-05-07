import { drafts as seedDrafts, players as seedPlayers } from "@/lib/seed";
import { DraftEvent, Player } from "@/lib/types";
import { mapDraft, mapPlayer } from "@/lib/supabase/mappers";
import { getSupabaseAdminClient, getSupabaseServerClient } from "@/lib/supabase/server";

const draftSelect = `
  *,
  draft_participants (*),
  matches (*, match_results (*)),
  money_results (*)
`;

export async function getPlayers(): Promise<Player[]> {
  const supabase = getSupabaseAdminClient() ?? getSupabaseServerClient();
  if (!supabase) return seedPlayers;

  const { data, error } = await supabase.from("users").select("*").order("display_name");
  if (error) return seedPlayers;
  if (data) return data.map(mapPlayer);
  return [];
}

export async function getDrafts(): Promise<DraftEvent[]> {
  const supabase = getSupabaseAdminClient() ?? getSupabaseServerClient();
  if (!supabase) return seedDrafts;

  const { data, error } = await supabase.from("draft_events").select(draftSelect).order("event_date", { ascending: false });
  if (error) return seedDrafts;
  if (data) {
    const drafts = data.map(mapDraft);
    const auditLogs = await getAuditLogsForDrafts(drafts.map((draft) => draft.id));
    return drafts.map((draft) => ({ ...draft, auditLog: auditLogs.get(draft.id) ?? [] }));
  }
  return [];
}

export async function getDraft(id: string): Promise<DraftEvent | undefined> {
  const supabase = getSupabaseAdminClient() ?? getSupabaseServerClient();
  if (!supabase) return seedDrafts.find((draft) => draft.id === id);

  const { data, error } = await supabase.from("draft_events").select(draftSelect).eq("id", id).single();
  if (error || !data) return seedDrafts.find((draft) => draft.id === id);
  const draft = mapDraft(data);
  const auditLogs = await getAuditLogsForDrafts([draft.id]);
  return { ...draft, auditLog: auditLogs.get(draft.id) ?? [] };
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
