from asyncio import graph

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
    print("Building file:", BASE / "data/building.json")
    print("Lab 1 connections:", graph.get("lab1"))
    print("Lab 2 connections:", graph.get("lab2"))
    print("Available exits:", list(building["exits"].keys()))
    print("Fire blocked edges:", blocked)

    exits = building["exits"]
    exit_routes = {}

    # Find a BFS route to each reachable exit
    for exit_id, details in exits.items():
        path = bfs(graph, req.start, [exit_id])

        if path:
            exit_routes[exit_id] = {
                "route": path,
                "distance": len(path) - 1,
                "capacity": details["capacity"]
            }

    reachable = list(exit_routes.keys())

    # Prefer an exit that can accommodate everyone.
    # Among suitable exits, choose the shortest route.
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
            "Selected the shortest reachable route among exits "
            "with sufficient capacity."
        )
    elif reachable:
        # If no single exit can accommodate everyone,
        # prefer the exit with the greatest capacity.
        recommended_exit = min(
            reachable,
            key=lambda exit_id: (
                -exit_routes[exit_id]["capacity"],
                exit_routes[exit_id]["distance"]
            )
        )
        recommendation_reason = (
            "No single reachable exit has enough capacity for everyone. "
            "The exit with the greatest capacity was selected, and "
            "additional people may be allocated to other reachable exits."
        )
    else:
        recommended_exit = None
        recommendation_reason = (
            "No exit is reachable from the selected starting location."
        )

    # Allocate people to the recommended exit first,
    # followed by the other reachable exits.
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
