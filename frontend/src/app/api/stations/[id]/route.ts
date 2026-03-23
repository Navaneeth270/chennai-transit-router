import { NextResponse } from "next/server";
import { transitGraph } from "@/lib/transit-graph";
import { stationToOut } from "@/lib/route-builder";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const station = transitGraph.getStation(id);
  if (!station) {
    return NextResponse.json({ detail: "Station not found" }, { status: 404 });
  }
  return NextResponse.json(stationToOut(station));
}
