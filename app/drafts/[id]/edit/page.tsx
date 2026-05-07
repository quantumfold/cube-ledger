import { notFound } from "next/navigation";
import { EditDraftForm } from "@/components/EditDraftForm";
import { getDraft } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function EditDraftPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const draft = await getDraft(id);
  if (!draft) notFound();

  return <EditDraftForm draft={draft} />;
}
