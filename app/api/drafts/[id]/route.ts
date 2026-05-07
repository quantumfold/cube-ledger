import { NextResponse } from "next/server";
import { drafts } from "@/lib/seed";
import { standingsForDraft } from "@/lib/stats";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const draft = drafts.find((candidate) => candidate.id === id);
  if (!draft) return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  return NextResponse.json({ draft: { ...draft, standings: standingsForDraft(draft) } });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const draft = drafts.find((candidate) => candidate.id === id);
  if (!draft) return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  return NextResponse.json({
    status: "accepted",
    id,
    expectedVersion: draft.version,
    received: body,
    conflictPolicy: "Reject stale baseVersion and return changed fields for organizer resolution."
  });
}
