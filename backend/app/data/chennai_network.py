"""
Chennai Metro + Bus transit network dataset.

Real-world station coordinates for:
  - Blue Line (BL): Wimco Nagar ↔ Chennai International Airport
  - Green Line (GL): Central Metro (CMBT extension planned) ↔ St. Thomas Mount
  - Major bus routes (MTC) connecting key interchanges

Edges carry travel_time_min, distance_km, and emission_gco2_per_km.
Transfer edges link stations that share a physical interchange.

CO₂ emission factors (grams per passenger-km, sourced from IEA/CSTEP):
  - Electric metro:  ~17 g/km  (Chennai Metro uses 25kV AC overhead)
  - Diesel bus (MTC): ~89 g/km  (moderate-occupancy diesel)
  - Walking:           0 g/km
  - Private car:     ~192 g/km  (benchmark for savings calculation)
"""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional
import math

PRIVATE_CAR_EMISSION_GRAMS_PER_KM = 192.0

# ──────────────────────────── Data Classes ────────────────────────────

@dataclass
class StationData:
    id: str
    name: str
    lat: float
    lng: float
    lines: list[str]
    is_landmark: bool = False
    zone: str = ""


@dataclass
class EdgeData:
    from_id: str
    to_id: str
    line_id: str
    distance_km: float
    travel_time_min: float
    bidirectional: bool = True


@dataclass
class LineData:
    id: str
    name: str
    color: str
    mode: str  # metro | bus | walk
    emission_gco2_per_km: float = 0.0


@dataclass
class IncidentData:
    """In-memory representation of a network disruption."""
    id: str
    title: str
    incident_type: str
    severity: str
    affected_station_id: str | None = None
    affected_edge_from: str | None = None
    affected_edge_to: str | None = None
    affected_line_id: str | None = None
    blocks_node: bool = False
    blocks_edge: bool = False
    time_penalty_min: float = 0.0
    lat: float | None = None
    lng: float | None = None
    radius_km: float = 0.5


# ──────────────────────────── Transit Lines ────────────────────────────

LINES: list[LineData] = [
    LineData("BL", "Blue Line", "#06b6d4", "metro", emission_gco2_per_km=17.0),
    LineData("GL", "Green Line", "#22c55e", "metro", emission_gco2_per_km=17.0),
    LineData("MTC21", "Bus 21 (Broadway–T.Nagar)", "#f59e0b", "bus", emission_gco2_per_km=89.0),
    LineData("MTC27", "Bus 27 (Central–Adyar)", "#ef4444", "bus", emission_gco2_per_km=89.0),
    LineData("MTC29C", "Bus 29C (CMBT–Thiruvanmiyur)", "#a855f7", "bus", emission_gco2_per_km=89.0),
    LineData("WALK", "Walking Transfer", "#94a3b8", "walk", emission_gco2_per_km=0.0),
]

LINE_LOOKUP: dict[str, LineData] = {ln.id: ln for ln in LINES}

# ──────────────────────────── Sample Incidents ────────────────────────────

SAMPLE_INCIDENTS: list[IncidentData] = [
    IncidentData(
        id="INC001",
        title="Flooding near Washermenpet",
        incident_type="flooding",
        severity="high",
        affected_station_id="BL09",
        blocks_node=True,
        lat=13.1093, lng=80.2604,
        radius_km=0.3,
    ),
    IncidentData(
        id="INC002",
        title="Track maintenance between Alandur and Nanganallur",
        incident_type="maintenance",
        severity="medium",
        affected_edge_from="BL27",
        affected_edge_to="BL28",
        affected_line_id="BL",
        blocks_edge=False,
        time_penalty_min=12.0,
        lat=12.9938, lng=80.1984,
        radius_km=0.5,
    ),
    IncidentData(
        id="INC003",
        title="Signal failure at Guindy station",
        incident_type="accident",
        severity="critical",
        affected_station_id="GL09",
        blocks_node=False,
        time_penalty_min=8.0,
        lat=13.0100, lng=80.2200,
        radius_km=0.2,
    ),
    IncidentData(
        id="INC004",
        title="Heavy rain causing bus delays on Route 27",
        incident_type="weather",
        severity="medium",
        affected_line_id="MTC27",
        blocks_edge=False,
        time_penalty_min=15.0,
        lat=13.0340, lng=80.2690,
        radius_km=1.0,
    ),
    IncidentData(
        id="INC005",
        title="Security check at Chennai Central",
        incident_type="security",
        severity="low",
        affected_station_id="BL12",
        blocks_node=False,
        time_penalty_min=5.0,
        lat=13.0827, lng=80.2752,
        radius_km=0.2,
    ),
]


# ──────────────────────────── Stations ────────────────────────────

STATIONS: list[StationData] = [
    # ── Blue Line (BL) — Wimco Nagar to Airport ──
    StationData("BL01", "Wimco Nagar", 13.1530, 80.3054, ["BL"]),
    StationData("BL02", "Thiruvottiyur", 13.1568, 80.3002, ["BL"]),
    StationData("BL03", "Thiruvottiyur Theradi", 13.1526, 80.2942, ["BL"]),
    StationData("BL04", "Kaladipet", 13.1440, 80.2870, ["BL"]),
    StationData("BL05", "Tollgate", 13.1365, 80.2793, ["BL"]),
    StationData("BL06", "New Washermenpet", 13.1260, 80.2730, ["BL"]),
    StationData("BL07", "Tondiarpet", 13.1180, 80.2700, ["BL"]),
    StationData("BL08", "Sir Theagaraya College", 13.1120, 80.2650, ["BL"]),
    StationData("BL09", "Washermenpet", 13.1093, 80.2604, ["BL"]),
    StationData("BL10", "Mannadi", 13.0980, 80.2870, ["BL"], is_landmark=True, zone="George Town"),
    StationData("BL11", "High Court", 13.0880, 80.2870, ["BL"], is_landmark=True),
    StationData("BL12", "Chennai Central", 13.0827, 80.2752, ["BL", "GL"], is_landmark=True, zone="Central"),
    StationData("BL13", "Egmore", 13.0732, 80.2609, ["BL"], is_landmark=True, zone="Egmore"),
    StationData("BL14", "Nehru Park", 13.0660, 80.2560, ["BL"]),
    StationData("BL15", "Kilpauk Medical College", 13.0610, 80.2490, ["BL"]),
    StationData("BL16", "Pachaiyappas College", 13.0741, 80.2399, ["BL"]),
    StationData("BL17", "Shenoy Nagar", 13.0785, 80.2278, ["BL"]),
    StationData("BL18", "Anna Nagar East", 13.0850, 80.2190, ["BL"]),
    StationData("BL19", "Anna Nagar Tower", 13.0870, 80.2100, ["BL"], is_landmark=True),
    StationData("BL20", "Thirumangalam", 13.0855, 80.1990, ["BL"]),
    StationData("BL21", "Koyambedu (CMBT)", 13.0693, 80.1976, ["BL", "MTC29C"], is_landmark=True, zone="Koyambedu"),
    StationData("BL22", "CMBT", 13.0670, 80.1950, ["BL"]),
    StationData("BL23", "Arumbakkam", 13.0619, 80.2106, ["BL"]),
    StationData("BL24", "Vadapalani", 13.0500, 80.2124, ["BL"], is_landmark=True),
    StationData("BL25", "Ashok Nagar", 13.0380, 80.2140, ["BL"]),
    StationData("BL26", "Ekkattuthangal", 13.0250, 80.2060, ["BL"]),
    StationData("BL27", "Alandur", 13.0027, 80.2008, ["BL", "GL"], is_landmark=True),
    StationData("BL28", "Nanganallur Road", 12.9850, 80.1960, ["BL"]),
    StationData("BL29", "Meenambakkam", 12.9770, 80.1880, ["BL"]),
    StationData("BL30", "Chennai Airport", 12.9816, 80.1640, ["BL"], is_landmark=True, zone="Airport"),

    # ── Green Line (GL) — Chennai Central to St. Thomas Mount ──
    StationData("GL02", "Government Estate", 13.0730, 80.2790, ["GL"]),
    StationData("GL03", "LIC", 13.0680, 80.2800, ["GL"]),
    StationData("GL04", "Thousand Lights", 13.0580, 80.2700, ["GL"], is_landmark=True),
    StationData("GL05", "AG-DMS", 13.0507, 80.2534, ["GL"]),
    StationData("GL06", "Teynampet", 13.0410, 80.2490, ["GL"]),
    StationData("GL07", "Nandanam", 13.0300, 80.2410, ["GL"]),
    StationData("GL08", "Saidapet", 13.0200, 80.2300, ["GL"]),
    StationData("GL09", "Guindy", 13.0100, 80.2200, ["GL"], is_landmark=True, zone="Guindy"),
    StationData("GL10", "Little Mount", 13.0140, 80.2110, ["GL"]),
    StationData("GL12", "St. Thomas Mount", 13.0010, 80.1960, ["GL"], is_landmark=True),

    # ── Bus Route 21: Broadway ↔ T.Nagar ──
    StationData("B21_01", "Broadway (Bus)", 13.0910, 80.2810, ["MTC21"], is_landmark=True, zone="George Town"),
    StationData("B21_02", "Parrys Corner", 13.0870, 80.2870, ["MTC21"], is_landmark=True),
    StationData("B21_03", "Central (Bus)", 13.0830, 80.2755, ["MTC21"]),
    StationData("B21_04", "Egmore (Bus)", 13.0735, 80.2612, ["MTC21"]),
    StationData("B21_05", "Chetpet", 13.0664, 80.2436, ["MTC21"]),
    StationData("B21_06", "Nungambakkam", 13.0580, 80.2350, ["MTC21"]),
    StationData("B21_07", "Kodambakkam", 13.0520, 80.2220, ["MTC21"]),
    StationData("B21_08", "T. Nagar", 13.0400, 80.2340, ["MTC21"], is_landmark=True, zone="T. Nagar"),

    # ── Bus Route 27: Central ↔ Adyar ──
    StationData("B27_01", "Central (Bus 27)", 13.0828, 80.2753, ["MTC27"]),
    StationData("B27_02", "Triplicane", 13.0580, 80.2730, ["MTC27"]),
    StationData("B27_03", "Mylapore", 13.0340, 80.2690, ["MTC27"], is_landmark=True),
    StationData("B27_04", "Mandaveli", 13.0240, 80.2640, ["MTC27"]),
    StationData("B27_05", "R.A. Puram", 13.0200, 80.2580, ["MTC27"]),
    StationData("B27_06", "Adyar", 13.0060, 80.2560, ["MTC27"], is_landmark=True, zone="Adyar"),

    # ── Bus Route 29C: CMBT ↔ Thiruvanmiyur ──
    StationData("B29C_01", "CMBT (Bus 29C)", 13.0695, 80.1980, ["MTC29C"]),
    StationData("B29C_02", "Vadapalani (Bus)", 13.0502, 80.2126, ["MTC29C"]),
    StationData("B29C_03", "Ashok Nagar (Bus)", 13.0382, 80.2142, ["MTC29C"]),
    StationData("B29C_04", "T. Nagar (Bus 29C)", 13.0402, 80.2342, ["MTC29C"]),
    StationData("B29C_05", "Alwarpet", 13.0330, 80.2500, ["MTC29C"]),
    StationData("B29C_06", "Mylapore (Bus 29C)", 13.0342, 80.2692, ["MTC29C"]),
    StationData("B29C_07", "Thiruvanmiyur", 12.9900, 80.2640, ["MTC29C"], is_landmark=True),
]


# ──────────────────────────── Edges ────────────────────────────

def _km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Haversine distance in km."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlng / 2) ** 2
    )
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _metro_time(dist_km: float) -> float:
    """Average metro speed ~33 km/h + 30s station dwell."""
    return (dist_km / 33.0) * 60.0 + 0.5


def _bus_time(dist_km: float) -> float:
    """Average bus speed ~15 km/h + 1min stops."""
    return (dist_km / 15.0) * 60.0 + 1.0


def _walk_time(dist_km: float) -> float:
    """Walking at ~5 km/h."""
    return (dist_km / 5.0) * 60.0


def _sequential_edges(
    station_ids: list[str], line_id: str, speed_fn
) -> list[EdgeData]:
    """Generate edges for consecutive stations on a line."""
    _lookup = {s.id: s for s in STATIONS}
    edges = []
    for i in range(len(station_ids) - 1):
        a, b = _lookup[station_ids[i]], _lookup[station_ids[i + 1]]
        dist = _km(a.lat, a.lng, b.lat, b.lng)
        t = speed_fn(dist)
        edges.append(EdgeData(a.id, b.id, line_id, round(dist, 2), round(t, 1)))
    return edges


def _transfer_edge(sid_a: str, sid_b: str) -> EdgeData:
    """Walking transfer between nearby stations (3-5 min fixed)."""
    _lookup = {s.id: s for s in STATIONS}
    a, b = _lookup[sid_a], _lookup[sid_b]
    dist = _km(a.lat, a.lng, b.lat, b.lng)
    t = max(3.0, _walk_time(dist))
    return EdgeData(sid_a, sid_b, "WALK", round(dist, 2), round(t, 1))


# Blue Line sequence
_BL_IDS = [f"BL{i:02d}" for i in range(1, 31)]

# Green Line sequence (Central → St. Thomas Mount)
_GL_IDS = ["BL12", "GL02", "GL03", "GL04", "GL05", "GL06", "GL07", "GL08", "GL09", "GL10", "BL27", "GL12"]

# Bus route sequences
_B21_IDS = [f"B21_{i:02d}" for i in range(1, 9)]
_B27_IDS = [f"B27_{i:02d}" for i in range(1, 7)]
_B29C_IDS = [f"B29C_{i:02d}" for i in range(1, 8)]

EDGES: list[EdgeData] = []
EDGES.extend(_sequential_edges(_BL_IDS, "BL", _metro_time))
EDGES.extend(_sequential_edges(_GL_IDS, "GL", _metro_time))
EDGES.extend(_sequential_edges(_B21_IDS, "MTC21", _bus_time))
EDGES.extend(_sequential_edges(_B27_IDS, "MTC27", _bus_time))
EDGES.extend(_sequential_edges(_B29C_IDS, "MTC29C", _bus_time))

# ── Walking transfers between metro & bus at interchanges ──
EDGES.extend([
    _transfer_edge("BL12", "B21_03"),
    _transfer_edge("BL12", "B27_01"),
    _transfer_edge("BL13", "B21_04"),
    _transfer_edge("BL21", "B29C_01"),
    _transfer_edge("BL24", "B29C_02"),
    _transfer_edge("BL25", "B29C_03"),
    _transfer_edge("B21_08", "B29C_04"),
    _transfer_edge("B27_03", "B29C_06"),
    _transfer_edge("GL04", "B21_06"),
    _transfer_edge("GL06", "B21_08"),
    _transfer_edge("GL09", "B27_06"),
])


# ──────────────────────────── Graph Data Structure ────────────────────────────

@dataclass
class GraphNode:
    station: StationData
    neighbors: list[GraphEdge] = field(default_factory=list)


@dataclass
class GraphEdge:
    to_node_id: str
    line_id: str
    distance_km: float
    travel_time_min: float
    emission_gco2_per_km: float = 0.0


class TransitGraph:
    """
    Adjacency-list graph built from the Chennai transit dataset.
    Supports weighted traversal for A*, BFS, DFS, and eco-routing.

    Disruption-aware: apply_incidents() modifies edge weights and
    blocks nodes in real time. reset_incidents() restores defaults.
    """

    def __init__(self) -> None:
        self.nodes: dict[str, GraphNode] = {}
        self._blocked_nodes: set[str] = set()
        self._blocked_edges: set[tuple[str, str, str]] = set()  # (from, to, line)
        self._edge_penalties: dict[tuple[str, str, str], float] = {}
        self._node_penalties: dict[str, float] = {}
        self._active_incidents: list[IncidentData] = []
        self._build()

    def _build(self) -> None:
        for s in STATIONS:
            self.nodes[s.id] = GraphNode(station=s)

        for e in EDGES:
            line = LINE_LOOKUP.get(e.line_id)
            emission = line.emission_gco2_per_km if line else 0.0

            if e.from_id in self.nodes:
                self.nodes[e.from_id].neighbors.append(
                    GraphEdge(e.to_id, e.line_id, e.distance_km, e.travel_time_min, emission)
                )
            if e.bidirectional and e.to_id in self.nodes:
                self.nodes[e.to_id].neighbors.append(
                    GraphEdge(e.from_id, e.line_id, e.distance_km, e.travel_time_min, emission)
                )

    # ─── Disruption API ───

    def apply_incidents(self, incidents: list[IncidentData]) -> None:
        """Apply a set of incidents to the graph, modifying traversal behavior."""
        self.reset_incidents()
        self._active_incidents = incidents

        for inc in incidents:
            if inc.blocks_node and inc.affected_station_id:
                self._blocked_nodes.add(inc.affected_station_id)

            if inc.blocks_edge and inc.affected_edge_from and inc.affected_edge_to:
                line = inc.affected_line_id or ""
                self._blocked_edges.add((inc.affected_edge_from, inc.affected_edge_to, line))
                self._blocked_edges.add((inc.affected_edge_to, inc.affected_edge_from, line))

            if inc.time_penalty_min > 0:
                if inc.affected_station_id:
                    self._node_penalties[inc.affected_station_id] = (
                        self._node_penalties.get(inc.affected_station_id, 0) + inc.time_penalty_min
                    )
                if inc.affected_edge_from and inc.affected_edge_to:
                    line = inc.affected_line_id or ""
                    key_fwd = (inc.affected_edge_from, inc.affected_edge_to, line)
                    key_rev = (inc.affected_edge_to, inc.affected_edge_from, line)
                    self._edge_penalties[key_fwd] = inc.time_penalty_min
                    self._edge_penalties[key_rev] = inc.time_penalty_min
                if inc.affected_line_id and not inc.affected_edge_from:
                    for node in self.nodes.values():
                        for edge in node.neighbors:
                            if edge.line_id == inc.affected_line_id:
                                key = (node.station.id, edge.to_node_id, edge.line_id)
                                self._edge_penalties[key] = inc.time_penalty_min

    def reset_incidents(self) -> None:
        """Clear all active disruptions."""
        self._blocked_nodes.clear()
        self._blocked_edges.clear()
        self._edge_penalties.clear()
        self._node_penalties.clear()
        self._active_incidents.clear()

    def get_active_incidents(self) -> list[IncidentData]:
        return self._active_incidents

    def is_node_blocked(self, station_id: str) -> bool:
        return station_id in self._blocked_nodes

    def get_node_penalty(self, station_id: str) -> float:
        return self._node_penalties.get(station_id, 0.0)

    def is_edge_blocked(self, from_id: str, to_id: str, line_id: str) -> bool:
        return (from_id, to_id, line_id) in self._blocked_edges

    def get_edge_penalty(self, from_id: str, to_id: str, line_id: str) -> float:
        return self._edge_penalties.get((from_id, to_id, line_id), 0.0)

    def get_effective_travel_time(self, from_id: str, edge: GraphEdge) -> float:
        """Travel time with incident penalties applied."""
        base = edge.travel_time_min
        base += self.get_edge_penalty(from_id, edge.to_node_id, edge.line_id)
        base += self.get_node_penalty(edge.to_node_id)
        return base

    # ─── Emission helpers ───

    def compute_edge_co2(self, edge: GraphEdge) -> float:
        """CO₂ in grams for traversing one edge."""
        return edge.emission_gco2_per_km * edge.distance_km

    def compute_car_equivalent_co2(self, distance_km: float) -> float:
        """What a private car would emit for the same distance."""
        return PRIVATE_CAR_EMISSION_GRAMS_PER_KM * distance_km

    # ─── Query API ───

    def get_station(self, station_id: str) -> Optional[StationData]:
        node = self.nodes.get(station_id)
        return node.station if node else None

    def get_all_stations(self) -> list[StationData]:
        return [n.station for n in self.nodes.values()]

    def get_neighbors(self, station_id: str) -> list[GraphEdge]:
        node = self.nodes.get(station_id)
        return node.neighbors if node else []

    def get_traversable_neighbors(self, station_id: str) -> list[GraphEdge]:
        """Neighbors filtered by active disruptions."""
        edges = self.get_neighbors(station_id)
        return [
            e for e in edges
            if not self.is_node_blocked(e.to_node_id)
            and not self.is_edge_blocked(station_id, e.to_node_id, e.line_id)
        ]

    def haversine(self, id_a: str, id_b: str) -> float:
        """Straight-line distance in km between two stations."""
        a = self.nodes[id_a].station
        b = self.nodes[id_b].station
        return _km(a.lat, a.lng, b.lat, b.lng)

    @property
    def station_count(self) -> int:
        return len(self.nodes)

    @property
    def edge_count(self) -> int:
        return sum(len(n.neighbors) for n in self.nodes.values())

    def __repr__(self) -> str:
        blocked = len(self._blocked_nodes)
        penalties = len(self._edge_penalties)
        return (
            f"TransitGraph(stations={self.station_count}, edges={self.edge_count}, "
            f"blocked_nodes={blocked}, edge_penalties={penalties})"
        )


# Singleton graph instance
transit_graph = TransitGraph()
