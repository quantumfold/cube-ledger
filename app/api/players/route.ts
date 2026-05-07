import { NextResponse } from "next/server";
import { players } from "@/lib/seed";

export function GET() {
  return NextResponse.json({ players });
}
