import { NextResponse } from "next/server";
import { getCurrentAppUser } from "@/lib/auth";
import { getDraft } from "@/lib/data";
import { standingsForDraft } from "@/lib/stats";
import { getSupabaseAdminClient, getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const draft = await getDraft(id);
  if (!draft) return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  return NextResponse.json({ draft: { ...draft, standings: standingsForDraft(draft) } });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const draft = await getDraft(id);
  if (!draft) return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  const supabase = getSupabaseAdminClient() ?? getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });

  const validation = validateEditPayload(body, draft);
  if ("error" in validation) return NextResponse.json({ error: validation.error }, { status: 400 });
  const payload = validation.value;

  if (payload.baseVersion !== draft.version) {
    return NextResponse.json({ error: "This draft changed since you opened it. Refresh and try again.", expectedVersion: draft.version }, { status: 409 });
  }

  const currentUser = await getCurrentAppUser();
  const changedBy = currentUser?.id ?? draft.createdBy;
  const before = snapshotDraft(draft);

  const { error: draftError } = await supabase
    .from("draft_events")
    .update({
      title: payload.title,
      event_date: payload.eventDate,
      format: payload.format,
      draft_type: payload.draftType,
      winning_team: payload.format === "Team" ? payload.winningTeam : null,
      default_stake_cents: payload.defaultStakeCents,
      notes: payload.notes,
      updated_by: changedBy,
      version: draft.version + 1,
      updated_at: new Date().toISOString()
    })
    .eq("id", id);

  if (draftError) return NextResponse.json({ error: draftError.message }, { status: 500 });

  for (const participant of payload.participants) {
    const { error } = await supabase
      .from("draft_participants")
      .update({
        team: payload.format === "Team" ? participant.team : null,
        deck_archetype: participant.deckArchetype,
        colors: participant.colors,
        strategy: participant.strategy,
        deck_notes: participant.deckNotes,
        decklist: participant.decklist
      })
      .eq("id", participant.id)
      .eq("draft_event_id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { error: moneyError } = await supabase
      .from("money_results")
      .update({
        net_cents: participant.moneyCents,
        notes: participant.moneyNotes,
        updated_by: changedBy,
        updated_at: new Date().toISOString()
      })
      .eq("draft_participant_id", participant.id)
      .eq("draft_event_id", id);
    if (moneyError) return NextResponse.json({ error: moneyError.message }, { status: 500 });
  }

  for (const match of payload.matches) {
    const { error } = await supabase
      .from("matches")
      .update({
        sidebet_cents: match.sidebetCents,
        sidebet_winner_participant_id: match.sidebetWinnerParticipantId,
        notes: match.notes
      })
      .eq("id", match.id)
      .eq("draft_event_id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { error: resultError } = await supabase
      .from("match_results")
      .update({
        player_a_wins: match.playerAWins,
        player_b_wins: match.playerBWins,
        draws: match.draws,
        corrected_by: changedBy,
        corrected_at: new Date().toISOString()
      })
      .eq("match_id", match.id);
    if (resultError) return NextResponse.json({ error: resultError.message }, { status: 500 });
  }

  const after = {
    title: payload.title,
    eventDate: payload.eventDate,
    format: payload.format,
    draftType: payload.draftType,
    winningTeam: payload.winningTeam,
    defaultStakeCents: payload.defaultStakeCents,
    notes: payload.notes,
    participants: payload.participants,
    matches: payload.matches
  };

  await supabase.from("audit_log").insert({
    entity_type: "DraftEvent",
    entity_id: id,
    action: "updated",
    changed_by: changedBy,
    before,
    after
  });

  return NextResponse.json({ status: "updated", id, version: draft.version + 1 });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const draft = await getDraft(id);
  if (!draft) return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  const supabase = getSupabaseAdminClient() ?? getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });

  const { error: auditError } = await supabase.from("audit_log").delete().eq("entity_type", "DraftEvent").eq("entity_id", id);
  if (auditError) return NextResponse.json({ error: auditError.message }, { status: 500 });

  const { error } = await supabase.from("draft_events").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ status: "deleted", id });
}

type EditPayload = {
  baseVersion: number;
  title: string;
  eventDate: string;
  format: "Individual" | "Team";
  draftType: string;
  winningTeam: "A" | "B" | null;
  defaultStakeCents: number;
  notes: string;
  participants: Array<{
    id: string;
    team: "A" | "B" | null;
    deckArchetype: string;
    colors: string[];
    strategy: string;
    deckNotes: string;
    decklist: string | null;
    moneyCents: number;
    moneyNotes: string;
  }>;
  matches: Array<{
    id: string;
    playerAWins: number;
    playerBWins: number;
    draws: number;
    sidebetCents: number;
    sidebetWinnerParticipantId: string | null;
    notes: string;
  }>;
};

function validateEditPayload(body: unknown, draft: Awaited<ReturnType<typeof getDraft>>): { value: EditPayload; error?: never } | { value?: never; error: string } {
  if (!draft) return { error: "Draft not found" };
  if (!body || typeof body !== "object") return { error: "Invalid edit payload" };
  const data = body as Record<string, unknown>;
  const baseVersion = Number(data.baseVersion);
  const title = typeof data.title === "string" ? data.title.trim() : "";
  const eventDate = typeof data.eventDate === "string" ? data.eventDate : "";
  const format = data.format === "Team" ? "Team" : data.format === "Individual" ? "Individual" : null;
  const draftType = typeof data.draftType === "string" ? data.draftType : "";
  const defaultStakeCents = parseCents(data.defaultStake);
  const notes = typeof data.notes === "string" ? data.notes.trim() : "";
  const winningTeam = data.winningTeam === "A" || data.winningTeam === "B" ? data.winningTeam : null;

  if (!Number.isInteger(baseVersion)) return { error: "Missing draft version" };
  if (!title) return { error: "Draft title is required" };
  if (!eventDate) return { error: "Draft date is required" };
  if (!format) return { error: "Format must be Individual or Team" };
  if (!["Vintage", "Andrew Cube", "Morgan Cube"].includes(draftType)) return { error: "Draft type is required" };
  if (defaultStakeCents < 0) return { error: "Stake cannot be negative" };

  const participantIds = new Set(draft.participants.map((participant) => participant.id));
  const rawParticipants = Array.isArray(data.participants) ? data.participants : [];
  const participants = rawParticipants.map((raw) => {
    if (!isRecord(raw) || typeof raw.id !== "string" || !participantIds.has(raw.id)) return null;
    const team = raw.team === "A" || raw.team === "B" ? raw.team : null;
    if (format === "Team" && !team) return null;
    return {
      id: raw.id,
      team,
      deckArchetype: typeof raw.deckArchetype === "string" ? raw.deckArchetype.trim() : "",
      colors: parseColors(raw.colors),
      strategy: typeof raw.strategy === "string" ? raw.strategy.trim() : "",
      deckNotes: typeof raw.deckNotes === "string" ? raw.deckNotes.trim() : "",
      decklist: typeof raw.decklist === "string" && raw.decklist.trim() ? raw.decklist.trim() : null,
      moneyCents: parseCents(raw.money),
      moneyNotes: typeof raw.moneyNotes === "string" ? raw.moneyNotes.trim() : ""
    };
  });

  if (participants.some((participant) => !participant) || participants.length !== draft.participants.length) {
    return { error: "All existing participants must be included in edits" };
  }

  const matchIds = new Set(draft.matches.map((match) => match.id));
  const rawMatches = Array.isArray(data.matches) ? data.matches : [];
  const matchById = new Map(draft.matches.map((match) => [match.id, match]));
  const matches = rawMatches.map((raw) => {
    if (!isRecord(raw) || typeof raw.id !== "string" || !matchIds.has(raw.id)) return null;
    const source = matchById.get(raw.id);
    const playerAWins = parseWholeNumber(raw.playerAWins);
    const playerBWins = parseWholeNumber(raw.playerBWins);
    const draws = parseWholeNumber(raw.draws);
    const sidebetCents = parseCents(raw.sidebet);
    const sidebetWinnerParticipantId = typeof raw.sidebetWinnerParticipantId === "string" && raw.sidebetWinnerParticipantId ? raw.sidebetWinnerParticipantId : null;
    if (!source || playerAWins < 0 || playerBWins < 0 || draws < 0 || sidebetCents < 0) return null;
    if (sidebetWinnerParticipantId && ![source.playerAId, source.playerBId].includes(sidebetWinnerParticipantId)) return null;
    if (sidebetCents > 0 && !sidebetWinnerParticipantId) return null;
    return {
      id: raw.id,
      playerAWins,
      playerBWins,
      draws,
      sidebetCents,
      sidebetWinnerParticipantId,
      notes: typeof raw.notes === "string" ? raw.notes.trim() : ""
    };
  });

  if (matches.some((match) => !match) || matches.length !== draft.matches.length) {
    return { error: "All existing matches must be included and valid" };
  }

  return {
    value: {
      baseVersion,
      title,
      eventDate,
      format,
      draftType,
      winningTeam,
      defaultStakeCents,
      notes,
      participants: participants as EditPayload["participants"],
      matches: matches as EditPayload["matches"]
    }
  };
}

function snapshotDraft(draft: NonNullable<Awaited<ReturnType<typeof getDraft>>>) {
  return {
    title: draft.title,
    eventDate: draft.eventDate,
    format: draft.format,
    draftType: draft.draftType,
    winningTeam: draft.winningTeam ?? null,
    defaultStakeCents: draft.defaultStakeCents,
    notes: draft.notes,
    participants: draft.participants,
    moneyResults: draft.moneyResults,
    matches: draft.matches
  };
}

function parseCents(value: unknown) {
  if (typeof value === "number") return Math.round(value * 100);
  if (typeof value !== "string") return 0;
  const parsed = Number.parseFloat(value.replace(/[$,\s]/g, ""));
  return Number.isNaN(parsed) ? 0 : Math.round(parsed * 100);
}

function parseWholeNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number.parseInt(String(value), 10);
  return Number.isInteger(parsed) ? parsed : -1;
}

function parseColors(value: unknown) {
  if (Array.isArray(value)) return value.filter((color): color is string => typeof color === "string");
  if (typeof value !== "string") return [];
  const trimmed = value.trim();
  if (!trimmed) return [];
  if (/[\s,/]/.test(trimmed)) return trimmed.split(/[\s,/]+/).filter(Boolean).map((color) => color.toUpperCase());
  return trimmed.split("").map((color) => color.toUpperCase());
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
