"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import type { AuditLogEntry } from "@/lib/types";

type AuditLogProps = {
  entries: AuditLogEntry[];
  version: number;
  submitterNames: Record<string, string>;
};

export function AuditLog({ entries, version, submitterNames }: AuditLogProps) {
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());

  function toggleEntry(id: string) {
    setExpandedEntries((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <section className="panel panel-pad">
      <div className="section-title"><h2>Audit Log</h2><span className="pill">Version {version}</span></div>
      <div className="list">
        {entries.map((entry) => {
          const isExpanded = expandedEntries.has(entry.id);
          const submittedBy = submitterNames[entry.changedBy] ?? "Unknown user";
          const submittedAt = new Date(entry.changedAt).toLocaleString();
          const actionLabel = actionTitle(entry.action);
          return (
            <div className="list-item audit-log-item" key={entry.id}>
              <div>
                <button
                  type="button"
                  className="audit-log-toggle"
                  aria-expanded={isExpanded}
                  aria-controls={`audit-log-entry-${entry.id}`}
                  onClick={() => toggleEntry(entry.id)}
                >
                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  <strong>{submittedBy} {actionLabel}</strong>
                </button>
                {isExpanded ? (
                  <div id={`audit-log-entry-${entry.id}`} className="audit-log-details">
                    <div>{entry.summary}</div>
                    <div className="muted">Action: {entry.action}</div>
                    <div className="muted">Submitted by {submittedBy} on {submittedAt}</div>
                  </div>
                ) : null}
              </div>
              <span className="muted">{submittedAt}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function actionTitle(action: string) {
  if (action === "created") return "created this draft";
  if (action === "deleted") return "deleted this draft";
  if (action === "deck_photo_added") return "added a deck photo";
  if (action === "deck_photo_deleted") return "deleted a deck photo";
  return "updated this draft";
}
