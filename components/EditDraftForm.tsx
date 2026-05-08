"use client";

import { Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { DraftEvent } from "@/lib/types";

type ParticipantEdit = {
  id: string;
  team: "" | "A" | "B";
  deckArchetype: string;
  colors: string;
  strategy: string;
  deckNotes: string;
  decklist: string;
  money: string;
  moneyNotes: string;
};

type MatchEdit = {
  id: string;
  playerAWins: string;
  playerBWins: string;
  draws: string;
  sidebet: string;
  sidebetWinnerParticipantId: string;
  notes: string;
};

export function EditDraftForm({ draft }: { draft: DraftEvent }) {
  const router = useRouter();
  const [title, setTitle] = useState(draft.title);
  const [eventDate, setEventDate] = useState(draft.eventDate);
  const [format, setFormat] = useState<DraftEvent["format"]>(draft.format);
  const [draftType, setDraftType] = useState(draft.draftType);
  const [winningTeam, setWinningTeam] = useState<"" | "A" | "B">(draft.winningTeam ?? "");
  const [stake, setStake] = useState(String(draft.defaultStakeCents / 100));
  const [notes, setNotes] = useState(draft.notes);
  const [participants, setParticipants] = useState<ParticipantEdit[]>(() => draft.participants.map((participant) => {
    const moneyResult = draft.moneyResults.find((result) => result.participantId === participant.id);
    return {
      id: participant.id,
      team: participant.team ?? "",
      deckArchetype: participant.deckArchetype,
      colors: participant.colors.join(""),
      strategy: participant.strategy,
      deckNotes: participant.deckNotes,
      decklist: participant.decklist ?? "",
      money: String((moneyResult?.netCents ?? 0) / 100),
      moneyNotes: moneyResult?.notes ?? ""
    };
  }));
  const [matches, setMatches] = useState<MatchEdit[]>(() => draft.matches.map((match) => ({
    id: match.id,
    playerAWins: String(match.playerAWins),
    playerBWins: String(match.playerBWins),
    draws: String(match.draws),
    sidebet: String(match.sidebetCents / 100),
    sidebetWinnerParticipantId: match.sidebetWinnerParticipantId ?? "",
    notes: match.notes ?? ""
  })));
  const [status, setStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const participantNames = useMemo(() => new Map(draft.participants.map((participant) => [participant.id, participant.displayNameSnapshot])), [draft.participants]);

  function updateParticipant(id: string, patch: Partial<ParticipantEdit>) {
    setParticipants((current) => current.map((participant) => participant.id === id ? { ...participant, ...patch } : participant));
  }

  function updateMatch(id: string, patch: Partial<MatchEdit>) {
    setMatches((current) => current.map((match) => match.id === id ? { ...match, ...patch } : match));
  }

  async function save() {
    setStatus("");
    setIsSaving(true);
    try {
      const response = await fetch(`/api/drafts/${draft.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseVersion: draft.version,
          title,
          eventDate,
          format,
          draftType,
          winningTeam: format === "Team" ? winningTeam || null : null,
          defaultStake: stake,
          notes,
          participants,
          matches
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not save changes");
      setStatus("Draft updated.");
      router.push(`/drafts/${draft.id}`);
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not save changes");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteDraft() {
    const confirmed = window.confirm(`Delete "${draft.title}"? This will permanently remove the draft, participants, matches, money results, and audit log entries.`);
    if (!confirmed) return;

    setStatus("");
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/drafts/${draft.id}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not delete draft");
      router.push("/drafts");
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not delete draft");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="grid" style={{ gap: 18 }}>
      <section className="panel panel-pad">
        <div className="section-title">
          <h1 style={{ margin: 0, fontSize: 24 }}>Edit Draft</h1>
          <button type="button" className="primary" onClick={save} disabled={isSaving}><Save size={16} /> {isSaving ? "Saving..." : "Save changes"}</button>
        </div>
        <div className="entry-grid">
          <input aria-label="Draft title" value={title} onChange={(event) => setTitle(event.target.value)} />
          <input aria-label="Draft date" type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} />
          <select aria-label="Format" value={format} onChange={(event) => setFormat(event.target.value as DraftEvent["format"])}>
            <option>Individual</option>
            <option>Team</option>
          </select>
          <select aria-label="Draft type" value={draftType} onChange={(event) => setDraftType(event.target.value)}>
            <option>Vintage</option>
            <option>Andrew Cube</option>
            <option>Morgan Cube</option>
          </select>
          <input aria-label="Default stake" value={stake} onChange={(event) => setStake(event.target.value)} />
          {format === "Team" ? (
            <select aria-label="Winning team" value={winningTeam} onChange={(event) => setWinningTeam(event.target.value as "" | "A" | "B")}>
              <option value="">Winning team not set</option>
              <option value="A">Team A won</option>
              <option value="B">Team B won</option>
            </select>
          ) : null}
        </div>
        <textarea aria-label="Draft notes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} style={{ marginTop: 12, width: "100%" }} />
        {status ? <p className="muted" role="status">{status}</p> : null}
      </section>

      <section className="panel panel-pad">
        <div className="section-title"><h2>Participants, Decks, Money</h2></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Player</th><th>Team</th><th>Archetype</th><th>Colors</th><th>Strategy</th><th>Money</th><th>Money Notes</th><th>Deck Notes</th></tr></thead>
            <tbody>
              {participants.map((participant) => (
                <tr key={participant.id}>
                  <td><strong>{participantNames.get(participant.id)}</strong></td>
                  <td>
                    <select value={participant.team} onChange={(event) => updateParticipant(participant.id, { team: event.target.value as "" | "A" | "B" })} disabled={format !== "Team"}>
                      <option value="">N/A</option>
                      <option value="A">A</option>
                      <option value="B">B</option>
                    </select>
                  </td>
                  <td><input value={participant.deckArchetype} onChange={(event) => updateParticipant(participant.id, { deckArchetype: event.target.value })} /></td>
                  <td><input value={participant.colors} onChange={(event) => updateParticipant(participant.id, { colors: event.target.value })} placeholder="WUBRG" /></td>
                  <td><input value={participant.strategy} onChange={(event) => updateParticipant(participant.id, { strategy: event.target.value })} /></td>
                  <td><input value={participant.money} onChange={(event) => updateParticipant(participant.id, { money: event.target.value })} /></td>
                  <td><input value={participant.moneyNotes} onChange={(event) => updateParticipant(participant.id, { moneyNotes: event.target.value })} /></td>
                  <td><input value={participant.deckNotes} onChange={(event) => updateParticipant(participant.id, { deckNotes: event.target.value })} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel panel-pad">
        <div className="section-title"><h2>Decklists</h2><span className="pill">Optional</span></div>
        <div className="grid">
          {participants.map((participant) => (
            <div key={participant.id}>
              <strong>{participantNames.get(participant.id)}</strong>
              <textarea
                aria-label={`${participantNames.get(participant.id)} decklist`}
                value={participant.decklist}
                onChange={(event) => updateParticipant(participant.id, { decklist: event.target.value })}
                placeholder="Paste decklist or card list here"
                rows={8}
                style={{ marginTop: 8, width: "100%" }}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="panel panel-pad">
        <div className="section-title"><h2>Existing Matches</h2></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Match</th><th>A Wins</th><th>B Wins</th><th>Draws</th><th>Sidebet</th><th>Sidebet Winner</th><th>Notes</th></tr></thead>
            <tbody>
              {matches.map((match) => {
                const source = draft.matches.find((item) => item.id === match.id);
                const a = participantNames.get(source?.playerAId ?? "");
                const b = participantNames.get(source?.playerBId ?? "");
                return (
                  <tr key={match.id}>
                    <td><strong>{a} vs {b}</strong></td>
                    <td><input value={match.playerAWins} onChange={(event) => updateMatch(match.id, { playerAWins: event.target.value })} /></td>
                    <td><input value={match.playerBWins} onChange={(event) => updateMatch(match.id, { playerBWins: event.target.value })} /></td>
                    <td><input value={match.draws} onChange={(event) => updateMatch(match.id, { draws: event.target.value })} /></td>
                    <td><input value={match.sidebet} onChange={(event) => updateMatch(match.id, { sidebet: event.target.value })} /></td>
                    <td>
                      <select value={match.sidebetWinnerParticipantId} onChange={(event) => updateMatch(match.id, { sidebetWinnerParticipantId: event.target.value })}>
                        <option value="">None</option>
                        {source ? <option value={source.playerAId}>{a}</option> : null}
                        {source ? <option value={source.playerBId}>{b}</option> : null}
                      </select>
                    </td>
                    <td><input value={match.notes} onChange={(event) => updateMatch(match.id, { notes: event.target.value })} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel panel-pad danger-zone">
        <div>
          <h2>Delete Draft</h2>
          <p className="muted">Deleting a draft permanently removes its participants, matches, match results, money results, and audit entries.</p>
        </div>
        <button type="button" className="danger" disabled={isDeleting} onClick={deleteDraft}>
          <Trash2 size={16} /> {isDeleting ? "Deleting..." : "Delete draft"}
        </button>
      </section>
    </div>
  );
}
