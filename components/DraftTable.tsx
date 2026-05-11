import { Edit3, Eye } from "lucide-react";
import { DraftEvent } from "@/lib/types";
import { money, standingsForDraft } from "@/lib/stats";

export function DraftTable({ drafts }: { drafts: DraftEvent[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Draft</th>
            <th>Date</th>
            <th>Format</th>
            <th>Draft Type</th>
            <th>Players</th>
            <th>Winner</th>
            <th>Stake</th>
            <th>Net Leader</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {drafts.map((draft) => {
            const standings = standingsForDraft(draft);
            const netLeader = [...standings].sort((a, b) => b.moneyCents - a.moneyCents)[0];
            return (
              <tr key={draft.id}>
                <td><a href={`/drafts/${draft.id}`}><strong>{draft.title}</strong></a></td>
                <td>{draft.eventDate}</td>
                <td>{draft.format}{draft.format === "Team" && draft.winningTeam ? ` · Team ${draft.winningTeam}` : ""}</td>
                <td>{draft.draftType}</td>
                <td>{draft.participants.length}</td>
                <td>{draft.format === "Team" ? draft.winningTeam ? `Team ${draft.winningTeam}` : "Team winner not set" : standings[0]?.displayName ?? "N/A"}</td>
                <td>{money(draft.defaultStakeCents)}</td>
                <td className={netLeader?.moneyCents >= 0 ? "money-pos" : "money-neg"}>{netLeader ? `${netLeader.displayName} ${money(netLeader.moneyCents)}` : "N/A"}</td>
                <td>
                  <div className="inline-actions">
                    <a className="button" href={`/drafts/${draft.id}`}><Eye size={16} /> View</a>
                    <a className="button" href={`/drafts/${draft.id}/edit`}><Edit3 size={16} /> Edit</a>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
