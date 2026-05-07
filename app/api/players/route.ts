import { NextResponse } from "next/server";
import { getPlayers } from "@/lib/data";

export async function GET() {
  const players = await getPlayers();
  return NextResponse.json({ players });
}
