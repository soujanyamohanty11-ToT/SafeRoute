from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pathlib import Path
import json

from algorithms.bfs import bfs
from algorithms.warshall import warshall
from algorithms.allocation import allocate_people

BASE = Path(__file__).parent
building = json.loads((BASE / "data/building.json").read_text())
emergencies = json.loads((BASE / "data/emergencies.json").read_text())

app = FastAPI(title="SafeRoute API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class RouteRequest(BaseModel):
    start: str
    emergency: str
    people: int = 0

def make_graph(blocked):
    graph = {n["id"]: [] for n in building["nodes"]}
    blocked_set = {frozenset(edge) for edge in blocked}

    for a, b in building["edges"]:
        if frozenset((a, b)) not in blocked_set:
            graph[a].append(b)
            graph[b].append(a)
    return graph

@app.get("/building")
def get_building():
    return building

@app.get("/emergencies")
def get_emergencies():
    return emergencies

@app.post("/evacuation")
def evacuation(req: RouteRequest):
    scenario = emergencies.get(req.emergency, {"blocked_edges": []})
    blocked = scenario["blocked_edges"]
    graph = make_graph(blocked)

    exits = list(building["exits"].keys())

    reachable = []
    for exit_id in exits:
        if bfs(graph, req.start, [exit_id]):
            reachable.append(exit_id)

    route = bfs(graph, req.start, reachable)

    recommended_exit = route[-1] if route else None

    # Put the recommended exit first
    allocation_exits = {}

    if recommended_exit:
        allocation_exits[recommended_exit] = building["exits"][recommended_exit]["capacity"]

    for exit_id in reachable:
        if exit_id != recommended_exit:
            allocation_exits[exit_id] = building["exits"][exit_id]["capacity"]

    allocation, unallocated = allocate_people(
        req.people,
        allocation_exits
    )

    return {
        "route": route,
        "recommended_exit": recommended_exit,
        "reachable_exits": reachable,
        "blocked_edges": blocked,
        "allocation": allocation,
        "unallocated": unallocated,
        "reachable": bool(route)
    }

@app.get("/reachability")
def reachability():
    nodes = [n["id"] for n in building["nodes"]]
    reach, index = warshall(nodes, building["edges"])
    return {
        "nodes": nodes,
        "matrix": reach
    }
