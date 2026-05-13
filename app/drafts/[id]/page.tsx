import Link from "next/link";
import { notFound } from "next/navigation";
import { Edit3 } from "lucide-react";
import { AuditLog } from "@/components/AuditLog";
import { getDraft, getPlayers } from "@/lib/data";
import { money, standingsForDraft } from "@/lib/stats";
import { isTeamDraftFormat } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DraftDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [draft, players] = await Promise.all([getDraft(id), getPlayers()]);
  if (!draft) notFound();
  const standings = standingsForDraft(draft);
  const submitterNames = Object.fromEntries(players.map((player) => [player.id, player.displayName]));

  return (
    <div className="grid" style={{ gap: 18 }}>
      <section className="panel panel-pad">
        <div className="section-title">
          <div>
            <h1 style={{ margin: 0, fontSize: 28 }}>{draft.title}</h1>
            <div className="muted">
              {draft.eventDate} · {draft.format} · {draft.draftType} · {draft.participants.length} players · Stake {money(draft.defaultStakeCents)}
              {isTeamDraftFormat(draft.format) && draft.winningTeam ? ` · Team ${draft.winningTeam} won` : ""}
            </div>
          </div>
          <a className="button primary" href={`/drafts/${draft.id}/edit`}><Edit3 size={16} /> Edit</a>
        </div>
        <p className="muted">{draft.notes}</p>
      </section>

      <section className="grid split">
        {isTeamDraftFormat(draft.format) ? (
          <div className="panel panel-pad">
            <div className="section-title"><h2>Draft Winner</h2></div>
            <strong>{draft.winningTeam ? `Team ${draft.winningTeam}` : "Team winner not set"}</strong>
          </div>
        ) : null}
        <div className="panel panel-pad">
          <div className="section-title"><h2>Final Standings</h2></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Rank</th><th>Player</th><th>Team</th><th>Deck</th><th>Record</th><th>Games</th><th>Points</th><th>Money</th></tr></thead>
              <tbody>
                {standings.map((row, index) => (
                  <tr key={row.participantId}>
                    <td>{index + 1}</td>
                    <td><Link href={`/players/${row.playerId}`}><strong>{row.displayName}</strong></Link></td>
                    <td>{draft.participants.find((participant) => participant.id === row.participantId)?.team ? `Team ${draft.participants.find((participant) => participant.id === row.participantId)?.team}` : "N/A"}</td>
                    <td>{row.deckArchetype} <span className="muted">({row.colors.join("")})</span></td>
                    <td>{row.matchWins}-{row.matchLosses}-{row.matchDraws}</td>
                    <td>{row.gamesWon}-{row.gamesLost}-{row.gamesDrawn}</td>
                    <td>{row.points}</td>
                    <td className={row.moneyCents >= 0 ? "money-pos" : "money-neg"}>{money(row.moneyCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel panel-pad">
          <div className="section-title"><h2>Deck Notes</h2></div>
          <div className="list">
            {draft.participants.map((participant) => (
              <div className="list-item" key={participant.id}>
                <div>
                  <strong>{participant.displayNameSnapshot}</strong>
                  <div className="muted">{participant.deckArchetype} · {participant.strategy}</div>
                  <div>{participant.deckNotes}</div>
                </div>
                <span className="pill">{participant.colors.join("")}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="panel panel-pad">
        <div className="section-title"><h2>Match Results</h2></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Round</th><th>Player A</th><th>Player B</th><th>Result</th><th>Draws</th><th>Sidebet</th><th>Notes</th></tr></thead>
            <tbody>
              {draft.matches.map((match) => {
                const a = draft.participants.find((participant) => participant.id === match.playerAId);
                const b = draft.participants.find((participant) => participant.id === match.playerBId);
                const sidebetWinner = sidebetWinnerName(draft, match.playerAId, match.playerBId, match.playerAWins, match.playerBWins);
                return (
                  <tr key={match.id}>
                    <td>{match.roundLabel}</td>
                    <td>{a?.displayNameSnapshot}</td>
                    <td>{b?.displayNameSnapshot}</td>
                    <td><strong>{match.playerAWins}-{match.playerBWins}</strong></td>
                    <td>{match.draws}</td>
                    <td>{match.sidebetCents > 0 && sidebetWinner ? `${sidebetWinner} ${money(match.sidebetCents)}` : "None"}</td>
                    <td className="muted">{match.notes ?? ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {draft.sidebets.length ? (
        <section className="panel panel-pad">
          <div className="section-title"><h2>Sidebets</h2></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Winner</th><th>Loser</th><th>Amount</th><th>Match</th><th>Notes</th></tr></thead>
              <tbody>
                {draft.sidebets.map((sidebet) => {
                  const winner = draft.participants.find((participant) => participant.id === sidebet.winnerParticipantId);
                  const loser = draft.participants.find((participant) => participant.id === sidebet.loserParticipantId);
                  const match = sidebet.matchId ? draft.matches.find((item) => item.id === sidebet.matchId) : null;
                  return (
                    <tr key={sidebet.id}>
                      <td>{winner?.displayNameSnapshot}</td>
                      <td>{loser?.displayNameSnapshot}</td>
                      <td>{money(sidebet.amountCents)}</td>
                      <td>{match?.roundLabel ?? "Standalone"}</td>
                      <td className="muted">{sidebet.notes ?? ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="panel panel-pad">
        <div className="section-title"><h2>Decklists</h2><span className="pill">Optional</span></div>
        <div className="grid">
          {draft.participants.map((participant) => (
            <div className="decklist-block" key={participant.id}>
              <div className="section-title">
                <h3>{participant.displayNameSnapshot}</h3>
                <span className="pill">{participant.deckArchetype || "No archetype"}</span>
              </div>
              {(participant.deckImages ?? []).length ? (
                <div className="deck-photo-grid">
                  {(participant.deckImages ?? []).map((image, index) => (
                    <a key={image.id} className="deck-photo-card" href={`/deck-images/${image.id}`} target="_blank" rel="noreferrer">
                      <img src={`/deck-images/${image.id}`} alt={`${participant.displayNameSnapshot} deck photo ${index + 1}`} />
                      <span>Deck photo {index + 1}</span>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="muted">No deck photos uploaded.</p>
              )}
              {participant.decklist ? (
                <pre className="decklist">{participant.decklist}</pre>
              ) : (
                <p className="muted">No decklist entered.</p>
              )}
            </div>
          ))}
        </div>
      </section>

      <AuditLog entries={draft.auditLog} version={draft.version} submitterNames={submitterNames} />
    </div>
  );
}

function sidebetWinnerName(draft: NonNullable<Awaited<ReturnType<typeof getDraft>>>, playerAId: string, playerBId: string, playerAWins: number, playerBWins: number) {
  const a = draft.participants.find((participant) => participant.id === playerAId);
  const b = draft.participants.find((participant) => participant.id === playerBId);
  if (!a || !b) return "";
  if (isTeamDraftFormat(draft.format) && draft.winningTeam) {
    if (a.team === b.team) return "";
    return a.team === draft.winningTeam ? a.displayNameSnapshot : b.displayNameSnapshot;
  }
  if (playerAWins > playerBWins) return a.displayNameSnapshot;
  if (playerBWins > playerAWins) return b.displayNameSnapshot;
  return "";
}
