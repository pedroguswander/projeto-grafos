import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from parte2.src.graphs.graph import Graph, Port
from parte2.src.graphs.algorithms import dfs


def _port(code: str) -> Port:
    return Port(code=code, name=code, country="BR", region="BR", latitude=0.0, longitude=0.0)


def _make_graph(*codes: str) -> Graph:
    g = Graph()
    for c in codes:
        g.add_port(_port(c))
    return g


def _dir(g: Graph, src: str, dst: str, w: float = 1.0) -> None:
    g.adjacency_list[src].append((dst, w))


def test_acyclic_graph_no_back_edges():
    g = _make_graph("A", "B", "C")
    _dir(g, "A", "B")
    _dir(g, "A", "C")

    result = dfs(g, "A")
    assert result["ciclos"] == 0
    assert result["arestas"]["back"] == []
    assert result["ordem"] == 3
    assert len(result["arestas"]["tree"]) == 2


def test_cycle_detected_as_back_edge():
    g = _make_graph("A", "B", "C")
    _dir(g, "A", "B")
    _dir(g, "B", "C")
    _dir(g, "C", "A")

    result = dfs(g, "A")
    assert result["ciclos"] == 1
    assert ["C", "A"] in result["arestas"]["back"]


def test_forward_edge_classification():
    g = _make_graph("A", "B", "C")
    _dir(g, "A", "B")
    _dir(g, "B", "C")
    _dir(g, "A", "C")

    result = dfs(g, "A")
    assert result["ciclos"] == 0
    assert ["A", "C"] in result["arestas"]["forward"]


def test_cross_edge_classification():
    g = _make_graph("A", "B", "C", "D")
    _dir(g, "A", "B")
    _dir(g, "A", "C")
    _dir(g, "B", "D")
    _dir(g, "C", "D")

    result = dfs(g, "A")
    assert result["ciclos"] == 0
    cross_or_forward = result["arestas"]["cross"] + result["arestas"]["forward"]
    assert any(e[1] == "D" for e in cross_or_forward)


def test_all_nodes_visited_in_connected_graph():
    g = _make_graph("A", "B", "C", "D", "E")
    _dir(g, "A", "B")
    _dir(g, "B", "C")
    _dir(g, "C", "D")
    _dir(g, "D", "E")

    result = dfs(g, "A")
    assert result["ordem"] == 5


def test_isolated_node():
    g = _make_graph("A", "B")

    result = dfs(g, "A")
    assert result["ordem"] == 1
    assert result["ciclos"] == 0
    assert result["arestas"] == {"tree": [], "back": [], "forward": [], "cross": []}


def test_node_not_in_graph():
    g = _make_graph("A", "B")
    _dir(g, "A", "B")

    result = dfs(g, "Z")
    assert result["ordem"] == 0
    assert result["ciclos"] == 0
