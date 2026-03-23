export const PRIVATE_CAR_EMISSION_GRAMS_PER_KM = 192.0;

export interface StationData {
  id: string;
  name: string;
  lat: number;
  lng: number;
  lines: string[];
  is_landmark: boolean;
  zone: string;
}

export interface EdgeData {
  from_id: string;
  to_id: string;
  line_id: string;
  distance_km: number;
  travel_time_min: number;
  bidirectional: boolean;
}

export interface LineData {
  id: string;
  name: string;
  color: string;
  mode: string;
  emission_gco2_per_km: number;
}

export interface IncidentData {
  id: string;
  title: string;
  incident_type: string;
  severity: string;
  affected_station_id: string | null;
  affected_edge_from: string | null;
  affected_edge_to: string | null;
  affected_line_id: string | null;
  blocks_node: boolean;
  blocks_edge: boolean;
  time_penalty_min: number;
  lat: number | null;
  lng: number | null;
  radius_km: number;
}

export interface GraphEdge {
  to_node_id: string;
  line_id: string;
  distance_km: number;
  travel_time_min: number;
  emission_gco2_per_km: number;
}

interface GraphNode {
  station: StationData;
  neighbors: GraphEdge[];
}

// ---------------------------------------------------------------------------
// Lines
// ---------------------------------------------------------------------------

export const LINES: LineData[] = [
  { id: "BL", name: "Blue Line", color: "#06b6d4", mode: "metro", emission_gco2_per_km: 17.0 },
  { id: "GL", name: "Green Line", color: "#22c55e", mode: "metro", emission_gco2_per_km: 17.0 },
  { id: "MTC21", name: "Bus 21 (Broadway–T.Nagar)", color: "#f59e0b", mode: "bus", emission_gco2_per_km: 89.0 },
  { id: "MTC27", name: "Bus 27 (Central–Adyar)", color: "#ef4444", mode: "bus", emission_gco2_per_km: 89.0 },
  { id: "MTC29C", name: "Bus 29C (CMBT–Thiruvanmiyur)", color: "#a855f7", mode: "bus", emission_gco2_per_km: 89.0 },
  { id: "WALK", name: "Walking Transfer", color: "#94a3b8", mode: "walk", emission_gco2_per_km: 0.0 },
];

export const LINE_LOOKUP: Record<string, LineData> = {};
for (const l of LINES) {
  LINE_LOOKUP[l.id] = l;
}

// ---------------------------------------------------------------------------
// Stations (61 total)
// ---------------------------------------------------------------------------

export const STATIONS: StationData[] = [
  // Blue Line BL01–BL30
  { id: "BL01", name: "Wimco Nagar", lat: 13.1530, lng: 80.3054, lines: ["BL"], is_landmark: false, zone: "" },
  { id: "BL02", name: "Thiruvottiyur", lat: 13.1568, lng: 80.3002, lines: ["BL"], is_landmark: false, zone: "" },
  { id: "BL03", name: "Thiruvottiyur Theradi", lat: 13.1526, lng: 80.2942, lines: ["BL"], is_landmark: false, zone: "" },
  { id: "BL04", name: "Kaladipet", lat: 13.1440, lng: 80.2870, lines: ["BL"], is_landmark: false, zone: "" },
  { id: "BL05", name: "Tollgate", lat: 13.1365, lng: 80.2793, lines: ["BL"], is_landmark: false, zone: "" },
  { id: "BL06", name: "New Washermenpet", lat: 13.1260, lng: 80.2730, lines: ["BL"], is_landmark: false, zone: "" },
  { id: "BL07", name: "Tondiarpet", lat: 13.1180, lng: 80.2700, lines: ["BL"], is_landmark: false, zone: "" },
  { id: "BL08", name: "Sir Theagaraya College", lat: 13.1120, lng: 80.2650, lines: ["BL"], is_landmark: false, zone: "" },
  { id: "BL09", name: "Washermenpet", lat: 13.1093, lng: 80.2604, lines: ["BL"], is_landmark: false, zone: "" },
  { id: "BL10", name: "Mannadi", lat: 13.0980, lng: 80.2870, lines: ["BL"], is_landmark: true, zone: "George Town" },
  { id: "BL11", name: "High Court", lat: 13.0880, lng: 80.2870, lines: ["BL"], is_landmark: true, zone: "" },
  { id: "BL12", name: "Chennai Central", lat: 13.0827, lng: 80.2752, lines: ["BL", "GL"], is_landmark: true, zone: "Central" },
  { id: "BL13", name: "Egmore", lat: 13.0732, lng: 80.2609, lines: ["BL"], is_landmark: true, zone: "Egmore" },
  { id: "BL14", name: "Nehru Park", lat: 13.0660, lng: 80.2560, lines: ["BL"], is_landmark: false, zone: "" },
  { id: "BL15", name: "Kilpauk Medical College", lat: 13.0610, lng: 80.2490, lines: ["BL"], is_landmark: false, zone: "" },
  { id: "BL16", name: "Pachaiyappas College", lat: 13.0741, lng: 80.2399, lines: ["BL"], is_landmark: false, zone: "" },
  { id: "BL17", name: "Shenoy Nagar", lat: 13.0785, lng: 80.2278, lines: ["BL"], is_landmark: false, zone: "" },
  { id: "BL18", name: "Anna Nagar East", lat: 13.0850, lng: 80.2190, lines: ["BL"], is_landmark: false, zone: "" },
  { id: "BL19", name: "Anna Nagar Tower", lat: 13.0870, lng: 80.2100, lines: ["BL"], is_landmark: true, zone: "" },
  { id: "BL20", name: "Thirumangalam", lat: 13.0855, lng: 80.1990, lines: ["BL"], is_landmark: false, zone: "" },
  { id: "BL21", name: "Koyambedu (CMBT)", lat: 13.0693, lng: 80.1976, lines: ["BL", "MTC29C"], is_landmark: true, zone: "Koyambedu" },
  { id: "BL22", name: "CMBT", lat: 13.0670, lng: 80.1950, lines: ["BL"], is_landmark: false, zone: "" },
  { id: "BL23", name: "Arumbakkam", lat: 13.0619, lng: 80.2106, lines: ["BL"], is_landmark: false, zone: "" },
  { id: "BL24", name: "Vadapalani", lat: 13.0500, lng: 80.2124, lines: ["BL"], is_landmark: true, zone: "" },
  { id: "BL25", name: "Ashok Nagar", lat: 13.0380, lng: 80.2140, lines: ["BL"], is_landmark: false, zone: "" },
  { id: "BL26", name: "Ekkattuthangal", lat: 13.0250, lng: 80.2060, lines: ["BL"], is_landmark: false, zone: "" },
  { id: "BL27", name: "Alandur", lat: 13.0027, lng: 80.2008, lines: ["BL", "GL"], is_landmark: true, zone: "" },
  { id: "BL28", name: "Nanganallur Road", lat: 12.9850, lng: 80.1960, lines: ["BL"], is_landmark: false, zone: "" },
  { id: "BL29", name: "Meenambakkam", lat: 12.9770, lng: 80.1880, lines: ["BL"], is_landmark: false, zone: "" },
  { id: "BL30", name: "Chennai Airport", lat: 12.9816, lng: 80.1640, lines: ["BL"], is_landmark: true, zone: "Airport" },

  // Green Line GL02–GL12 (BL12 and BL27 are shared; GL11 is skipped in the data)
  { id: "GL02", name: "Government Estate", lat: 13.0730, lng: 80.2790, lines: ["GL"], is_landmark: false, zone: "" },
  { id: "GL03", name: "LIC", lat: 13.0680, lng: 80.2800, lines: ["GL"], is_landmark: false, zone: "" },
  { id: "GL04", name: "Thousand Lights", lat: 13.0580, lng: 80.2700, lines: ["GL"], is_landmark: true, zone: "" },
  { id: "GL05", name: "AG-DMS", lat: 13.0507, lng: 80.2534, lines: ["GL"], is_landmark: false, zone: "" },
  { id: "GL06", name: "Teynampet", lat: 13.0410, lng: 80.2490, lines: ["GL"], is_landmark: false, zone: "" },
  { id: "GL07", name: "Nandanam", lat: 13.0300, lng: 80.2410, lines: ["GL"], is_landmark: false, zone: "" },
  { id: "GL08", name: "Saidapet", lat: 13.0200, lng: 80.2300, lines: ["GL"], is_landmark: false, zone: "" },
  { id: "GL09", name: "Guindy", lat: 13.0100, lng: 80.2200, lines: ["GL"], is_landmark: true, zone: "Guindy" },
  { id: "GL10", name: "Little Mount", lat: 13.0140, lng: 80.2110, lines: ["GL"], is_landmark: false, zone: "" },
  { id: "GL12", name: "St. Thomas Mount", lat: 13.0010, lng: 80.1960, lines: ["GL"], is_landmark: true, zone: "" },

  // Bus 21 (MTC21) B21_01–B21_08
  { id: "B21_01", name: "Broadway (Bus)", lat: 13.0910, lng: 80.2810, lines: ["MTC21"], is_landmark: true, zone: "George Town" },
  { id: "B21_02", name: "Parrys Corner", lat: 13.0870, lng: 80.2870, lines: ["MTC21"], is_landmark: true, zone: "" },
  { id: "B21_03", name: "Central (Bus)", lat: 13.0830, lng: 80.2755, lines: ["MTC21"], is_landmark: false, zone: "" },
  { id: "B21_04", name: "Egmore (Bus)", lat: 13.0735, lng: 80.2612, lines: ["MTC21"], is_landmark: false, zone: "" },
  { id: "B21_05", name: "Chetpet", lat: 13.0664, lng: 80.2436, lines: ["MTC21"], is_landmark: false, zone: "" },
  { id: "B21_06", name: "Nungambakkam", lat: 13.0580, lng: 80.2350, lines: ["MTC21"], is_landmark: false, zone: "" },
  { id: "B21_07", name: "Kodambakkam", lat: 13.0520, lng: 80.2220, lines: ["MTC21"], is_landmark: false, zone: "" },
  { id: "B21_08", name: "T. Nagar", lat: 13.0400, lng: 80.2340, lines: ["MTC21"], is_landmark: true, zone: "T. Nagar" },

  // Bus 27 (MTC27) B27_01–B27_06
  { id: "B27_01", name: "Central (Bus 27)", lat: 13.0828, lng: 80.2753, lines: ["MTC27"], is_landmark: false, zone: "" },
  { id: "B27_02", name: "Triplicane", lat: 13.0580, lng: 80.2730, lines: ["MTC27"], is_landmark: false, zone: "" },
  { id: "B27_03", name: "Mylapore", lat: 13.0340, lng: 80.2690, lines: ["MTC27"], is_landmark: true, zone: "" },
  { id: "B27_04", name: "Mandaveli", lat: 13.0240, lng: 80.2640, lines: ["MTC27"], is_landmark: false, zone: "" },
  { id: "B27_05", name: "R.A. Puram", lat: 13.0200, lng: 80.2580, lines: ["MTC27"], is_landmark: false, zone: "" },
  { id: "B27_06", name: "Adyar", lat: 13.0060, lng: 80.2560, lines: ["MTC27"], is_landmark: true, zone: "Adyar" },

  // Bus 29C (MTC29C) B29C_01–B29C_07
  { id: "B29C_01", name: "CMBT (Bus 29C)", lat: 13.0695, lng: 80.1980, lines: ["MTC29C"], is_landmark: false, zone: "" },
  { id: "B29C_02", name: "Vadapalani (Bus)", lat: 13.0502, lng: 80.2126, lines: ["MTC29C"], is_landmark: false, zone: "" },
  { id: "B29C_03", name: "Ashok Nagar (Bus)", lat: 13.0382, lng: 80.2142, lines: ["MTC29C"], is_landmark: false, zone: "" },
  { id: "B29C_04", name: "T. Nagar (Bus 29C)", lat: 13.0402, lng: 80.2342, lines: ["MTC29C"], is_landmark: false, zone: "" },
  { id: "B29C_05", name: "Alwarpet", lat: 13.0330, lng: 80.2500, lines: ["MTC29C"], is_landmark: false, zone: "" },
  { id: "B29C_06", name: "Mylapore (Bus 29C)", lat: 13.0342, lng: 80.2692, lines: ["MTC29C"], is_landmark: false, zone: "" },
  { id: "B29C_07", name: "Thiruvanmiyur", lat: 12.9900, lng: 80.2640, lines: ["MTC29C"], is_landmark: true, zone: "" },
];

// ---------------------------------------------------------------------------
// Sample incidents
// ---------------------------------------------------------------------------

export const SAMPLE_INCIDENTS: IncidentData[] = [
  {
    id: "INC001",
    title: "Flooding near Washermenpet",
    incident_type: "flooding",
    severity: "high",
    affected_station_id: "BL09",
    affected_edge_from: null,
    affected_edge_to: null,
    affected_line_id: null,
    blocks_node: true,
    blocks_edge: false,
    time_penalty_min: 0.0,
    lat: 13.1093,
    lng: 80.2604,
    radius_km: 0.3,
  },
  {
    id: "INC002",
    title: "Track maintenance between Alandur and Nanganallur",
    incident_type: "maintenance",
    severity: "medium",
    affected_station_id: null,
    affected_edge_from: "BL27",
    affected_edge_to: "BL28",
    affected_line_id: "BL",
    blocks_node: false,
    blocks_edge: false,
    time_penalty_min: 12.0,
    lat: 12.9938,
    lng: 80.1984,
    radius_km: 0.5,
  },
  {
    id: "INC003",
    title: "Signal failure at Guindy station",
    incident_type: "accident",
    severity: "critical",
    affected_station_id: "GL09",
    affected_edge_from: null,
    affected_edge_to: null,
    affected_line_id: null,
    blocks_node: false,
    blocks_edge: false,
    time_penalty_min: 8.0,
    lat: 13.0100,
    lng: 80.2200,
    radius_km: 0.2,
  },
  {
    id: "INC004",
    title: "Heavy rain causing bus delays on Route 27",
    incident_type: "weather",
    severity: "medium",
    affected_station_id: null,
    affected_edge_from: null,
    affected_edge_to: null,
    affected_line_id: "MTC27",
    blocks_node: false,
    blocks_edge: false,
    time_penalty_min: 15.0,
    lat: 13.0340,
    lng: 80.2690,
    radius_km: 1.0,
  },
  {
    id: "INC005",
    title: "Security check at Chennai Central",
    incident_type: "security",
    severity: "low",
    affected_station_id: "BL12",
    affected_edge_from: null,
    affected_edge_to: null,
    affected_line_id: null,
    blocks_node: false,
    blocks_edge: false,
    time_penalty_min: 5.0,
    lat: 13.0827,
    lng: 80.2752,
    radius_km: 0.2,
  },
];

// ---------------------------------------------------------------------------
// Haversine helper (returns km)
// ---------------------------------------------------------------------------

function _haversineCoords(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371.0;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ---------------------------------------------------------------------------
// Edge generation
// ---------------------------------------------------------------------------

const _stationLookup = new Map<string, StationData>();
for (const s of STATIONS) {
  _stationLookup.set(s.id, s);
}

function _travelTime(distKm: number, mode: string): number {
  if (mode === "metro") return (distKm / 33.0) * 60 + 0.5;
  if (mode === "bus") return (distKm / 15.0) * 60 + 1.0;
  return (distKm / 5.0) * 60; // walk
}

function _generateSequenceEdges(
  stationIds: string[],
  lineId: string,
  mode: string,
): EdgeData[] {
  const edges: EdgeData[] = [];
  for (let i = 0; i < stationIds.length - 1; i++) {
    const from = _stationLookup.get(stationIds[i])!;
    const to = _stationLookup.get(stationIds[i + 1])!;
    const dist = _haversineCoords(from.lat, from.lng, to.lat, to.lng);
    edges.push({
      from_id: stationIds[i],
      to_id: stationIds[i + 1],
      line_id: lineId,
      distance_km: dist,
      travel_time_min: _travelTime(dist, mode),
      bidirectional: true,
    });
  }
  return edges;
}

function _generateWalkEdge(idA: string, idB: string): EdgeData {
  const a = _stationLookup.get(idA)!;
  const b = _stationLookup.get(idB)!;
  const dist = _haversineCoords(a.lat, a.lng, b.lat, b.lng);
  const walkTime = _travelTime(dist, "walk");
  return {
    from_id: idA,
    to_id: idB,
    line_id: "WALK",
    distance_km: dist,
    travel_time_min: Math.max(3.0, walkTime),
    bidirectional: true,
  };
}

const BLUE_LINE_SEQ = [
  "BL01", "BL02", "BL03", "BL04", "BL05", "BL06", "BL07", "BL08", "BL09",
  "BL10", "BL11", "BL12", "BL13", "BL14", "BL15", "BL16", "BL17", "BL18",
  "BL19", "BL20", "BL21", "BL22", "BL23", "BL24", "BL25", "BL26", "BL27",
  "BL28", "BL29", "BL30",
];

const GREEN_LINE_SEQ = [
  "BL12", "GL02", "GL03", "GL04", "GL05", "GL06", "GL07", "GL08", "GL09",
  "GL10", "BL27", "GL12",
];

const BUS21_SEQ = [
  "B21_01", "B21_02", "B21_03", "B21_04", "B21_05", "B21_06", "B21_07", "B21_08",
];

const BUS27_SEQ = [
  "B27_01", "B27_02", "B27_03", "B27_04", "B27_05", "B27_06",
];

const BUS29C_SEQ = [
  "B29C_01", "B29C_02", "B29C_03", "B29C_04", "B29C_05", "B29C_06", "B29C_07",
];

const WALKING_TRANSFERS: [string, string][] = [
  ["BL12", "B21_03"],
  ["BL12", "B27_01"],
  ["BL13", "B21_04"],
  ["BL21", "B29C_01"],
  ["BL24", "B29C_02"],
  ["BL25", "B29C_03"],
  ["B21_08", "B29C_04"],
  ["B27_03", "B29C_06"],
  ["GL04", "B21_06"],
  ["GL06", "B21_08"],
  ["GL09", "B27_06"],
];

export const EDGES: EdgeData[] = [
  ..._generateSequenceEdges(BLUE_LINE_SEQ, "BL", "metro"),
  ..._generateSequenceEdges(GREEN_LINE_SEQ, "GL", "metro"),
  ..._generateSequenceEdges(BUS21_SEQ, "MTC21", "bus"),
  ..._generateSequenceEdges(BUS27_SEQ, "MTC27", "bus"),
  ..._generateSequenceEdges(BUS29C_SEQ, "MTC29C", "bus"),
  ...WALKING_TRANSFERS.map(([a, b]) => _generateWalkEdge(a, b)),
];

// ---------------------------------------------------------------------------
// TransitGraph
// ---------------------------------------------------------------------------

function _edgeKey(fromId: string, toId: string, lineId: string): string {
  return `${fromId}|${toId}|${lineId}`;
}

export class TransitGraph {
  nodes: Map<string, GraphNode> = new Map();

  private _blockedNodes: Set<string> = new Set();
  private _blockedEdges: Set<string> = new Set();
  private _edgePenalties: Map<string, number> = new Map();
  private _nodePenalties: Map<string, number> = new Map();
  private _activeIncidents: IncidentData[] = [];

  constructor() {
    this._build();
  }

  private _build(): void {
    for (const station of STATIONS) {
      this.nodes.set(station.id, { station, neighbors: [] });
    }

    for (const edge of EDGES) {
      const line = LINE_LOOKUP[edge.line_id];
      const emissionRate = line ? line.emission_gco2_per_km : 0;

      const graphEdge: GraphEdge = {
        to_node_id: edge.to_id,
        line_id: edge.line_id,
        distance_km: edge.distance_km,
        travel_time_min: edge.travel_time_min,
        emission_gco2_per_km: emissionRate,
      };

      const fromNode = this.nodes.get(edge.from_id);
      if (fromNode) fromNode.neighbors.push(graphEdge);

      if (edge.bidirectional) {
        const reverseEdge: GraphEdge = {
          to_node_id: edge.from_id,
          line_id: edge.line_id,
          distance_km: edge.distance_km,
          travel_time_min: edge.travel_time_min,
          emission_gco2_per_km: emissionRate,
        };
        const toNode = this.nodes.get(edge.to_id);
        if (toNode) toNode.neighbors.push(reverseEdge);
      }
    }
  }

  // -- Incident management --------------------------------------------------

  applyIncidents(incidents: IncidentData[]): void {
    this.resetIncidents();
    this._activeIncidents = [...incidents];

    for (const inc of incidents) {
      if (inc.blocks_node && inc.affected_station_id) {
        this._blockedNodes.add(inc.affected_station_id);
      }

      if (inc.blocks_edge && inc.affected_edge_from && inc.affected_edge_to) {
        const lineId = inc.affected_line_id ?? "";
        this._blockedEdges.add(_edgeKey(inc.affected_edge_from, inc.affected_edge_to, lineId));
        this._blockedEdges.add(_edgeKey(inc.affected_edge_to, inc.affected_edge_from, lineId));
      }

      if (inc.time_penalty_min > 0) {
        if (inc.affected_station_id) {
          const existing = this._nodePenalties.get(inc.affected_station_id) ?? 0;
          this._nodePenalties.set(
            inc.affected_station_id,
            existing + inc.time_penalty_min,
          );
        }

        if (inc.affected_edge_from && inc.affected_edge_to) {
          const lineId = inc.affected_line_id ?? "";
          const fwdKey = _edgeKey(inc.affected_edge_from, inc.affected_edge_to, lineId);
          const revKey = _edgeKey(inc.affected_edge_to, inc.affected_edge_from, lineId);
          this._edgePenalties.set(
            fwdKey,
            (this._edgePenalties.get(fwdKey) ?? 0) + inc.time_penalty_min,
          );
          this._edgePenalties.set(
            revKey,
            (this._edgePenalties.get(revKey) ?? 0) + inc.time_penalty_min,
          );
        }

        if (
          inc.affected_line_id &&
          !inc.affected_edge_from &&
          !inc.affected_edge_to
        ) {
          for (const edge of EDGES) {
            if (edge.line_id === inc.affected_line_id) {
              const fwdKey = _edgeKey(edge.from_id, edge.to_id, edge.line_id);
              const revKey = _edgeKey(edge.to_id, edge.from_id, edge.line_id);
              this._edgePenalties.set(
                fwdKey,
                (this._edgePenalties.get(fwdKey) ?? 0) + inc.time_penalty_min,
              );
              if (edge.bidirectional) {
                this._edgePenalties.set(
                  revKey,
                  (this._edgePenalties.get(revKey) ?? 0) + inc.time_penalty_min,
                );
              }
            }
          }
        }
      }
    }
  }

  resetIncidents(): void {
    this._blockedNodes.clear();
    this._blockedEdges.clear();
    this._edgePenalties.clear();
    this._nodePenalties.clear();
    this._activeIncidents = [];
  }

  // -- Query helpers --------------------------------------------------------

  isNodeBlocked(stationId: string): boolean {
    return this._blockedNodes.has(stationId);
  }

  getNodePenalty(stationId: string): number {
    return this._nodePenalties.get(stationId) ?? 0;
  }

  isEdgeBlocked(fromId: string, toId: string, lineId: string): boolean {
    return this._blockedEdges.has(_edgeKey(fromId, toId, lineId));
  }

  getEdgePenalty(fromId: string, toId: string, lineId: string): number {
    return this._edgePenalties.get(_edgeKey(fromId, toId, lineId)) ?? 0;
  }

  getEffectiveTravelTime(fromId: string, edge: GraphEdge): number {
    return (
      edge.travel_time_min +
      this.getEdgePenalty(fromId, edge.to_node_id, edge.line_id) +
      this.getNodePenalty(edge.to_node_id)
    );
  }

  // -- CO₂ helpers ----------------------------------------------------------

  computeEdgeCo2(edge: GraphEdge): number {
    return edge.emission_gco2_per_km * edge.distance_km;
  }

  computeCarEquivalentCo2(distanceKm: number): number {
    return PRIVATE_CAR_EMISSION_GRAMS_PER_KM * distanceKm;
  }

  // -- Graph access ---------------------------------------------------------

  getStation(stationId: string): StationData | undefined {
    return this.nodes.get(stationId)?.station;
  }

  getAllStations(): StationData[] {
    return Array.from(this.nodes.values()).map((n) => n.station);
  }

  getNeighbors(stationId: string): GraphEdge[] {
    return this.nodes.get(stationId)?.neighbors ?? [];
  }

  getTraversableNeighbors(stationId: string): GraphEdge[] {
    return this.getNeighbors(stationId).filter(
      (edge) =>
        !this.isNodeBlocked(edge.to_node_id) &&
        !this.isEdgeBlocked(stationId, edge.to_node_id, edge.line_id),
    );
  }

  haversine(idA: string, idB: string): number {
    const a = this.nodes.get(idA)?.station;
    const b = this.nodes.get(idB)?.station;
    if (!a || !b) return Infinity;
    return _haversineCoords(a.lat, a.lng, b.lat, b.lng);
  }

  get stationCount(): number {
    return this.nodes.size;
  }

  get edgeCount(): number {
    let count = 0;
    for (const node of this.nodes.values()) {
      count += node.neighbors.length;
    }
    return count;
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

export const transitGraph = new TransitGraph();
