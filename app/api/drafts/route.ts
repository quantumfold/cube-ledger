import { NextResponse } from "next/server";
import { drafts } from "@/lib/seed";
import { standingsForDraft } from "@/lib/stats";

export function GET() {
  return NextResponse.json({ drafts: drafts.map((draft) => ({ ...draft, standings: standingsForDraft(draft) })) });
}

export async function POST(request: Request) {
  const body = await request.json();
  return NextResponse.json(
    {
      id: `draft-${Date.now()}`,
      version: 1,
      status: "created",
      received: body,
      next: "Persist this payload to draft_events, draft_participants, money_results, and audit_log."
    },
    { status: 201 }
  );
}
