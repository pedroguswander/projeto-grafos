import heapq
from typing import Dict, List, Tuple, Optional
from .graph import Graph


def dijkstra(graph: Graph, start: str, end: str) -> Tuple[Optional[float], Optional[List[str]]]:
    if start not in graph.adjacency_list or end not in graph.adjacency_list:
        return None, None

    distances: Dict[str, float] = {node: float('inf') for node in graph.adjacency_list}
    distances[start] = 0
    previous: Dict[str, Optional[str]] = {node: None for node in graph.adjacency_list}
    priority_queue: List[Tuple[float, str]] = [(0, start)]
    visited: set = set()

    while priority_queue:
        current_distance, current_node = heapq.heappop(priority_queue)

        if current_node in visited:
            continue
        visited.add(current_node)

        if current_node == end:
            break

        for neighbor, weight in graph.get_neighbors(current_node):
            if weight < 0:
                return None, None
            if neighbor in visited:
                continue
            new_distance = current_distance + weight
            if new_distance < distances.get(neighbor, float('inf')):
                distances[neighbor] = new_distance
                previous[neighbor] = current_node
                heapq.heappush(priority_queue, (new_distance, neighbor))

    if distances.get(end, float('inf')) == float('inf'):
        return None, None

    path = []
    current = end
    while current is not None:
        path.append(current)
        current = previous.get(current)
    path.reverse()

    if path[0] != start:
        return None, None

    return distances[end], path


def bfs(graph: Graph, start: str) -> dict:
    if start not in graph.adjacency_list:
        return {"camadas": {}, "ordem": 0}

    visited = {start}
    queue = [start]
    camadas: Dict[int, List[str]] = {0: [start]}
    level = 0
    ordem = 1

    while queue:
        next_queue: List[str] = []
        for node in queue:
            for neighbor, _ in graph.get_neighbors(node):
                if neighbor not in visited:
                    visited.add(neighbor)
                    next_queue.append(neighbor)
                    ordem += 1
        if next_queue:
            level += 1
            camadas[level] = next_queue
        queue = next_queue

    return {"camadas": camadas, "ordem": ordem}


def dfs(graph: Graph, start: str) -> dict:
    if start not in graph.adjacency_list:
        return {"ordem": 0, "ciclos": 0, "arestas": {"tree": [], "back": [], "forward": [], "cross": []}}

    color: Dict[str, int] = {node: 0 for node in graph.adjacency_list}
    disc: Dict[str, int] = {}
    finish: Dict[str, int] = {}
    timer = [0]
    visited_count = [0]
    edges: Dict[str, List] = {"tree": [], "back": [], "forward": [], "cross": []}

    def _visit(u: str) -> None:
        color[u] = 1
        timer[0] += 1
        disc[u] = timer[0]
        visited_count[0] += 1

        for v, _ in graph.get_neighbors(u):
            if v not in color:
                continue
            if color[v] == 0:
                edges["tree"].append([u, v])
                _visit(v)
            elif color[v] == 1:
                edges["back"].append([u, v])
            else:
                if disc.get(v, 0) > disc.get(u, 0):
                    edges["forward"].append([u, v])
                else:
                    edges["cross"].append([u, v])

        color[u] = 2
        timer[0] += 1
        finish[u] = timer[0]

    _visit(start)

    return {
        "ordem": visited_count[0],
        "ciclos": len(edges["back"]),
        "arestas": edges,
    }


def bfs_find(graph: Graph, start: str, target: str) -> dict:
    if start not in graph.adjacency_list:
        return {"nos_visitados": 0, "encontrado": False}
    if start == target:
        return {"nos_visitados": 1, "encontrado": True}

    visited = {start}
    queue = [start]
    count = 1

    while queue:
        next_queue: List[str] = []
        for node in queue:
            for neighbor, _ in graph.get_neighbors(node):
                if neighbor not in visited:
                    visited.add(neighbor)
                    count += 1
                    if neighbor == target:
                        return {"nos_visitados": count, "encontrado": True}
                    next_queue.append(neighbor)
        queue = next_queue

    return {"nos_visitados": count, "encontrado": False}


def dfs_find(graph: Graph, start: str, target: str) -> dict:
    if start not in graph.adjacency_list:
        return {"nos_visitados": 0, "encontrado": False}

    visited: set = set()
    stack = [start]
    count = 0

    while stack:
        node = stack.pop()
        if node in visited:
            continue
        visited.add(node)
        count += 1
        if node == target:
            return {"nos_visitados": count, "encontrado": True}
        for neighbor, _ in graph.get_neighbors(node):
            if neighbor not in visited:
                stack.append(neighbor)

    return {"nos_visitados": count, "encontrado": False}


def _shortest_simple_path(
    graph: Graph, start: str, end: str
) -> Tuple[Optional[float], Optional[List[str]]]:
    best: List = [float('inf'), None]

    def _dfs(node: str, path: List[str], visited: set, cost: float) -> None:
        if node == end:
            if cost < best[0]:
                best[0] = cost
                best[1] = path.copy()
            return
        for neighbor, weight in graph.get_neighbors(node):
            if neighbor not in visited:
                visited.add(neighbor)
                path.append(neighbor)
                _dfs(neighbor, path, visited, cost + weight)
                path.pop()
                visited.remove(neighbor)

    _dfs(start, [start], {start}, 0.0)
    if best[1] is None:
        return None, None
    return best[0], best[1]


def _detectar_ciclo_negativo(graph: Graph) -> Optional[List[str]]:
    nodes = list(graph.adjacency_list)
    edges = [(u, v, w) for u in nodes for v, w in graph.get_neighbors(u)]
    dist: Dict[str, float] = {n: 0.0 for n in nodes}
    prev: Dict[str, Optional[str]] = {n: None for n in nodes}
    x: Optional[str] = None
    for _ in range(len(nodes)):
        x = None
        for u, v, w in edges:
            if v not in dist:
                continue
            if dist[u] + w < dist[v] - 1e-9:
                dist[v] = dist[u] + w
                prev[v] = u
                x = v
    if x is None:
        return None
    for _ in range(len(nodes)):
        x = prev[x]
    cycle: List[str] = [x]
    v = prev[x]
    while v != x:
        cycle.append(v)
        v = prev[v]
    cycle.append(x)
    cycle.reverse()
    return cycle


def remover_ciclos_negativos(graph: Graph) -> Graph:
    novo = Graph()
    for port in graph.ports.values():
        novo.add_port(port)
    for u in graph.adjacency_list:
        for v, w in graph.get_neighbors(u):
            novo.add_route(u, v, w)
    while True:
        cycle = _detectar_ciclo_negativo(novo)
        if cycle is None:
            break
        pior_arco: Optional[Tuple[str, str]] = None
        pior_peso = float('inf')
        for i in range(len(cycle) - 1):
            a, b = cycle[i], cycle[i + 1]
            for v, w in novo.adjacency_list[a]:
                if v == b and w < pior_peso:
                    pior_peso = w
                    pior_arco = (a, b)
        if pior_arco is None:
            break
        a, b = pior_arco
        vizinhos = novo.adjacency_list[a]
        for idx, (v, w) in enumerate(vizinhos):
            if v == b and w == pior_peso:
                vizinhos.pop(idx)
                break
    return novo


def bellman_ford(
    graph: Graph, start: str, end: str
) -> Tuple[Optional[float], Optional[List[str]], bool]:
    if start not in graph.adjacency_list or end not in graph.adjacency_list:
        return None, None, False

    distances: Dict[str, float] = {node: float('inf') for node in graph.adjacency_list}
    distances[start] = 0
    previous: Dict[str, Optional[str]] = {node: None for node in graph.adjacency_list}

    V = len(graph.adjacency_list)

    for _ in range(V - 1):
        updated = False
        for u in graph.adjacency_list:
            if distances[u] == float('inf'):
                continue
            for v, wt in graph.get_neighbors(u):
                if v not in distances:
                    continue
                if distances[u] + wt < distances[v]:
                    distances[v] = distances[u] + wt
                    previous[v] = u
                    updated = True
        if not updated:
            break

    for u in graph.adjacency_list:
        if distances[u] == float('inf'):
            continue
        for v, wt in graph.get_neighbors(u):
            if v not in distances:
                continue
            if distances[u] + wt < distances[v]:
                return None, None, True

    if distances.get(end, float('inf')) == float('inf'):
        return None, None, False

    path: List[str] = []
    current: Optional[str] = end
    while current is not None:
        path.append(current)
        current = previous.get(current)
    path.reverse()

    if path[0] != start:
        return None, None, False

    return distances[end], path, False
