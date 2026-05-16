import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from parte2.src.graphs.graph import Graph, Port
from parte2.src.graphs.algorithms import bellman_ford


def _port(code: str) -> Port:
    return Port(code=code, name=code, country="BR", region="BR", latitude=0.0, longitude=0.0)


def _make_graph(*codes: str) -> Graph:
    g = Graph()
    for c in codes:
        g.add_port(_port(c))
    return g


def _dir(g: Graph, src: str, dst: str, w: float) -> None:
    g.adjacency_list[src].append((dst, w))


def test_positive_weights_baseline():
    g = _make_graph("A", "B", "C")
    _dir(g, "A", "B", 3)
    _dir(g, "B", "C", 4)

    cost, path, has_cycle = bellman_ford(g, "A", "C")
    assert cost == 7
    assert path == ["A", "B", "C"]
    assert has_cycle == False


def test_negative_weight_shorter_path():
    g = _make_graph("A", "B", "C")
    _dir(g, "A", "B", 5)
    _dir(g, "A", "C", 10)
    _dir(g, "B", "C", -3)

    cost, path, has_cycle = bellman_ford(g, "A", "C")
    assert cost == 2
    assert path == ["A", "B", "C"]
    assert has_cycle == False


def test_negative_weight_direct_is_still_shorter():
    g = _make_graph("A", "B", "C")
    _dir(g, "A", "B", 5)
    _dir(g, "A", "C", 1)
    _dir(g, "B", "C", -3)

    cost, path, has_cycle = bellman_ford(g, "A", "C")
    assert cost == 1
    assert path == ["A", "C"]
    assert has_cycle == False


def test_negative_cycle_detected():
    g = _make_graph("A", "B", "C")
    _dir(g, "A", "B", 1)
    _dir(g, "B", "C", -3)
    _dir(g, "C", "B", 1)

    cost, path, has_cycle = bellman_ford(g, "A", "C")
    assert has_cycle == True
    assert cost is None
    assert path is None


def test_unreachable_destination():
    g = _make_graph("A", "B", "C")
    _dir(g, "A", "B", 1)

    cost, path, has_cycle = bellman_ford(g, "A", "C")
    assert cost is None
    assert path is None


def test_node_not_in_graph():
    g = _make_graph("A", "B")
    _dir(g, "A", "B", 1)

    cost, path, has_cycle = bellman_ford(g, "A", "Z")
    assert cost is None
    assert path is None
