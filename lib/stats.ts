import type { Achievement, DraftEvent, HeadToHead, Player, PlayerStats, Standing } from "./types.ts";

export function money(cents: number) {
  const sign = cents > 0 ? "+" : cents < 0 ? "-" : "";
  return `${sign}$${Math.abs(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function percent(value: number) {
  if (!Number.isFinite(value)) return "0.0%";
  return `${(value * 100).toFixed(1)}%`;
}

export function standingsForDraft(draft: DraftEvent): Standing[] {
  const rows = new Map<string, Standing>();
  const participantsById = new Map(draft.participants.map((participant) => [participant.id, participant]));
  for (const participant of draft.participants) {
    rows.set(participant.id, {
      participantId: participant.id,
      playerId: participant.playerId,
      displayName: participant.displayNameSnapshot,
      matchWins: 0,
      matchLosses: 0,
      matchDraws: 0,
      gamesWon: 0,
      gamesLost: 0,
      gamesDrawn: 0,
      points: 0,
      moneyCents: 0,
      deckArchetype: participant.deckArchetype,
      colors: participant.colors
    });
  }

  for (const match of draft.matches) {
    const a = rows.get(match.playerAId);
    const b = rows.get(match.playerBId);
    if (!a || !b) continue;
    a.gamesWon += match.playerAWins;
    a.gamesLost += match.playerBWins;
    a.gamesDrawn += match.draws;
    b.gamesWon += match.playerBWins;
    b.gamesLost += match.playerAWins;
    b.gamesDrawn += match.draws;

    if (match.playerAWins > match.playerBWins) {
      a.matchWins += 1;
      b.matchLosses += 1;
      a.points += 3;
    } else if (match.playerBWins > match.playerAWins) {
      b.matchWins += 1;
      a.matchLosses += 1;
      b.points += 3;
    } else {
      a.matchDraws += 1;
      b.matchDraws += 1;
      a.points += 1;
      b.points += 1;
    }

    if (draft.format === "Individual") {
      const stake = draft.defaultStakeCents + match.sidebetCents;
      if (match.playerAWins > match.playerBWins) {
        a.moneyCents += stake;
        b.moneyCents -= stake;
      } else if (match.playerBWins > match.playerAWins) {
        b.moneyCents += stake;
        a.moneyCents -= stake;
      }
    }
  }

  if (draft.format === "Team" && draft.winningTeam) {
    for (const participant of draft.participants) {
      const row = rows.get(participant.id);
      if (!row) continue;
      row.moneyCents += participant.team === draft.winningTeam ? draft.defaultStakeCents : -draft.defaultStakeCents;
    }

    for (const match of draft.matches) {
      if (match.sidebetCents <= 0) continue;
      const participantA = participantsById.get(match.playerAId);
      const participantB = participantsById.get(match.playerBId);
      if (!participantA || !participantB || participantA.team === participantB.team) continue;
      const winner = participantA.team === draft.winningTeam ? rows.get(participantA.id) : rows.get(participantB.id);
      const loser = participantA.team === draft.winningTeam ? rows.get(participantB.id) : rows.get(participantA.id);
      if (!winner || !loser) continue;
      winner.moneyCents += match.sidebetCents;
      loser.moneyCents -= match.sidebetCents;
    }
  }

  return [...rows.values()].sort((a, b) => b.points - a.points || b.gamesWon - a.gamesWon || b.moneyCents - a.moneyCents);
}

export function playerStats(players: Player[], drafts: DraftEvent[]): PlayerStats[] {
  const stats = new Map<string, PlayerStats>();
  for (const player of players) {
    stats.set(player.id, {
      playerId: player.id,
      displayName: player.displayName,
      profileImageUrl: player.profileImageUrl,
      draftsPlayed: 0,
      matchesPlayed: 0,
      matchWins: 0,
      matchLosses: 0,
      matchDraws: 0,
      gamesWon: 0,
      gamesLost: 0,
      gamesDrawn: 0,
      firstPlaces: 0,
      teamDraftsPlayed: 0,
      teamDraftWins: 0,
      totalMoneyCents: 0,
      winRate: 0,
      gameWinRate: 0,
      teamDraftWinRate: 0,
      averageMoneyCents: 0
    });
  }

  for (const draft of drafts) {
    const standings = standingsForDraft(draft);
    standings.forEach((standing, index) => {
      const row = stats.get(standing.playerId);
      if (!row) return;
      row.draftsPlayed += 1;
      row.matchesPlayed += standing.matchWins + standing.matchLosses + standing.matchDraws;
      row.matchWins += standing.matchWins;
      row.matchLosses += standing.matchLosses;
      row.matchDraws += standing.matchDraws;
      row.gamesWon += standing.gamesWon;
      row.gamesLost += standing.gamesLost;
      row.gamesDrawn += standing.gamesDrawn;
      row.totalMoneyCents += standing.moneyCents;
      if (draft.format === "Team") {
        const participant = draft.participants.find((item) => item.id === standing.participantId);
        row.teamDraftsPlayed += 1;
        if (participant?.team && participant.team === draft.winningTeam) {
          row.firstPlaces += 1;
          row.teamDraftWins += 1;
        }
      } else if (index === 0) {
        row.firstPlaces += 1;
      }
    });
  }

  return [...stats.values()].map((row) => {
    const decidedMatches = row.matchWins + row.matchLosses;
    const decidedGames = row.gamesWon + row.gamesLost;
    return {
      ...row,
      winRate: decidedMatches ? row.matchWins / decidedMatches : 0,
      gameWinRate: decidedGames ? row.gamesWon / decidedGames : 0,
      teamDraftWinRate: row.teamDraftsPlayed ? row.teamDraftWins / row.teamDraftsPlayed : 0,
      averageMoneyCents: row.draftsPlayed ? Math.round(row.totalMoneyCents / row.draftsPlayed) : 0
    };
  });
}

export function playerTrendSeries(players: Player[], drafts: DraftEvent[]) {
  const colors = ["#0f766e", "#9a3412", "#2563eb", "#7c3aed", "#be123c", "#4d7c0f", "#c2410c", "#0f172a"];
  const orderedDrafts = [...drafts].sort((a, b) => a.eventDate.localeCompare(b.eventDate));
  const topPlayers = playerStats(players, drafts)
    .filter((player) => player.draftsPlayed > 0)
    .sort((a, b) => b.matchesPlayed - a.matchesPlayed || b.totalMoneyCents - a.totalMoneyCents)
    .slice(0, 8);

  const winRateSeries = topPlayers.map((player, playerIndex) => {
    let wins = 0;
    let losses = 0;
    const points: Array<{ label: string; value: number }> = [];

    for (const draft of orderedDrafts) {
      const standing = standingsForDraft(draft).find((row) => row.playerId === player.playerId);
      if (!standing) continue;
      wins += standing.matchWins;
      losses += standing.matchLosses;
      points.push({
        label: draft.eventDate,
        value: wins + losses ? wins / (wins + losses) : 0
      });
    }

    return { name: player.displayName, color: colors[playerIndex % colors.length], points };
  });

  const moneySeries = topPlayers.map((player, playerIndex) => {
    let total = 0;
    const points: Array<{ label: string; value: number }> = [];

    for (const draft of orderedDrafts) {
      const standing = standingsForDraft(draft).find((row) => row.playerId === player.playerId);
      if (!standing) continue;
      total += standing.moneyCents;
      points.push({
        label: draft.eventDate,
        value: total
      });
    }

    return { name: player.displayName, color: colors[playerIndex % colors.length], points };
  });

  return { winRateSeries, moneySeries };
}

export function playerProfileTrendSeries(player: Player, drafts: DraftEvent[]) {
  const orderedDrafts = [...drafts].sort((a, b) => a.eventDate.localeCompare(b.eventDate));
  let wins = 0;
  let losses = 0;
  let moneyTotal = 0;
  const winRatePoints: Array<{ label: string; value: number }> = [];
  const moneyPoints: Array<{ label: string; value: number }> = [];

  for (const draft of orderedDrafts) {
    const standing = standingsForDraft(draft).find((row) => row.playerId === player.id);
    if (!standing) continue;
    wins += standing.matchWins;
    losses += standing.matchLosses;
    moneyTotal += standing.moneyCents;
    winRatePoints.push({
      label: draft.eventDate,
      value: wins + losses ? wins / (wins + losses) : 0
    });
    moneyPoints.push({
      label: draft.eventDate,
      value: moneyTotal
    });
  }

  return {
    winRateSeries: [{ name: player.displayName, color: "#0f766e", points: winRatePoints }],
    moneySeries: [{ name: player.displayName, color: "#9a3412", points: moneyPoints }]
  };
}

export function headToHeadForPlayer(playerId: string, players: Player[], drafts: DraftEvent[]): HeadToHead[] {
  const rows = new Map<string, HeadToHead>();
  for (const player of players.filter((candidate) => candidate.id !== playerId)) {
    rows.set(player.id, { opponentId: player.id, opponentName: player.displayName, wins: 0, losses: 0, draws: 0, winRate: 0, moneyCents: 0 });
  }

  for (const draft of drafts) {
    const byParticipant = new Map(draft.participants.map((participant) => [participant.id, participant]));
    const playerParticipant = draft.participants.find((participant) => participant.playerId === playerId);
    if (!playerParticipant) continue;
    const ownMoney = draft.moneyResults.find((result) => result.participantId === playerParticipant.id)?.netCents ?? 0;
    for (const match of draft.matches) {
      const a = byParticipant.get(match.playerAId);
      const b = byParticipant.get(match.playerBId);
      if (!a || !b) continue;
      const isA = a.playerId === playerId;
      const isB = b.playerId === playerId;
      if (!isA && !isB) continue;
      const opponent = isA ? b : a;
      const row = rows.get(opponent.playerId);
      if (!row) continue;
      const ownWins = isA ? match.playerAWins : match.playerBWins;
      const opponentWins = isA ? match.playerBWins : match.playerAWins;
      if (ownWins > opponentWins) row.wins += 1;
      else if (opponentWins > ownWins) row.losses += 1;
      else row.draws += 1;
      row.moneyCents += ownMoney;
    }
  }

  return [...rows.values()].map((row) => ({ ...row, winRate: row.wins + row.losses ? row.wins / (row.wins + row.losses) : 0 }));
}

export function achievements(_stats: PlayerStats[], drafts: DraftEvent[]): Achievement[] {
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 1);
  const recentDrafts = drafts.filter((draft) => new Date(`${draft.eventDate}T00:00:00`) >= cutoff);
  const rows = new Map<string, { name: string; wins: number; losses: number; draws: number; moneyCents: number }>();

  for (const draft of recentDrafts) {
    for (const standing of standingsForDraft(draft)) {
      const current = rows.get(standing.playerId) ?? {
        name: standing.displayName,
        wins: 0,
        losses: 0,
        draws: 0,
        moneyCents: 0
      };
      current.wins += standing.matchWins;
      current.losses += standing.matchLosses;
      current.draws += standing.matchDraws;
      current.moneyCents += standing.moneyCents;
      rows.set(standing.playerId, current);
    }
  }

  const withMatches = [...rows.values()].filter((row) => row.wins + row.losses > 0);
  const withMoney = [...rows.values()].filter((row) => row.moneyCents !== 0);
  const highestWinRate = [...withMatches].sort((a, b) => winRate(b) - winRate(a) || b.wins - a.wins)[0];
  const lowestWinRate = [...withMatches].sort((a, b) => winRate(a) - winRate(b) || b.losses - a.losses)[0];
  const mostMoneyWon = [...withMoney].sort((a, b) => b.moneyCents - a.moneyCents)[0];
  const mostMoneyLost = [...withMoney].sort((a, b) => a.moneyCents - b.moneyCents)[0];

  return [
    {
      title: "Highest Win Rate",
      playerName: highestWinRate?.name ?? "N/A",
      value: percent(highestWinRate ? winRate(highestWinRate) : 0),
      detail: "Last 12 months"
    },
    {
      title: "Lowest Win Rate",
      playerName: lowestWinRate?.name ?? "N/A",
      value: percent(lowestWinRate ? winRate(lowestWinRate) : 0),
      detail: "Last 12 months"
    },
    {
      title: "Most Money Won",
      playerName: mostMoneyWon?.name ?? "N/A",
      value: money(mostMoneyWon?.moneyCents ?? 0),
      detail: "Last 12 months"
    },
    {
      title: "Most Money Lost",
      playerName: mostMoneyLost?.name ?? "N/A",
      value: money(mostMoneyLost?.moneyCents ?? 0),
      detail: "Last 12 months"
    }
  ];
}

function winRate(row: { wins: number; losses: number }) {
  return row.wins + row.losses ? row.wins / (row.wins + row.losses) : 0;
}
