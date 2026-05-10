import { NextResponse } from "next/server";
import { getCurrentAppUser } from "@/lib/auth";
import { getDraft } from "@/lib/data";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

const bucketName = "deck-images";
const maxImagesPerParticipant = 2;
const maxImageBytes = 2 * 1024 * 1024;

export async function POST(request: Request) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "Supabase service role is required for image uploads" }, { status: 500 });

  const currentUser = await getCurrentAppUser();
  if (!currentUser) return NextResponse.json({ error: "You must be logged in to upload deck photos" }, { status: 401 });

  const formData = await request.formData();
  const draftId = stringValue(formData.get("draftId"));
  const participantId = stringValue(formData.get("participantId"));
  const caption = stringValue(formData.get("caption")).trim();
  const file = formData.get("file");

  if (!draftId || !participantId) return NextResponse.json({ error: "Draft and participant are required" }, { status: 400 });
  if (!(file instanceof File)) return NextResponse.json({ error: "Image file is required" }, { status: 400 });
  if (!file.type.startsWith("image/")) return NextResponse.json({ error: "Only image uploads are allowed" }, { status: 400 });
  if (file.size > maxImageBytes) return NextResponse.json({ error: "Deck photos must be 2 MB or smaller" }, { status: 400 });

  const draft = await getDraft(draftId);
  const participant = draft?.participants.find((item) => item.id === participantId);
  if (!draft || !participant) return NextResponse.json({ error: "Draft participant not found" }, { status: 404 });

  const { count, error: countError } = await supabase
    .from("deck_images")
    .select("id", { count: "exact", head: true })
    .eq("draft_participant_id", participantId);

  if (countError) return NextResponse.json({ error: countError.message }, { status: 500 });
  if ((count ?? 0) >= maxImagesPerParticipant) {
    return NextResponse.json({ error: "Each deck can have at most 2 photos" }, { status: 400 });
  }

  await ensureDeckImagesBucket();

  const extension = extensionForFile(file);
  const imageId = crypto.randomUUID();
  const storagePath = `${draftId}/${participantId}/${imageId}.${extension}`;
  const { error: uploadError } = await supabase.storage.from(bucketName).upload(storagePath, file, {
    contentType: file.type,
    upsert: false
  });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: image, error: insertError } = await supabase
    .from("deck_images")
    .insert({
      id: imageId,
      draft_event_id: draftId,
      draft_participant_id: participantId,
      uploaded_by: currentUser.id,
      storage_path: storagePath,
      file_name: file.name,
      mime_type: file.type,
      file_size_bytes: file.size,
      caption: caption || null,
      updated_by: currentUser.id
    })
    .select("*")
    .single();

  if (insertError || !image) {
    await supabase.storage.from(bucketName).remove([storagePath]);
    return NextResponse.json({ error: insertError?.message ?? "Could not save deck photo metadata" }, { status: 500 });
  }

  await supabase.from("audit_log").insert({
    entity_type: "DraftEvent",
    entity_id: draftId,
    action: "deck_photo_added",
    changed_by: currentUser.id,
    after: {
      participant: participant.displayNameSnapshot,
      file_name: file.name,
      caption: caption || null
    }
  });

  const { data: signedUrl } = await supabase.storage.from(bucketName).createSignedUrl(storagePath, 60 * 60);
  return NextResponse.json({ image: { ...image, signed_url: signedUrl?.signedUrl ?? null } }, { status: 201 });
}

async function ensureDeckImagesBucket() {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return;
  const { data } = await supabase.storage.getBucket(bucketName);
  if (data) return;
  await supabase.storage.createBucket(bucketName, {
    public: false,
    fileSizeLimit: maxImageBytes,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"]
  });
}

function stringValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value : "";
}

function extensionForFile(file: File) {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}
