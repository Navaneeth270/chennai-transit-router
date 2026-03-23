"""
BFS — Minimum Transfers Route (Disruption-Aware).

Models the graph at the *line-segment* level: each state is (station, current_line).
BFS on transfer count finds the path that minimizes line changes.
Within equal-transfer paths, picks the shorter one by total travel time.

Blocked nodes/edges are excluded via ``get_traversable_neighbors``.
Travel times include incident penalties via ``get_effective_travel_time``.
Each result segment carries a ``co2_grams`` field.
"""

from __future__ import annotations

from collections import deque
from typing import Optional, TYPE_CHECKING

from app.data.chennai_network import LINES, LINE_LOOKUP

if TYPE_CHECKING:
    from app.data.chennai_network import TransitGraph


def bfs_search(
    graph: TransitGraph, origin_id: str, dest_id: str
) -> Optional[dict]:
    if graph.is_node_blocked(origin_id) or graph.is_node_blocked(dest_id):
        return None

    queue: deque[
        tuple[str, str, int, list[tuple[str, str]], float, float]
    ] = deque()
    visited: set[tuple[str, str]] = set()

    for edge in graph.get_traversable_neighbors(origin_id):
        state = (origin_id, edge.line_id)
        if state not in visited:
            visited.add(state)
            eff_time = graph.get_effective_travel_time(origin_id, edge)
            queue.append((
                edge.to_node_id,
                edge.line_id,
                0,
                [(origin_id, "START"), (edge.to_node_id, edge.line_id)],
                eff_time,
                edge.distance_km,
            ))
            visited.add((edge.to_node_id, edge.line_id))

    best_result: Optional[dict] = None

    while queue:
        station, line, transfers, path, time_acc, dist_acc = queue.popleft()

        if station == dest_id:
            candidate = _build_result(
                graph, path, time_acc, dist_acc, transfers
            )
            if best_result is None or transfers < best_result["total_transfers"]:
                best_result = candidate
            elif (
                transfers == best_result["total_transfers"]
                and time_acc < best_result["total_time_min"]
            ):
                best_result = candidate
            continue

        for edge in graph.get_traversable_neighbors(station):
            new_line = edge.line_id
            is_transfer = new_line != line
            new_transfers = transfers + (1 if is_transfer else 0)

            if best_result and new_transfers > best_result["total_transfers"]:
                continue

            state = (edge.to_node_id, new_line)
            if state in visited:
                continue
            visited.add(state)

            eff_time = graph.get_effective_travel_time(station, edge)
            queue.append((
                edge.to_node_id,
                new_line,
                new_transfers,
                path + [(edge.to_node_id, new_line)],
                time_acc + eff_time,
                dist_acc + edge.distance_km,
            ))

    return best_result


def _build_result(
    graph: TransitGraph,
    path: list[tuple[str, str]],
    total_time: float,
    total_dist: float,
    transfers: int,
) -> dict:
    segments: list[dict] = []
    seg_start = 0

    for i in range(1, len(path)):
        if path[i][1] != path[seg_start][1] and path[seg_start][1] != "START":
            segments.append(_make_segment(graph, path, seg_start, i - 1))
            seg_start = i - 1
        elif path[seg_start][1] == "START" and i > 0:
            seg_start_line = path[1][1] if len(path) > 1 else ""
            if i > 1 and path[i][1] != seg_start_line:
                segments.append(_make_segment(graph, path, 0, i - 1))
                seg_start = i - 1

    segments.append(_make_segment(graph, path, seg_start, len(path) - 1))

    total_co2 = sum(s["co2_grams"] for s in segments)

    return {
        "segments": segments,
        "total_time_min": round(total_time, 1),
        "total_distance_km": round(total_dist, 2),
        "total_transfers": transfers,
        "total_co2_grams": round(total_co2, 1),
        "visited_ids": [p[0] for p in path],
    }


def _make_segment(
    graph: TransitGraph,
    path: list[tuple[str, str]],
    start: int,
    end: int,
) -> dict:
    from_s = graph.get_station(path[start][0])
    to_s = graph.get_station(path[end][0])

    line_id = path[end][1]
    if line_id == "START" and end > start:
        line_id = path[start + 1][1]

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
