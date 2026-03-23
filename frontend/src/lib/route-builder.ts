import {
  transitGraph,
  LINE_LOOKUP,
  PRIVATE_CAR_EMISSION_GRAMS_PER_KM,
  type StationData,
} from "@/lib/transit-graph";
import type { RouteSearchResult, SegmentResult } from "@/lib/algorithms/types";

export interface StationOut {
  id: string;
  name: string;
  lat: number;
  lng: number;
  lines: string[];
  is_landmark: boolean;
  zone: string;
}

export interface RouteSegmentOut {
  from_station: StationOut;
  to_station: StationOut;
  line: string;
  mode: string;
  travel_time_min: number;
  distance_km: number;
  co2_grams: number;
  intermediate_stations: StationOut[];
}

export interface EmissionBreakdown {
  segment_co2_grams: number[];
  total_co2_grams: number;
  car_equivalent_co2_grams: number;
  co2_saved_grams: number;
  co2_saved_percent: number;
}

export interface RouteResultOut {
  algorithm: string;
  segments: RouteSegmentOut[];
  total_time_min: number;
  total_distance_km: number;
  total_transfers: number;
  stations_visited: StationOut[];
  computation_time_ms: number;
  path_coordinates: [number, number][];
  emissions: EmissionBreakdown;
  incidents_applied: number;
}

export interface IncidentOut {
  id: string;
  title: string;
  description: string;
  incident_type: string;
  severity: string;
  affected_station_id: string | null;
  affected_line_id: string | null;
  blocks_node: boolean;
  blocks_edge: boolean;
  time_penalty_min: number;
  lat: number | null;
  lng: number | null;
  radius_km: number;
}

export interface LineEmissionInfo {
  line_id: string;
  mode: string;
  emission_gco2_per_km: number;
}

export function stationToOut(s: StationData): StationOut {
  return {
    id: s.id,
    name: s.name,
    lat: s.lat,
    lng: s.lng,
    lines: s.lines,
    is_landmark: s.is_landmark,
    zone: s.zone,
  };
}

function computeSegmentCo2(seg: SegmentResult): number {
  if (seg.co2_grams > 0) return seg.co2_grams;
  const line = LINE_LOOKUP[seg.line];
  const factor = line ? line.emission_gco2_per_km : 0;
  return factor * seg.distance_km;
}

export function buildRouteResponse(
  result: RouteSearchResult,
  algorithm: string,
  elapsedMs: number,
  incidentsApplied: number,
): RouteResultOut {
  const segmentsOut: RouteSegmentOut[] = [];
  const segmentCo2List: number[] = [];

  for (const seg of result.segments) {
    const co2 = computeSegmentCo2(seg);
    segmentCo2List.push(Math.round(co2 * 100) / 100);

    segmentsOut.push({
      from_station: stationToOut(seg.from_station),
      to_station: stationToOut(seg.to_station),
      line: seg.line,
      mode: seg.mode,
      travel_time_min: seg.travel_time_min,
      distance_km: seg.distance_km,
      co2_grams: Math.round(co2 * 100) / 100,
      intermediate_stations: seg.intermediate_stations.map(stationToOut),
    });
  }

  const totalCo2 =
    result.total_co2_grams > 0
      ? result.total_co2_grams
      : segmentCo2List.reduce((a, b) => a + b, 0);

  const carEquivalent =
    PRIVATE_CAR_EMISSION_GRAMS_PER_KM * result.total_distance_km;
  const co2Saved = carEquivalent - totalCo2;
  const co2SavedPct =
    carEquivalent > 0 ? (co2Saved / carEquivalent) * 100 : 0;

  const emissions: EmissionBreakdown = {
    segment_co2_grams: segmentCo2List,
    total_co2_grams: Math.round(totalCo2 * 100) / 100,
    car_equivalent_co2_grams: Math.round(carEquivalent * 100) / 100,
    co2_saved_grams: Math.round(co2Saved * 100) / 100,
    co2_saved_percent: Math.round(co2SavedPct * 10) / 10,
  };

  const stationsVisited: StationOut[] = result.visited_ids
    .map((id) => transitGraph.getStation(id))
    .filter((s): s is StationData => s !== undefined)
    .map(stationToOut);

  const pathCoordinates: [number, number][] = result.visited_ids
    .map((id) => transitGraph.getStation(id))
    .filter((s): s is StationData => s !== undefined)
    .map((s) => [s.lat, s.lng] as [number, number]);

  return {
    algorithm,
    segments: segmentsOut,
    total_time_min: result.total_time_min,
    total_distance_km: result.total_distance_km,
    total_transfers: result.total_transfers,
    stations_visited: stationsVisited,
    computation_time_ms: Math.round(elapsedMs * 100) / 100,
    path_coordinates: pathCoordinates,
    emissions,
    incidents_applied: incidentsApplied,
  };
}
