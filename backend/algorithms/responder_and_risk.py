from collections import deque
from typing import Dict, List, Set, Tuple, Any

def find_responder_paths(
    adjacency: Dict[str, List[str]],
    entry_point: str,
    incident_location: str,
    blocked_edges: Set[Tuple[str, str]]
) -> Dict[str, Any]:
    """
    Calculates primary and alternative entry routes for first responders,
    avoiding blocked corridors.
    """
    if entry_point not in adjacency or incident_location not in adjacency:
        return {
            "primary_route": [],
            "alternative_route": [],
            "status": "Invalid nodes"
        }

    def bfs_path(forbidden_edge: Set[Tuple[str, str]] = set()) -> List[str]:
        queue = deque([[entry_point]])
        visited = {entry_point}

        while queue:
            path = queue.popleft()
            curr = path[-1]
            if curr == incident_location:
                return path

            for neighbor in adjacency.get(curr, []):
                edge = (min(curr, neighbor), max(curr, neighbor))
                if edge in blocked_edges or edge in forbidden_edge:
                    continue
                if neighbor not in visited:
                    visited.add(neighbor)
                    queue.append(path + [neighbor])
        return []

    primary_route = bfs_path()

    if not primary_route:
        return {
            "primary_route": [],
            "alternative_route": [],
            "status": "No route available"
        }

    # Generate alternative route by temporarily removing edges of primary path
    alt_route = []
    if len(primary_route) > 2:
        for i in range(len(primary_route) - 1):
            u, v = primary_route[i], primary_route[i + 1]
            forbidden = {(min(u, v), max(u, v))}
            candidate = bfs_path(forbidden_edge=forbidden)
            if candidate and candidate != primary_route:
                alt_route = candidate
                break

    return {
        "primary_route": primary_route,
        "alternative_route": alt_route,
        "status": "Success"
    }


def analyze_risk_scenario(
    nodes: List[Dict[str, Any]],
    edges: List[Any],
    simulated_blocked_corridors: List[Tuple[str, str]]
) -> Dict[str, Any]:
    """
    Simulates corridor blockages and evaluates disconnected rooms,
    impacted occupants, and graph risk scores.
    """
    sim_blocked_set = set()
    for u, v in simulated_blocked_corridors:
        sim_blocked_set.add((min(u, v), max(u, v)))

    # Construct graph adjacency
    adj = {n["id"]: [] for n in nodes}
    for e in edges:
        if isinstance(e, (list, tuple)):
            u, v = e[0], e[1]
        else:
            u, v = e["source"], e["target"]

        if (min(u, v), max(u, v)) not in sim_blocked_set:
            adj[u].append(v)
            adj[v].append(u)

    exits = {n["id"] for n in nodes if n["id"].startswith("exit")}
    rooms = [n for n in nodes if not n["id"].startswith("exit")]

    unreachable_rooms = []
    affected_occupants = 0
    total_occupants = 0

    for r in rooms:
        r_id = r["id"]
        occ = r.get("occupants", 20)
        total_occupants += occ

        # BFS reachability test
        q = deque([r_id])
        visited = {r_id}
        can_reach = False

        while q:
            curr = q.popleft()
            if curr in exits:
                can_reach = True
                break
            for nxt in adj.get(curr, []):
                if nxt not in visited:
                    visited.add(nxt)
                    q.append(nxt)

        if not can_reach:
            unreachable_rooms.append(r_id)
            affected_occupants += occ

    disconnected_ratio = (len(unreachable_rooms) / len(rooms)) if rooms else 0
    occ_ratio = (affected_occupants / total_occupants) if total_occupants > 0 else 0
    risk_score = min(100, round((disconnected_ratio * 50) + (occ_ratio * 50), 1))

    suggestions = []
    if unreachable_rooms:
        suggestions.append(f"Re-open corridor connections around node(s): {', '.join(unreachable_rooms)}")
    if risk_score > 40:
        suggestions.append("Reallocate emergency exit capacity near heavy occupant zones.")
    if not suggestions:
        suggestions.append("Graph connections remain fully resilient under this test scenario.")

    return {
        "unreachable_rooms": unreachable_rooms,
        "affected_occupants": affected_occupants,
        "total_occupants": total_occupants,
        "risk_score": risk_score,
        "suggestions": suggestions
    }