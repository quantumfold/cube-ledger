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
                  <strong>{entry.summary}</strong>
                </button>
                {isExpanded ? (
                  <div id={`audit-log-entry-${entry.id}`} className="audit-log-details">
                    <div className="muted">Action: {entry.action}</div>
                    <div className="muted">Submitted by {submitterNames[entry.changedBy] ?? "Unknown user"}</div>
                  </div>
                ) : null}
              </div>
              <span className="muted">{new Date(entry.changedAt).toLocaleString()}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
