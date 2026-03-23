import { NextResponse } from "next/server";
import { LINES } from "@/lib/transit-graph";

export async function GET() {
  const lines = LINES.map((ln) => ({
    line_id: ln.id,
    mode: ln.mode,
    emission_gco2_per_km: ln.emission_gco2_per_km,
  }));
  return NextResponse.json(lines);
}
