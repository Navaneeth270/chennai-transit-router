"""
Pydantic schemas for API request/response serialization.

Covers: stations, routes, emissions, incidents, auth, saved data.
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


# ──────────────────── Station ────────────────────

class StationOut(BaseModel):
    id: str
    name: str
    lat: float
    lng: float
    lines: list[str]
    is_landmark: bool
    zone: str

    model_config = {"from_attributes": True}


# ──────────────────── Emissions ────────────────────

class EmissionBreakdown(BaseModel):
    """Per-segment and total CO₂ analytics."""
    segment_co2_grams: list[float]
    total_co2_grams: float
    car_equivalent_co2_grams: float
    co2_saved_grams: float
    co2_saved_percent: float


class LineEmissionInfo(BaseModel):
    line_id: str
    mode: str
    emission_gco2_per_km: float


# ──────────────────── Route ────────────────────

class RouteSegmentOut(BaseModel):
    from_station: StationOut
    to_station: StationOut
    line: str
    mode: str
    travel_time_min: float
    distance_km: float
    co2_grams: float = 0.0
    intermediate_stations: list[StationOut]


class RouteResultOut(BaseModel):
    algorithm: str
    segments: list[RouteSegmentOut]
    total_time_min: float
    total_distance_km: float
    total_transfers: int
    stations_visited: list[StationOut]
    computation_time_ms: float
    path_coordinates: list[tuple[float, float]]
    emissions: EmissionBreakdown
    incidents_applied: int = 0


class RouteRequest(BaseModel):
    origin_id: str
    destination_id: str
    algorithm: str  # astar | bfs | dfs | eco
    via_stations: Optional[list[str]] = None
    max_time_min: Optional[float] = None
    apply_incidents: bool = False


# ──────────────────── Incidents ────────────────────

class IncidentOut(BaseModel):
    id: str
    title: str
    description: str = ""
    incident_type: str
    severity: str
    status: str = "active"
    affected_station_id: Optional[str] = None
    affected_edge_id: Optional[int] = None
    affected_line_id: Optional[str] = None
    blocks_node: bool = False
    blocks_edge: bool = False
    time_penalty_min: float = 0.0
    lat: Optional[float] = None
    lng: Optional[float] = None
    radius_km: float = 0.5
    created_at: Optional[datetime] = None
    starts_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class IncidentCreate(BaseModel):
    title: str = Field(..., max_length=200)
    description: str = ""
    incident_type: str = "other"
    severity: str = "medium"
    affected_station_id: Optional[str] = None
    affected_line_id: Optional[str] = None
    blocks_node: bool = False
    blocks_edge: bool = False
    time_penalty_min: float = 0.0
    lat: Optional[float] = None
    lng: Optional[float] = None
    radius_km: float = 0.5
    expires_at: Optional[datetime] = None


class IncidentSimulation(BaseModel):
    """Request body for simulating incidents on the fly."""
    incident_ids: list[str] = Field(default_factory=list)
    use_all_active: bool = False


# ──────────────────── Auth ────────────────────

class UserCreate(BaseModel):
    email: str = Field(..., max_length=255)
    password: str = Field(..., min_length=6, max_length=128)
    display_name: str = Field(..., max_length=100)


class UserLogin(BaseModel):
    email: str
    password: str


class UserOut(BaseModel):
    id: str
    email: str
    display_name: str
    avatar_url: Optional[str] = None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenRefresh(BaseModel):
    refresh_token: str


# ──────────────────── Saved Data ────────────────────

class SavedLocationCreate(BaseModel):
    label: str = Field(..., max_length=50)
    station_id: str
    icon: str = "pin"


class SavedLocationOut(BaseModel):
    id: str
    label: str
    icon: str
    station: StationOut
    created_at: datetime

    model_config = {"from_attributes": True}


class SavedRouteCreate(BaseModel):
    name: str = Field(..., max_length=100)
    origin_station_id: str
    destination_station_id: str
    algorithm: str = "astar"
    via_station_ids: list[str] = Field(default_factory=list)


class SavedRouteOut(BaseModel):
    id: str
    name: str
    origin_station: StationOut
    destination_station: StationOut
    algorithm: str
    via_station_ids: list[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class RouteHistoryOut(BaseModel):
    id: str
    origin_station: StationOut
    destination_station: StationOut
    algorithm: str
    total_time_min: float
    total_distance_km: float
    total_transfers: int
    co2_grams: float
    co2_car_equivalent_grams: float
    co2_saved_grams: float
    created_at: datetime

    model_config = {"from_attributes": True}


class CarbonDashboard(BaseModel):
    """Aggregated carbon savings for a user."""
    total_trips: int
    total_distance_km: float
    total_co2_grams: float
    total_co2_saved_grams: float
    equivalent_trees_planted: float
    trips_by_algorithm: dict[str, int]
    monthly_savings: list[dict]
