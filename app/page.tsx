import Link from "next/link";
import { CalendarDays, Filter, Plus, Trophy } from "lucide-react";
import { DraftTable } from "@/components/DraftTable";
import { LineChart } from "@/components/LineChart";
import { StatTable } from "@/components/StatTable";
import { getDrafts, getPlayers } from "@/lib/data";
import { achievements, money, percent, playerStats, playerTrendSeries } from "@/lib/stats";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [players, drafts] = await Promise.all([getPlayers(), getDrafts()]);
  const stats = playerStats(players, drafts).sort((a, b) => b.winRate - a.winRate || b.totalMoneyCents - a.totalMoneyCents);
  const achievementRows = achievements(stats, drafts);
  const { winRateSeries, moneySeries } = playerTrendSeries(players, drafts);

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <h1>Cube results, money, and rivalries in one clean ledger.</h1>
          <p>Record any Cube format, enter match scores in seconds, track net money by player, and keep long-term stats derived from saved draft data.</p>
          <div className="hero-actions">
            <Link className="button primary" href="/new-draft"><Plus size={16} /> New Draft</Link>
            <Link className="button" href="/drafts"><CalendarDays size={16} /> Draft History</Link>
          </div>
        </div>
      </section>

      <section className="panel panel-pad" style={{ marginTop: 18 }}>
        <div className="section-title">
          <h2>Dashboard Filters</h2>
          <Filter size={18} />
        </div>
        <div className="filters">
          <input type="date" aria-label="Start date" defaultValue="2026-04-01" />
          <input type="date" aria-label="End date" defaultValue="2026-05-05" />
          <select aria-label="Draft format"><option>All formats</option><option>Individual</option><option>Team</option></select>
          <select aria-label="Draft type"><option>All draft types</option><option>Vintage</option><option>Andrew Cube</option><option>Morgan Cube</option></select>
          <select aria-label="Player"><option>All players</option>{players.map((player) => <option key={player.id}>{player.displayName}</option>)}</select>
          <input aria-label="Minimum drafts" placeholder="Min drafts" />
          <input aria-label="Minimum matches" placeholder="Min matches" />
          <select aria-label="Money results"><option>Any money result</option><option>Positive only</option><option>Negative only</option></select>
          <select aria-label="Win rate"><option>Any win rate</option><option>50%+</option><option>60%+</option></select>
        </div>
      </section>

      <section className="grid split" style={{ marginTop: 18 }}>
        <div className="panel panel-pad">
          <div className="section-title"><h2>Match Win Percentage Over Time</h2><span className="pill">Top active players</span></div>
          <LineChart series={winRateSeries} formatValue={percent} emptyLabel="Add match results to see win-rate trends." />
        </div>
        <div className="panel panel-pad">
          <div className="section-title"><h2>Total Money Over Time</h2><span className="pill">Cumulative</span></div>
          <LineChart series={moneySeries} formatValue={money} emptyLabel="Add money results to see cumulative totals." />
        </div>
      </section>

      <section className="grid split" style={{ marginTop: 18 }}>
        <div className="panel panel-pad">
          <div className="section-title"><h2>Player Leaderboard</h2><span className="pill">Sortable table ready</span></div>
          <StatTable stats={stats} />
        </div>
        <div className="panel panel-pad">
          <div className="section-title"><h2>Achievements</h2><Trophy size={18} /></div>
          <div className="list">
            {achievementRows.map((achievement) => (
              <div className="list-item" key={achievement.title}>
                <div>
                  <strong>{achievement.title}</strong>
                  <div className="muted">{achievement.playerName} · {achievement.detail}</div>
                </div>
                <strong>{achievement.value}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="panel panel-pad" style={{ marginTop: 18 }}>
        <div className="section-title"><h2>Recent Draft History</h2><Link href="/drafts">View all</Link></div>
        <DraftTable drafts={drafts} />
      </section>
    </>
  );
}
