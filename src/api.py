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
    """Calcula o caminho mais curto entre dois aeroportos usando Dijkstra."""
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

    # Obter informações dos aeroportos no caminho
    path_info = []
    for code in path:
        airport = g.get_airport(code)
        if airport:
            path_info.append({
                'code': airport.code,
                'name': airport.name,
                'city': airport.city
            })

    return jsonify({
        'success': True,
        'cost': cost,
        'path': path,
        'path_info': path_info,
        'connections': len(path) - 1
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
            'group': 'airport'
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
                'title': f"Distância: {distance}"
            })

    return jsonify({
        'nodes': nodes,
        'edges': edges
    })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)