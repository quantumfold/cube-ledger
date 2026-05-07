import { Achievement, DraftEvent, HeadToHead, Player, PlayerStats, Standing } from "./types";

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
  for (const participant of draft.participants) {
    const moneyResult = draft.moneyResults.find((result) => result.participantId === participant.id);
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
      moneyCents: moneyResult?.netCents ?? 0,
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

    if (match.sidebetCents > 0 && match.sidebetWinnerParticipantId) {
      const winner = rows.get(match.sidebetWinnerParticipantId);
      const loser = match.sidebetWinnerParticipantId === match.playerAId ? b : a;
      if (winner && loser) {
        winner.moneyCents += match.sidebetCents;
        loser.moneyCents -= match.sidebetCents;
      }
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
      totalMoneyCents: 0,
      winRate: 0,
      gameWinRate: 0,
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
      if (index === 0) row.firstPlaces += 1;
    });
  }

  return [...stats.values()].map((row) => {
    const decidedMatches = row.matchWins + row.matchLosses;
    const decidedGames = row.gamesWon + row.gamesLost;
    return {
      ...row,
      winRate: decidedMatches ? row.matchWins / decidedMatches : 0,
      gameWinRate: decidedGames ? row.gamesWon / decidedGames : 0,
      averageMoneyCents: row.draftsPlayed ? Math.round(row.totalMoneyCents / row.draftsPlayed) : 0
    };
  });
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

export function achievements(stats: PlayerStats[], drafts: DraftEvent[]): Achievement[] {
  const mostDrafts = [...stats].sort((a, b) => b.draftsPlayed - a.draftsPlayed)[0];
  const richest = [...stats].sort((a, b) => b.totalMoneyCents - a.totalMoneyCents)[0];
  const bestRate = [...stats].filter((row) => row.matchesPlayed >= 3).sort((a, b) => b.winRate - a.winRate)[0];
  const biggestSwing = drafts.flatMap((draft) => standingsForDraft(draft)).sort((a, b) => Math.abs(b.moneyCents) - Math.abs(a.moneyCents))[0];
  const twoOh = new Map<string, number>();
  for (const draft of drafts) {
    for (const match of draft.matches) {
      const a = draft.participants.find((participant) => participant.id === match.playerAId);
      const b = draft.participants.find((participant) => participant.id === match.playerBId);
      if (match.playerAWins === 2 && match.playerBWins === 0 && a) twoOh.set(a.displayNameSnapshot, (twoOh.get(a.displayNameSnapshot) ?? 0) + 1);
      if (match.playerBWins === 2 && match.playerAWins === 0 && b) twoOh.set(b.displayNameSnapshot, (twoOh.get(b.displayNameSnapshot) ?? 0) + 1);
    }
  }
  const mostTwoOh = [...twoOh.entries()].sort((a, b) => b[1] - a[1])[0];

  return [
    { title: "Most Drafts Played", playerName: mostDrafts?.displayName ?? "N/A", value: `${mostDrafts?.draftsPlayed ?? 0}`, detail: "Lifetime attendance leader" },
    { title: "Biggest Money Swing", playerName: biggestSwing?.displayName ?? "N/A", value: money(biggestSwing?.moneyCents ?? 0), detail: "Largest single-draft net result" },
    { title: "Best Match Win Rate", playerName: bestRate?.displayName ?? "N/A", value: percent(bestRate?.winRate ?? 0), detail: "Minimum three matches" },
    { title: "Most 2-0 Wins", playerName: mostTwoOh?.[0] ?? "N/A", value: `${mostTwoOh?.[1] ?? 0}`, detail: "Clean match wins recorded" },
    { title: "Money Leader", playerName: richest?.displayName ?? "N/A", value: money(richest?.totalMoneyCents ?? 0), detail: "Lifetime net result" }
  ];
}
