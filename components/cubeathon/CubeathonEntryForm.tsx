"use client";

import { Plus, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { Player } from "@/lib/types";

type ResultRow = {
  id: string;
  playerId: string;
  money: string;
  ranking: string;
  matchWins: string;
  matchesPlayed: string;
  notes: string;
};

export function CubeathonEntryForm({ players }: { players: Player[] }) {
  const router = useRouter();
  const [title, setTitle] = useState(`Cubeathon ${new Date().getFullYear()}`);
  const [eventDate, setEventDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [status, setStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const availablePlayers = useMemo(() => players.filter((player) => player.showOnLeaderboard), [players]);

  useEffect(() => {
    setRows(availablePlayers.slice(0, 4).map((player, index) => ({
      id: crypto.randomUUID(),
      playerId: player.id,
      money: "$0",
      ranking: String(index + 1),
      matchWins: "0",
      matchesPlayed: "0",
      notes: ""
    })));
  }, [availablePlayers]);

  function addRow() {
    const unusedPlayer = availablePlayers.find((player) => !rows.some((row) => row.playerId === player.id));
    setRows((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        playerId: unusedPlayer?.id ?? availablePlayers[0]?.id ?? "",
        money: "$0",
        ranking: String(current.length + 1),
        matchWins: "0",
        matchesPlayed: "0",
        notes: ""
      }
    ]);
  }

  function updateRow(id: string, patch: Partial<ResultRow>) {
    setRows((current) => current.map((row) => row.id === id ? { ...row, ...patch } : row));
  }

  async function saveEvent() {
    setStatus("");
    setIsSaving(true);
    try {
      const response = await fetch("/api/cubeathon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          eventDate,
          notes,
          results: rows.map((row) => ({
            playerId: row.playerId,
            money: row.money,
            ranking: row.ranking,
            matchWins: row.matchWins,
            matchesPlayed: row.matchesPlayed,
            notes: row.notes
          }))
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not save Cubeathon results");
      router.push("/cubeathon");
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not save Cubeathon results");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="panel panel-pad">
      <div className="section-title">
        <h1 style={{ margin: 0, fontSize: 28 }}>New Cubeathon Results</h1>
        <button type="button" className="primary" disabled={isSaving} onClick={saveEvent}><Save size={16} /> {isSaving ? "Saving..." : "Save results"}</button>
      </div>
      <div className="entry-grid" style={{ marginTop: 14 }}>
        <input aria-label="Cubeathon title" value={title} onChange={(event) => setTitle(event.target.value)} />
        <input aria-label="Cubeathon date" type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} />
        <input aria-label="Cubeathon notes" placeholder="Notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
      </div>

      <div style={{ marginTop: 18 }}>
        <div className="section-title">
          <h2>Player Results</h2>
          <button type="button" onClick={addRow}><Plus size={16} /> Add player</button>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Player</th><th>Money</th><th>Ranking</th><th>Match Wins</th><th>Matches Played</th><th>Notes</th><th></th></tr></thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <select aria-label="Cubeathon player" value={row.playerId} onChange={(event) => updateRow(row.id, { playerId: event.target.value })}>
                      {availablePlayers.map((player) => <option key={player.id} value={player.id}>{player.displayName}</option>)}
                    </select>
                  </td>
                  <td><input aria-label="Money won or lost" value={row.money} onChange={(event) => updateRow(row.id, { money: event.target.value })} /></td>
                  <td><input aria-label="Ranking" value={row.ranking} onChange={(event) => updateRow(row.id, { ranking: event.target.value })} /></td>
                  <td><input aria-label="Match wins" value={row.matchWins} onChange={(event) => updateRow(row.id, { matchWins: event.target.value })} /></td>
                  <td><input aria-label="Matches played" value={row.matchesPlayed} onChange={(event) => updateRow(row.id, { matchesPlayed: event.target.value })} /></td>
                  <td><input aria-label="Result notes" value={row.notes} onChange={(event) => updateRow(row.id, { notes: event.target.value })} /></td>
                  <td><button type="button" disabled={rows.length <= 1} onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))}><Trash2 size={16} /> Remove</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {status ? <p className="muted" role="status">{status}</p> : null}
    </section>
  );
}
