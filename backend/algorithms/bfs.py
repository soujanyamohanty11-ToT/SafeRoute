from collections import deque

def bfs(graph, start, targets):
    targets = set(targets)
    queue = deque([start])
    parent = {start: None}

    while queue:
        current = queue.popleft()

        if current in targets:
            path = []
            while current is not None:
                path.append(current)
                current = parent[current]
            return path[::-1]

        for neighbor in graph.get(current, []):
            if neighbor not in parent:
                parent[neighbor] = current
                queue.append(neighbor)

    return []
