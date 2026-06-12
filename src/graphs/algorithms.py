from typing import Dict, List, Tuple, Optional
from .graph import Graph


class MinHeap:
    def __init__(self):
        self._data: List[Tuple[float, str]] = []

    def __len__(self) -> int:
        return len(self._data)

    def push(self, item: Tuple[float, str]) -> None:
        self._data.append(item)
        self._sift_up(len(self._data) - 1)

    def pop(self) -> Tuple[float, str]:
        data = self._data
        topo = data[0]
        ultimo = data.pop()
        if data:
            data[0] = ultimo
            self._sift_down(0)
        return topo

    def _sift_up(self, i: int) -> None:
        data = self._data
        while i > 0:
            pai = (i - 1) // 2
            if data[i] < data[pai]:
                data[i], data[pai] = data[pai], data[i]
                i = pai
            else:
                break

    def _sift_down(self, i: int) -> None:
        data = self._data
        n = len(data)
        while True:
            menor = i
            esq = 2 * i + 1
            dir = 2 * i + 2
            if esq < n and data[esq] < data[menor]:
                menor = esq
            if dir < n and data[dir] < data[menor]:
                menor = dir
            if menor == i:
                break
            data[i], data[menor] = data[menor], data[i]
            i = menor


def dijkstra(graph: Graph, start: str, end: str) -> Tuple[Optional[float], Optional[List[str]]]:
    if start not in graph.adjacency_list or end not in graph.adjacency_list:
        return None, None

    distances: Dict[str, float] = {node: float('inf') for node in graph.adjacency_list}
    distances[start] = 0

    previous: Dict[str, Optional[str]] = {node: None for node in graph.adjacency_list}

    priority_queue = MinHeap()
    priority_queue.push((0, start))

    visited: set = set()

    while len(priority_queue):
        current_distance, current_node = priority_queue.pop()

        if current_node in visited:
            continue

        visited.add(current_node)

        if current_node == end:
            break

        for neighbor, weight in graph.get_neighbors(current_node):
            if neighbor in visited:
                continue

            new_distance = current_distance + weight

            if new_distance < distances[neighbor]:
                distances[neighbor] = new_distance
                previous[neighbor] = current_node
                priority_queue.push((new_distance, neighbor))

    if distances[end] == float('inf'):
        return None, None

    path = []
    current = end
    while current is not None:
        path.append(current)
        current = previous[current]
    path.reverse()

    if path[0] != start:
        return None, None

    return distances[end], path


def calculate_distance(graph: Graph, path: List[str]) -> float:
    if len(path) < 2:
        return 0

    total_distance = 0
    for i in range(len(path) - 1):
        from_node = path[i]
        to_node = path[i + 1]

        found = False
        for neighbor, weight in graph.get_neighbors(from_node):
            if neighbor == to_node:
                total_distance += weight
                found = True
                break

        if not found:
            raise ValueError(f"Não há conexão direta entre {from_node} e {to_node}")

    return total_distance


def _shortest_simple_path(
    graph: Graph, start: str, end: str
) -> Tuple[Optional[float], Optional[List[str]]]:
    best: List = [float('inf'), None]

    def dfs(node: str, path: List[str], visited: set, cost: float) -> None:
        if node == end:
            if cost < best[0]:
                best[0] = cost
                best[1] = path.copy()
            return
        for neighbor, weight in graph.get_neighbors(node):
            if neighbor not in visited:
                visited.add(neighbor)
                path.append(neighbor)
                dfs(neighbor, path, visited, cost + weight)
                path.pop()
                visited.remove(neighbor)

    dfs(start, [start], {start}, 0.0)
    if best[1] is None:
        return None, None
    return best[0], best[1]


def bellman_ford(graph: Graph, start: str, end: str) -> Tuple[Optional[float], Optional[List[str]]]:
    if start not in graph.adjacency_list or end not in graph.adjacency_list:
        return None, None

    distances: Dict[str, float] = {node: float('inf') for node in graph.adjacency_list}
    distances[start] = 0
    previous: Dict[str, Optional[str]] = {node: None for node in graph.adjacency_list}

    V = len(graph.adjacency_list)

    for i in range(V - 1):
        for u in graph.adjacency_list:
            if distances[u] == float('inf'):
                continue
            for v, wt in graph.get_neighbors(u):
                if distances[u] + wt < distances[v]:
                    distances[v] = distances[u] + wt
                    previous[v] = u

    for u in graph.adjacency_list:
        if distances[u] == float('inf'):
            continue
        for v, wt in graph.get_neighbors(u):
            if distances[u] + wt < distances[v]:
                return _shortest_simple_path(graph, start, end)

    if distances[end] == float('inf'):
        return None, None

    path = []
    current = end
    while current is not None:
        path.append(current)
        current = previous[current]
    path.reverse()

    if path[0] != start:
        return None, None

    return distances[end], path