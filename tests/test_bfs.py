import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from parte2.src.graphs.graph import Graph, Port
from parte2.src.graphs.algorithms import bfs


def _port(code: str) -> Port:
    return Port(code=code, name=code, country="BR", region="BR", latitude=0.0, longitude=0.0)


def _make_graph(*codes: str) -> Graph:
    g = Graph()
    for c in codes:
        g.add_port(_port(c))
    return g


def _dir(g: Graph, src: str, dst: str, w: float = 1.0) -> None:
    g.adjacency_list[src].append((dst, w))


def test_linear_graph_levels():
    g = _make_graph("A", "B", "C", "D")
    _dir(g, "A", "B")
    _dir(g, "B", "C")
    _dir(g, "C", "D")

    result = bfs(g, "A")
    assert result["camadas"][0] == ["A"]
    assert result["camadas"][1] == ["B"]
    assert result["camadas"][2] == ["C"]
    assert result["camadas"][3] == ["D"]
    assert result["ordem"] == 4


def test_multiple_neighbors_per_level():
    g = _make_graph("A", "B", "C", "D", "E")
    _dir(g, "A", "B")
    _dir(g, "A", "C")
    _dir(g, "B", "D")
    _dir(g, "C", "E")

    result = bfs(g, "A")
    assert result["camadas"][0] == ["A"]
    assert set(result["camadas"][1]) == {"B", "C"}
    assert set(result["camadas"][2]) == {"D", "E"}
    assert result["ordem"] == 5


def test_isolated_node():
    g = _make_graph("A", "B")

    result = bfs(g, "A")
    assert result["camadas"] == {0: ["A"]}
    assert result["ordem"] == 1


def test_node_not_in_graph():
    g = _make_graph("A", "B")
    _dir(g, "A", "B")

    result = bfs(g, "Z")
    assert result["camadas"] == {}
    assert result["ordem"] == 0


def test_cycle_does_not_revisit():
    g = _make_graph("A", "B", "C")
    _dir(g, "A", "B")
    _dir(g, "B", "C")
    _dir(g, "C", "A")

    result = bfs(g, "A")
    assert result["ordem"] == 3
    assert result["camadas"][0] == ["A"]
    assert result["camadas"][1] == ["B"]
    assert result["camadas"][2] == ["C"]


def test_single_node():
    g = _make_graph("A")

    result = bfs(g, "A")
    assert result["camadas"] == {0: ["A"]}
    assert result["ordem"] == 1
