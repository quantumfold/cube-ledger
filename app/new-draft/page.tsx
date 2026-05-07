import { FastEntryPanel } from "@/components/FastEntryPanel";
import { players } from "@/lib/seed";

export default function NewDraftPage() {
  return (
    <div className="grid split">
      <FastEntryPanel players={players} />
      <section className="panel panel-pad">
        <div className="section-title"><h2>Organizer Controls</h2></div>
        <div className="list">
          <div className="list-item"><span>Google OAuth account</span><strong>Required</strong></div>
          <div className="list-item"><span>Role needed to create drafts</span><strong>Organizer/Admin</strong></div>
          <div className="list-item"><span>Default stake</span><strong>$50</strong></div>
          <div className="list-item"><span>Sidebet default</span><strong>No sidebet</strong></div>
          <div className="list-item"><span>Team draft setup</span><strong>Two teams</strong></div>
          <div className="list-item"><span>Conflict handling</span><strong>Version check</strong></div>
        </div>
        <p className="muted">This form models the fast mobile entry workflow. In production it writes queued mutations to IndexedDB, then syncs through the API with audit log entries.</p>
      </section>
    </div>
  );
}
