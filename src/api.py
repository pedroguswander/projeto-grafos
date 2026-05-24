#!/usr/bin/env python3
from flask import Flask, jsonify, request
from flask_cors import CORS
from collections import Counter
import sys, os, csv, json

sys.path.insert(0, os.path.dirname(__file__))
from graphs.algorithms import dijkstra
from graphs.io import load_graph_from_csvs

app = Flask(__name__)
CORS(app)

graph = None
BASE = os.path.dirname(os.path.abspath(__file__))

# ── Helpers ───────────────────────────────────────────────────────────────────

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

# ── Grafo ─────────────────────────────────────────────────────────────────────

@app.route('/api/airports')
def get_airports():
    g = load_graph()
    return jsonify([{
        'code': a.code, 'name': a.name, 'city': a.city,
        'country': a.country, 'latitude': a.latitude, 'longitude': a.longitude
    } for a in g.airports.values()])

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
    nodes = [{'id': c, 'label': f"{c}\n{a.city}", 'title': f"{a.name} - {a.city}"}
             for c, a in g.airports.items()]
    seen, edges = set(), []
    for src, neighbors in g.adjacency_list.items():
        for dst, dist in neighbors:
            key = tuple(sorted([src, dst]))
            if key not in seen:
                seen.add(key)
                edges.append({'from': src, 'to': dst, 'label': str(dist),
                               'title': f"Distância: {dist}", 'weight': dist})
    return jsonify({'nodes': nodes, 'edges': edges})

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
                    visited.add(nb); path.append(nb)
                    dfs(nb, visited, path, cost + dist)
                    path.pop(); visited.remove(nb)
        dfs(start, {start}, [start], 0)
        seen, unique = set(), []
        for r in routes:
            k = tuple(r['path'])
            if k not in seen:
                seen.add(k); unique.append(r)
        return sorted(unique, key=lambda r: (r['cost'], len(r['path'])))[:limit]

    top = [{'path': r['path'], 'cost': r['cost'], 'connections': r['connections'],
            'path_info': enrich(r['path'])} for r in find_routes()]

    return jsonify({'success': True, 'cost': cost, 'path': path,
                    'path_info': enrich(path), 'connections': max(len(path) - 2, 0),
                    'topRoutes': top})

# ── Dashboard ETN ─────────────────────────────────────────────────────────────

@app.route('/api/dashboard-stats')
def get_dashboard_stats():
    etn = data_path('ETN')
    vpath, apath = os.path.join(etn, 'vertices.csv'), os.path.join(etn, 'arestas.csv')
    if not os.path.exists(vpath):
        return jsonify({'error': f'vertices.csv não encontrado em {etn}'}), 404
    if not os.path.exists(apath):
        return jsonify({'error': f'arestas.csv não encontrado em {etn}'}), 404

    vertices, arestas = read_csv(vpath), read_csv(apath)
    total_v, total_e = len(vertices), len(arestas)

    pesos = [float(a.get('peso') or a.get('weight') or 0)
             for a in arestas if (a.get('peso') or a.get('weight'))]
    peso_medio = round(sum(pesos) / len(pesos)) if pesos else 0
    grau_medio = round((total_e * 2) / total_v, 2) if total_v else 0

    regioes = Counter(v['D_Region'] for v in vertices if v.get('D_Region'))
    dist_regiao = [{'nome': k, 'valor': v}
                   for k, v in sorted(regioes.items(), key=lambda x: x[1], reverse=True)]

    endpoints = [a.get('origem') or a.get('from') for a in arestas] + \
                [a.get('destino') or a.get('to') for a in arestas]
    graus = Counter(filter(None, endpoints))
    dist_graus = [{'grau': k, 'quantidade': v}
                  for k, v in sorted(Counter(graus.values()).items())]

    return jsonify({
        'totalV': total_v, 'totalE': total_e,
        'pesoMedio': peso_medio, 'grauMedio': grau_medio,
        'distribuicaoRegiao': dist_regiao, 'distribuicaoGraus': dist_graus,
        'topVertices': [{'nome': n, 'grau': g} for n, g in graus.most_common(10)]
    })

# ── Relatório Parte 2 ─────────────────────────────────────────────────────────

def _report_candidates():
    return [
        os.path.join(BASE, '..', 'out', 'part2_report.json'),
        os.path.join(BASE, 'part2_report.json'),
        os.path.join(BASE, '..', 'data', 'part2_report.json'),
        os.path.join(BASE, '..', 'part2_report.json'),
        os.path.join(BASE, 'data', 'part2_report.json'),
    ]

def load_report():
    for p in _report_candidates():
        r = os.path.abspath(p)
        if os.path.exists(r):
            with open(r, encoding='utf-8') as f:
                return json.load(f)
    return None

def require_report():
    """Retorna (report, None) ou (None, error_response)."""
    r = load_report()
    if r is None:
        return None, (jsonify({'error': 'part2_report.json não encontrado'}), 404)
    return r, None

def source_key(item):
    k = next((k for k in item if k.startswith('source')), None)
    return item.get(k) if k else None

def filter_by(data, **kwargs):
    for key, val in kwargs.items():
        if val is not None:
            data = [d for d in data if d.get(key) == val]
    return data

# ── Diagnóstico ───────────────────────────────────────────────────────────────

@app.route('/api/report/debug')
def debug_report():
    found = None
    candidates = []
    for p in _report_candidates():
        r = os.path.abspath(p)
        exists = os.path.exists(r)
        candidates.append({'path': r, 'exists': exists})
        if exists and not found:
            found = r
    return jsonify({'found': found is not None, 'used_path': found,
                    'candidates_checked': candidates, 'api_dir': BASE})

# ── BFS / DFS ─────────────────────────────────────────────────────────────────

@app.route('/api/report/bfs')
def get_report_bfs():
    report, err = require_report()
    if err: return err
    items = report.get('BFS', [])
    src_filter = request.args.get('source')
    if src_filter:
        items = [i for i in items if any(v == src_filter for v in i.values() if isinstance(v, str))]
    return jsonify([{
        'source': source_key(i), 'tempo_segundos': i.get('tempo'),
        'total_vertices': i.get('ordem'),
        'num_camadas': len(i.get('camadas', {})), 'camadas': i.get('camadas', {})
    } for i in items])

@app.route('/api/report/dfs')
def get_report_dfs():
    report, err = require_report()
    if err: return err
    items = report.get('DFS', [])
    src_filter = request.args.get('source')
    if src_filter:
        items = [i for i in items if any(v == src_filter for v in i.values() if isinstance(v, str))]
    return jsonify([{
        'source': source_key(i), 'tempo_segundos': i.get('tempo'),
        'total_vertices': i.get('ordem'), 'ciclos': i.get('ciclos'),
        'arestas_tree': len(i.get('arestas', {}).get('tree', [])),
        'arestas_back': len(i.get('arestas', {}).get('back', [])),
        'arestas_cross': len(i.get('arestas', {}).get('cross', [])),
        'arestas_detalhe': i.get('arestas', {})
    } for i in items])

# ── Dijkstra / Bellman-Ford ───────────────────────────────────────────────────

@app.route('/api/report/dijkstra')
def get_report_dijkstra():
    report, err = require_report()
    if err: return err
    data = filter_by(report.get('DIJKSTRA', []),
                     source=request.args.get('source'),
                     target=request.args.get('target'))
    if request.args.get('apenas_validos') == 'true':
        data = [d for d in data if d.get('custo') is not None]
    return jsonify(data)

@app.route('/api/report/bellman-ford')
def get_report_bellman_ford():
    report, err = require_report()
    if err: return err
    data = filter_by(report.get('BELLMAN-FORD', []),
                     source=request.args.get('source'),
                     target=request.args.get('target'))
    for flag in ('tem_peso_negativo', 'tem_ciclo_negativo'):
        if request.args.get(flag) is not None:
            val = request.args.get(flag).lower() == 'true'
            data = [d for d in data if d.get(flag) == val]
    return jsonify(data)

# ── Comparações ───────────────────────────────────────────────────────────────

@app.route('/api/report/comparacao/bfs-dfs')
def comparar_bfs_dfs():
    report, err = require_report()
    if err: return err

    bfs_map = {source_key(i): i for i in report.get('BFS', [])}
    dfs_map = {source_key(i): i for i in report.get('DFS', [])}

    comparacoes = []
    for src in sorted(set(bfs_map) & set(dfs_map)):
        b, d = bfs_map[src], dfs_map[src]
        comparacoes.append({
            'source': src,
            'bfs': {'tempo_segundos': b.get('tempo'), 'total_vertices': b.get('ordem'),
                    'num_camadas': len(b.get('camadas', {}))},
            'dfs': {'tempo_segundos': d.get('tempo'), 'total_vertices': d.get('ordem'),
                    'ciclos': d.get('ciclos'),
                    'arestas_tree': len(d.get('arestas', {}).get('tree', [])),
                    'arestas_back': len(d.get('arestas', {}).get('back', []))},
            'delta_tempo_ms': round((d.get('tempo', 0) - b.get('tempo', 0)) * 1000, 4),
            'mais_rapido': 'BFS' if b.get('tempo', 0) < d.get('tempo', 0) else 'DFS'
        })
    return jsonify({'total_comparacoes': len(comparacoes), 'comparacoes': comparacoes})

@app.route('/api/report/comparacao/dijkstra-bellman')
def comparar_dijkstra_bellman():
    report, err = require_report()
    if err: return err

    def key(i): return (i.get('source'), i.get('target'))
    dmap = {key(i): i for i in report.get('DIJKSTRA', [])}
    bmap = {key(i): i for i in report.get('BELLMAN-FORD', [])}

    comparacoes = []
    for par in sorted(set(dmap) & set(bmap)):
        d, b = dmap[par], bmap[par]
        comparacoes.append({
            'source': par[0], 'target': par[1],
            'dijkstra': {
                'tempo_segundos': d.get('tempo'), 'custo': d.get('custo'),
                'tamanho_caminho': d.get('tamanho_caminho'), 'caminho': d.get('caminho'),
                'eh_subgrafo': d.get('eh_subgrafo'), 'tem_peso_negativo': d.get('tem_peso_negativo')
            },
            'bellman_ford': {
                'tempo_segundos': b.get('tempo'), 'custo': b.get('custo'),
                'tamanho_caminho': b.get('tamanho_caminho'), 'caminho': b.get('caminho'),
                'eh_subgrafo': b.get('eh_subgrafo'), 'tem_peso_negativo': b.get('tem_peso_negativo'),
                'tem_ciclo_negativo': b.get('tem_ciclo_negativo'), 'descricao': b.get('descricao')
            },
            'custo_identico': d.get('custo') == b.get('custo') if None not in (d.get('custo'), b.get('custo')) else None,
            'delta_tempo_ms': round((b.get('tempo', 0) - d.get('tempo', 0)) * 1000, 4),
            'mais_rapido': 'Dijkstra' if d.get('tempo', 0) < b.get('tempo', 0) else 'Bellman-Ford'
        })

    return jsonify({
        'total_comparacoes': len(comparacoes), 'comparacoes': comparacoes,
        'apenas_dijkstra': [{**dmap[k], 'nota': 'apenas_dijkstra'} for k in set(dmap) - set(bmap)],
        'apenas_bellman_ford': [{**bmap[k], 'nota': 'apenas_bellman_ford'} for k in set(bmap) - set(dmap)]
    })

# ── Resumo ────────────────────────────────────────────────────────────────────

@app.route('/api/report/resumo')
def get_report_resumo():
    report, err = require_report()
    if err: return err

    def stats(items, key='tempo'):
        vals = [i.get(key, 0) for i in items]
        return {'total': len(vals), 'media': round(sum(vals)/len(vals), 6) if vals else None,
                'total_s': round(sum(vals), 6)}

    def path_stats(items):
        validos = [i for i in items if i.get('custo') is not None]
        s = stats(items)
        s.update({'validos': len(validos), 'invalidos': len(items) - len(validos),
                  'custo_medio': round(sum(i['custo'] for i in validos)/len(validos), 2) if validos else None})
        return s

    bfs = report.get('BFS', [])
    dfs = report.get('DFS', [])
    return jsonify({
        'BFS': stats(bfs),
        'DFS': {**stats(dfs), 'ciclos_medio': round(sum(i.get('ciclos',0) for i in dfs)/len(dfs), 2) if dfs else None},
        'DIJKSTRA': path_stats(report.get('DIJKSTRA', [])),
        'BELLMAN_FORD': {**path_stats(report.get('BELLMAN-FORD', [])),
                         'com_ciclo_negativo': sum(1 for i in report.get('BELLMAN-FORD', []) if i.get('tem_ciclo_negativo'))}
    })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
