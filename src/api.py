#!/usr/bin/env python3
from flask import Flask, jsonify, request
from flask_cors import CORS
from collections import Counter
import sys, os, csv

sys.path.insert(0, os.path.dirname(__file__))

from graphs.algorithms import dijkstra
from graphs.io import load_graph_from_csvs

app = Flask(__name__)
CORS(app)

graph = None
BASE = os.path.dirname(os.path.abspath(__file__))


# ─── Helpers ───────────────────────────────────────────────────

def data_path(*parts):
    return os.path.abspath(os.path.join(BASE, '..', 'data', *parts))

def read_csv(path):
    with open(path, encoding='utf-8') as f:
        return list(csv.DictReader(f))

def load_graph():
    global graph
    if graph is None:
        graph = load_graph_from_csvs(data_path())
    return graph

def airport_info(airport):
    return {'code': airport.code, 'name': airport.name, 'city': airport.city}

def csv_endpoint(filename):
    path = data_path(filename)
    if not os.path.exists(path):
        return jsonify({'error': f'{filename} não encontrado'}), 404
    return jsonify(read_csv(path))

def get_weight(row):
    val = row.get('peso') or row.get('weight')
    return float(val) if val else None

def get_endpoint(row, key_a, key_b):
    return row.get(key_a) or row.get(key_b)

def calc_stats(vertices, arestas):
    """Calcula estatísticas de grafo a partir de listas de vértices e arestas."""
    total_v = len(vertices)
    total_e = len(arestas)

    pesos = [w for a in arestas if (w := get_weight(a)) is not None]
    peso_medio = round(sum(pesos) / len(pesos)) if pesos else 0
    grau_medio = round((total_e * 2) / total_v, 2) if total_v else 0

    endpoints = (
        [get_endpoint(a, 'origem', 'from') for a in arestas] +
        [get_endpoint(a, 'destino', 'to') for a in arestas]
    )
    graus = Counter(filter(None, endpoints))

    grau_para_vertices = {}
    for codigo, grau in graus.items():
        grau_para_vertices.setdefault(grau, []).append(codigo)

    dist_graus = [
        {'grau': k, 'quantidade': v, 'vertices': sorted(grau_para_vertices[k])}
        for k, v in sorted(Counter(graus.values()).items())
    ]

    regioes = Counter(v['D_Region'] for v in vertices if v.get('D_Region'))
    dist_regiao = [
        {'nome': k, 'valor': v}
        for k, v in sorted(regioes.items(), key=lambda x: x[1], reverse=True)
    ]

    return {
        'totalV': total_v,
        'totalE': total_e,
        'pesoMedio': peso_medio,
        'grauMedio': grau_medio,
        'distribuicaoRegiao': dist_regiao,
        'distribuicaoGraus': dist_graus,
        'topVertices': [{'nome': n, 'grau': g} for n, g in graus.most_common(10)],
    }

def load_etn():
    etn = data_path('ETN')
    vpath, apath = os.path.join(etn, 'vertices.csv'), os.path.join(etn, 'arestas.csv')
    if not os.path.exists(vpath) or not os.path.exists(apath):
        return None, None, jsonify({'error': 'arquivos ETN não encontrados'}), 404
    return read_csv(vpath), read_csv(apath), None, None


# ─── Grafo ─────────────────────────────────────────────────────

@app.route('/api/airports')
def get_airports():
    g = load_graph()
    return jsonify([
        {'code': a.code, 'name': a.name, 'city': a.city,
         'country': a.country, 'latitude': a.latitude, 'longitude': a.longitude}
        for a in g.airports.values()
    ])

@app.route('/api/routes')
def get_routes():
    g = load_graph()
    return jsonify([
        {'from': src, 'to': dst, 'distance': dist}
        for src, neighbors in g.adjacency_list.items()
        for dst, dist in neighbors
    ])

@app.route('/api/aeroportos-data')
def get_aeroportos_data():
    return csv_endpoint('aeroportos_data.csv')

@app.route('/api/ego-aeroportos')
def get_ego_aeroportos():
    return csv_endpoint('ego_aeroportos.csv')

@app.route('/api/ego-regiao')
def get_ego_regiao():
    return csv_endpoint('ego_regiao.csv')

@app.route('/api/graph-data')
def get_graph_data():
    g = load_graph()
    nodes = [
        {'id': c, 'label': f"{c}\n{a.city}", 'title': f"{a.name} - {a.city}"}
        for c, a in g.airports.items()
    ]
    seen, edges = set(), []
    for src, neighbors in g.adjacency_list.items():
        for dst, dist in neighbors:
            key = tuple(sorted([src, dst]))
            if key not in seen:
                seen.add(key)
                edges.append({'from': src, 'to': dst, 'label': str(dist),
                               'title': f"Distância: {dist}", 'weight': dist})
    return jsonify({'nodes': nodes, 'edges': edges})


# ─── Dijkstra ──────────────────────────────────────────────────

@app.route('/api/dijkstra', methods=['POST'])
def calculate_dijkstra():
    body = request.get_json()
    start, end = body.get('start'), body.get('end')

    if not start or not end:
        return jsonify({'error': 'start e end são obrigatórios'}), 400

    g = load_graph()
    cost, path = dijkstra(g, start, end)

    if cost is None:
        return jsonify({'success': False, 'message': f'Sem caminho entre {start} e {end}'})

    def enrich(codes):
        return [airport_info(g.get_airport(c)) for c in codes if g.get_airport(c)]

    def find_routes(limit=20, max_depth=8):
        routes = []

        def dfs(cur, visited, path, cost):
            if len(path) > max_depth:
                return
            if cur == end:
                routes.append({'path': list(path), 'cost': cost,
                                'connections': max(len(path) - 2, 0)})
                return
            for nb, dist in g.adjacency_list.get(cur, []):
                if nb not in visited:
                    visited.add(nb)
                    path.append(nb)
                    dfs(nb, visited, path, cost + dist)
                    path.pop()
                    visited.remove(nb)

        dfs(start, {start}, [start], 0)
        seen = set()
        unique = [r for r in routes if (k := tuple(r['path'])) not in seen and not seen.add(k)]
        return sorted(unique, key=lambda r: (r['cost'], len(r['path'])))[:limit]

    top = [
        {**r, 'path_info': enrich(r['path'])}
        for r in find_routes()
    ]

    return jsonify({
        'success': True, 'cost': cost, 'path': path,
        'path_info': enrich(path), 'connections': max(len(path) - 2, 0),
        'topRoutes': top,
    })


# ─── Dashboard ETN ─────────────────────────────────────────────

@app.route('/api/dashboard-stats')
def get_dashboard_stats():
    vertices, arestas, err, code = load_etn()
    if err:
        return err, code
    return jsonify(calc_stats(vertices, arestas))


@app.route('/api/dashboard-stats/etn/filtros')
def get_etn_filtros():
    vertices, _, err, code = load_etn()
    if err:
        return err, code

    mapa = {}
    for v in vertices:
        r, c = v.get('D_Region', ''), v.get('Country', '')
        if r and c:
            mapa.setdefault(r, set()).add(c)

    return jsonify({
        'regioes': sorted(mapa),
        'paises_por_regiao': {r: sorted(ps) for r, ps in sorted(mapa.items())},
    })


@app.route('/api/dashboard-stats/etn/filtrado')
def get_etn_filtrado():
    vertices, arestas, err, code = load_etn()
    if err:
        return err, code

    regiao, pais = request.args.get('regiao'), request.args.get('pais')

    if regiao:
        vertices = [v for v in vertices if v.get('D_Region') == regiao]
    if pais:
        vertices = [v for v in vertices if v.get('Country') == pais]

    codigos = {v['UNLocode'] for v in vertices}
    arestas = [
        a for a in arestas
        if get_endpoint(a, 'origem', 'from') in codigos
        and get_endpoint(a, 'destino', 'to') in codigos
    ]

    return jsonify(calc_stats(vertices, arestas))


# ─── Filtros Aeroportos ────────────────────────────────────────

@app.route('/api/dashboard-stats/aeroportos/filtros')
def get_aeroportos_filtros():
    g = load_graph()
    paises = sorted({getattr(a, 'country', None) for a in g.airports.values()} - {None})
    graus = Counter({src: len(nb) for src, nb in g.adjacency_list.items()})
    all_dists = [d for nb in g.adjacency_list.values() for _, d in nb if d]

    return jsonify({
        'paises': paises,
        'grau_min': min(graus.values(), default=0),
        'grau_max': max(graus.values(), default=0),
        'dist_min': round(min(all_dists, default=0)),
        'dist_max': round(max(all_dists, default=0)),
    })


@app.route('/api/dashboard-stats/aeroportos/filtrado')
def get_aeroportos_filtrado():
    g = load_graph()

    pais     = request.args.get('pais')
    grau_min = request.args.get('grau_min', type=int)
    grau_max = request.args.get('grau_max', type=int)
    dist_min = request.args.get('dist_min', type=float)
    dist_max = request.args.get('dist_max', type=float)

    graus_full = Counter({src: len(nb) for src, nb in g.adjacency_list.items()})

    codigos = {
        code for code, airport in g.airports.items()
        if (not pais or getattr(airport, 'country', None) == pais)
        and (grau_min is None or graus_full.get(code, 0) >= grau_min)
        and (grau_max is None or graus_full.get(code, 0) <= grau_max)
    }

    seen, all_edges = set(), []
    for src, neighbors in g.adjacency_list.items():
        if src not in codigos:
            continue
        for dst, dist in neighbors:
            if dst not in codigos:
                continue
            if dist_min is not None and dist < dist_min:
                continue
            if dist_max is not None and dist > dist_max:
                continue
            key = tuple(sorted([src, dst]))
            if key not in seen:
                seen.add(key)
                all_edges.append((src, dst, dist))

    total_v, total_e = len(codigos), len(all_edges)
    pesos = [d for _, _, d in all_edges if d]
    peso_medio = round(sum(pesos) / len(pesos)) if pesos else 0
    grau_medio = round((total_e * 2) / total_v, 2) if total_v else 0

    graus = Counter()
    for src, dst, _ in all_edges:
        graus[src] += 1
        graus[dst] += 1

    grau_para_vertices = {}
    for codigo, grau in graus.items():
        grau_para_vertices.setdefault(grau, []).append(codigo)

    paises_count = Counter(
        getattr(g.airports[c], 'country', 'N/A') for c in codigos if c in g.airports
    )

    return jsonify({
        'totalV': total_v,
        'totalE': total_e,
        'pesoMedio': peso_medio,
        'grauMedio': grau_medio,
        'distribuicaoGraus': [
            {'grau': k, 'quantidade': v, 'vertices': sorted(grau_para_vertices[k])}
            for k, v in sorted(Counter(graus.values()).items())
        ],
        'topVertices': [{'nome': n, 'grau': g} for n, g in graus.most_common(10)],
        'distribuicaoRegiao': [
            {'nome': k, 'valor': v}
            for k, v in sorted(paises_count.items(), key=lambda x: x[1], reverse=True)
        ],
    })


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
