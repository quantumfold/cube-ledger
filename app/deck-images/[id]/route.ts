import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });

  const { data: image, error } = await supabase.from("deck_images").select("storage_path").eq("id", id).single();
  if (error || !image) return NextResponse.json({ error: "Deck photo not found" }, { status: 404 });
  const deckImage = image as Pick<Database["public"]["Tables"]["deck_images"]["Row"], "storage_path">;

  const { data: signedUrl, error: signedUrlError } = await supabase.storage.from("deck-images").createSignedUrl(deckImage.storage_path, 60);
  if (signedUrlError || !signedUrl?.signedUrl) return NextResponse.json({ error: "Could not create image link" }, { status: 500 });

  return NextResponse.redirect(signedUrl.signedUrl);
}
