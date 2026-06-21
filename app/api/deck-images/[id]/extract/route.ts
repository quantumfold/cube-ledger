import { NextResponse } from "next/server";
import { getCurrentAppUser } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

const bucketName = "deck-images";
const openaiModel = process.env.OPENAI_VISION_MODEL || "gpt-4.1-mini";

type ExtractionJson = {
  mainboard?: Array<{ quantity?: number; cardName?: string }>;
  sideboard?: Array<{ quantity?: number; cardName?: string }>;
  uncertain?: string[];
  notes?: string;
  rawText?: string;
};

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "Supabase service role is required for decklist extraction" }, { status: 500 });

  const currentUser = await getCurrentAppUser();
  if (!currentUser) return NextResponse.json({ error: "You must be logged in to extract decklists" }, { status: 401 });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "OPENAI_API_KEY is not configured" }, { status: 500 });

  const { data: image, error: imageError } = await supabase.from("deck_images").select("*").eq("id", id).single();
  if (imageError || !image) return NextResponse.json({ error: "Deck photo not found" }, { status: 404 });
  const deckImage = image as Database["public"]["Tables"]["deck_images"]["Row"];

  const { data: file, error: downloadError } = await supabase.storage.from(bucketName).download(deckImage.storage_path);
  if (downloadError || !file) return NextResponse.json({ error: downloadError?.message ?? "Could not load deck photo" }, { status: 500 });

  const imageBase64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  const extraction = await extractDecklistFromImage(apiKey, deckImage.mime_type, imageBase64);
  if ("error" in extraction) {
    await recordExtractionFailure(deckImage, currentUser.id, extraction.error);
    return NextResponse.json({ error: extraction.error }, { status: 502 });
  }

  const decklistText = formatDecklist(extraction.parsed);
  const rawText = extraction.parsed.rawText || decklistText;
  const uncertainCards = extraction.parsed.uncertain ?? [];
  const parsedCards = {
    mainboard: extraction.parsed.mainboard ?? [],
    sideboard: extraction.parsed.sideboard ?? [],
    uncertain: uncertainCards,
    notes: extraction.parsed.notes ?? ""
  };

  const { data: extractionRow, error: insertError } = await supabase
    .from("decklist_extractions")
    .insert({
      deck_image_id: deckImage.id,
      draft_participant_id: deckImage.draft_participant_id,
      status: "completed",
      raw_text: rawText,
      parsed_cards: parsedCards,
      uncertain_cards: uncertainCards,
      model: openaiModel,
      created_by: currentUser.id
    })
    .select("*")
    .single();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  await supabase.from("audit_log").insert({
    entity_type: "DraftEvent",
    entity_id: deckImage.draft_event_id,
    action: "decklist_extracted",
    changed_by: currentUser.id,
    after: {
      file_name: deckImage.file_name,
      model: openaiModel,
      mainboard_count: countCards(extraction.parsed.mainboard),
      sideboard_count: countCards(extraction.parsed.sideboard),
      uncertain_count: uncertainCards.length
    }
  });

  return NextResponse.json({
    extraction: {
      id: extractionRow?.id ?? null,
      deckImageId: deckImage.id,
      participantId: deckImage.draft_participant_id,
      decklistText,
      rawText,
      parsedCards,
      uncertainCards,
      model: openaiModel
    }
  });
}

async function extractDecklistFromImage(apiKey: string, mimeType: string, imageBase64: string): Promise<{ parsed: ExtractionJson } | { error: string }> {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: openaiModel,
      input: [{
        role: "user",
        content: [
          {
            type: "input_text",
            text: [
              "Extract the Magic: The Gathering decklist from this image.",
              "Return only valid JSON with this shape:",
              "{\"mainboard\":[{\"quantity\":1,\"cardName\":\"Card Name\"}],\"sideboard\":[],\"uncertain\":[],\"notes\":\"\",\"rawText\":\"\"}",
              "Use exact card names when readable. Put partially obscured or uncertain cards in uncertain.",
              "If quantities are not visible, use 1. Do not invent cards."
            ].join(" ")
          },
          {
            type: "input_image",
            image_url: `data:${mimeType};base64,${imageBase64}`
          }
        ]
      }]
    })
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) return { error: openaiError(body) };

  const text = outputText(body);
  if (!text) return { error: "OpenAI returned no decklist text" };

  const parsed = parseExtractionJson(text);
  if (!parsed) return { parsed: { rawText: text, notes: "Could not parse model JSON output." } };
  return { parsed };
}

async function recordExtractionFailure(deckImage: Database["public"]["Tables"]["deck_images"]["Row"], userId: string, error: string) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return;
  await supabase.from("decklist_extractions").insert({
    deck_image_id: deckImage.id,
    draft_participant_id: deckImage.draft_participant_id,
    status: "failed",
    raw_text: "",
    parsed_cards: {},
    uncertain_cards: [],
    model: openaiModel,
    error,
    created_by: userId
  });
}

function outputText(body: unknown) {
  if (!body || typeof body !== "object") return "";
  const response = body as { output_text?: unknown; output?: Array<{ content?: Array<{ text?: unknown }> }> };
  if (typeof response.output_text === "string") return response.output_text.trim();
  return (response.output ?? [])
    .flatMap((item) => item.content ?? [])
    .map((content) => typeof content.text === "string" ? content.text : "")
    .filter(Boolean)
    .join("\n")
    .trim();
}

function parseExtractionJson(text: string): ExtractionJson | null {
  const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  try {
    const parsed = JSON.parse(cleaned) as ExtractionJson;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function formatDecklist(parsed: ExtractionJson) {
  const sections = [
    formatSection("", parsed.mainboard),
    formatSection("Sideboard", parsed.sideboard),
    formatUncertain(parsed.uncertain),
    parsed.notes ? `Notes\n${parsed.notes}` : ""
  ].filter(Boolean);
  return sections.join("\n\n") || parsed.rawText || "";
}

function formatSection(title: string, cards: ExtractionJson["mainboard"]) {
  if (!cards?.length) return "";
  const lines = cards.map((card) => `${positiveQuantity(card.quantity)} ${card.cardName || "Unknown card"}`);
  return title ? `${title}\n${lines.join("\n")}` : lines.join("\n");
}

function formatUncertain(cards: string[] | undefined) {
  if (!cards?.length) return "";
  return `Uncertain\n${cards.map((card) => `? ${card}`).join("\n")}`;
}

function positiveQuantity(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.round(value) : 1;
}

function countCards(cards: ExtractionJson["mainboard"]) {
  return (cards ?? []).reduce((total, card) => total + positiveQuantity(card.quantity), 0);
}

function openaiError(body: unknown) {
  if (body && typeof body === "object" && "error" in body) {
    const error = (body as { error?: { message?: string } }).error;
    if (error?.message) return error.message;
  }
  return "OpenAI decklist extraction failed";
}
