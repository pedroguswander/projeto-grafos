import csv
from typing import List, Tuple
from .graph import Graph


def load_graph_from_csvs(data_dir: str) -> Graph:
    """
    Carrega o grafo a partir dos arquivos CSV.

    Args:
        data_dir: Diretório onde estão os arquivos CSV

    Returns:
        Grafo carregado com aeroportos e rotas
    """
    graph = Graph()

    # Carregar aeroportos
    airports_file = f"{data_dir}/aeroportos_data.csv"
    graph.load_airports(airports_file)

    # Carregar rotas usando adjacencias_aeroportos.csv que tem as conexões diretas
    routes_file = f"{data_dir}/adjacencias_aeroportos.csv"
    graph.load_routes(routes_file)

    return graph


def load_pairs_from_csv(filepath: str) -> List[Tuple[str, str]]:
    """
    Carrega os pares (origem, destino) do arquivo CSV.

    Args:
        filepath: Caminho para o arquivo CSV com os pares

    Returns:
        Lista de tuplas (origem, destino)
    """
    pairs = []
    with open(filepath, 'r', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        for row in reader:
            # Usando as colunas corretas
            from_code = row.get('origem', row.get('from', ''))
            to_code = row.get('destino', row.get('to', ''))
            if from_code and to_code:
                pairs.append((from_code, to_code))
    return pairs