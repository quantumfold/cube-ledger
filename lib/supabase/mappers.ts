import { DeckImage, DraftEvent, DraftParticipant, Match, MoneyResult, normalizeDraftFormat, Player } from "@/lib/types";

type DbUser = {
  id: string;
  google_id: string | null;
  display_name: string;
  email: string;
  profile_image_url: string | null;
  role: Player["role"];
};

type DbDraft = {
  id: string;
  title: string;
  event_date: string;
  format: string;
  draft_type: string;
  winning_team: "A" | "B" | null;
  default_stake_cents: number;
  notes: string | null;
  created_by: string;
  version: number;
  draft_participants?: DbParticipant[];
  matches?: DbMatch[];
  money_results?: DbMoneyResult[];
  audit_log?: DbAuditLog[];
};

type DbParticipant = {
  id: string;
  draft_event_id: string;
  user_id: string;
  display_name_snapshot: string;
  seat_order: number | null;
  deck_archetype: string | null;
  colors: string[] | null;
  strategy: string | null;
  deck_notes: string | null;
  decklist: string | null;
  team: "A" | "B" | null;
};

export type DbDeckImage = {
  id: string;
  draft_event_id: string;
  draft_participant_id: string;
  uploaded_by: string | null;
  storage_path: string;
  file_name: string;
  mime_type: string;
  file_size_bytes: number;
  caption: string | null;
  created_at: string;
  signed_url?: string | null;
};

type DbMatch = {
  id: string;
  draft_event_id: string;
  round_label: string | null;
  table_number: number | null;
  player_a_id: string;
  player_b_id: string;
  sidebet_cents: number;
  sidebet_winner_participant_id: string | null;
  notes: string | null;
  match_results?: DbMatchResult | DbMatchResult[] | null;
};

type DbMatchResult = {
  player_a_wins: number;
  player_b_wins: number;
  draws: number;
};

type DbMoneyResult = {
  id: string;
  draft_event_id: string;
  draft_participant_id: string;
  net_cents: number;
  notes: string | null;
};

type DbAuditLog = {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  changed_by: string;
  changed_at: string;
  after: unknown;
};

export function mapPlayer(row: DbUser): Player {
  return {
    id: row.id,
    googleId: row.google_id ?? undefined,
    displayName: row.display_name,
    email: row.email,
    profileImageUrl: row.profile_image_url ?? undefined,
    role: row.role
  };
}

export function mapDraft(row: DbDraft): DraftEvent {
  return {
    id: row.id,
    title: row.title,
    eventDate: row.event_date,
    format: normalizeDraftFormat(row.format) ?? "Teams After Draft",
    draftType: row.draft_type,
    winningTeam: row.winning_team ?? undefined,
    defaultStakeCents: row.default_stake_cents,
    notes: row.notes ?? "",
    createdBy: row.created_by,
    version: row.version,
    participants: (row.draft_participants ?? []).map(mapParticipant),
    matches: (row.matches ?? []).map(mapMatch),
    moneyResults: (row.money_results ?? []).map(mapMoneyResult),
    auditLog: (row.audit_log ?? []).map((entry) => ({
      id: entry.id,
      entityType: entry.entity_type,
      entityId: entry.entity_id,
      action: entry.action,
      changedBy: entry.changed_by,
      changedAt: entry.changed_at,
      summary: typeof entry.after === "object" && entry.after ? JSON.stringify(entry.after) : entry.action
    }))
  };
}

function mapParticipant(row: DbParticipant): DraftParticipant {
  return {
    id: row.id,
    draftEventId: row.draft_event_id,
    playerId: row.user_id,
    displayNameSnapshot: row.display_name_snapshot,
    seatOrder: row.seat_order ?? 0,
    deckArchetype: row.deck_archetype ?? "",
    colors: row.colors ?? [],
    strategy: row.strategy ?? "",
    deckNotes: row.deck_notes ?? "",
    decklist: row.decklist ?? undefined,
    deckImages: [],
    team: row.team ?? undefined
  };
}

export function mapDeckImage(row: DbDeckImage): DeckImage {
  return {
    id: row.id,
    draftEventId: row.draft_event_id,
    participantId: row.draft_participant_id,
    uploadedBy: row.uploaded_by ?? undefined,
    storagePath: row.storage_path,
    fileName: row.file_name,
    mimeType: row.mime_type,
    fileSizeBytes: row.file_size_bytes,
    caption: row.caption ?? undefined,
    createdAt: row.created_at,
    signedUrl: row.signed_url ?? undefined
  };
}

function mapMatch(row: DbMatch): Match {
  const result = Array.isArray(row.match_results) ? row.match_results[0] : row.match_results;
  return {
    id: row.id,
    draftEventId: row.draft_event_id,
    roundLabel: row.round_label ?? "",
    tableNumber: row.table_number ?? undefined,
    playerAId: row.player_a_id,
    playerBId: row.player_b_id,
    playerAWins: result?.player_a_wins ?? 0,
    playerBWins: result?.player_b_wins ?? 0,
    draws: result?.draws ?? 0,
    notes: row.notes ?? undefined,
    sidebetCents: row.sidebet_cents,
    sidebetWinnerParticipantId: row.sidebet_winner_participant_id ?? undefined
  };
}

function mapMoneyResult(row: DbMoneyResult): MoneyResult {
  return {
    id: row.id,
    draftEventId: row.draft_event_id,
    participantId: row.draft_participant_id,
    netCents: row.net_cents,
    notes: row.notes ?? undefined
  };
}
