import { NextResponse } from "next/server";
import { transitGraph } from "@/lib/transit-graph";
import { stationToOut } from "@/lib/route-builder";

export async function GET() {
  const stations = transitGraph.getAllStations().map(stationToOut);
  return NextResponse.json(stations);
}
