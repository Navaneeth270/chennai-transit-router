import { NextResponse } from "next/server";
import { transitGraph, SAMPLE_INCIDENTS } from "@/lib/transit-graph";
import { astarSearch } from "@/lib/algorithms/astar";
import { bfsSearch } from "@/lib/algorithms/bfs";
import { dfsSearch } from "@/lib/algorithms/dfs";
import { ecoSearch } from "@/lib/algorithms/eco";
import { buildRouteResponse, type RouteResultOut } from "@/lib/route-builder";

interface CompareRequestBody {
  origin_id: string;
  destination_id: string;
  apply_incidents?: boolean;
}

export async function POST(request: Request) {
  const body: CompareRequestBody = await request.json();
  const { origin_id, destination_id, apply_incidents } = body;

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

  const algos: Record<string, () => ReturnType<typeof astarSearch>> = {
    astar: () => astarSearch(transitGraph, origin_id, destination_id),
    bfs: () => bfsSearch(transitGraph, origin_id, destination_id),
    dfs: () => dfsSearch(transitGraph, origin_id, destination_id, [], 120.0),
    eco: () => ecoSearch(transitGraph, origin_id, destination_id),
  };

  const results: Record<string, RouteResultOut> = {};

  for (const [algoName, searchFn] of Object.entries(algos)) {
    try {
      const t0 = performance.now();
      const result = searchFn();
      const elapsedMs = performance.now() - t0;

      if (result !== null) {
        results[algoName] = buildRouteResponse(result, algoName, elapsedMs, incidentsApplied);
      }
    } catch {
      // skip failed algorithms
    }
  }

  if (apply_incidents) {
    transitGraph.resetIncidents();
  }

  if (Object.keys(results).length === 0) {
    return NextResponse.json(
      { detail: "No routes found between these stations with any algorithm" },
      { status: 404 },
    );
  }

  return NextResponse.json(results);
}
