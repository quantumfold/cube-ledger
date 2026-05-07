import { DraftTable } from "@/components/DraftTable";
import { getDrafts } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function DraftsPage() {
  const drafts = await getDrafts();
  return (
    <section className="panel panel-pad">
      <div className="section-title">
        <h1 style={{ margin: 0, fontSize: 24 }}>Draft History</h1>
        <span className="pill">{drafts.length} events</span>
      </div>
      <DraftTable drafts={drafts} />
    </section>
  );
}
