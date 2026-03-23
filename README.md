# Chennai Transit Router

A multi-modal urban transit route planner built on real Chennai Metro and MTC Bus network data.
Uses **A\***, **BFS**, and **DFS** search algorithms to find optimal routes across the city.

Dark-mode, glassmorphism UI with animated route drawing, radar-pulse markers, and Framer Motion transitions.

---

## Architecture

```
transit-router/
├── frontend/               Next.js 15 + Tailwind v4 + Leaflet + Framer Motion
│   └── src/
│       ├── app/            App Router (layout, page, dark-mode globals)
│       ├── components/
│       │   ├── TransitApp   Root orchestrator with error handling
│       │   ├── TransitMap   Leaflet map with animated route drawing + pulse markers
│       │   ├── ControlPanel Autocomplete inputs, algorithm selector, DFS waypoints
│       │   └── RoutePanel   Slide-in results with staggered step animations
│       └── types/          TypeScript interfaces
├── backend/                FastAPI (Python)
│   ├── app/
│   │   ├── algorithms/     A* (astar.py), BFS (bfs.py), DFS (dfs.py)
│   │   ├── data/           Chennai transit graph (61 stations, 138 directed edges)
│   │   ├── models/         SQLAlchemy ORM + Pydantic schemas
│   │   └── routes/         REST API endpoints
│   └── db/                 PostgreSQL seeder (optional)
```

## Transit Network

| Line   | Name                        | Mode  | Stations |
|--------|-----------------------------|-------|----------|
| BL     | Blue Line                   | Metro | 30       |
| GL     | Green Line                  | Metro | 12       |
| MTC21  | Bus 21 (Broadway–T.Nagar)   | Bus   | 8        |
| MTC27  | Bus 27 (Central–Adyar)      | Bus   | 6        |
| MTC29C | Bus 29C (CMBT–Thiruvanmiyur)| Bus   | 7        |
| WALK   | Walking transfers           | Walk  | 11 edges |

## Algorithms

| Algorithm | Purpose | Strategy |
|-----------|---------|----------|
| **A\***   | Fastest route | Haversine heuristic / avg speed, optimal travel time |
| **BFS**   | Minimum transfers | Line-segment level BFS, fewest mode/line changes |
| **DFS**   | Sightseeing | Time-bounded depth search with optional waypoints |

## UI Features

- **Dark mode** — CARTO dark basemap tiles with neon-accented route lines
- **Glassmorphism panels** — Frosted glass control and results panels
- **Animated route drawing** — Progressive polyline animation from origin to destination
- **Radar-pulse markers** — Pulsing rings on start/end stations
- **Autocomplete** — Keyboard-navigable station search with line indicators
- **Algorithm selector** — Visual cards with color-coded indicators (cyan/magenta/emerald)
- **DFS waypoints** — Add up to 3 intermediate landmark stops
- **Staggered results** — Framer Motion cascading step-by-step directions
- **Expandable accordions** — Click to reveal intermediate stations per segment

---

## Quick Start

### Prerequisites

- **Node.js** >= 18
- **Python** >= 3.11
- PostgreSQL is optional (the app runs entirely from an in-memory graph)

### 1. Backend

```bash
cd transit-router/backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

### 2. Frontend

```bash
cd transit-router/frontend
npm install
npm run dev
```

Open **http://localhost:3000**

---

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/api/stations` | List all 61 stations |
| `GET`  | `/api/stations/:id` | Station details |
| `POST` | `/api/route` | Compute route |
| `GET`  | `/health` | Health check |

### POST /api/route

```json
{
  "origin_id": "BL12",
  "destination_id": "BL30",
  "algorithm": "astar",
  "via_stations": ["GL04"],
  "max_time_min": 120
}
```

### Response

```json
{
  "algorithm": "astar",
  "total_time_min": 42.3,
  "total_distance_km": 19.77,
  "total_transfers": 1,
  "computation_time_ms": 0.15,
  "segments": [...],
  "stations_visited": [...],
  "path_coordinates": [[13.08, 80.27], ...]
}
```
