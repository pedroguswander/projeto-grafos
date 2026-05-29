import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import time
import statistics
import tracemalloc
import json

from parte2.src.graphs.graph import Graph
from parte2.src.graphs.io import load_graph_from_csvs
from parte2.src.graphs.algorithms import bfs, dfs, dijkstra, bellman_ford

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "ETN")
OUT_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "out", "part2_report.json")

N_RUNS = 10


def _top_nodes_by_degree(graph, n: int):
    return sorted(
        graph.adjacency_list.keys(),
        key=lambda node: len(graph.adjacency_list[node]),
        reverse=True,
    )[:n]


def _direct_pairs(graph, sources, count: int):
    pairs = []
    for src in sources:
        for nb, _ in graph.adjacency_list.get(src, []):
            if nb != src and (src, nb) not in pairs:
                pairs.append((src, nb))
                if len(pairs) == count:
                    return pairs
    return pairs[:count]


def _run_bfs(graph, source: str, label: str) -> dict:
    print(f"\n[BFS] Fonte: {source}")

    tracemalloc.start()
    result = bfs(graph, source)
    _, peak = tracemalloc.get_traced_memory()
    tracemalloc.stop()

    times = []
    for _ in range(N_RUNS):
        t0 = time.perf_counter()
        bfs(graph, source)
        t1 = time.perf_counter()
        times.append(t1 - t0)
    elapsed = statistics.median(times)

    print(f"  tempo(mediana): {elapsed:.6f}s | memoria_pico: {peak / 1024:.2f} KB | camadas: {len(result['camadas'])} | nos_visitados: {result['ordem']}")
    return {
        label: source,
        "tempo": elapsed,
        "camadas": {str(k): v for k, v in result["camadas"].items()},
        "ordem": result["ordem"],
    }


def _run_dfs(graph, source: str, label: str) -> dict:
    print(f"\n[DFS] Fonte: {source}")

    tracemalloc.start()
    result = dfs(graph, source)
    _, peak = tracemalloc.get_traced_memory()
    tracemalloc.stop()

    times = []
    for _ in range(N_RUNS):
        t0 = time.perf_counter()
        dfs(graph, source)
        t1 = time.perf_counter()
        times.append(t1 - t0)
    elapsed = statistics.median(times)

    print(f"  tempo(mediana): {elapsed:.6f}s | memoria_pico: {peak / 1024:.2f} KB | nos_visitados: {result['ordem']} | ciclos: {result['ciclos']}")
    print(f"  arestas -> tree: {len(result['arestas']['tree'])} | back: {len(result['arestas']['back'])} | forward: {len(result['arestas']['forward'])} | cross: {len(result['arestas']['cross'])}")
    return {
        label: source,
        "tempo": elapsed,
        "ordem": result["ordem"],
        "ciclos": result["ciclos"],
        "arestas": result["arestas"],
    }


def _has_negative_edges(graph) -> bool:
    return any(
        w < 0
        for neighbors in graph.adjacency_list.values()
        for _, w in neighbors
    )


def _build_non_negative_subgraph(graph) -> Graph:
    subgraph = Graph()
    subgraph.ports = dict(graph.ports)
    for node, neighbors in graph.adjacency_list.items():
        subgraph.adjacency_list[node] = [(nb, w) for nb, w in neighbors if w >= 0]
    return subgraph


def _build_subgraph_no_cycle(graph) -> Graph:
    nodes = list(graph.adjacency_list.keys())
    dist = {n: 0 for n in nodes}
    for _ in range(len(nodes) - 1):
        for u in nodes:
            for v, w in graph.adjacency_list.get(u, []):
                if dist[u] + w < dist[v]:
                    dist[v] = dist[u] + w
    in_neg_cycle = set()
    for u in nodes:
        for v, w in graph.adjacency_list.get(u, []):
            if dist[u] + w < dist[v]:
                in_neg_cycle.add(u)
    subgraph = Graph()
    subgraph.ports = dict(graph.ports)
    for u in nodes:
        subgraph.adjacency_list[u] = [] if u in in_neg_cycle else list(graph.adjacency_list.get(u, []))
    return subgraph


def _run_dijkstra(graph, src: str, dst: str, eh_subgrafo: bool) -> dict:
    print(f"\n[DIJKSTRA] {src} -> {dst} | subgrafo={eh_subgrafo}")

    tracemalloc.start()
    cost, path = dijkstra(graph, src, dst)
    _, peak = tracemalloc.get_traced_memory()
    tracemalloc.stop()

    times = []
    for _ in range(N_RUNS):
        t0 = time.perf_counter()
        dijkstra(graph, src, dst)
        t1 = time.perf_counter()
        times.append(t1 - t0)
    elapsed = statistics.median(times)

    print(f"  tempo(mediana): {elapsed:.6f}s | memoria_pico: {peak / 1024:.2f} KB | custo: {cost} | tamanho: {len(path) if path else None}")
    return {
        "source": src,
        "target": dst,
        "tempo": elapsed,
        "custo": cost,
        "tamanho_caminho": len(path) if path else None,
        "caminho": path,
        "eh_subgrafo": eh_subgrafo,
        "tem_peso_negativo": _has_negative_edges(graph),
    }


def _run_bellman_ford(graph, src: str, dst: str, descricao: str, eh_subgrafo: bool) -> dict:
    print(f"\n[BELLMAN-FORD] {descricao} | {src} -> {dst}")

    tracemalloc.start()
    cost, path, has_cycle = bellman_ford(graph, src, dst)
    _, peak = tracemalloc.get_traced_memory()
    tracemalloc.stop()

    times = []
    for _ in range(N_RUNS):
        t0 = time.perf_counter()
        bellman_ford(graph, src, dst)
        t1 = time.perf_counter()
        times.append(t1 - t0)
    elapsed = statistics.median(times)

    print(f"  tempo(mediana): {elapsed:.6f}s | memoria_pico: {peak / 1024:.2f} KB | custo: {cost} | ciclo_negativo: {has_cycle}")
    return {
        "descricao": descricao,
        "source": src,
        "target": dst,
        "tempo": elapsed,
        "custo": cost,
        "tamanho_caminho": len(path) if path else None,
        "caminho": path,
        "eh_subgrafo": eh_subgrafo,
        "tem_peso_negativo": _has_negative_edges(graph),
        "tem_ciclo_negativo": has_cycle,
    }


def test_generate_part2_report():
    print("\n" + "=" * 60)
    print("Carregando grafo ETN...")
    graph = load_graph_from_csvs(DATA_DIR)
    n_ports = len(graph.ports)
    n_routes = sum(len(v) for v in graph.adjacency_list.values())
    print(f"Grafo carregado: {n_ports} portos, {n_routes} rotas")

    bfs_sources = ["AEJEA", "CNYTN", "CAMTR"]
    dfs_sources = ["AEJEA", "CNYTN", "CAMTR"]

    print("\n--- BFS ---")
    bfs_results = [_run_bfs(graph, src, f"source BFS {i}") for i, src in enumerate(bfs_sources, 1)]

    print("\n--- DFS ---")
    dfs_results = [_run_dfs(graph, src, f"source DFS {i}") for i, src in enumerate(dfs_sources, 1)]

    print("\n--- DIJKSTRA ---")
    subgraph = _build_non_negative_subgraph(graph)
    _DIJKSTRA_SUBGRAPH_PAIRS = [
        ("HKHKG", "USEWR"),
        ("SGSIN", "BRSSZ"),
        ("CLSAI", "LKCMB"),
        ("LKCMB", "MYPKG"),
    ]
    dijkstra_results = (
        [_run_dijkstra(subgraph, src, dst, eh_subgrafo=True) for src, dst in _DIJKSTRA_SUBGRAPH_PAIRS] +
        [_run_dijkstra(graph, "LKCMB", "MYTPP", eh_subgrafo=False)]
    )

    print("\n--- BELLMAN-FORD ---")
    subgrafo_pos = _build_non_negative_subgraph(graph)
    subgrafo_neg = _build_subgraph_no_cycle(graph)
    bf_pair_pos = _direct_pairs(subgrafo_pos, _top_nodes_by_degree(subgrafo_pos, 10), 1)[0]
    bf_pair_neg = _direct_pairs(subgrafo_neg, _top_nodes_by_degree(subgrafo_neg, 10), 1)[0]
    pairs_2 = _direct_pairs(graph, _top_nodes_by_degree(graph, 10), 2)
    bellman_results = [
        _run_bellman_ford(subgrafo_pos, bf_pair_pos[0], bf_pair_pos[1],
                          "Subgrafo positivo (sem arestas negativas)", eh_subgrafo=True),
        _run_bellman_ford(subgrafo_neg, bf_pair_neg[0], bf_pair_neg[1],
                          "Subgrafo com aresta negativa, sem ciclo negativo", eh_subgrafo=True),
        _run_bellman_ford(graph, pairs_2[0][0], pairs_2[0][1],
                          "Grafo completo (ciclo negativo detectado)", eh_subgrafo=False),
    ]

    report = {
        "BFS": bfs_results,
        "DFS": dfs_results,
        "DIJKSTRA": dijkstra_results,
        "BELLMAN-FORD": bellman_results,
    }

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    print(f"\nRelatório salvo em: {OUT_PATH}")
    print("=" * 60)

    assert os.path.exists(OUT_PATH)
