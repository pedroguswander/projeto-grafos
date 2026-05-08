import heapq
from typing import Dict, List, Tuple, Optional
from .graph import Graph


def dijkstra(graph: Graph, start: str, end: str) -> Tuple[Optional[float], Optional[List[str]]]:
    """
    Implementação manual do algoritmo de Dijkstra para encontrar o caminho mais curto.

    Args:
        graph: O grafo contendo os aeroportos e rotas
        start: Código do aeroporto de origem
        end: Código do aeroporto de destino

    Returns:
        Tupla contendo (custo_total, caminho) ou (None, None) se não houver caminho
    """

    # Verificar se os nós existem no grafo
    if start not in graph.adjacency_list or end not in graph.adjacency_list:
        return None, None

    # Dicionário para armazenar as distâncias mínimas conhecidas
    distances: Dict[str, float] = {node: float('inf') for node in graph.adjacency_list}
    distances[start] = 0

    # Dicionário para armazenar o nó anterior no caminho mais curto
    previous: Dict[str, Optional[str]] = {node: None for node in graph.adjacency_list}

    # Fila de prioridade (min-heap) para os nós a serem processados
    # Cada elemento é uma tupla (distância, nó)
    priority_queue: List[Tuple[float, str]] = [(0, start)]

    # Conjunto para rastrear nós já processados
    visited: set = set()

    while priority_queue:
        # Extrair o nó com a menor distância conhecida
        current_distance, current_node = heapq.heappop(priority_queue)

        # Se já visitamos este nó, pular
        if current_node in visited:
            continue

        # Marcar como visitado
        visited.add(current_node)

        # Se chegamos ao destino, podemos parar
        if current_node == end:
            break

        # Para cada vizinho do nó atual
        for neighbor, weight in graph.get_neighbors(current_node):
            if neighbor in visited:
                continue

            # Calcular nova distância
            new_distance = current_distance + weight

            # Se encontramos um caminho mais curto
            if new_distance < distances[neighbor]:
                distances[neighbor] = new_distance
                previous[neighbor] = current_node
                heapq.heappush(priority_queue, (new_distance, neighbor))

    # Se não conseguimos alcançar o destino
    if distances[end] == float('inf'):
        return None, None

    # Reconstruir o caminho
    path = []
    current = end
    while current is not None:
        path.append(current)
        current = previous[current]
    path.reverse()

    # Verificar se o caminho começa no start
    if path[0] != start:
        return None, None

    return distances[end], path


def calculate_distance(graph: Graph, path: List[str]) -> float:
    """
    Calcula a distância total de um caminho dado.

    Args:
        graph: O grafo
        path: Lista de códigos de aeroportos no caminho

    Returns:
        Distância total do caminho
    """
    if len(path) < 2:
        return 0

    total_distance = 0
    for i in range(len(path) - 1):
        from_node = path[i]
        to_node = path[i + 1]

        # Encontrar a aresta entre os nós
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