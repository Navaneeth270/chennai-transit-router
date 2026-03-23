-- ═══════════════════════════════════════════════════════════════════════
-- Chennai Transit Router — Complete PostgreSQL Schema
-- ═══════════════════════════════════════════════════════════════════════
--
-- Tables:
--   1. transit_lines      — Metro/bus lines with CO₂ emission factors
--   2. stations            — Transit stops with coordinates
--   3. station_lines       — Many-to-many junction
--   4. edges               — Weighted connections between stations
--   5. incidents           — Dynamic disruptions (flooding, maintenance, etc.)
--   6. users               — Authentication with bcrypt password hashes
--   7. saved_locations     — User's pinned stations (Home, Work, etc.)
--   8. saved_routes        — Bookmarked frequent routes
--   9. route_history       — Trip log with CO₂ analytics
--
-- Emission factors (grams CO₂ per passenger-km):
--   Electric Metro:  17 g/km   (Chennai Metro, 25kV AC overhead)
--   Diesel Bus:      89 g/km   (MTC fleet, moderate occupancy)
--   Walking:          0 g/km
--   Private Car:    192 g/km   (benchmark for savings calculation)
-- ═══════════════════════════════════════════════════════════════════════


-- ─────────────────────── Enums ───────────────────────

CREATE TYPE incident_type_enum AS ENUM (
    'maintenance', 'weather', 'flooding',
    'accident', 'security', 'congestion', 'other'
);

CREATE TYPE incident_severity_enum AS ENUM (
    'low', 'medium', 'high', 'critical'
);

CREATE TYPE incident_status_enum AS ENUM (
    'active', 'resolved', 'scheduled'
);


-- ─────────────────────── Core Transit Network ───────────────────────

CREATE TABLE transit_lines (
    id                    VARCHAR     PRIMARY KEY,
    name                  VARCHAR     NOT NULL,
    color                 VARCHAR     DEFAULT '#ffffff',
    mode                  VARCHAR     DEFAULT 'metro',      -- metro | bus | walk
    emission_gco2_per_km  FLOAT       DEFAULT 0.0           -- grams CO₂ / passenger-km
);

COMMENT ON COLUMN transit_lines.emission_gco2_per_km IS
    'CO₂ emission factor in grams per passenger-kilometer. '
    'Metro ~17, Diesel Bus ~89, Walking 0.';


CREATE TABLE stations (
    id          VARCHAR     PRIMARY KEY,
    name        VARCHAR     NOT NULL,
    lat         FLOAT       NOT NULL,
    lng         FLOAT       NOT NULL,
    zone        VARCHAR     DEFAULT '',
    is_landmark BOOLEAN     DEFAULT FALSE
);

CREATE INDEX idx_stations_name ON stations (name);


CREATE TABLE station_lines (
    station_id  VARCHAR     NOT NULL REFERENCES stations(id),
    line_id     VARCHAR     NOT NULL REFERENCES transit_lines(id),
    PRIMARY KEY (station_id, line_id)
);


CREATE TABLE edges (
    id                SERIAL      PRIMARY KEY,
    from_station_id   VARCHAR     NOT NULL REFERENCES stations(id),
    to_station_id     VARCHAR     NOT NULL REFERENCES stations(id),
    line_id           VARCHAR     NOT NULL REFERENCES transit_lines(id),
    distance_km       FLOAT       NOT NULL,
    travel_time_min   FLOAT       NOT NULL,
    bidirectional     BOOLEAN     DEFAULT TRUE
);

CREATE INDEX idx_edges_from ON edges (from_station_id);
CREATE INDEX idx_edges_to   ON edges (to_station_id);


-- ─────────────────────── Dynamic Incidents ───────────────────────

CREATE TABLE incidents (
    id                    VARCHAR     PRIMARY KEY DEFAULT gen_random_uuid()::text,
    title                 VARCHAR(200) NOT NULL,
    description           TEXT        DEFAULT '',

    incident_type         incident_type_enum      NOT NULL DEFAULT 'other',
    severity              incident_severity_enum   NOT NULL DEFAULT 'medium',
    status                incident_status_enum     NOT NULL DEFAULT 'active',

    -- What is affected (at least one should be non-null)
    affected_station_id   VARCHAR     REFERENCES stations(id),
    affected_edge_id      INTEGER     REFERENCES edges(id),
    affected_line_id      VARCHAR     REFERENCES transit_lines(id),

    -- Impact parameters
    blocks_node           BOOLEAN     DEFAULT FALSE,   -- completely close a station
    blocks_edge           BOOLEAN     DEFAULT FALSE,   -- completely sever a connection
    time_penalty_min      FLOAT       DEFAULT 0.0,     -- additional delay (if not fully blocked)

    -- Map display coordinates
    lat                   FLOAT,
    lng                   FLOAT,
    radius_km             FLOAT       DEFAULT 0.5,

    -- Temporal scope
    created_at            TIMESTAMPTZ DEFAULT now(),
    starts_at             TIMESTAMPTZ DEFAULT now(),
    expires_at            TIMESTAMPTZ                   -- NULL = indefinite
);

CREATE INDEX idx_incidents_status ON incidents (status);
CREATE INDEX idx_incidents_station ON incidents (affected_station_id) WHERE affected_station_id IS NOT NULL;
CREATE INDEX idx_incidents_line ON incidents (affected_line_id) WHERE affected_line_id IS NOT NULL;

COMMENT ON TABLE incidents IS
    'Dynamic disruptions that modify graph weights at query time. '
    'Active incidents cause A*/BFS/DFS to reroute around hazards.';


-- ─────────────────────── User Authentication ───────────────────────

CREATE TABLE users (
    id              VARCHAR     PRIMARY KEY DEFAULT gen_random_uuid()::text,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,   -- bcrypt or argon2
    display_name    VARCHAR(100) NOT NULL,
    avatar_url      VARCHAR(500),
    is_active       BOOLEAN     DEFAULT TRUE,

    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX idx_users_email ON users (email);

COMMENT ON COLUMN users.password_hash IS
    'Never store plaintext passwords. Use bcrypt (cost=12) or Argon2id.';


-- ─────────────────────── Saved Locations ───────────────────────

CREATE TABLE saved_locations (
    id          VARCHAR     PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id     VARCHAR     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label       VARCHAR(50) NOT NULL,       -- "Home", "Work", "Campus", custom
    icon        VARCHAR(20) DEFAULT 'pin',  -- icon identifier for the UI
    station_id  VARCHAR     NOT NULL REFERENCES stations(id),

    created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_saved_locations_user ON saved_locations (user_id);

COMMENT ON TABLE saved_locations IS
    'User''s pinned stations for quick one-tap route planning.';


-- ─────────────────────── Saved Routes ───────────────────────

CREATE TABLE saved_routes (
    id                      VARCHAR     PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id                 VARCHAR     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name                    VARCHAR(100) NOT NULL,
    origin_station_id       VARCHAR     NOT NULL REFERENCES stations(id),
    destination_station_id  VARCHAR     NOT NULL REFERENCES stations(id),
    algorithm               VARCHAR(10) DEFAULT 'astar',
    via_station_ids         JSONB       DEFAULT '[]',

    created_at              TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_saved_routes_user ON saved_routes (user_id);

COMMENT ON TABLE saved_routes IS
    'Bookmarked routes that users can re-execute with one tap.';


-- ─────────────────────── Route History + Carbon Analytics ───────────────────────

CREATE TABLE route_history (
    id                      VARCHAR     PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id                 VARCHAR     NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    origin_station_id       VARCHAR     NOT NULL REFERENCES stations(id),
    destination_station_id  VARCHAR     NOT NULL REFERENCES stations(id),
    algorithm               VARCHAR(10) NOT NULL,

    total_time_min          FLOAT       NOT NULL,
    total_distance_km       FLOAT       NOT NULL,
    total_transfers         INTEGER     DEFAULT 0,

    -- Carbon analytics
    co2_grams               FLOAT       NOT NULL DEFAULT 0.0,    -- actual transit CO₂
    co2_car_equivalent_grams FLOAT      NOT NULL DEFAULT 0.0,    -- what a car would emit
    co2_saved_grams         FLOAT       NOT NULL DEFAULT 0.0,    -- car − transit

    route_snapshot          JSONB,                               -- full response for replay

    created_at              TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_route_history_user       ON route_history (user_id);
CREATE INDEX idx_route_history_created_at ON route_history (created_at DESC);

COMMENT ON TABLE route_history IS
    'Every trip a user executes, with CO₂ metrics for the '
    'cumulative "carbon saved" dashboard.';

COMMENT ON COLUMN route_history.co2_saved_grams IS
    'Difference: co2_car_equivalent_grams − co2_grams. '
    'Summed over time for the user''s environmental impact score.';
