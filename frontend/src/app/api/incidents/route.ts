import { NextResponse } from "next/server";
import { SAMPLE_INCIDENTS } from "@/lib/transit-graph";
import type { IncidentOut } from "@/lib/route-builder";

export async function GET() {
  const incidents: IncidentOut[] = SAMPLE_INCIDENTS.map((inc) => ({
    id: inc.id,
    title: inc.title,
    description: "",
    incident_type: inc.incident_type,
    severity: inc.severity,
    affected_station_id: inc.affected_station_id,
    affected_line_id: inc.affected_line_id,
    blocks_node: inc.blocks_node,
    blocks_edge: inc.blocks_edge,
    time_penalty_min: inc.time_penalty_min,
    lat: inc.lat,
    lng: inc.lng,
    radius_km: inc.radius_km,
  }));
  return NextResponse.json(incidents);
}
