"use client";

import { Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Player } from "@/lib/types";

export function FastEntryPanel({ players }: { players: Player[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [format, setFormat] = useState<"Individual" | "Team">("Team");
  const [draftType, setDraftType] = useState("Vintage");
  const [title, setTitle] = useState("Tuesday Cube Draft");
  const [eventDate, setEventDate] = useState("2026-05-05");
  const [stake, setStake] = useState("$50");
  const [notes, setNotes] = useState("");
  const [teams, setTeams] = useState<Record<string, "A" | "B">>({});
  const [winningTeam, setWinningTeam] = useState<"" | "A" | "B">("");
  const [playerAId, setPlayerAId] = useState("");
  const [playerBId, setPlayerBId] = useState("");
  const [matchResult, setMatchResult] = useState("2-1");
  const [sidebetAmount, setSidebetAmount] = useState("$0");
  const [matchNotes, setMatchNotes] = useState("");
  const [status, setStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const selectedPlayers = useMemo(() => players.filter((player) => selected.includes(player.id)), [players, selected]);

  useEffect(() => {
    const initial = players.slice(0, 4).map((player) => player.id);
    setSelected(initial);
  }, [players]);

  useEffect(() => {
    setPlayerAId((current) => current && selected.includes(current) ? current : selected[0] ?? "");
    setPlayerBId((current) => current && selected.includes(current) ? current : selected[1] ?? selected[0] ?? "");
    setTeams((current) => {
      const next: Record<string, "A" | "B"> = {};
      selected.forEach((id, index) => {
        next[id] = current[id] ?? (index % 2 === 0 ? "A" : "B");
      });
      return next;
    });
  }, [selected]);

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
          winningTeam: format === "Team" ? winningTeam || null : null,
          defaultStake: stake,
          notes,
          participantIds: selected,
          teams: format === "Team" ? teams : {},
          initialMatch: playerAId && playerBId && playerAId !== playerBId ? {
            playerAId,
            playerBId,
            result: matchResult,
            sidebetAmount,
            sidebetWinnerId: null,
            notes: matchNotes
          } : null
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
        <select aria-label="Draft format" value={format} onChange={(event) => setFormat(event.target.value as "Individual" | "Team")}>
          <option>Individual</option>
          <option>Team</option>
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
      {format === "Team" ? (
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
      <div className="entry-grid" style={{ marginTop: 14 }}>
        <select aria-label="Player A" value={playerAId} onChange={(event) => setPlayerAId(event.target.value)}>{selectedPlayers.map((player) => <option key={player.id} value={player.id}>{player.displayName}</option>)}</select>
        <select aria-label="Player B" value={playerBId} onChange={(event) => setPlayerBId(event.target.value)}>{selectedPlayers.map((player) => <option key={player.id} value={player.id}>{player.displayName}</option>)}</select>
        <select aria-label="Match result" value={matchResult} onChange={(event) => setMatchResult(event.target.value)}>
          {["2-0", "2-1", "1-1-1", "1-2", "0-2"].map((result) => <option key={result}>{result}</option>)}
        </select>
        <input aria-label="Sidebet amount" placeholder="Sidebet, default $0" value={sidebetAmount} onChange={(event) => setSidebetAmount(event.target.value)} />
        <input aria-label="Match notes" placeholder="Notes" value={matchNotes} onChange={(event) => setMatchNotes(event.target.value)} />
      </div>
      <div className="inline-actions" style={{ marginTop: 14 }}>
        <button type="button" className="primary" disabled={isSaving} onClick={saveDraft}><Save size={16} /> {isSaving ? "Saving..." : "Save draft"}</button>
      </div>
      {status ? <p className="muted" role="status">{status}</p> : null}
    </section>
  );
}
