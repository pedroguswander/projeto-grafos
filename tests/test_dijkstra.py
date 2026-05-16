import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from parte2.src.graphs.graph import Graph, Port
from parte2.src.graphs.algorithms import dijkstra


def _port(code: str) -> Port:
    return Port(code=code, name=code, country="BR", region="BR", latitude=0.0, longitude=0.0)


def _make_graph(*codes: str) -> Graph:
    g = Graph()
    for c in codes:
        g.add_port(_port(c))
    return g


def _dir(g: Graph, src: str, dst: str, w: float) -> None:
    g.adjacency_list[src].append((dst, w))


def test_direct_path():
    g = _make_graph("A", "B")
    _dir(g, "A", "B", 5.0)

    cost, path = dijkstra(g, "A", "B")
    assert cost == 5.0
    assert path == ["A", "B"]


def test_shortest_via_intermediate():
    g = _make_graph("A", "B", "C")
    _dir(g, "A", "C", 100.0)
    _dir(g, "A", "B", 2.0)
    _dir(g, "B", "C", 3.0)

    cost, path = dijkstra(g, "A", "C")
    assert cost == 5.0
    assert path == ["A", "B", "C"]


def test_unreachable_destination():
    g = _make_graph("A", "B", "C")
    _dir(g, "A", "B", 1.0)

    cost, path = dijkstra(g, "A", "C")
    assert cost is None
    assert path is None


def test_node_not_in_graph():
    g = _make_graph("A", "B")
    _dir(g, "A", "B", 1.0)

    cost, path = dijkstra(g, "A", "Z")
    assert cost is None
    assert path is None


def test_equal_cost_two_paths():
    g = _make_graph("A", "B", "C", "D")
    _dir(g, "A", "B", 3.0)
    _dir(g, "B", "D", 3.0)
    _dir(g, "A", "C", 2.0)
    _dir(g, "C", "D", 4.0)

    cost, path = dijkstra(g, "A", "D")
    assert cost == 6.0
    assert path is not None
    assert path[0] == "A"
    assert path[-1] == "D"


def test_negative_weight_rejected():
    g = _make_graph("A", "B", "C")
    _dir(g, "A", "B", -1.0)
    _dir(g, "B", "C", 3.0)

    cost, path = dijkstra(g, "A", "C")
    assert cost is None
    assert path is None


def test_self_loop_start_equals_end():
    g = _make_graph("A", "B")
    _dir(g, "A", "B", 1.0)

    cost, path = dijkstra(g, "A", "A")
    assert cost == 0
    assert path == ["A"]
