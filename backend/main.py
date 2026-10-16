from pathlib import Path
import json
from typing import List, Tuple, Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from algorithms.bfs import bfs
from algorithms.warshall import warshall
from algorithms.allocation import allocate_people
from algorithms.responder_and_risk import find_responder_paths, analyze_risk_scenario

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
    simulated_blockages: Optional[List[Tuple[str, str]]] = []

class ResponderRequest(BaseModel):
    entry_point: str
    incident_location: str
    simulated_blockages: Optional[List[Tuple[str, str]]] = []

class RiskAnalysisRequest(BaseModel):
    simulated_blocked_corridors: List[Tuple[str, str]]


def make_graph(blocked, extra_simulated_blockages=None):
    graph = {n["id"]: [] for n in building["nodes"]}
    
    blocked_set = {frozenset(edge) for edge in blocked}
    if extra_simulated_blockages:
        for u, v in extra_simulated_blockages:
            blocked_set.add(frozenset((u, v)))

    for edge in building["edges"]:
        if isinstance(edge, (list, tuple)):
            a, b = edge[0], edge[1]
        else:
            a, b = edge["source"], edge["target"]

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
    
    # Generate graph taking into account emergency blockages + user test blockages
    graph = make_graph(blocked, req.simulated_blockages)

    exits = building["exits"]
    exit_routes = {}

    for exit_id, details in exits.items():
        path = bfs(graph, req.start, [exit_id])
        if path:
            exit_routes[exit_id] = {
                "route": path,
                "distance": len(path) - 1,
                "capacity": details["capacity"]
            }

    reachable = list(exit_routes.keys())

    suitable = [
        exit_id for exit_id in reachable
        if exit_routes[exit_id]["capacity"] >= req.people
    ]

    if suitable:
        recommended_exit = min(
            suitable,
            key=lambda exit_id: (
                exit_routes[exit_id]["distance"],
                -exit_routes[exit_id]["capacity"]
            )
        )
        recommendation_reason = (
            "Selected the shortest reachable route among exits with sufficient capacity."
        )
    elif reachable:
        recommended_exit = min(
            reachable,
            key=lambda exit_id: (
                -exit_routes[exit_id]["capacity"],
                exit_routes[exit_id]["distance"]
            )
        )
        recommendation_reason = (
            "No single reachable exit has enough capacity for everyone. "
            "The exit with the greatest capacity was selected."
        )
    else:
        recommended_exit = None
        recommendation_reason = (
            "No exit is reachable from the selected starting location."
        )

    allocation_exits = {}
    ordered_exits = []

    if recommended_exit:
        ordered_exits.append(recommended_exit)

    ordered_exits.extend(
        sorted(
            [e for e in reachable if e != recommended_exit],
            key=lambda e: (
                exit_routes[e]["distance"],
                -exit_routes[e]["capacity"]
            )
        )
    )

    for exit_id in ordered_exits:
        allocation_exits[exit_id] = exits[exit_id]["capacity"]

    allocation, unallocated = allocate_people(
        req.people,
        allocation_exits
    )

    route = (
        exit_routes[recommended_exit]["route"]
        if recommended_exit else []
    )

    return {
        "route": route,
        "recommended_exit": recommended_exit,
        "recommendation_reason": recommendation_reason,
        "reachable_exits": reachable,
        "exit_routes": exit_routes,
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


@app.post("/responder-path")
def get_responder_path(req: ResponderRequest):
    blocked_edges = set()
    for u, v in req.simulated_blockages:
        blocked_edges.add((min(u, v), max(u, v)))

    adj = {n["id"]: [] for n in building.get("nodes", [])}
    for e in building.get("edges", []):
        if isinstance(e, (list, tuple)):
            u, v = e[0], e[1]
        else:
            u, v = e["source"], e["target"]
        adj[u].append(v)
        adj[v].append(u)

    result = find_responder_paths(adj, req.entry_point, req.incident_location, blocked_edges)
    return result


@app.post("/risk-analysis")
def post_risk_analysis(req: RiskAnalysisRequest):
    analysis = analyze_risk_scenario(
        nodes=building.get("nodes", []),
        edges=building.get("edges", []),
        simulated_blocked_corridors=req.simulated_blocked_corridors
    )
    return analysis