"use client";

import { Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { draftFormats, DraftFormat, isTeamDraftFormat, Player } from "@/lib/types";

type MatchEntry = {
  id: string;
  playerAId: string;
  playerBId: string;
  result: string;
  sidebetAmount: string;
  notes: string;
};

export function FastEntryPanel({ players }: { players: Player[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [format, setFormat] = useState<DraftFormat>("Teams After Draft");
  const [draftType, setDraftType] = useState("Vintage");
  const [title, setTitle] = useState("Tuesday Cube Draft");
  const [eventDate, setEventDate] = useState("2026-05-05");
  const [stake, setStake] = useState("$50");
  const [notes, setNotes] = useState("");
  const [teams, setTeams] = useState<Record<string, "A" | "B">>({});
  const [winningTeam, setWinningTeam] = useState<"" | "A" | "B">("");
  const [matches, setMatches] = useState<MatchEntry[]>([]);
  const [status, setStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const selectedPlayers = useMemo(() => players.filter((player) => selected.includes(player.id)), [players, selected]);

  useEffect(() => {
    const initial = players.slice(0, 4).map((player) => player.id);
    setSelected(initial);
  }, [players]);

  useEffect(() => {
    setMatches((current) => {
      const fallbackA = selected[0] ?? "";
      const fallbackB = selected[1] ?? selected[0] ?? "";
      if (!current.length && fallbackA && fallbackB) {
        return [{ id: crypto.randomUUID(), playerAId: fallbackA, playerBId: fallbackB, result: "2-1", sidebetAmount: "$0", notes: "" }];
      }
      return current.map((match) => ({
        ...match,
        playerAId: match.playerAId && selected.includes(match.playerAId) ? match.playerAId : fallbackA,
        playerBId: match.playerBId && selected.includes(match.playerBId) ? match.playerBId : fallbackB
      }));
    });
    setTeams((current) => {
      const next: Record<string, "A" | "B"> = {};
      selected.forEach((id, index) => {
        next[id] = current[id] ?? (index % 2 === 0 ? "A" : "B");
      });
      return next;
    });
  }, [selected]);

  function addMatch() {
    setMatches((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        playerAId: selected[0] ?? "",
        playerBId: selected[1] ?? selected[0] ?? "",
        result: "2-1",
        sidebetAmount: "$0",
        notes: ""
      }
    ]);
  }

  function updateMatch(id: string, patch: Partial<MatchEntry>) {
    setMatches((current) => current.map((match) => match.id === id ? { ...match, ...patch } : match));
  }

  function removeMatch(id: string) {
    setMatches((current) => current.filter((match) => match.id !== id));
  }

  async function saveDraft() {
    setStatus("");
    setIsSaving(true);
    try {
      const response = await fetch("/api/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          eventDate,
          format,
          draftType,
          winningTeam: isTeamDraftFormat(format) ? winningTeam || null : null,
          defaultStake: stake,
          notes,
          participantIds: selected,
          teams: isTeamDraftFormat(format) ? teams : {},
          matches: matches
            .filter((match) => match.playerAId && match.playerBId && match.playerAId !== match.playerBId)
            .map((match) => ({
              playerAId: match.playerAId,
              playerBId: match.playerBId,
              result: match.result,
              sidebetAmount: match.sidebetAmount,
              sidebetWinnerId: null,
              notes: match.notes
            }))
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not save draft");
      setStatus("Draft saved.");
      router.push(`/drafts/${result.id}`);
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not save draft");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="panel panel-pad">
      <div className="section-title">
        <h2>Fast Draft Entry</h2>
        <span className="pill">Online save</span>
      </div>
      <div className="entry-grid" style={{ marginTop: 14 }}>
        <input aria-label="Draft title" value={title} onChange={(event) => setTitle(event.target.value)} />
        <input aria-label="Draft date" type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} />
        <select aria-label="Draft format" value={format} onChange={(event) => setFormat(event.target.value as DraftFormat)}>
          {draftFormats.map((draftFormat) => <option key={draftFormat}>{draftFormat}</option>)}
        </select>
        <select aria-label="Draft type" value={draftType} onChange={(event) => setDraftType(event.target.value)}>
          {["Vintage", "Andrew Cube", "Morgan Cube"].map((type) => <option key={type}>{type}</option>)}
        </select>
        <input aria-label="Stake" value={stake} onChange={(event) => setStake(event.target.value)} />
        <input aria-label="Draft notes" placeholder="Draft notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
      </div>
      <div style={{ marginTop: 14 }}>
        <strong>Players</strong>
        <div className="pill-row" style={{ marginTop: 8 }}>
          {players.map((player) => (
            <button
              key={player.id}
              type="button"
              className={selected.includes(player.id) ? "primary" : ""}
              onClick={() => setSelected((current) => current.includes(player.id) ? current.filter((id) => id !== player.id) : [...current, player.id])}
            >
              {player.displayName}
            </button>
          ))}
        </div>
      </div>
      {isTeamDraftFormat(format) ? (
        <div style={{ marginTop: 14 }}>
          <strong>Team setup</strong>
          <div className="entry-grid" style={{ marginTop: 8 }}>
            {selectedPlayers.map((player, index) => (
              <select
                key={player.id}
                aria-label={`${player.displayName} team`}
                value={teams[player.id] ?? (index % 2 === 0 ? "A" : "B")}
                onChange={(event) => setTeams((current) => ({ ...current, [player.id]: event.target.value as "A" | "B" }))}
              >
                <option value="A">{player.displayName}: Team A</option>
                <option value="B">{player.displayName}: Team B</option>
              </select>
            ))}
            <select aria-label="Winning team" value={winningTeam} onChange={(event) => setWinningTeam(event.target.value as "" | "A" | "B")}>
              <option value="">Winning team not set</option>
              <option value="A">Team A won</option>
              <option value="B">Team B won</option>
            </select>
          </div>
        </div>
      ) : null}
      <div style={{ marginTop: 14 }}>
        <div className="section-title">
          <strong>Match results</strong>
          <button type="button" onClick={addMatch}><Plus size={16} /> Add match</button>
        </div>
        <div className="grid" style={{ marginTop: 8, gap: 10 }}>
          {matches.map((match, index) => (
            <div className="entry-grid" key={match.id}>
              <select aria-label={`Match ${index + 1} player A`} value={match.playerAId} onChange={(event) => updateMatch(match.id, { playerAId: event.target.value })}>{selectedPlayers.map((player) => <option key={player.id} value={player.id}>{player.displayName}</option>)}</select>
              <select aria-label={`Match ${index + 1} player B`} value={match.playerBId} onChange={(event) => updateMatch(match.id, { playerBId: event.target.value })}>{selectedPlayers.map((player) => <option key={player.id} value={player.id}>{player.displayName}</option>)}</select>
              <select aria-label={`Match ${index + 1} result`} value={match.result} onChange={(event) => updateMatch(match.id, { result: event.target.value })}>
                {["2-0", "2-1", "1-1-1", "1-2", "0-2"].map((result) => <option key={result}>{result}</option>)}
              </select>
              <input aria-label={`Match ${index + 1} sidebet amount`} placeholder="Sidebet, default $0" value={match.sidebetAmount} onChange={(event) => updateMatch(match.id, { sidebetAmount: event.target.value })} />
              <input aria-label={`Match ${index + 1} notes`} placeholder="Notes" value={match.notes} onChange={(event) => updateMatch(match.id, { notes: event.target.value })} />
              <button type="button" disabled={matches.length <= 1} onClick={() => removeMatch(match.id)}><Trash2 size={16} /> Remove</button>
            </div>
          ))}
        </div>
      </div>
      <div className="inline-actions" style={{ marginTop: 14 }}>
        <button type="button" className="primary" disabled={isSaving} onClick={saveDraft}><Save size={16} /> {isSaving ? "Saving..." : "Save draft"}</button>
      </div>
      {status ? <p className="muted" role="status">{status}</p> : null}
    </section>
  );
}
