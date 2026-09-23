def warshall(nodes, edges):
    index = {node: i for i, node in enumerate(nodes)}
    n = len(nodes)
    reach = [[False] * n for _ in range(n)]

    for i in range(n):
        reach[i][i] = True

    for a, b in edges:
        reach[index[a]][index[b]] = True
        reach[index[b]][index[a]] = True

    for k in range(n):
        for i in range(n):
            for j in range(n):
                reach[i][j] = reach[i][j] or (reach[i][k] and reach[k][j])

    return reach, index
