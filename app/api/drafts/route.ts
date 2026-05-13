import { NextResponse } from "next/server";
import { getCurrentAppUser } from "@/lib/auth";
import { getDrafts } from "@/lib/data";
import { standingsForDraft } from "@/lib/stats";
import { getSupabaseAdminClient, getSupabaseServerClient } from "@/lib/supabase/server";
import { DraftFormat, isTeamDraftFormat, normalizeDraftFormat } from "@/lib/types";

export async function GET() {
  const drafts = await getDrafts();
  return NextResponse.json({ drafts: drafts.map((draft) => ({ ...draft, standings: standingsForDraft(draft) })) });
}

export async function POST(request: Request) {
  const body = await request.json();
  const supabase = getSupabaseAdminClient() ?? getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });

  const validation = validateDraftPayload(body);
  if ("error" in validation) return NextResponse.json({ error: validation.error }, { status: 400 });
  const payload = validation.value;

  const { data: playerRows, error: playersError } = await supabase
    .from("users")
    .select("id, display_name, role")
    .in("id", payload.participantIds);

  if (playersError) return NextResponse.json({ error: playersError.message }, { status: 500 });
  if (!playerRows || playerRows.length !== payload.participantIds.length) {
    return NextResponse.json({ error: "One or more selected players could not be found" }, { status: 400 });
  }

  const currentUser = await getCurrentAppUser();
  const createdBy = currentUser?.id ?? playerRows.find((player) => player.role === "admin" || player.role === "organizer")?.id ?? playerRows[0].id;
  const { data: draft, error: draftError } = await supabase
    .from("draft_events")
    .insert({
      title: payload.title,
      event_date: payload.eventDate,
      format: payload.format,
      draft_type: payload.draftType,
      winning_team: isTeamDraftFormat(payload.format) ? payload.winningTeam : null,
      default_stake_cents: payload.defaultStakeCents,
      notes: payload.notes,
      created_by: createdBy,
      updated_by: createdBy
    })
    .select("id")
    .single();

  if (draftError || !draft) return NextResponse.json({ error: draftError?.message ?? "Could not create draft" }, { status: 500 });

  const playerById = new Map(playerRows.map((player) => [player.id, player]));
  const participantRows = payload.participantIds.map((playerId, index) => {
    const player = playerById.get(playerId);
    return {
      draft_event_id: draft.id,
      user_id: playerId,
      display_name_snapshot: player?.display_name ?? "Unknown Player",
      seat_order: index + 1,
      team: isTeamDraftFormat(payload.format) ? payload.teams[playerId] ?? null : null,
      deck_archetype: "",
      colors: [],
      strategy: "",
      deck_notes: "",
      created_by: createdBy,
      updated_by: createdBy
    };
  });

  const { data: participants, error: participantsError } = await supabase
    .from("draft_participants")
    .insert(participantRows)
    .select("id, user_id");

  if (participantsError || !participants) return NextResponse.json({ error: participantsError?.message ?? "Could not add participants" }, { status: 500 });

  const { error: moneyError } = await supabase
    .from("money_results")
    .insert(participants.map((participant) => ({
      draft_event_id: draft.id,
      draft_participant_id: participant.id,
      net_cents: moneyForParticipant(payload.format, payload.defaultStakeCents, payload.winningTeam, payload.teams[participant.user_id] ?? null, 0),
      created_by: createdBy,
      updated_by: createdBy
    })));

  if (moneyError) return NextResponse.json({ error: moneyError.message }, { status: 500 });

  if (payload.matches.length) {
    const participantByPlayerId = new Map(participants.map((participant) => [participant.user_id, participant.id]));
    const matchRows = payload.matches.map((match, index) => ({
      draft_event_id: draft.id,
      round_label: `Match ${index + 1}`,
      table_number: index + 1,
      player_a_id: participantByPlayerId.get(match.playerAId),
      player_b_id: participantByPlayerId.get(match.playerBId),
      sidebet_cents: match.sidebetCents,
      sidebet_winner_participant_id: match.sidebetWinnerId ? participantByPlayerId.get(match.sidebetWinnerId) ?? null : null,
      notes: match.notes,
      created_by: createdBy,
      updated_by: createdBy
    }));
    if (matchRows.some((match) => !match.player_a_id || !match.player_b_id)) {
      return NextResponse.json({ error: "Match players must be draft participants" }, { status: 400 });
    }

    const { data: createdMatches, error: matchError } = await supabase
      .from("matches")
      .insert(matchRows)
      .select("id");

    if (matchError || !createdMatches) return NextResponse.json({ error: matchError?.message ?? "Could not add matches" }, { status: 500 });

    const { error: resultError } = await supabase.from("match_results").insert(createdMatches.map((match, index) => ({
      match_id: match.id,
      player_a_wins: payload.matches[index].playerAWins,
      player_b_wins: payload.matches[index].playerBWins,
      draws: payload.matches[index].draws,
      created_by: createdBy,
      updated_by: createdBy,
      corrected_by: createdBy,
      corrected_at: new Date().toISOString()
    })));

    if (resultError) return NextResponse.json({ error: resultError.message }, { status: 500 });

    const sidebetRows = payload.matches.flatMap((match, index) => {
      const playerAParticipantId = participantByPlayerId.get(match.playerAId);
      const playerBParticipantId = participantByPlayerId.get(match.playerBId);
      if (!playerAParticipantId || !playerBParticipantId) return [];
      const sidebet = sidebetForMatch({
        format: payload.format,
        winningTeam: payload.winningTeam,
        playerAParticipantId,
        playerBParticipantId,
        playerATeam: payload.teams[match.playerAId] ?? null,
        playerBTeam: payload.teams[match.playerBId] ?? null,
        playerAWins: match.playerAWins,
        playerBWins: match.playerBWins,
        amountCents: match.sidebetCents,
        matchId: createdMatches[index].id,
        draftEventId: draft.id,
        notes: match.notes,
        changedBy: createdBy
      });
      return sidebet ? [sidebet] : [];
    });
    if (sidebetRows.length) {
      const { error: sidebetError } = await supabase.from("sidebets").insert(sidebetRows);
      if (sidebetError) return NextResponse.json({ error: sidebetError.message }, { status: 500 });
    }
  }

  await supabase.from("audit_log").insert({
    entity_type: "DraftEvent",
    entity_id: draft.id,
    action: "created",
    changed_by: createdBy,
    after: {
      title: payload.title,
      format: payload.format,
      draft_type: payload.draftType,
      participant_count: payload.participantIds.length
    }
  });

  return NextResponse.json({ id: draft.id, status: "created" }, { status: 201 });
}

function sidebetForMatch(input: {
  format: DraftFormat;
  winningTeam: "A" | "B" | null;
  playerAParticipantId: string;
  playerBParticipantId: string;
  playerATeam: "A" | "B" | null;
  playerBTeam: "A" | "B" | null;
  playerAWins: number;
  playerBWins: number;
  amountCents: number;
  matchId: string;
  draftEventId: string;
  notes: string;
  changedBy: string;
}) {
  if (input.amountCents <= 0) return null;
  let winnerParticipantId = "";
  let loserParticipantId = "";

  if (isTeamDraftFormat(input.format)) {
    if (!input.winningTeam || !input.playerATeam || !input.playerBTeam || input.playerATeam === input.playerBTeam) return null;
    winnerParticipantId = input.playerATeam === input.winningTeam ? input.playerAParticipantId : input.playerBParticipantId;
    loserParticipantId = input.playerATeam === input.winningTeam ? input.playerBParticipantId : input.playerAParticipantId;
  } else if (input.playerAWins > input.playerBWins) {
    winnerParticipantId = input.playerAParticipantId;
    loserParticipantId = input.playerBParticipantId;
  } else if (input.playerBWins > input.playerAWins) {
    winnerParticipantId = input.playerBParticipantId;
    loserParticipantId = input.playerAParticipantId;
  } else {
    return null;
  }

  return {
    draft_event_id: input.draftEventId,
    winner_participant_id: winnerParticipantId,
    loser_participant_id: loserParticipantId,
    amount_cents: input.amountCents,
    match_id: input.matchId,
    notes: input.notes || null,
    created_by: input.changedBy,
    updated_by: input.changedBy
  };
}

type DraftPayload = {
  title: string;
  eventDate: string;
  format: DraftFormat;
  draftType: string;
  winningTeam: "A" | "B" | null;
  defaultStakeCents: number;
  notes: string;
  participantIds: string[];
  teams: Record<string, "A" | "B">;
  matches: Array<{
    playerAId: string;
    playerBId: string;
    playerAWins: number;
    playerBWins: number;
    draws: number;
    sidebetCents: number;
    sidebetWinnerId: string | null;
    notes: string;
  }>;
};

function validateDraftPayload(body: unknown): { value: DraftPayload; error?: never } | { value?: never; error: string } {
  if (!body || typeof body !== "object") return { error: "Invalid draft payload" };
  const data = body as Record<string, unknown>;
  const title = typeof data.title === "string" ? data.title.trim() : "";
  const eventDate = typeof data.eventDate === "string" ? data.eventDate : "";
  const format = normalizeDraftFormat(data.format);
  const draftType = typeof data.draftType === "string" ? data.draftType : "";
  const participantIds = Array.isArray(data.participantIds) ? data.participantIds.filter((id): id is string => typeof id === "string") : [];
  const uniqueParticipantIds = [...new Set(participantIds)];
  const defaultStakeCents = parseCents(data.defaultStake);
  const notes = typeof data.notes === "string" ? data.notes.trim() : "";

  if (!title) return { error: "Draft title is required" };
  if (!eventDate) return { error: "Draft date is required" };
  if (!format) return { error: "Draft format must be Individual, Teams Before Draft, or Teams After Draft" };
  if (!["Vintage", "Andrew Cube", "Morgan Cube"].includes(draftType)) return { error: "Draft type is required" };
  if (uniqueParticipantIds.length < 2) return { error: "Select at least two players" };
  if (defaultStakeCents < 0) return { error: "Stake cannot be negative" };

  const rawTeams = isRecord(data.teams) ? data.teams : {};
  const teams: Record<string, "A" | "B"> = {};
  for (const participantId of uniqueParticipantIds) {
    const team = rawTeams[participantId];
    if (isTeamDraftFormat(format)) {
      if (team !== "A" && team !== "B") return { error: "Every team draft player needs Team A or Team B" };
      teams[participantId] = team;
    }
  }

  const winningTeam = data.winningTeam === "A" || data.winningTeam === "B" ? data.winningTeam : null;
  const rawMatches = Array.isArray(data.matches) ? data.matches : data.initialMatch ? [data.initialMatch] : [];
  const matches = rawMatches.map((match) => validateMatch(match, uniqueParticipantIds));
  const matchError = matches.find((match): match is string => typeof match === "string");
  if (matchError) return { error: matchError };

  return {
    value: {
      title,
      eventDate,
      format,
      draftType,
      winningTeam,
      defaultStakeCents,
      notes,
      participantIds: uniqueParticipantIds,
      teams,
      matches: matches as DraftPayload["matches"]
    }
  };
}

function validateMatch(raw: unknown, participantIds: string[]): DraftPayload["matches"][number] | string {
  if (!isRecord(raw)) return "Invalid match";
  const playerAId = typeof raw.playerAId === "string" ? raw.playerAId : "";
  const playerBId = typeof raw.playerBId === "string" ? raw.playerBId : "";
  if (!participantIds.includes(playerAId) || !participantIds.includes(playerBId)) return "Match players must be selected players";
  if (playerAId === playerBId) return "Matches need two different players";

  const result = typeof raw.result === "string" ? raw.result : "";
  const parsedResult = parseResult(result);
  if (!parsedResult) return "Invalid match result";
  const sidebetCents = parseCents(raw.sidebetAmount);
  if (sidebetCents < 0) return "Sidebet cannot be negative";
  const sidebetWinnerId = typeof raw.sidebetWinnerId === "string" && raw.sidebetWinnerId ? raw.sidebetWinnerId : null;
  if (sidebetWinnerId && ![playerAId, playerBId].includes(sidebetWinnerId)) {
    return "Sidebet winner must be one of the match players";
  }
  const notes = typeof raw.notes === "string" ? raw.notes.trim() : "";

  return {
    playerAId,
    playerBId,
    ...parsedResult,
    sidebetCents,
    sidebetWinnerId,
    notes
  };
}

function parseResult(value: string) {
  const parts = value.split("-").map((part) => Number.parseInt(part, 10));
  if (parts.length < 2 || parts.length > 3 || parts.some((part) => Number.isNaN(part) || part < 0)) return null;
  return { playerAWins: parts[0], playerBWins: parts[1], draws: parts[2] ?? 0 };
}

function parseCents(value: unknown) {
  if (typeof value === "number") return Math.round(value * 100);
  if (typeof value !== "string") return 0;
  const parsed = Number.parseFloat(value.replace(/[$,\s]/g, ""));
  return Number.isNaN(parsed) ? 0 : Math.round(parsed * 100);
}

function moneyForParticipant(format: DraftFormat, defaultStakeCents: number, winningTeam: "A" | "B" | null, team: "A" | "B" | null, fallbackCents: number) {
  if (!isTeamDraftFormat(format) || !winningTeam || !team) return fallbackCents;
  return team === winningTeam ? defaultStakeCents : -defaultStakeCents;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
