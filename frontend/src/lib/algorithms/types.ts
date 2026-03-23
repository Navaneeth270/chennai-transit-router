import type { TransitGraph, StationData } from "@/lib/transit-graph";
import { LINE_LOOKUP } from "@/lib/transit-graph";

export interface SegmentResult {
  from_station: StationData;
  to_station: StationData;
  line: string;
  mode: string;
  travel_time_min: number;
  distance_km: number;
  co2_grams: number;
  intermediate_stations: StationData[];
}

export interface RouteSearchResult {
  segments: SegmentResult[];
  total_time_min: number;
  total_distance_km: number;
  total_transfers: number;
  total_co2_grams: number;
  visited_ids: string[];
}

export type PathEntry = [string, string]; // [stationId, lineId]

/**
 * Build a single route segment between path[start] and path[end].
 * Looks up each consecutive edge, preferring one matching `lineId`,
 * falling back to any edge connecting the two nodes.
 */
export function makeSegment(
  graph: TransitGraph,
  path: PathEntry[],
  start: number,
  end: number,
  lineId: string,
): SegmentResult {
  const fromStation = graph.getStation(path[start][0])!;
  const toStation = graph.getStation(path[end][0])!;

  const lineInfo = LINE_LOOKUP[lineId];
  const mode = lineInfo?.mode ?? "metro";

  let totalTime = 0;
  let totalDist = 0;
  let totalCo2 = 0;
  const intermediates: StationData[] = [];

  for (let i = start; i < end; i++) {
    const sid = path[i][0];
    const nid = path[i + 1][0];
    let found = false;

    for (const edge of graph.getNeighbors(sid)) {
      if (edge.to_node_id === nid && edge.line_id === lineId) {
        totalTime += graph.getEffectiveTravelTime(sid, edge);
        totalDist += edge.distance_km;
        totalCo2 += edge.emission_gco2_per_km * edge.distance_km;
        found = true;
        break;
      }
    }

    if (!found) {
      for (const edge of graph.getNeighbors(sid)) {
        if (edge.to_node_id === nid) {
          totalTime += graph.getEffectiveTravelTime(sid, edge);
          totalDist += edge.distance_km;
          totalCo2 += edge.emission_gco2_per_km * edge.distance_km;
          break;
        }
      }
    }

    if (i > start && i < end) {
      intermediates.push(graph.getStation(path[i][0])!);
    }
  }

  return {
    from_station: fromStation,
    to_station: toStation,
    line: lineId,
    mode,
    travel_time_min: Math.round(totalTime * 10) / 10,
    distance_km: Math.round(totalDist * 100) / 100,
    co2_grams: Math.round(totalCo2 * 10) / 10,
    intermediate_stations: intermediates,
  };
}
