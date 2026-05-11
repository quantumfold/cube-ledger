import type { DraftEvent } from "./types.ts";
import { isTeamDraftFormat, normalizeDraftFormat } from "./types.ts";

export type DashboardDraftFilters = {
  start?: string;
  end?: string;
  format?: string;
  draftType?: string;
  playerId?: string;
  includeLegacy?: string;
};

export const legacyDraftCutoffDate = "2026-01-01";

export function filterDashboardDrafts(drafts: DraftEvent[], filters: DashboardDraftFilters) {
  const format = normalizeDraftFormat(filters.format);
  return drafts.filter((draft) => {
    if (filters.includeLegacy !== "1" && draft.eventDate < legacyDraftCutoffDate) return false;
    if (filters.start && draft.eventDate < filters.start) return false;
    if (filters.end && draft.eventDate > filters.end) return false;
    if (filters.format && !format) return false;
    if (format && isTeamDraftFormat(format) && !isTeamDraftFormat(draft.format)) return false;
    if (format && !isTeamDraftFormat(format) && draft.format !== format) return false;
    if (filters.draftType && draft.draftType !== filters.draftType) return false;
    if (filters.playerId && !draft.participants.some((participant) => participant.playerId === filters.playerId)) return false;
    return true;
  });
}
