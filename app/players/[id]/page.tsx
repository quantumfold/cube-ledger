import { notFound } from "next/navigation";
import { DraftTable } from "@/components/DraftTable";
import { drafts, players } from "@/lib/seed";
import { headToHeadForPlayer, money, percent, playerStats, standingsForDraft } from "@/lib/stats";

export default async function PlayerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const player = players.find((candidate) => candidate.id === id);
  if (!player) notFound();
  const stats = playerStats(players, drafts).find((row) => row.playerId === player.id);
  const playerDrafts = drafts.filter((draft) => draft.participants.some((participant) => participant.playerId === player.id));
  const headToHead = headToHeadForPlayer(player.id, players, drafts);
  const formatRows = playerDrafts.map((draft) => {
    const standing = standingsForDraft(draft).find((row) => row.playerId === player.id);
    return { draft, standing };
  });

  return (
    <div className="grid" style={{ gap: 18 }}>
      <section className="panel panel-pad">
        <div className="section-title">
          <div className="player-cell">
            {player.profileImageUrl ? <img className="avatar" src={player.profileImageUrl} alt="" /> : null}
            <div>
              <h1 style={{ margin: 0, fontSize: 28 }}>{player.displayName}</h1>
              <div className="muted">{player.email} · {player.role}</div>
            </div>
          </div>
          <span className="pill">Google OAuth linked</span>
        </div>
      </section>

      <section className="grid kpis">
        <div className="panel kpi"><span>Overall record</span><strong>{stats?.matchWins}-{stats?.matchLosses}-{stats?.matchDraws}</strong></div>
        <div className="panel kpi"><span>Match win rate</span><strong>{percent(stats?.winRate ?? 0)}</strong></div>
        <div className="panel kpi"><span>Money won/lost</span><strong>{money(stats?.totalMoneyCents ?? 0)}</strong></div>
        <div className="panel kpi"><span>Draft wins</span><strong>{stats?.firstPlaces ?? 0}</strong></div>
      </section>

      <section className="grid split">
        <div className="panel panel-pad">
          <div className="section-title"><h2>Performance By Format</h2></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Draft</th><th>Format</th><th>Draft Type</th><th>Deck</th><th>Match Record</th><th>Money</th></tr></thead>
              <tbody>
                {formatRows.map(({ draft, standing }) => (
                  <tr key={draft.id}>
                    <td>{draft.title}</td>
                    <td>{draft.format}</td>
                    <td>{draft.draftType}</td>
                    <td>{standing?.deckArchetype}</td>
                    <td>{standing?.matchWins}-{standing?.matchLosses}-{standing?.matchDraws}</td>
                    <td className={(standing?.moneyCents ?? 0) >= 0 ? "money-pos" : "money-neg"}>{money(standing?.moneyCents ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel panel-pad">
          <div className="section-title"><h2>Head-to-Head</h2></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Opponent</th><th>W-L-D</th><th>Win %</th><th>Money Context</th></tr></thead>
              <tbody>
                {headToHead.map((row) => (
                  <tr key={row.opponentId}>
                    <td>{row.opponentName}</td>
                    <td>{row.wins}-{row.losses}-{row.draws}</td>
                    <td>{percent(row.winRate)}</td>
                    <td>{money(row.moneyCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="panel panel-pad">
        <div className="section-title"><h2>Draft History</h2></div>
        <DraftTable drafts={playerDrafts} />
      </section>
    </div>
  );
}
