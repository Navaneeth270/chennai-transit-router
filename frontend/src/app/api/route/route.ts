import { NextResponse } from "next/server";
import { transitGraph, SAMPLE_INCIDENTS } from "@/lib/transit-graph";
import { astarSearch } from "@/lib/algorithms/astar";
import { bfsSearch } from "@/lib/algorithms/bfs";
import { dfsSearch } from "@/lib/algorithms/dfs";
import { ecoSearch } from "@/lib/algorithms/eco";
import { buildRouteResponse } from "@/lib/route-builder";

interface RouteRequestBody {
  origin_id: string;
  destination_id: string;
  algorithm: string;
  apply_incidents?: boolean;
  via_stations?: string[];
  max_time_min?: number;
}

export async function POST(request: Request) {
  const body: RouteRequestBody = await request.json();
  const { origin_id, destination_id, algorithm, apply_incidents, via_stations, max_time_min } = body;

  if (!transitGraph.getStation(origin_id)) {
    return NextResponse.json({ detail: "Origin station not found" }, { status: 404 });
  }
  if (!transitGraph.getStation(destination_id)) {
    return NextResponse.json({ detail: "Destination station not found" }, { status: 404 });
  }

  let incidentsApplied = 0;
  if (apply_incidents) {
    transitGraph.applyIncidents(SAMPLE_INCIDENTS);
    incidentsApplied = SAMPLE_INCIDENTS.length;
  }

  try {
    const t0 = performance.now();
    let result;

    switch (algorithm) {
      case "astar":
        result = astarSearch(transitGraph, origin_id, destination_id);
        break;
      case "bfs":
        result = bfsSearch(transitGraph, origin_id, destination_id);
        break;
      case "dfs":
        result = dfsSearch(
          transitGraph,
          origin_id,
          destination_id,
          via_stations ?? [],
          max_time_min ?? 120.0,
        );
        break;
      case "eco":
        result = ecoSearch(transitGraph, origin_id, destination_id);
        break;
      default:
        return NextResponse.json(
          { detail: "Invalid algorithm. Choose: astar, bfs, dfs, eco" },
          { status: 400 },
        );
    }

    const elapsedMs = performance.now() - t0;

    if (result === null) {
      let msg = "No route found between these stations";
      if (apply_incidents) {
        msg += ". Active disruptions may be blocking the path — try disabling disruptions or pick different stations.";
      } else {
        msg += ". These stations may not be connected by the selected algorithm.";
      }
      return NextResponse.json({ detail: msg }, { status: 404 });
    }

    return NextResponse.json(
      buildRouteResponse(result, algorithm, elapsedMs, incidentsApplied),
    );
  } finally {
    if (apply_incidents) {
      transitGraph.resetIncidents();
    }
  }
}
