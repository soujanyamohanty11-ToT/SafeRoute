from collections import deque
from typing import Any, Dict, List, Optional, Set, Tuple

Edge = Tuple[str, str]


def normalize_edge(u: str, v: str) -> Edge:
    return (min(u, v), max(u, v))


def find_responder_paths(
    adjacency: Dict[str, List[str]],
    entry_point: str,
    incident_location: str,
    blocked_edges: Set[Edge],
) -> Dict[str, Any]:
    if entry_point not in adjacency or incident_location not in adjacency:
        return {
            "primary_route": [],
            "alternative_route": [],
            "status": "Invalid nodes",
        }

    normalized_blocked = {normalize_edge(u, v) for u, v in blocked_edges}

    def bfs_path(forbidden_edges: Optional[Set[Edge]] = None) -> List[str]:
        forbidden_edges = forbidden_edges or set()
        queue = deque([[entry_point]])
        visited = {entry_point}

        while queue:
            path = queue.popleft()
            current = path[-1]

            if current == incident_location:
                return path

            for neighbor in adjacency.get(current, []):
                edge = normalize_edge(current, neighbor)
                if edge in normalized_blocked or edge in forbidden_edges:
                    continue
                if neighbor not in visited:
                    visited.add(neighbor)
                    queue.append(path + [neighbor])

        return []

    primary = bfs_path()
    if not primary:
        return {
            "primary_route": [],
            "alternative_route": [],
            "status": "No route available",
        }

    alternatives = []
    for u, v in zip(primary, primary[1:]):
        candidate = bfs_path({normalize_edge(u, v)})
        if candidate and candidate != primary:
            alternatives.append(candidate)

    alternative = min(alternatives, key=len) if alternatives else []

    return {
        "primary_route": primary,
        "alternative_route": alternative,
        "status": "Success",
    }


def analyze_risk_scenario(
    nodes: List[Dict[str, Any]],
    edges: List[Any],
    simulated_blocked_corridors: List[Edge],
    exit_ids: Optional[Set[str]] = None,
) -> Dict[str, Any]:
    """
    Evaluates building graph resilience using deterministic reachability and exit capacity stress.

    Risk Logic (Balanced 50/50 Split):
    1. Hard Override (100/100): If ANY room is completely trapped with zero exit paths.
    2. Zero Risk (0/100): If no simulated corridor blockages exist.
    3. Scaled Risk (0-99):
       - Corridor Failure Ratio (50% Weight)
       - Exit Capacity Strain (50% Weight)
    """
    blocked = {
        normalize_edge(u, v)
        for u, v in simulated_blocked_corridors
    }

    node_ids = {node["id"] for node in nodes}
    exits = set(exit_ids or ())
    if not exits:
        exits = {
            node["id"]
            for node in nodes
            if node.get("type") == "exit" or node["id"].lower().startswith("exit")
        }
    exits &= node_ids
    rooms = [node for node in nodes if node["id"] not in exits]

    # Map exit capacities
    exit_capacities = {
        node["id"]: node.get("capacity", 50) for node in nodes if node["id"] in exits
    }

    adjacency = {node_id: [] for node_id in node_ids}

    for edge in edges:
        if isinstance(edge, (list, tuple)):
            u, v = edge[0], edge[1]
        else:
            u, v = edge["source"], edge["target"]

        if u not in adjacency or v not in adjacency:
            continue
        if normalize_edge(u, v) in blocked:
            continue

        adjacency[u].append(v)
        adjacency[v].append(u)

    unreachable_rooms = []
    affected_occupants = 0
    total_occupants = 0

    # 1. BFS Traversal Check per Room
    for room in rooms:
        room_id = room["id"]
        occupants = max(0, int(room.get("occupants", 20)))
        total_occupants += occupants

        queue = deque([room_id])
        visited = {room_id}
        can_reach_exit = False

        while queue:
            current = queue.popleft()
            if current in exits:
                can_reach_exit = True
                break

            for neighbor in adjacency[current]:
                if neighbor not in visited:
                    visited.add(neighbor)
                    queue.append(neighbor)

        if not can_reach_exit:
            unreachable_rooms.append(room_id)
            affected_occupants += occupants

    # 2. Metric Calculations with Equal 50/50 Weights
    total_edges = len(edges) if edges else 1
    blocked_count = len(simulated_blocked_corridors)
    blockage_pct = round((blocked_count / total_edges) * 100)

    # Reachable capacity across remaining exit connections
    reachable_capacity = sum(
        cap for e_id, cap in exit_capacities.items()
        if len(adjacency.get(e_id, [])) > 0
    )

    capacity_deficit = max(0, total_occupants - reachable_capacity)
    capacity_stress_pct = (
        round((capacity_deficit / total_occupants) * 100) if total_occupants > 0 else 0
    )

    # 50% / 50% Point Allocation
    blockage_points = round(blockage_pct * 0.5)
    capacity_points = round(capacity_stress_pct * 0.5)

    # 3. Decision Tree Logic for Final Risk Score
    if unreachable_rooms:
        risk_score = 100
        override_reason = "CRITICAL OVERRIDE: At least one room is completely trapped with zero exit paths."
    elif not simulated_blocked_corridors:
        risk_score = 0
        override_reason = "OPTIMAL: All network corridors are fully operational."
    else:
        override_reason = None
        raw_score = blockage_points + capacity_points
        risk_score = min(99, round(raw_score))

    # 4. Recommendations Generation
    suggestions = []
    if unreachable_rooms:
        suggestions.append(
            "CRITICAL: Immediate corridor restoration required for trapped room(s): "
            + ", ".join(unreachable_rooms)
        )
    elif risk_score > 50:
        suggestions.append(
            "HIGH STRESS: Reallocate crowd flow toward secondary exits to relieve bottlenecks."
        )
    else:
        suggestions.append(
            "Graph network remains resilient. All locations can reach functional exits."
        )

    return {
        "unreachable_rooms": unreachable_rooms,
        "affected_occupants": affected_occupants,
        "total_occupants": total_occupants,
        "risk_score": risk_score,
        "suggestions": suggestions,
        "breakdown": {
            "blocked_count": blocked_count,
            "total_edges": total_edges,
            "blockage_pct": blockage_pct,
            "blockage_points": blockage_points,
            "total_occupants": total_occupants,
            "reachable_capacity": reachable_capacity,
            "capacity_stress_pct": capacity_stress_pct,
            "capacity_points": capacity_points,
            "override_reason": override_reason,
        },
    }


def _route_edges(route: List[str]) -> List[Edge]:
    return [(a, b) for a, b in zip(route, route[1:])]


def find_civilian_route(
    adjacency: Dict[str, List[str]],
    civilian_start: str,
    exit_ids: Set[str],
    avoid_edges: Optional[Set[Edge]] = None,
) -> Dict[str, Any]:
    avoid = {normalize_edge(u, v) for u, v in (avoid_edges or set())}

    def shortest(target: str) -> List[str]:
        queue = deque([[civilian_start]])
        seen = {civilian_start}
        while queue:
            path = queue.popleft()
            if path[-1] == target:
                return path
            for nb in adjacency.get(path[-1], []):
                if nb not in seen:
                    seen.add(nb)
                    queue.append(path + [nb])
        return []

    if civilian_start not in adjacency:
        return {"route": [], "exit": None, "conflict_free_route": []}

    options = []
    for ex in sorted(exit_ids):
        if ex in adjacency:
            path = shortest(ex)
            if path:
                options.append(path)
    options.sort(key=len)

    if not options:
        return {"route": [], "exit": None, "conflict_free_route": []}

    best = options[0]
    clear = [
        r for r in options
        if not ({normalize_edge(u, v) for u, v in _route_edges(r)} & avoid)
    ]
    return {
        "route": best,
        "exit": best[-1],
        "conflict_free_route": clear[0] if clear else [],
    }


def find_shared_corridors(
    responder_route: List[str], civilian_route: List[str]
) -> List[Dict[str, Any]]:
    civ = {}
    for u, v in _route_edges(civilian_route):
        civ[normalize_edge(u, v)] = (u, v)

    shared = []
    for u, v in _route_edges(responder_route):
        key = normalize_edge(u, v)
        if key in civ:
            shared.append({
                "edge": [u, v],
                "counterflow": civ[key] != (u, v),
            })
    return shared