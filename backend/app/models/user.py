"""
User authentication, saved locations, saved routes, and route history.

Security:
  - Passwords stored as bcrypt hashes (never plaintext)
  - Sessions managed via JWT access + refresh tokens
  - API routes protected with dependency-injected auth guards
"""

import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Boolean, Integer, ForeignKey, DateTime, Text, JSON
from sqlalchemy.orm import relationship
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    display_name = Column(String(100), nullable=False)
    avatar_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    saved_locations = relationship("SavedLocation", back_populates="user", cascade="all, delete-orphan")
    saved_routes = relationship("SavedRoute", back_populates="user", cascade="all, delete-orphan")
    route_history = relationship("RouteHistory", back_populates="user", cascade="all, delete-orphan")


class SavedLocation(Base):
    """Pinned locations like Home, Work, Campus."""
    __tablename__ = "saved_locations"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    label = Column(String(50), nullable=False)  # "Home", "Work", custom
    icon = Column(String(20), default="pin")    # icon identifier
    station_id = Column(String, ForeignKey("stations.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="saved_locations")
    station = relationship("Station")


class SavedRoute(Base):
    """Bookmarked frequent routes."""
    __tablename__ = "saved_routes"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    origin_station_id = Column(String, ForeignKey("stations.id"), nullable=False)
    destination_station_id = Column(String, ForeignKey("stations.id"), nullable=False)
    algorithm = Column(String(10), default="astar")
    via_station_ids = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="saved_routes")
    origin_station = relationship("Station", foreign_keys=[origin_station_id])
    destination_station = relationship("Station", foreign_keys=[destination_station_id])


class RouteHistory(Base):
    """
    Historical trip log. Stores CO2 metrics for the cumulative
    'carbon saved' dashboard.
    """
    __tablename__ = "route_history"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    origin_station_id = Column(String, ForeignKey("stations.id"), nullable=False)
    destination_station_id = Column(String, ForeignKey("stations.id"), nullable=False)
    algorithm = Column(String(10), nullable=False)

    total_time_min = Column(Float, nullable=False)
    total_distance_km = Column(Float, nullable=False)
    total_transfers = Column(Integer, default=0)

    # Carbon analytics
    co2_grams = Column(Float, nullable=False, default=0.0)
    co2_car_equivalent_grams = Column(Float, nullable=False, default=0.0)
    co2_saved_grams = Column(Float, nullable=False, default=0.0)

    route_snapshot = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    user = relationship("User", back_populates="route_history")
    origin_station = relationship("Station", foreign_keys=[origin_station_id])
    destination_station = relationship("Station", foreign_keys=[destination_station_id])
