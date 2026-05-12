import Link from "next/link";
import { Plus } from "lucide-react";
import { getCubeathonEvents, getPlayers } from "@/lib/data";
import { cubeathonPlayerStats, money, percent } from "@/lib/stats";

export const dynamic = "force-dynamic";

export default async function CubeathonPage() {
  const [players, events] = await Promise.all([getPlayers(), getCubeathonEvents()]);
  const stats = cubeathonPlayerStats(players, events);

  return (
    <div className="grid" style={{ gap: 18 }}>
      <section className="panel panel-pad">
        <div className="section-title">
          <div>
            <h1 style={{ margin: 0, fontSize: 28 }}>Cubeathon Results</h1>
            <div className="muted">{events.length} events recorded</div>
          </div>
          <Link className="button primary" href="/cubeathon/new"><Plus size={16} /> New Results</Link>
        </div>
      </section>

      <section className="panel panel-pad">
        <div className="section-title"><h2>Cubeathon Performance</h2></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Player</th><th>Events</th><th>Total Money</th><th>Average Ranking</th><th>Match Win %</th><th>Match Wins</th><th>Matches Played</th></tr></thead>
            <tbody>
              {stats.map((row) => (
                <tr key={row.playerId}>
                  <td><strong>{row.displayName}</strong></td>
                  <td>{row.eventsPlayed}</td>
                  <td className={row.totalMoneyCents >= 0 ? "money-pos" : "money-neg"}>{money(row.totalMoneyCents)}</td>
                  <td>{row.averageRanking.toFixed(2)}</td>
                  <td>{percent(row.matchWinRate)}</td>
                  <td>{row.matchWins}</td>
                  <td>{row.matchesPlayed}</td>
                </tr>
              ))}
              {!stats.length ? (
                <tr><td colSpan={7} className="muted">No Cubeathon results recorded yet.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel panel-pad">
        <div className="section-title"><h2>Events</h2></div>
        <div className="grid">
          {events.map((event) => (
            <div className="list-item" key={event.id}>
              <div>
                <strong>{event.title}</strong>
                <div className="muted">{event.eventDate} · {event.results.length} players</div>
              </div>
              <strong>{money(event.results.reduce((sum, result) => sum + result.moneyCents, 0))}</strong>
            </div>
          ))}
          {!events.length ? <p className="muted">Create Cubeathon results when the next event finishes.</p> : null}
        </div>
      </section>
    </div>
  );
}
