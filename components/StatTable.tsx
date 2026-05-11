import Link from "next/link";
import { PlayerStats } from "@/lib/types";
import { money, percent } from "@/lib/stats";

export function StatTable({ stats }: { stats: PlayerStats[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Player</th>
            <th>Drafts</th>
            <th>Matches</th>
            <th>W-L-D</th>
            <th>Match Win %</th>
            <th>Game Win %</th>
            <th>Team Draft Win %</th>
            <th>Firsts</th>
            <th>Money</th>
            <th>Avg/Draft</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((row) => (
            <tr key={row.playerId}>
              <td>
                <Link className="player-cell" href={`/players/${row.playerId}`}>
                  {row.profileImageUrl ? <img className="avatar" src={row.profileImageUrl} alt="" /> : null}
                  <strong>{row.displayName}</strong>
                </Link>
              </td>
              <td>{row.draftsPlayed}</td>
              <td>{row.matchesPlayed}</td>
              <td>{row.matchWins}-{row.matchLosses}-{row.matchDraws}</td>
              <td>{percent(row.winRate)}</td>
              <td>{percent(row.gameWinRate)}</td>
              <td>{row.teamDraftsPlayed ? `${percent(row.teamDraftWinRate)} (${row.teamDraftWins}/${row.teamDraftsPlayed})` : "N/A"}</td>
              <td>{row.firstPlaces}</td>
              <td className={row.totalMoneyCents >= 0 ? "money-pos" : "money-neg"}>{money(row.totalMoneyCents)}</td>
              <td>{money(row.averageMoneyCents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
