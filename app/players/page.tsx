import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { DraftTable } from "@/components/DraftTable";
import { LineChart } from "@/components/LineChart";
import { PlayerSelector } from "@/components/PlayerSelector";
import { getDrafts, getPlayers } from "@/lib/data";
import { headToHeadForPlayer, money, percent, playerProfileTrendSeries, playerStats, standingsForDraft } from "@/lib/stats";

export const dynamic = "force-dynamic";

export default async function PlayersPage({ searchParams }: { searchParams: Promise<{ playerId?: string }> }) {
  const [{ playerId }, players, drafts, signedInEmail] = await Promise.all([
    searchParams,
    getPlayers(),
    getDrafts(),
    getSignedInEmail()
  ]);
  const signedInPlayer = players.find((player) => player.email.toLowerCase() === signedInEmail?.toLowerCase());
  const selectedPlayer = players.find((player) => player.id === playerId) ?? signedInPlayer ?? players[0];

  if (!selectedPlayer) {
    return (
      <section className="panel panel-pad">
        <h1>No players found</h1>
        <p className="muted">Add players before viewing profiles.</p>
      </section>
    );
  }

  const stats = playerStats(players, drafts).find((row) => row.playerId === selectedPlayer.id);
  const playerDrafts = drafts.filter((draft) => draft.participants.some((participant) => participant.playerId === selectedPlayer.id));
  const headToHead = headToHeadForPlayer(selectedPlayer.id, players, drafts);
  const formatRows = playerDrafts.map((draft) => {
    const standing = standingsForDraft(draft).find((row) => row.playerId === selectedPlayer.id);
    return { draft, standing };
  });
  const { winRateSeries, moneySeries } = playerProfileTrendSeries(selectedPlayer, drafts);

  return (
    <div className="grid" style={{ gap: 18 }}>
      <section className="panel panel-pad">
        <div className="section-title">
          <div className="player-cell">
            {selectedPlayer.profileImageUrl ? <img className="avatar" src={selectedPlayer.profileImageUrl} alt="" /> : null}
            <div>
              <h1 style={{ margin: 0, fontSize: 28 }}>{selectedPlayer.displayName}</h1>
              <div className="muted">{selectedPlayer.email} · {selectedPlayer.role}</div>
            </div>
          </div>
          <PlayerSelector players={players} selectedPlayerId={selectedPlayer.id} />
        </div>
      </section>

      <section className="grid kpis">
        <div className="panel kpi"><span>Overall record</span><strong>{stats?.matchWins ?? 0}-{stats?.matchLosses ?? 0}-{stats?.matchDraws ?? 0}</strong></div>
        <div className="panel kpi"><span>Match win rate</span><strong>{percent(stats?.winRate ?? 0)}</strong></div>
        <div className="panel kpi"><span>Money won/lost</span><strong>{money(stats?.totalMoneyCents ?? 0)}</strong></div>
        <div className="panel kpi"><span>Drafts played</span><strong>{stats?.draftsPlayed ?? 0}</strong></div>
      </section>

      <section className="grid split">
        <div className="panel panel-pad">
          <div className="section-title"><h2>Match Win Percentage Over Time</h2></div>
          <LineChart series={winRateSeries} formatValue={percent} emptyLabel="This player has no match results yet." />
        </div>
        <div className="panel panel-pad">
          <div className="section-title"><h2>Total Money Over Time</h2></div>
          <LineChart series={moneySeries} formatValue={money} emptyLabel="This player has no money results yet." />
        </div>
      </section>

      <section className="grid split">
        <div className="panel panel-pad">
          <div className="section-title"><h2>Performance By Draft</h2></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Draft</th><th>Date</th><th>Format</th><th>Draft Type</th><th>Deck</th><th>Match Record</th><th>Money</th></tr></thead>
              <tbody>
                {formatRows.map(({ draft, standing }) => (
                  <tr key={draft.id}>
                    <td><a href={`/drafts/${draft.id}`}><strong>{draft.title}</strong></a></td>
                    <td>{draft.eventDate}</td>
                    <td>{draft.format}</td>
                    <td>{draft.draftType}</td>
                    <td>{standing?.deckArchetype}</td>
                    <td>{standing?.matchWins ?? 0}-{standing?.matchLosses ?? 0}-{standing?.matchDraws ?? 0}</td>
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
        <div className="section-title"><h2>Draft History</h2><span className="pill">{playerDrafts.length} drafts</span></div>
        <DraftTable drafts={playerDrafts} />
      </section>
    </div>
  );
}

async function getSignedInEmail() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return null;
  const cookieStore = await cookies();
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {
      }
    }
  });
  const { data } = await supabase.auth.getUser();
  return data.user?.email ?? null;
}
