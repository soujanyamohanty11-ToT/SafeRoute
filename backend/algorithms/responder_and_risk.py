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

    # Removing each primary-route corridor in turn reveals alternate paths,
    # including alternatives when the primary path is a single corridor.
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

    for room in rooms:
        room_id = room["id"]
        occupants = max(0, int(room.get("occupants", 0)))
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

    room_ratio = len(unreachable_rooms) / len(rooms) if rooms else 0
    occupant_ratio = (
        affected_occupants / total_occupants if total_occupants else 0
    )
    risk_score = round(min(100, 50 * room_ratio + 50 * occupant_ratio), 1)

    suggestions = []
    if unreachable_rooms:
        suggestions.append(
            "Re-open corridor connections around: "
            + ", ".join(unreachable_rooms)
        )
    if risk_score > 40:
        suggestions.append(
            "Review exit access and capacity near affected rooms."
        )
    if not suggestions:
        suggestions.append(
            "All rooms can still reach an exit in this simulated scenario."
        )

    return {
        "unreachable_rooms": unreachable_rooms,
        "affected_occupants": affected_occupants,
        "total_occupants": total_occupants,
        "risk_score": risk_score,
        "suggestions": suggestions,
    }


def _route_edges(route: List[str]) -> List[Edge]:
    return [(a, b) for a, b in zip(route, route[1:])]


def find_civilian_route(
    adjacency: Dict[str, List[str]],
    civilian_start: str,
    exit_ids: Set[str],
    avoid_edges: Optional[Set[Edge]] = None,
) -> Dict[str, Any]:
    """Shortest route from civilian_start to the nearest reachable exit.

    Also looks for the shortest route to any exit that shares no corridor with
    `avoid_edges` (the responder route), so the planner can suggest a
    non-conflicting alternative.
    """
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
    """Corridors used by both groups. `counterflow` is True when responders
    and civilians traverse the corridor in opposite directions."""
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