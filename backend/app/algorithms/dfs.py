"""
DFS — Sightseeing / Constrained Path (Disruption-Aware).

Generates a continuous path that visits a specific sequence of landmark nodes
(via_stations) without revisiting any node, bounded by max_time_min.

Uses iterative DFS with backtracking.  When via_stations is provided,
the algorithm plans sub-paths between consecutive waypoints.

Blocked nodes/edges are excluded via ``get_traversable_neighbors``.
Travel times include incident penalties via ``get_effective_travel_time``.
Each result segment carries a ``co2_grams`` field.
"""

from __future__ import annotations

from typing import Optional, TYPE_CHECKING

from app.data.chennai_network import LINES, LINE_LOOKUP

if TYPE_CHECKING:
    from app.data.chennai_network import TransitGraph


def dfs_search(
    graph: TransitGraph,
    origin_id: str,
    dest_id: str,
    via_stations: list[str] | None = None,
    max_time_min: float = 120.0,
) -> Optional[dict]:
    if graph.is_node_blocked(origin_id) or graph.is_node_blocked(dest_id):
        return None

    if via_stations:
        waypoints = [origin_id] + via_stations + [dest_id]
        return _multi_waypoint_dfs(graph, waypoints, max_time_min)

    return _single_dfs(graph, origin_id, dest_id, max_time_min)


def _single_dfs(
    graph: TransitGraph,
    origin_id: str,
    dest_id: str,
    max_time_min: float,
) -> Optional[dict]:
    """DFS from origin to dest with time budget, no revisits."""

    best: dict | None = None

    stack: list[tuple[str, list[tuple[str, str]], float, float, set[str]]] = []
    stack.append((origin_id, [(origin_id, "")], 0.0, 0.0, {origin_id}))

    while stack:
        current, path, time_acc, dist_acc, visited = stack.pop()

        if current == dest_id:
            candidate = _build_result(graph, path, time_acc, dist_acc)
            if best is None or time_acc < best["total_time_min"]:
                best = candidate
            continue

        if time_acc > max_time_min:
            continue

        for edge in graph.get_traversable_neighbors(current):
            if edge.to_node_id not in visited:
                eff_time = graph.get_effective_travel_time(current, edge)
                new_time = time_acc + eff_time
                if new_time <= max_time_min:
                    new_visited = visited | {edge.to_node_id}
                    stack.append((
                        edge.to_node_id,
                        path + [(edge.to_node_id, edge.line_id)],
                        new_time,
                        dist_acc + edge.distance_km,
                        new_visited,
                    ))

    return best


def _multi_waypoint_dfs(
    graph: TransitGraph,
    waypoints: list[str],
    max_time_min: float,
) -> Optional[dict]:
    """Chain DFS sub-paths through each consecutive pair of waypoints."""

    full_path: list[tuple[str, str]] = []
    total_time = 0.0
    total_dist = 0.0
    global_visited: set[str] = set()

    for i in range(len(waypoints) - 1):
        sub = _single_dfs_visited(
            graph,
            waypoints[i],
            waypoints[i + 1],
            max_time_min - total_time,
            global_visited,
        )
        if sub is None:
            return None

        if full_path:
            sub_path = sub["path"][1:]
        else:
            sub_path = sub["path"]

        full_path.extend(sub_path)
        total_time += sub["time"]
        total_dist += sub["dist"]
        global_visited.update(p[0] for p in sub_path)

    return _build_result(graph, full_path, total_time, total_dist)


def _single_dfs_visited(
    graph: TransitGraph,
    origin_id: str,
    dest_id: str,
    max_time_min: float,
    already_visited: set[str],
) -> Optional[dict]:
    """DFS respecting already-visited nodes (except origin and dest)."""

    best: dict | None = None

    stack: list[tuple[str, list[tuple[str, str]], float, float, set[str]]] = []
    init_visited = already_visited.copy()
    init_visited.add(origin_id)

    stack.append((origin_id, [(origin_id, "")], 0.0, 0.0, init_visited))

    while stack:
        current, path, time_acc, dist_acc, visited = stack.pop()

        if current == dest_id:
            if best is None or time_acc < best["time"]:
                best = {"path": path, "time": time_acc, "dist": dist_acc}
            continue

        if time_acc > max_time_min:
            continue

        for edge in graph.get_traversable_neighbors(current):
            nid = edge.to_node_id
            if nid not in visited or nid == dest_id:
                eff_time = graph.get_effective_travel_time(current, edge)
                new_time = time_acc + eff_time
                if new_time <= max_time_min:
                    new_visited = visited | {nid}
                    stack.append((
                        nid,
                        path + [(nid, edge.line_id)],
                        new_time,
                        dist_acc + edge.distance_km,
                        new_visited,
                    ))

    return best


def _build_result(
    graph: TransitGraph,
    path: list[tuple[str, str]],
    total_time: float,
    total_dist: float,
) -> dict:
    segments: list[dict] = []
    seg_start = 0

    for i in range(2, len(path)):
        if path[i][1] != path[i - 1][1] and path[i - 1][1] != "":
            segments.append(_make_segment(graph, path, seg_start, i - 1))
            seg_start = i - 1

    if seg_start < len(path) - 1:
        segments.append(_make_segment(graph, path, seg_start, len(path) - 1))

    total_co2 = sum(s["co2_grams"] for s in segments)
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


def _make_segment(
    graph: TransitGraph,
    path: list[tuple[str, str]],
    start: int,
    end: int,
) -> dict:
    from_s = graph.get_station(path[start][0])
    to_s = graph.get_station(path[end][0])

    line_id = (
        path[end][1]
        if path[end][1]
        else (path[start + 1][1] if start + 1 < len(path) else "WALK")
    )
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
