import { NextResponse } from "next/server";
import { drafts, players } from "@/lib/seed";
import { achievements, playerStats } from "@/lib/stats";

export function GET() {
  const stats = playerStats(players, drafts);
  return NextResponse.json({ stats, achievements: achievements(stats, drafts) });
}
