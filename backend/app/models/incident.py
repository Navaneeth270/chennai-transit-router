"""
Dynamic incident / disruption model.

Represents real-time events that alter the transit graph:
  - Station closures (blocks_node=True)
  - Edge disruptions (blocks_edge=True)
  - Partial delays (time_penalty_min > 0)

Active incidents are applied to the graph at query time, ensuring
A*, BFS, and DFS route around hazards in real time.
"""

import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Boolean, Integer, ForeignKey, DateTime, Text, Enum
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class IncidentType(str, enum.Enum):
    MAINTENANCE = "maintenance"
    WEATHER = "weather"
    FLOODING = "flooding"
    ACCIDENT = "accident"
    SECURITY = "security"
    CONGESTION = "congestion"
    OTHER = "other"


class IncidentSeverity(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class IncidentStatus(str, enum.Enum):
    ACTIVE = "active"
    RESOLVED = "resolved"
    SCHEDULED = "scheduled"


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(200), nullable=False)
    description = Column(Text, default="")

    incident_type = Column(
        Enum(IncidentType, name="incident_type_enum", create_constraint=True),
        nullable=False,
        default=IncidentType.OTHER,
    )
    severity = Column(
        Enum(IncidentSeverity, name="incident_severity_enum", create_constraint=True),
        nullable=False,
        default=IncidentSeverity.MEDIUM,
    )
    status = Column(
        Enum(IncidentStatus, name="incident_status_enum", create_constraint=True),
        nullable=False,
        default=IncidentStatus.ACTIVE,
        index=True,
    )

    # What is affected — at least one should be set
    affected_station_id = Column(String, ForeignKey("stations.id"), nullable=True, index=True)
    affected_edge_id = Column(Integer, ForeignKey("edges.id"), nullable=True, index=True)
    affected_line_id = Column(String, ForeignKey("transit_lines.id"), nullable=True, index=True)

    # Impact parameters
    blocks_node = Column(Boolean, default=False)
    blocks_edge = Column(Boolean, default=False)
    time_penalty_min = Column(Float, default=0.0)

    # Map display
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    radius_km = Column(Float, default=0.5)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    starts_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)

    # Relationships
    affected_station = relationship("Station", back_populates="incidents")
    affected_edge = relationship("Edge", back_populates="incidents")
    affected_line = relationship("TransitLine")
