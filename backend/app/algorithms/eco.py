"""
Eco-Routing A* — Lowest-Carbon Route (Disruption-Aware).

An A* variant where the edge cost is CO₂ grams rather than travel time.
The heuristic uses Haversine distance × the minimum network emission factor
(17 g/km for electric metro), which is admissible since no real path can
emit less per km than the cleanest mode over a shorter-than-real distance.

Blocked nodes/edges are excluded via ``get_traversable_neighbors``.
Travel times include incident penalties via ``get_effective_travel_time``.
Each result segment carries a ``co2_grams`` field.
"""

from __future__ import annotations

import heapq
from typing import Optional, TYPE_CHECKING

from app.data.chennai_network import LINES, LINE_LOOKUP

if TYPE_CHECKING:
    from app.data.chennai_network import TransitGraph

MIN_EMISSION_GRAMS_PER_KM = 17.0  # electric metro — lowest in the network


def _heuristic(graph: TransitGraph, current: str, goal: str) -> float:
    """Admissible CO₂ estimate: straight-line km × minimum emission factor."""
    return graph.haversine(current, goal) * MIN_EMISSION_GRAMS_PER_KM


def eco_search(
    graph: TransitGraph, origin_id: str, dest_id: str
) -> Optional[dict]:
    if graph.is_node_blocked(origin_id) or graph.is_node_blocked(dest_id):
        return None

    open_set: list[tuple[float, int, str]] = []
    counter = 0
    heapq.heappush(open_set, (0.0, counter, origin_id))

    g_score: dict[str, float] = {origin_id: 0.0}
    came_from: dict[str, tuple[str, str]] = {}

    while open_set:
        _f, _, current = heapq.heappop(open_set)

        if current == dest_id:
            return _reconstruct(
                graph, came_from, origin_id, dest_id, g_score[dest_id]
            )

        for edge in graph.get_traversable_neighbors(current):
            co2_cost = graph.compute_edge_co2(edge)
            tentative_g = g_score[current] + co2_cost

            if tentative_g < g_score.get(edge.to_node_id, float("inf")):
                g_score[edge.to_node_id] = tentative_g
                came_from[edge.to_node_id] = (current, edge.line_id)
                f_score = tentative_g + _heuristic(
                    graph, edge.to_node_id, dest_id
                )
                counter += 1
                heapq.heappush(
                    open_set, (f_score, counter, edge.to_node_id)
                )

    return None


def _reconstruct(
    graph: TransitGraph,
    came_from: dict[str, tuple[str, str]],
    origin_id: str,
    dest_id: str,
    total_co2: float,
) -> dict:
    path: list[tuple[str, str]] = []
    current = dest_id
    while current != origin_id:
        prev, line_id = came_from[current]
        path.append((current, line_id))
        current = prev
    path.append((origin_id, ""))
    path.reverse()

    segments = _build_segments(graph, path)
    total_time = sum(s["travel_time_min"] for s in segments)
    total_dist = sum(s["distance_km"] for s in segments)
    transfers = sum(
        1
        for i in range(1, len(segments))
        if segments[i]["line"] != segments[i - 1]["line"]
    )

    return {
        "segments": segments,
        "total_time_min": round(total_time, 1),
        "total_distance_km": round(total_dist, 2),
        "total_transfers": transfers,
        "total_co2_grams": round(total_co2, 1),
        "visited_ids": [p[0] for p in path],
    }


def _build_segments(
    graph: TransitGraph, path: list[tuple[str, str]]
) -> list[dict]:
    if len(path) < 2:
        return []

    segments: list[dict] = []
    seg_start = 0

    for i in range(2, len(path)):
        if path[i][1] != path[i - 1][1]:
            segments.append(_make_segment(graph, path, seg_start, i - 1))
            seg_start = i - 1

    segments.append(_make_segment(graph, path, seg_start, len(path) - 1))
    return segments


def _make_segment(
    graph: TransitGraph,
    path: list[tuple[str, str]],
    start: int,
    end: int,
) -> dict:
    from_s = graph.get_station(path[start][0])
    to_s = graph.get_station(path[end][0])

    line_id = path[min(start + 1, end)][1]
    line_info = LINE_LOOKUP.get(line_id)
    mode = line_info.mode if line_info else "metro"

    total_time = 0.0
    total_dist = 0.0
    total_co2 = 0.0
    intermediates: list = []

    for i in range(start, end):
        sid = path[i][0]
        nid = path[i + 1][0]
        found = False
        for edge in graph.get_neighbors(sid):
            if edge.to_node_id == nid and edge.line_id == line_id:
                total_time += graph.get_effective_travel_time(sid, edge)
                total_dist += edge.distance_km
                total_co2 += edge.emission_gco2_per_km * edge.distance_km
                found = True
                break
        if not found:
            for edge in graph.get_neighbors(sid):
                if edge.to_node_id == nid:
                    total_time += graph.get_effective_travel_time(sid, edge)
                    total_dist += edge.distance_km
                    total_co2 += edge.emission_gco2_per_km * edge.distance_km
                    break

        if start < i < end:
            intermediates.append(graph.get_station(path[i][0]))

    return {
        "from_station": from_s,
        "to_station": to_s,
        "line": line_id,
        "mode": mode,
        "travel_time_min": round(total_time, 1),
        "distance_km": round(total_dist, 2),
        "co2_grams": round(total_co2, 1),
        "intermediate_stations": intermediates,
    }
