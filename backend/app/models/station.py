"""
Core transit network ORM models.

Tables: stations, transit_lines, edges, station_lines (junction).
"""

from sqlalchemy import Column, String, Float, Boolean, Integer, ForeignKey, Table
from sqlalchemy.orm import relationship
from app.database import Base

station_lines = Table(
    "station_lines",
    Base.metadata,
    Column("station_id", String, ForeignKey("stations.id"), primary_key=True),
    Column("line_id", String, ForeignKey("transit_lines.id"), primary_key=True),
)


class Station(Base):
    __tablename__ = "stations"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False, index=True)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    zone = Column(String, default="")
    is_landmark = Column(Boolean, default=False)

    lines = relationship("TransitLine", secondary=station_lines, back_populates="stations")
    edges_from = relationship("Edge", foreign_keys="Edge.from_station_id", back_populates="from_station")
    edges_to = relationship("Edge", foreign_keys="Edge.to_station_id", back_populates="to_station")
    incidents = relationship("Incident", back_populates="affected_station")


class TransitLine(Base):
    __tablename__ = "transit_lines"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    color = Column(String, default="#ffffff")
    mode = Column(String, default="metro")  # metro | bus | walk
    emission_gco2_per_km = Column(Float, default=0.0)

    stations = relationship("Station", secondary=station_lines, back_populates="lines")


class Edge(Base):
    __tablename__ = "edges"

    id = Column(Integer, primary_key=True, autoincrement=True)
    from_station_id = Column(String, ForeignKey("stations.id"), nullable=False, index=True)
    to_station_id = Column(String, ForeignKey("stations.id"), nullable=False, index=True)
    line_id = Column(String, ForeignKey("transit_lines.id"), nullable=False)
    distance_km = Column(Float, nullable=False)
    travel_time_min = Column(Float, nullable=False)
    bidirectional = Column(Boolean, default=True)

    from_station = relationship("Station", foreign_keys=[from_station_id], back_populates="edges_from")
    to_station = relationship("Station", foreign_keys=[to_station_id], back_populates="edges_to")
    line = relationship("TransitLine")
    incidents = relationship("Incident", back_populates="affected_edge")
