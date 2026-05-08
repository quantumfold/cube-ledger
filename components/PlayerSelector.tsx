"use client";

import { useRouter } from "next/navigation";
import { Player } from "@/lib/types";

export function PlayerSelector({ players, selectedPlayerId }: { players: Player[]; selectedPlayerId: string }) {
  const router = useRouter();

  return (
    <select
      aria-label="Select player profile"
      value={selectedPlayerId}
      onChange={(event) => router.push(`/players?playerId=${event.target.value}`)}
    >
      {players.map((player) => (
        <option key={player.id} value={player.id}>{player.displayName}</option>
      ))}
    </select>
  );
}
