from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.api import router as api_router
from app.routes.auth_routes import router as auth_router

app = FastAPI(
    title="Chennai Transit Router",
    description="Multi-modal urban transit pathfinding with A*, BFS, DFS, and Eco-routing",
    version="0.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")
app.include_router(auth_router, prefix="/api")


@app.get("/health")
async def health():
    from app.data.chennai_network import transit_graph
    return {"status": "ok", "stations": transit_graph.station_count, "edges": transit_graph.edge_count}
