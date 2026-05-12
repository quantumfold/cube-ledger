import { NextResponse } from "next/server";
import { getCurrentAppUser } from "@/lib/auth";
import { getCubeathonEvents } from "@/lib/data";
import { getSupabaseAdminClient, getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const events = await getCubeathonEvents();
  return NextResponse.json({ events });
}

export async function POST(request: Request) {
  const body = await request.json();
  const supabase = getSupabaseAdminClient() ?? getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });

  const validation = validatePayload(body);
  if ("error" in validation) return NextResponse.json({ error: validation.error }, { status: 400 });
  const payload = validation.value;

  const { data: playerRows, error: playersError } = await supabase
    .from("users")
    .select("id, display_name, role")
    .in("id", payload.results.map((result) => result.playerId));

  if (playersError) return NextResponse.json({ error: playersError.message }, { status: 500 });
  if (!playerRows || playerRows.length !== payload.results.length) {
    return NextResponse.json({ error: "One or more selected players could not be found" }, { status: 400 });
  }

  const currentUser = await getCurrentAppUser();
  const createdBy = currentUser?.id ?? playerRows.find((player) => player.role === "admin" || player.role === "organizer")?.id ?? playerRows[0].id;
  const { data: event, error: eventError } = await supabase
    .from("cubeathon_events")
    .insert({
      title: payload.title,
      event_date: payload.eventDate,
      notes: payload.notes,
      created_by: createdBy,
      updated_by: createdBy
    })
    .select("id")
    .single();

  if (eventError || !event) return NextResponse.json({ error: eventError?.message ?? "Could not create Cubeathon event" }, { status: 500 });

  const playerById = new Map(playerRows.map((player) => [player.id, player]));
  const { error: resultsError } = await supabase.from("cubeathon_results").insert(payload.results.map((result) => ({
    cubeathon_event_id: event.id,
    user_id: result.playerId,
    display_name_snapshot: playerById.get(result.playerId)?.display_name ?? "Unknown Player",
    money_cents: result.moneyCents,
    ranking: result.ranking,
    match_wins: result.matchWins,
    matches_played: result.matchesPlayed,
    notes: result.notes,
    created_by: createdBy,
    updated_by: createdBy
  })));

  if (resultsError) return NextResponse.json({ error: resultsError.message }, { status: 500 });

  await supabase.from("audit_log").insert({
    entity_type: "CubeathonEvent",
    entity_id: event.id,
    action: "created",
    changed_by: createdBy,
    after: {
      title: payload.title,
      participant_count: payload.results.length
    }
  });

  return NextResponse.json({ id: event.id, status: "created" }, { status: 201 });
}

type Payload = {
  title: string;
  eventDate: string;
  notes: string;
  results: Array<{
    playerId: string;
    moneyCents: number;
    ranking: number;
    matchWins: number;
    matchesPlayed: number;
    notes: string;
  }>;
};

function validatePayload(body: unknown): { value: Payload; error?: never } | { value?: never; error: string } {
  if (!body || typeof body !== "object") return { error: "Invalid Cubeathon payload" };
  const data = body as Record<string, unknown>;
  const title = typeof data.title === "string" ? data.title.trim() : "";
  const eventDate = typeof data.eventDate === "string" ? data.eventDate : "";
  const notes = typeof data.notes === "string" ? data.notes.trim() : "";
  const rawResults = Array.isArray(data.results) ? data.results : [];

  if (!title) return { error: "Cubeathon title is required" };
  if (!eventDate) return { error: "Cubeathon date is required" };
  if (rawResults.length < 1) return { error: "Select at least one player" };

  const seen = new Set<string>();
  const results = rawResults.map((raw) => {
    if (!isRecord(raw)) return null;
    const playerId = typeof raw.playerId === "string" ? raw.playerId : "";
    const ranking = parseWholeNumber(raw.ranking);
    const matchWins = parseWholeNumber(raw.matchWins);
    const matchesPlayed = parseWholeNumber(raw.matchesPlayed);
    if (!playerId || seen.has(playerId) || ranking < 1 || matchWins < 0 || matchesPlayed < 0 || matchWins > matchesPlayed) return null;
    seen.add(playerId);
    return {
      playerId,
      moneyCents: parseCents(raw.money),
      ranking,
      matchWins,
      matchesPlayed,
      notes: typeof raw.notes === "string" ? raw.notes.trim() : ""
    };
  });

  if (results.some((result) => !result)) return { error: "Each result needs a unique player, ranking, and valid match record" };

  return { value: { title, eventDate, notes, results: results as Payload["results"] } };
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
