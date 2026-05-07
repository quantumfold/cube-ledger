import { NextResponse } from "next/server";
import { getDrafts, getPlayers } from "@/lib/data";
import { achievements, playerStats } from "@/lib/stats";

export async function GET() {
  const [players, drafts] = await Promise.all([getPlayers(), getDrafts()]);
  const stats = playerStats(players, drafts);
  return NextResponse.json({ stats, achievements: achievements(stats, drafts) });
}
