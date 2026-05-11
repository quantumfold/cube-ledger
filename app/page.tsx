import Link from "next/link";
import { CalendarDays, Filter, Plus, Trophy } from "lucide-react";
import { DraftTable } from "@/components/DraftTable";
import { LineChart } from "@/components/LineChart";
import { StatTable } from "@/components/StatTable";
import { filterDashboardDrafts } from "@/lib/dashboard";
import { getDrafts, getPlayers } from "@/lib/data";
import { achievements, money, percent, playerStats, playerTrendSeries } from "@/lib/stats";
import { draftFormats } from "@/lib/types";

export const dynamic = "force-dynamic";

type DashboardSearchParams = {
  start?: string;
  end?: string;
  format?: string;
  draftType?: string;
  playerId?: string;
  minDrafts?: string;
  minMatches?: string;
  money?: string;
  winRate?: string;
};

export default async function DashboardPage({ searchParams }: { searchParams: Promise<DashboardSearchParams> }) {
  const filters = await searchParams;
  const [players, drafts] = await Promise.all([getPlayers(), getDrafts()]);
  const filteredDrafts = filterDashboardDrafts(drafts, filters);
  const dashboardPlayers = players.filter((player) => player.showOnLeaderboard);
  const stats = filterStats(playerStats(dashboardPlayers, filteredDrafts), filters).sort((a, b) => b.winRate - a.winRate || b.totalMoneyCents - a.totalMoneyCents);
  const achievementRows = achievements(stats, filteredDrafts);
  const { winRateSeries, moneySeries } = playerTrendSeries(dashboardPlayers, filteredDrafts);

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
        <form className="filters">
          <input name="start" type="date" aria-label="Start date" defaultValue={filters.start ?? ""} />
          <input name="end" type="date" aria-label="End date" defaultValue={filters.end ?? ""} />
          <select name="format" aria-label="Draft format" defaultValue={filters.format ?? ""}><option value="">All formats</option>{draftFormats.map((draftFormat) => <option key={draftFormat}>{draftFormat}</option>)}</select>
          <select name="draftType" aria-label="Draft type" defaultValue={filters.draftType ?? ""}><option value="">All draft types</option><option>Vintage</option><option>Andrew Cube</option><option>Morgan Cube</option></select>
          <select name="playerId" aria-label="Player" defaultValue={filters.playerId ?? ""}><option value="">All players</option>{players.map((player) => <option key={player.id} value={player.id}>{player.displayName}</option>)}</select>
          <input name="minDrafts" aria-label="Minimum drafts" placeholder="Min drafts" defaultValue={filters.minDrafts ?? ""} />
          <input name="minMatches" aria-label="Minimum matches" placeholder="Min matches" defaultValue={filters.minMatches ?? ""} />
          <select name="money" aria-label="Money results" defaultValue={filters.money ?? ""}><option value="">Any money result</option><option value="positive">Positive only</option><option value="negative">Negative only</option></select>
          <select name="winRate" aria-label="Win rate" defaultValue={filters.winRate ?? ""}><option value="">Any win rate</option><option value="0.5">50%+</option><option value="0.6">60%+</option></select>
          <button type="submit" className="primary">Apply</button>
          <Link className="button" href="/">Reset</Link>
        </form>
      </section>

      <section className="panel panel-pad" style={{ marginTop: 18 }}>
        <div className="section-title"><h2>Match Win Percentage Over Time</h2><span className="pill">Top active players</span></div>
        <LineChart series={winRateSeries} formatValue={percent} emptyLabel="Add match results to see win-rate trends." />
      </section>

      <section className="panel panel-pad" style={{ marginTop: 18 }}>
        <div className="section-title"><h2>Total Money Over Time</h2><span className="pill">Cumulative</span></div>
        <LineChart series={moneySeries} formatValue={money} emptyLabel="Add money results to see cumulative totals." />
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
        <DraftTable drafts={filteredDrafts} />
      </section>
    </>
  );
}

function filterStats(stats: ReturnType<typeof playerStats>, filters: DashboardSearchParams) {
  const minDrafts = Number.parseInt(filters.minDrafts ?? "", 10);
  const minMatches = Number.parseInt(filters.minMatches ?? "", 10);
  const minWinRate = Number.parseFloat(filters.winRate ?? "");
  return stats.filter((row) => {
    if (filters.playerId && row.playerId !== filters.playerId) return false;
    if (Number.isFinite(minDrafts) && row.draftsPlayed < minDrafts) return false;
    if (Number.isFinite(minMatches) && row.matchesPlayed < minMatches) return false;
    if (filters.money === "positive" && row.totalMoneyCents <= 0) return false;
    if (filters.money === "negative" && row.totalMoneyCents >= 0) return false;
    if (Number.isFinite(minWinRate) && row.winRate < minWinRate) return false;
    return true;
  });
}
