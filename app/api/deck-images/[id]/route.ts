import { NextResponse } from "next/server";
import { getCurrentAppUser } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

const bucketName = "deck-images";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "Supabase service role is required for image deletion" }, { status: 500 });

  const currentUser = await getCurrentAppUser();
  if (!currentUser) return NextResponse.json({ error: "You must be logged in to delete deck photos" }, { status: 401 });

  const { data: image, error: imageError } = await supabase.from("deck_images").select("*").eq("id", id).single();
  if (imageError || !image) return NextResponse.json({ error: "Deck photo not found" }, { status: 404 });
  const deckImage = image as Database["public"]["Tables"]["deck_images"]["Row"];

  const { error: deleteError } = await supabase.from("deck_images").delete().eq("id", id);
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

  await supabase.storage.from(bucketName).remove([deckImage.storage_path]);
  await supabase.from("audit_log").insert({
    entity_type: "DraftEvent",
    entity_id: deckImage.draft_event_id,
    action: "deck_photo_deleted",
    changed_by: currentUser.id,
    before: {
      file_name: deckImage.file_name,
      caption: deckImage.caption,
      storage_path: deckImage.storage_path
    }
  });

  return NextResponse.json({ status: "deleted", id });
}
