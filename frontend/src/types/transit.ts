export interface Station {
  id: string;
  name: string;
  lat: number;
  lng: number;
  lines: string[];
  is_landmark: boolean;
  zone: string;
}

export interface EmissionBreakdown {
  segment_co2_grams: number[];
  total_co2_grams: number;
  car_equivalent_co2_grams: number;
  co2_saved_grams: number;
  co2_saved_percent: number;
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  incident_type: string;
  severity: string;
  status: string;
  affected_station_id: string | null;
  affected_line_id: string | null;
  blocks_node: boolean;
  blocks_edge: boolean;
  time_penalty_min: number;
  lat: number | null;
  lng: number | null;
  radius_km: number;
}

export interface RouteSegment {
  from_station: Station;
  to_station: Station;
  line: string;
  mode: "metro" | "bus" | "walk";
  travel_time_min: number;
  distance_km: number;
  co2_grams: number;
  intermediate_stations: Station[];
}

export interface RouteResult {
  algorithm: "astar" | "bfs" | "dfs" | "eco";
  segments: RouteSegment[];
  total_time_min: number;
  total_distance_km: number;
  total_transfers: number;
  stations_visited: Station[];
  computation_time_ms: number;
  path_coordinates: [number, number][];
  emissions: EmissionBreakdown;
  incidents_applied: number;
}

export interface SearchRequest {
  origin_id: string;
  destination_id: string;
  algorithm: "astar" | "bfs" | "dfs";
  via_stations?: string[];
  max_time_min?: number;
}

export interface CustomLocation {
  lat: number;
  lng: number;
  label: string;
}

export interface NearestStationResult {
  station: Station;
  distance_km: number;
  walk_time_min: number;
}

export interface WalkingLeg {
  from: { lat: number; lng: number; label: string };
  to: { lat: number; lng: number; label: string };
  distance_km: number;
  walk_time_min: number;
}

export type AlgorithmType = "astar" | "bfs" | "dfs" | "eco";

export const ALGORITHM_META: Record<
  AlgorithmType,
  { label: string; color: string; glow: string; description: string }
> = {
  astar: {
    label: "A* \u2014 Fastest Route",
    color: "#06b6d4",
    glow: "rgba(6, 182, 212, 0.3)",
    description: "Finds the quickest path using Haversine heuristic",
  },
  bfs: {
    label: "BFS \u2014 Min Transfers",
    color: "#d946ef",
    glow: "rgba(217, 70, 239, 0.3)",
    description: "Minimizes line changes regardless of distance",
  },
  dfs: {
    label: "DFS \u2014 Sightseeing",
    color: "#10b981",
    glow: "rgba(16, 185, 129, 0.3)",
    description: "Visit landmarks via a constrained exploratory path",
  },
  eco: {
    label: "Eco \u2014 Lowest Carbon",
    color: "#22c55e",
    glow: "rgba(34, 197, 94, 0.3)",
    description: "Minimizes CO\u2082 emissions, prefers electric metro",
  },
};
