#!/usr/bin/env python3
"""
API REST para o grafo de aeroportos usando Flask.
"""
from flask import Flask, jsonify, request
from flask_cors import CORS
import sys
import os

# Adicionar o diretório src ao path para importar os módulos
sys.path.insert(0, os.path.dirname(__file__))

from graphs.graph import Graph
from graphs.algorithms import dijkstra
from graphs.io import load_graph_from_csvs, load_pairs_from_csv

app = Flask(__name__)
CORS(app)  # Habilitar CORS para o frontend

# Carregar o grafo globalmente
graph = None


def load_global_graph():
    global graph
    if graph is None:
        data_dir = os.path.join(os.path.dirname(__file__), '..', 'data')
        graph = load_graph_from_csvs(data_dir)
    return graph


def calculate_path_cost(g, path):
    """Calcula o custo total de um caminho."""
    if not path or len(path) < 2:
        return 0

    total_cost = 0

    for i in range(len(path) - 1):
        current_node = path[i]
        next_node = path[i + 1]

        found = False
        for neighbor, distance in g.adjacency_list.get(current_node, []):
            if neighbor == next_node:
                total_cost += distance
                found = True
                break

        if not found:
            return None

    return total_cost


def find_top_routes(g, start, end, limit=20, max_depth=8):
    """
    Encontra várias rotas possíveis entre start e end.
    Retorna as melhores rotas ordenadas por custo.
    """
    routes = []

    def dfs(current, target, visited, path, cost):
        if len(path) > max_depth:
            return

        if current == target:
            routes.append({
                'path': list(path),
                'cost': cost,
                'connections': max(len(path) - 2, 0)
            })
            return

        for neighbor, distance in g.adjacency_list.get(current, []):
            if neighbor not in visited:
                visited.add(neighbor)
                path.append(neighbor)

                dfs(
                    neighbor,
                    target,
                    visited,
                    path,
                    cost + distance
                )

                path.pop()
                visited.remove(neighbor)

    visited = set([start])
    dfs(start, end, visited, [start], 0)

    # remover duplicadas
    unique_routes = []
    seen = set()

    for route in routes:
        key = tuple(route['path'])
        if key not in seen:
            seen.add(key)
            unique_routes.append(route)

    # ordenar por custo e depois por tamanho do caminho
    unique_routes.sort(key=lambda r: (r['cost'], len(r['path'])))

    return unique_routes[:limit]


@app.route('/api/airports', methods=['GET'])
def get_airports():
    """Retorna lista de todos os aeroportos."""
    g = load_global_graph()
    airports = []

    for code, airport in g.airports.items():
        airports.append({
            'code': airport.code,
            'name': airport.name,
            'city': airport.city,
            'country': airport.country,
            'latitude': airport.latitude,
            'longitude': airport.longitude
        })

    return jsonify(airports)


@app.route('/api/routes', methods=['GET'])
def get_routes():
    """Retorna lista de todas as rotas/conexões."""
    g = load_global_graph()
    routes = []

    for from_code, neighbors in g.adjacency_list.items():
        for to_code, distance in neighbors:
            routes.append({
                'from': from_code,
                'to': to_code,
                'distance': distance
            })

    return jsonify(routes)


@app.route('/api/dijkstra', methods=['POST'])
def calculate_dijkstra():
    """Calcula o caminho mais curto entre dois aeroportos e retorna top rotas possíveis."""
    data = request.get_json()
    start = data.get('start')
    end = data.get('end')

    if not start or not end:
        return jsonify({'error': 'Parâmetros start e end são obrigatórios'}), 400

    g = load_global_graph()

    cost, path = dijkstra(g, start, end)

    if cost is None or path is None:
        return jsonify({
            'success': False,
            'message': f'Não foi possível encontrar um caminho entre {start} e {end}'
        })

    # Melhor rota
    path_info = []
    for code in path:
        airport = g.get_airport(code)
        if airport:
            path_info.append({
                'code': airport.code,
                'name': airport.name,
                'city': airport.city
            })

    # Top rotas possíveis
    top_routes_raw = find_top_routes(g, start, end, limit=20, max_depth=8)

    top_routes = []
    for route in top_routes_raw:
        route_path_info = []
        for code in route['path']:
            airport = g.get_airport(code)
            if airport:
                route_path_info.append({
                    'code': airport.code,
                    'name': airport.name,
                    'city': airport.city
                })

        top_routes.append({
            'path': route['path'],
            'cost': route['cost'],
            'connections': route['connections'],
            'path_info': route_path_info
        })

    return jsonify({
        'success': True,
        'cost': cost,
        'path': path,
        'path_info': path_info,
        'connections': max(len(path) - 2, 0),
        'topRoutes': top_routes
    })


@app.route('/api/graph-data', methods=['GET'])
def get_graph_data():
    """Retorna dados completos do grafo para visualização."""
    g = load_global_graph()

    # Nós (aeroportos)
    nodes = []
    for code, airport in g.airports.items():
        nodes.append({
            'id': code,
            'label': f"{code}\n{airport.city}",
            'title': f"{airport.name} - {airport.city}",
            'group': 'airport',
            'city': airport.city
        })

    # Arestas (rotas) - evitar duplicidade (ida/volta)
    edges = []
    seen = set()

    for from_code, neighbors in g.adjacency_list.items():
        for to_code, distance in neighbors:
            key = tuple(sorted([from_code, to_code]))
            if key in seen:
                continue

            seen.add(key)
            edges.append({
                'from': from_code,
                'to': to_code,
                'label': str(distance),
                'title': f"Distância: {distance}",
                'weight': distance
            })

    return jsonify({
        'nodes': nodes,
        'edges': edges
    })


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)