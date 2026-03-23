"""
Seed the PostgreSQL database with Chennai transit data,
emission factors, and sample incidents.

Usage:
    python -m db.seed
"""

import sys
import os
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from app.database import Base
from app.models.station import Station, TransitLine, Edge, station_lines
from app.models.incident import Incident, IncidentType, IncidentSeverity, IncidentStatus
from app.models.user import User, SavedLocation, SavedRoute, RouteHistory
from app.data.chennai_network import STATIONS, LINES, EDGES, SAMPLE_INCIDENTS
from app.config import SYNC_DATABASE_URL


def seed():
    engine = create_engine(SYNC_DATABASE_URL, echo=True)

    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        # ── Transit Lines (with emission factors) ──
        line_map: dict[str, TransitLine] = {}
        for line in LINES:
            db_line = TransitLine(
                id=line.id,
                name=line.name,
                color=line.color,
                mode=line.mode,
                emission_gco2_per_km=line.emission_gco2_per_km,
            )
            session.add(db_line)
            line_map[line.id] = db_line

        # ── Stations ──
        station_map: dict[str, Station] = {}
        for s in STATIONS:
            db_station = Station(
                id=s.id,
                name=s.name,
                lat=s.lat,
                lng=s.lng,
                zone=s.zone,
                is_landmark=s.is_landmark,
            )
            for lid in s.lines:
                if lid in line_map:
                    db_station.lines.append(line_map[lid])
            session.add(db_station)
            station_map[s.id] = db_station

        # ── Edges ──
        edge_map: dict[int, Edge] = {}
        for i, e in enumerate(EDGES):
            db_edge = Edge(
                from_station_id=e.from_id,
                to_station_id=e.to_id,
                line_id=e.line_id,
                distance_km=e.distance_km,
                travel_time_min=e.travel_time_min,
                bidirectional=e.bidirectional,
            )
            session.add(db_edge)

        session.flush()

        # ── Sample Incidents ──
        now = datetime.utcnow()
        for inc in SAMPLE_INCIDENTS:
            db_incident = Incident(
                id=inc.id,
                title=inc.title,
                description=f"Simulated incident: {inc.title}",
                incident_type=IncidentType(inc.incident_type),
                severity=IncidentSeverity(inc.severity),
                status=IncidentStatus.ACTIVE,
                affected_station_id=inc.affected_station_id,
                affected_line_id=inc.affected_line_id,
                blocks_node=inc.blocks_node,
                blocks_edge=inc.blocks_edge,
                time_penalty_min=inc.time_penalty_min,
                lat=inc.lat,
                lng=inc.lng,
                radius_km=inc.radius_km,
                created_at=now,
                starts_at=now,
                expires_at=now + timedelta(hours=24),
            )
            session.add(db_incident)

        session.commit()
        print(
            f"\n{'='*50}"
            f"\nSeeded successfully:"
            f"\n  {len(station_map)} stations"
            f"\n  {len(line_map)} lines (with emission factors)"
            f"\n  {len(EDGES)} edges"
            f"\n  {len(SAMPLE_INCIDENTS)} sample incidents"
            f"\n{'='*50}"
        )


if __name__ == "__main__":
    seed()
