import { TransitGraph } from "@/lib/transit-graph";
import { LINE_LOOKUP } from "@/lib/transit-graph";
import { type RouteSearchResult, type PathEntry, makeSegment } from "./types";

const MIN_EMISSION_GRAMS_PER_KM = 17.0;

function heuristic(graph: TransitGraph, current: string, goal: string): number {
  return graph.haversine(current, goal) * MIN_EMISSION_GRAMS_PER_KM;
}

export function ecoSearch(
  graph: TransitGraph,
  originId: string,
  destId: string,
): RouteSearchResult | null {
  if (graph.isNodeBlocked(originId) || graph.isNodeBlocked(destId)) return null;

  const openSet: Array<[number, number, string]> = [];
  let counter = 0;
  openSet.push([0.0, counter, originId]);

  const gScore = new Map<string, number>();
  gScore.set(originId, 0.0);

  const cameFrom = new Map<string, [string, string]>();

  while (openSet.length > 0) {
    openSet.sort((a, b) => a[0] - b[0]);
    const [, , current] = openSet.shift()!;

    if (current === destId) {
      return reconstruct(graph, cameFrom, originId, destId, gScore.get(destId)!);
    }

    for (const edge of graph.getTraversableNeighbors(current)) {
      const co2Cost = graph.computeEdgeCo2(edge);
      const tentativeG = (gScore.get(current) ?? Infinity) + co2Cost;

      if (tentativeG < (gScore.get(edge.to_node_id) ?? Infinity)) {
        gScore.set(edge.to_node_id, tentativeG);
        cameFrom.set(edge.to_node_id, [current, edge.line_id]);
        const fScore = tentativeG + heuristic(graph, edge.to_node_id, destId);
        counter++;
        openSet.push([fScore, counter, edge.to_node_id]);
      }
    }
  }

  return null;
}

function reconstruct(
  graph: TransitGraph,
  cameFrom: Map<string, [string, string]>,
  originId: string,
  destId: string,
  totalCo2: number,
): RouteSearchResult {
  const path: PathEntry[] = [];
  let current = destId;
  while (current !== originId) {
    const [prev, lineId] = cameFrom.get(current)!;
    path.push([current, lineId]);
    current = prev;
  }
  path.push([originId, ""]);
  path.reverse();

  const segments = buildSegments(graph, path);
  const totalTime = segments.reduce((s, seg) => s + seg.travel_time_min, 0);
  const totalDist = segments.reduce((s, seg) => s + seg.distance_km, 0);
  let transfers = 0;
  for (let i = 1; i < segments.length; i++) {
    if (segments[i].line !== segments[i - 1].line) transfers++;
  }

  return {
    segments,
    total_time_min: Math.round(totalTime * 10) / 10,
    total_distance_km: Math.round(totalDist * 100) / 100,
    total_transfers: transfers,
    total_co2_grams: Math.round(totalCo2 * 10) / 10,
    visited_ids: path.map((p) => p[0]),
  };
}

function buildSegments(graph: TransitGraph, path: PathEntry[]) {
  if (path.length < 2) return [];

  const segments = [];
  let segStart = 0;

  for (let i = 2; i < path.length; i++) {
    if (path[i][1] !== path[i - 1][1]) {
      const lineId = path[Math.min(segStart + 1, i - 1)][1];
      segments.push(makeSegment(graph, path, segStart, i - 1, lineId));
      segStart = i - 1;
    }
  }

  const lineId = path[Math.min(segStart + 1, path.length - 1)][1];
  segments.push(makeSegment(graph, path, segStart, path.length - 1, lineId));
  return segments;
}
