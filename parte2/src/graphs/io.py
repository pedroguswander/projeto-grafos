from .graph import Graph


def load_graph_from_csvs(data_dir: str) -> Graph:
    graph = Graph()
    graph.load_ports(f"{data_dir}/vertices.csv")
    graph.load_routes(f"{data_dir}/arestas.csv")
    return graph
