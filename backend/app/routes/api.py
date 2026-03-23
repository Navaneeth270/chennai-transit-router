"""
Core API routes: stations, route computation (with emissions & incidents), lines.
"""

import time
from fastapi import APIRouter, HTTPException

from app.data.chennai_network import (
    transit_graph,
    StationData,
    SAMPLE_INCIDENTS,
    LINES,
    LINE_LOOKUP,
    PRIVATE_CAR_EMISSION_GRAMS_PER_KM,
)
from app.algorithms.astar import astar_search
from app.algorithms.bfs import bfs_search
from app.algorithms.dfs import dfs_search
from app.algorithms.eco import eco_search
from app.models.schemas import (
    StationOut,
    RouteRequest,
    RouteResultOut,
    RouteSegmentOut,
    EmissionBreakdown,
    IncidentOut,
    LineEmissionInfo,
    IncidentSimulation,
)

router = APIRouter()


def _station_to_out(s: StationData) -> StationOut:
    return StationOut(
        id=s.id,
        name=s.name,
        lat=s.lat,
        lng=s.lng,
        lines=s.lines,
        is_landmark=s.is_landmark,
        zone=s.zone,
    )


def _incident_to_out(inc) -> IncidentOut:
    return IncidentOut(
        id=inc.id,
        title=inc.title,
        description=getattr(inc, "description", ""),
        incident_type=inc.incident_type,
        severity=inc.severity,
        affected_station_id=inc.affected_station_id,
        affected_line_id=inc.affected_line_id,
        blocks_node=inc.blocks_node,
        blocks_edge=inc.blocks_edge,
        time_penalty_min=inc.time_penalty_min,
        lat=inc.lat,
        lng=inc.lng,
        radius_km=inc.radius_km,
    )


def _compute_segment_co2(seg_dict: dict) -> float:
    """Compute CO₂ for a segment based on its line's emission factor."""
    if "co2_grams" in seg_dict and seg_dict["co2_grams"] > 0:
        return seg_dict["co2_grams"]
    line = LINE_LOOKUP.get(seg_dict["line"])
    factor = line.emission_gco2_per_km if line else 0.0
    return factor * seg_dict["distance_km"]


def _build_route_response(
    result: dict, algorithm: str, elapsed_ms: float, incidents_applied: int
) -> RouteResultOut:
    segments_out = []
    segment_co2_list: list[float] = []

    for seg in result["segments"]:
        co2 = _compute_segment_co2(seg)
        segment_co2_list.append(round(co2, 2))

        segments_out.append(
            RouteSegmentOut(
                from_station=_station_to_out(seg["from_station"]),
                to_station=_station_to_out(seg["to_station"]),
                line=seg["line"],
                mode=seg["mode"],
                travel_time_min=seg["travel_time_min"],
                distance_km=seg["distance_km"],
                co2_grams=round(co2, 2),
                intermediate_stations=[
                    _station_to_out(s) for s in seg["intermediate_stations"]
                ],
            )
        )

    total_co2 = result.get("total_co2_grams", sum(segment_co2_list))
    car_equivalent = PRIVATE_CAR_EMISSION_GRAMS_PER_KM * result["total_distance_km"]
    co2_saved = car_equivalent - total_co2
    co2_saved_pct = (co2_saved / car_equivalent * 100) if car_equivalent > 0 else 0.0

    emissions = EmissionBreakdown(
        segment_co2_grams=segment_co2_list,
        total_co2_grams=round(total_co2, 2),
        car_equivalent_co2_grams=round(car_equivalent, 2),
        co2_saved_grams=round(co2_saved, 2),
        co2_saved_percent=round(co2_saved_pct, 1),
    )

    visited_stations = [
        _station_to_out(transit_graph.get_station(sid))
        for sid in result["visited_ids"]
        if transit_graph.get_station(sid)
    ]

    path_coords = [
        (transit_graph.get_station(sid).lat, transit_graph.get_station(sid).lng)
        for sid in result["visited_ids"]
        if transit_graph.get_station(sid)
    ]

    return RouteResultOut(
        algorithm=algorithm,
        segments=segments_out,
        total_time_min=result["total_time_min"],
        total_distance_km=result["total_distance_km"],
        total_transfers=result["total_transfers"],
        stations_visited=visited_stations,
        computation_time_ms=round(elapsed_ms, 2),
        path_coordinates=path_coords,
        emissions=emissions,
        incidents_applied=incidents_applied,
    )


# ──────────────────── Station Endpoints ────────────────────


@router.get("/stations", response_model=list[StationOut])
async def list_stations():
    return [_station_to_out(s) for s in transit_graph.get_all_stations()]


@router.get("/stations/{station_id}", response_model=StationOut)
async def get_station(station_id: str):
    s = transit_graph.get_station(station_id)
    if not s:
        raise HTTPException(status_code=404, detail="Station not found")
    return _station_to_out(s)


@router.get("/nearest-station")
async def nearest_station(lat: float, lng: float, count: int = 3):
    """Find the nearest transit stations to a given lat/lng coordinate."""
    import math

    all_stations = transit_graph.get_all_stations()
    if not all_stations:
        raise HTTPException(status_code=404, detail="No stations available")

    WALK_SPEED_KMH = 5.0

    def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        R = 6371.0
        dlat = math.radians(lat2 - lat1)
        dlng = math.radians(lng2 - lng1)
        a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2
        return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    ranked = []
    for s in all_stations:
        dist = haversine_km(lat, lng, s.lat, s.lng)
        walk_min = (dist / WALK_SPEED_KMH) * 60
        ranked.append({
            "station": _station_to_out(s),
            "distance_km": round(dist, 3),
            "walk_time_min": round(walk_min, 1),
        })

    ranked.sort(key=lambda x: x["distance_km"])
    return ranked[:count]


# ──────────────────── Route Endpoint ────────────────────


@router.post("/route", response_model=RouteResultOut)
async def compute_route(req: RouteRequest):
    if not transit_graph.get_station(req.origin_id):
        raise HTTPException(status_code=404, detail="Origin station not found")
    if not transit_graph.get_station(req.destination_id):
        raise HTTPException(status_code=404, detail="Destination station not found")

    incidents_applied = 0
    if req.apply_incidents:
        transit_graph.apply_incidents(SAMPLE_INCIDENTS)
        incidents_applied = len(SAMPLE_INCIDENTS)

    try:
        t0 = time.perf_counter()

        if req.algorithm == "astar":
            result = astar_search(transit_graph, req.origin_id, req.destination_id)
        elif req.algorithm == "bfs":
            result = bfs_search(transit_graph, req.origin_id, req.destination_id)
        elif req.algorithm == "dfs":
            result = dfs_search(
                transit_graph,
                req.origin_id,
                req.destination_id,
                via_stations=req.via_stations or [],
                max_time_min=req.max_time_min or 120.0,
            )
        elif req.algorithm == "eco":
            result = eco_search(transit_graph, req.origin_id, req.destination_id)
        else:
            raise HTTPException(status_code=400, detail="Invalid algorithm. Choose: astar, bfs, dfs, eco")

        elapsed_ms = (time.perf_counter() - t0) * 1000

        if result is None:
            msg = "No route found between these stations"
            if req.apply_incidents:
                msg += ". Active disruptions may be blocking the path — try disabling disruptions or pick different stations."
            else:
                msg += ". These stations may not be connected by the selected algorithm."
            raise HTTPException(status_code=404, detail=msg)

        return _build_route_response(result, req.algorithm, elapsed_ms, incidents_applied)

    finally:
        if req.apply_incidents:
            transit_graph.reset_incidents()


# ──────────────────── Compare All Algorithms ────────────────────


from pydantic import BaseModel as _PydanticBase


class CompareRequest(_PydanticBase):
    origin_id: str
    destination_id: str
    apply_incidents: bool = False


@router.post("/route/compare")
async def compare_routes(req: CompareRequest):
    """Run all 4 algorithms on the same origin/destination and return results."""
    if not transit_graph.get_station(req.origin_id):
        raise HTTPException(status_code=404, detail="Origin station not found")
    if not transit_graph.get_station(req.destination_id):
        raise HTTPException(status_code=404, detail="Destination station not found")

    incidents_applied = 0
    if req.apply_incidents:
        transit_graph.apply_incidents(SAMPLE_INCIDENTS)
        incidents_applied = len(SAMPLE_INCIDENTS)

    algos = {
        "astar": lambda: astar_search(transit_graph, req.origin_id, req.destination_id),
        "bfs": lambda: bfs_search(transit_graph, req.origin_id, req.destination_id),
        "dfs": lambda: dfs_search(transit_graph, req.origin_id, req.destination_id, via_stations=[], max_time_min=120.0),
        "eco": lambda: eco_search(transit_graph, req.origin_id, req.destination_id),
    }

    results = {}
    for algo_name, search_fn in algos.items():
        try:
            t0 = time.perf_counter()
            result = search_fn()
            elapsed_ms = (time.perf_counter() - t0) * 1000

            if result is not None:
                results[algo_name] = _build_route_response(result, algo_name, elapsed_ms, incidents_applied)
        except Exception:
            pass

    if req.apply_incidents:
        transit_graph.reset_incidents()

    if not results:
        raise HTTPException(status_code=404, detail="No routes found between these stations with any algorithm")

    return results


# ──────────────────── Incident Endpoints ────────────────────


@router.get("/incidents", response_model=list[IncidentOut])
async def list_incidents():
    return [_incident_to_out(inc) for inc in SAMPLE_INCIDENTS]


@router.post("/incidents/simulate", response_model=RouteResultOut)
async def simulate_incidents(body: IncidentSimulation):
    if body.use_all_active:
        selected = SAMPLE_INCIDENTS
    else:
        lookup = {inc.id: inc for inc in SAMPLE_INCIDENTS}
        selected = [lookup[iid] for iid in body.incident_ids if iid in lookup]

    if not selected:
        raise HTTPException(status_code=400, detail="No valid incidents selected")

    transit_graph.apply_incidents(selected)
    try:
        t0 = time.perf_counter()
        result = astar_search(
            transit_graph,
            transit_graph.get_all_stations()[0].id,
            transit_graph.get_all_stations()[-1].id,
        )
        elapsed_ms = (time.perf_counter() - t0) * 1000

        if result is None:
            raise HTTPException(status_code=404, detail="No route found with active incidents")

        return _build_route_response(result, "astar", elapsed_ms, len(selected))
    finally:
        transit_graph.reset_incidents()


# ──────────────────── Lines Endpoint ────────────────────


@router.get("/lines", response_model=list[LineEmissionInfo])
async def list_lines():
    return [
        LineEmissionInfo(
            line_id=ln.id,
            mode=ln.mode,
            emission_gco2_per_km=ln.emission_gco2_per_km,
        )
        for ln in LINES
    ]
