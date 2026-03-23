import { NextResponse } from "next/server";
import { transitGraph } from "@/lib/transit-graph";
import { stationToOut } from "@/lib/route-builder";

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371.0;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lng = parseFloat(searchParams.get("lng") ?? "");
  const count = parseInt(searchParams.get("count") ?? "3", 10);

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ detail: "lat and lng are required" }, { status: 400 });
  }

  const WALK_SPEED_KMH = 5.0;
  const allStations = transitGraph.getAllStations();

  const ranked = allStations
    .map((s) => {
      const dist = haversineKm(lat, lng, s.lat, s.lng);
      return {
        station: stationToOut(s),
        distance_km: Math.round(dist * 1000) / 1000,
        walk_time_min: Math.round(((dist / WALK_SPEED_KMH) * 60) * 10) / 10,
      };
    })
    .sort((a, b) => a.distance_km - b.distance_km)
    .slice(0, count);

  return NextResponse.json(ranked);
}
