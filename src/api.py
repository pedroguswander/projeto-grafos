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

graph = etn_graph = None
BASE = os.path.dirname(os.path.abspath(__file__))

# ─── Helpers ───────────────────────────────────────────────────

def data_path(*p): return os.path.abspath(os.path.join(BASE, '..', 'data', *p))
def read_csv(path):
    with open(path, encoding='utf-8') as f: return list(csv.DictReader(f))

def load_graph():
    global graph
    if graph is None: graph = load_graph_from_csvs(data_path())
    return graph

def load_etn_graph():
    global etn_graph
    if etn_graph is None:
        root = os.path.abspath(os.path.join(BASE, '..'))
        if root not in sys.path: sys.path.insert(0, root)
        from parte2.src.graphs.io import load_graph_from_csvs as _load
        etn_graph = _load(data_path('ETN'))
    return etn_graph

def load_etn():
    vp, ap = data_path('ETN', 'vertices.csv'), data_path('ETN', 'arestas.csv')
    if not os.path.exists(vp) or not os.path.exists(ap):
        return None, None, jsonify({'error': 'arquivos ETN não encontrados'}), 404
    return read_csv(vp), read_csv(ap), None, None

def csv_endpoint(filename):
    path = data_path(filename)
    if not os.path.exists(path): return jsonify({'error': f'{filename} não encontrado'}), 404
    return jsonify(read_csv(path))

def get_weight(row):
    val = row.get('peso') or row.get('weight')
    return float(val) if val else None

def get_ep(row, a, b): return row.get(a) or row.get(b)

def calc_stats(vertices, arestas):
    total_v, total_e = len(vertices), len(arestas)
    pesos = [w for a in arestas if (w := get_weight(a)) is not None]
    pesos_pos = [w for w in pesos if w > 0]
    graus = Counter(filter(None,
        [get_ep(a, 'origem', 'from') for a in arestas] +
        [get_ep(a, 'destino', 'to') for a in arestas]
    ))
    grau_para_v = {}
    for cod, g in graus.items(): grau_para_v.setdefault(g, []).append(cod)

    conexoes_map = {}
    for a in arestas:
        orig = get_ep(a, 'origem', 'from')
        dest = get_ep(a, 'destino', 'to')
        if orig: conexoes_map.setdefault(orig, []).append(dest)

    vi = {v.get('UNLocode', ''): v for v in vertices}
    top = [{'nome': n, 'nome_completo': vi.get(n, {}).get('name', n),
             'grau': g, 'conexoes': conexoes_map.get(n, [])}
           for n, g in graus.most_common(10)]

    return {
        'totalV': total_v, 'totalE': total_e,
        'grauMedio': round((total_e * 2) / total_v, 2) if total_v else 0,
        'pesoMedio': round(sum(pesos) / len(pesos)) if pesos else 0,
        'pesoMedioPositivo': round(sum(pesos_pos) / len(pesos_pos)) if pesos_pos else 0,
        'rotasDeficitarias': sum(1 for w in pesos if w < 0),
        'percDeficitarias': round(sum(1 for w in pesos if w < 0) / len(pesos) * 100, 1) if pesos else 0,
        'pesoMin': round(min(pesos)) if pesos else 0,
        'pesoMax': round(max(pesos)) if pesos else 0,
        'distribuicaoGraus': [
            {'grau': k, 'quantidade': v, 'vertices': sorted(grau_para_v[k])}
            for k, v in sorted(Counter(graus.values()).items())
        ],
        'distribuicaoRegiao': [
            {'nome': k, 'valor': v}
            for k, v in sorted(Counter(v.get('D_Region') for v in vertices if v.get('D_Region')).items(),
                                key=lambda x: x[1], reverse=True)
        ],
        'topVertices': top,
    }

def load_report():
    for p in ['../out/part2_report.json', 'part2_report.json',
              '../data/part2_report.json', '../part2_report.json', 'data/part2_report.json']:
        r = os.path.abspath(os.path.join(BASE, p))
        if os.path.exists(r):
            with open(r, encoding='utf-8') as f: return json.load(f)
    return None

def require_report():
    r = load_report()
    return (r, None) if r else (None, (jsonify({'error': 'report não encontrado'}), 404))

def source_key(i):
    return i.get('source') or i.get('origem') or next(
        (v for v in i.values() if isinstance(v, str)), None)

def filter_by(items, source=None, target=None):
    if source: items = [i for i in items if i.get('source') == source]
    if target: items = [i for i in items if i.get('target') == target]
    return items

def tempo_stats(items):
    vals = [i.get('tempo', 0) for i in items]
    return {'total': len(vals), 'media': round(sum(vals)/len(vals), 6) if vals else None,
            'total_s': round(sum(vals), 6)}

def path_stats(items):
    validos = [i for i in items if i.get('custo') is not None]
    return {**tempo_stats(items), 'validos': len(validos), 'invalidos': len(items)-len(validos),
            'custo_medio': round(sum(i['custo'] for i in validos)/len(validos), 2) if validos else None}

def enrich_airports(g, codes):
    return [{'code': a.code, 'name': a.name, 'city': a.city}
            for c in codes if (a := g.get_airport(c))]

def enrich_ports(g, codes):
    return [{'code': p.code, 'name': p.name, 'country': p.country, 'region': p.region}
            for c in codes if (p := g.get_port(c))]


# ─── Grafo Aeroportos ──────────────────────────────────────────

@app.route('/api/airports')
def get_airports():
    g = load_graph()
    return jsonify([{'code': a.code, 'name': a.name, 'city': a.city,
                     'country': a.country, 'latitude': a.latitude, 'longitude': a.longitude}
                    for a in g.airports.values()])

@app.route('/api/routes')
def get_routes():
    g = load_graph()
    return jsonify([{'from': src, 'to': dst, 'distance': dist}
                    for src, nb in g.adjacency_list.items() for dst, dist in nb])

@app.route('/api/adjacencias')
def get_adjacencias(): return csv_endpoint('adjacencias_aeroportos.csv')

@app.route('/api/aeroportos-data')
def get_aeroportos_data(): return csv_endpoint('aeroportos_data.csv')

@app.route('/api/ego-aeroportos')
def get_ego_aeroportos(): return csv_endpoint('ego_aeroportos.csv')

@app.route('/api/ego-regiao')
def get_ego_regiao(): return csv_endpoint('ego_regiao.csv')

@app.route('/api/graph-data')
def get_graph_data():
    g = load_graph()
    nodes = [{'id': c, 'label': f"{c}\n{a.city}", 'title': f"{a.name} - {a.city}"}
             for c, a in g.airports.items()]
    seen, edges = set(), []
    for src, nb in g.adjacency_list.items():
        for dst, dist in nb:
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

    def find_routes(limit=20, max_depth=8):
        routes = []
        def dfs(cur, visited, path, cost):
            if len(path) > max_depth: return
            if cur == end:
                routes.append({'path': list(path), 'cost': cost, 'connections': max(len(path)-2, 0)}); return
            for nb, dist in g.adjacency_list.get(cur, []):
                if nb not in visited:
                    visited.add(nb); path.append(nb)
                    dfs(nb, visited, path, cost + dist)
                    path.pop(); visited.remove(nb)
        dfs(start, {start}, [start], 0)
        seen = set()
        unique = [r for r in routes if (k := tuple(r['path'])) not in seen and not seen.add(k)]
        return sorted(unique, key=lambda r: (r['cost'], len(r['path'])))[:limit]

    top = [{**r, 'path_info': enrich_airports(g, r['path'])} for r in find_routes()]
    return jsonify({'success': True, 'cost': cost, 'path': path,
                    'path_info': enrich_airports(g, path), 'connections': max(len(path)-2, 0),
                    'topRoutes': top})


# ─── Dashboard Stats ───────────────────────────────────────────

@app.route('/api/dashboard-stats')
def get_dashboard_stats():
    vertices, arestas, err, code = load_etn()
    if err: return err, code
    return jsonify(calc_stats(vertices, arestas))

@app.route('/api/etn/arestas')
def get_etn_arestas():
    _, arestas, err, code = load_etn()
    if err: return err, code
    return jsonify(arestas)

@app.route('/api/etn/vertices')
def get_etn_vertices():
    vertices, _, err, code = load_etn()
    if err: return err, code
    return jsonify(vertices)

@app.route('/api/dashboard-stats/etn/filtros')
def get_etn_filtros():
    vertices, arestas, err, code = load_etn()
    if err: return err, code
    mapa = {}
    for v in vertices:
        r, c = v.get('D_Region', ''), v.get('Country', '')
        if r and c: mapa.setdefault(r, set()).add(c)
    graus = Counter(filter(None,
        [a.get('source') or a.get('origem') for a in arestas] +
        [a.get('target') or a.get('destino') for a in arestas]
    ))
    pesos = [w for a in arestas if (w := get_weight(a)) is not None]
    gv = list(graus.values()) or [0]
    return jsonify({
        'regioes': sorted(mapa),
        'paises_por_regiao': {r: sorted(ps) for r, ps in sorted(mapa.items())},
        'grau_min': min(gv), 'grau_max': max(gv),
        'peso_min': round(min(pesos)) if pesos else 0,
        'peso_max': round(max(pesos)) if pesos else 0,
    })

@app.route('/api/dashboard-stats/etn/filtrado')
def get_etn_filtrado():
    vertices, arestas, err, code = load_etn()
    if err: return err, code
    regiao  = request.args.get('regiao')
    pais    = request.args.get('pais')
    grau_min = request.args.get('grau_min', type=float)
    grau_max = request.args.get('grau_max', type=float)
    peso_min = request.args.get('peso_min', type=float)
    peso_max = request.args.get('peso_max', type=float)

    if regiao: vertices = [v for v in vertices if v.get('D_Region') == regiao]
    if pais:   vertices = [v for v in vertices if v.get('Country') == pais]
    codigos = {v['UNLocode'] for v in vertices}

    graus_full = Counter(filter(None,
        [a.get('source') or a.get('origem') for a in arestas] +
        [a.get('target') or a.get('destino') for a in arestas]
    ))
    nos_validos = {n for n, g in graus_full.items()
                   if (grau_min is None or g >= grau_min) and (grau_max is None or g <= grau_max)}

    filtradas = []
    for a in arestas:
        src = a.get('source') or a.get('origem') or get_ep(a, 'origem', 'from')
        tgt = a.get('target') or a.get('destino') or get_ep(a, 'destino', 'to')
        if codigos and src not in codigos and tgt not in codigos: continue
        if src not in nos_validos or tgt not in nos_validos: continue
        w = get_weight(a)
        if peso_min is not None and (w is None or w < peso_min): continue
        if peso_max is not None and (w is None or w > peso_max): continue
        filtradas.append(a)
    return jsonify(calc_stats(vertices, filtradas))

@app.route('/api/dashboard-stats/aeroportos/filtros')
def get_aeroportos_filtros():
    g = load_graph()
    graus = Counter({src: len(nb) for src, nb in g.adjacency_list.items()})
    dists = [d for nb in g.adjacency_list.values() for _, d in nb if d]
    return jsonify({
        'paises': sorted({getattr(a, 'country', None) for a in g.airports.values()} - {None}),
        'grau_min': min(graus.values(), default=0), 'grau_max': max(graus.values(), default=0),
        'dist_min': round(min(dists, default=0)), 'dist_max': round(max(dists, default=0)),
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
    codigos = {c for c, a in g.airports.items()
               if (not pais or getattr(a, 'country', None) == pais)
               and (grau_min is None or graus_full.get(c, 0) >= grau_min)
               and (grau_max is None or graus_full.get(c, 0) <= grau_max)}

    seen, edges = set(), []
    for src, nb in g.adjacency_list.items():
        if src not in codigos: continue
        for dst, dist in nb:
            if dst not in codigos: continue
            if dist_min is not None and dist < dist_min: continue
            if dist_max is not None and dist > dist_max: continue
            key = tuple(sorted([src, dst]))
            if key not in seen: seen.add(key); edges.append((src, dst, dist))

    pesos = [d for _, _, d in edges if d]
    graus = Counter()
    for src, dst, _ in edges: graus[src] += 1; graus[dst] += 1
    grau_para_v = {}
    for cod, g_ in graus.items(): grau_para_v.setdefault(g_, []).append(cod)

    return jsonify({
        'totalV': len(codigos), 'totalE': len(edges),
        'pesoMedio': round(sum(pesos)/len(pesos)) if pesos else 0,
        'grauMedio': round((len(edges)*2)/len(codigos), 2) if codigos else 0,
        'distribuicaoGraus': [{'grau': k, 'quantidade': v, 'vertices': sorted(grau_para_v[k])}
                               for k, v in sorted(Counter(graus.values()).items())],
        'topVertices': [{'nome': n, 'grau': g_} for n, g_ in graus.most_common(10)],
        'distribuicaoRegiao': [{'nome': k, 'valor': v}
                                for k, v in sorted(
                                    Counter(getattr(g.airports[c], 'country', 'N/A') for c in codigos if c in g.airports).items(),
                                    key=lambda x: x[1], reverse=True)],
    })


# ─── BFS / DFS / Dijkstra / Bellman-Ford Reports ───────────────

@app.route('/api/report/bfs')
def get_report_bfs():
    report, err = require_report()
    if err: return err
    items = report.get('BFS', [])
    if src := request.args.get('source'):
        items = [i for i in items if any(v == src for v in i.values() if isinstance(v, str))]
    return jsonify([{'source': source_key(i), 'tempo_segundos': i.get('tempo'),
                     'total_vertices': i.get('ordem'),
                     'num_camadas': len(i.get('camadas', {})), 'camadas': i.get('camadas', {})}
                    for i in items])

@app.route('/api/report/dfs')
def get_report_dfs():
    report, err = require_report()
    if err: return err
    items = report.get('DFS', [])
    if src := request.args.get('source'):
        items = [i for i in items if any(v == src for v in i.values() if isinstance(v, str))]
    return jsonify([{'source': source_key(i), 'tempo_segundos': i.get('tempo'),
                     'total_vertices': i.get('ordem'), 'ciclos': i.get('ciclos'),
                     'arestas_tree':  len(i.get('arestas', {}).get('tree', [])),
                     'arestas_back':  len(i.get('arestas', {}).get('back', [])),
                     'arestas_cross': len(i.get('arestas', {}).get('cross', [])),
                     'arestas_detalhe': i.get('arestas', {})}
                    for i in items])

@app.route('/api/report/dijkstra')
def get_report_dijkstra():
    report, err = require_report()
    if err: return err
    data = filter_by(report.get('DIJKSTRA', []),
                     source=request.args.get('source'), target=request.args.get('target'))
    if request.args.get('apenas_validos') == 'true':
        data = [d for d in data if d.get('custo') is not None]
    return jsonify(data)

@app.route('/api/report/bellman-ford')
def get_report_bellman_ford():
    report, err = require_report()
    if err: return err
    data = filter_by(report.get('BELLMAN-FORD', []),
                     source=request.args.get('source'), target=request.args.get('target'))
    for flag in ('tem_peso_negativo', 'tem_ciclo_negativo'):
        if (val := request.args.get(flag)) is not None:
            data = [d for d in data if d.get(flag) == (val.lower() == 'true')]
    return jsonify(data)

@app.route('/api/report/comparacao/bfs-dfs')
def comparar_bfs_dfs():
    report, err = require_report()
    if err: return err
    bfs_map = {source_key(i): i for i in report.get('BFS', [])}
    dfs_map = {source_key(i): i for i in report.get('DFS', [])}
    out = []
    for src in sorted(set(bfs_map) & set(dfs_map)):
        b, d = bfs_map[src], dfs_map[src]
        bt, dt = b.get('tempo', 0), d.get('tempo', 0)
        out.append({
            'source': src,
            'bfs': {'tempo_segundos': bt, 'total_vertices': b.get('ordem'),
                    'num_camadas': len(b.get('camadas', {}))},
            'dfs': {'tempo_segundos': dt, 'total_vertices': d.get('ordem'),
                    'ciclos': d.get('ciclos'),
                    'arestas_tree': len(d.get('arestas', {}).get('tree', [])),
                    'arestas_back': len(d.get('arestas', {}).get('back', []))},
            'delta_tempo_ms': round((dt - bt) * 1000, 4),
            'mais_rapido': 'BFS' if bt < dt else 'DFS',
        })
    return jsonify({'total_comparacoes': len(out), 'comparacoes': out})

@app.route('/api/report/comparacao/dijkstra-bellman')
def comparar_dijkstra_bellman():
    report, err = require_report()
    if err: return err
    dmap = {(i.get('source'), i.get('target')): i for i in report.get('DIJKSTRA', [])}
    bmap = {(i.get('source'), i.get('target')): i for i in report.get('BELLMAN-FORD', [])}

    def fmt(i, extra=None):
        r = {'tempo_segundos': i.get('tempo'), 'custo': i.get('custo'),
             'tamanho_caminho': i.get('tamanho_caminho'), 'caminho': i.get('caminho'),
             'eh_subgrafo': i.get('eh_subgrafo'), 'tem_peso_negativo': i.get('tem_peso_negativo')}
        if extra: r.update({k: i.get(k) for k in extra})
        return r

    out = []
    for par in sorted(set(dmap) & set(bmap)):
        d, b = dmap[par], bmap[par]
        dt, bt = d.get('tempo', 0), b.get('tempo', 0)
        dc, bc = d.get('custo'), b.get('custo')
        out.append({
            'source': par[0], 'target': par[1],
            'dijkstra': fmt(d), 'bellman_ford': fmt(b, ['tem_ciclo_negativo', 'descricao']),
            'custo_identico': (dc == bc) if None not in (dc, bc) else None,
            'delta_tempo_ms': round((bt - dt) * 1000, 4),
            'mais_rapido': 'Dijkstra' if dt < bt else 'Bellman-Ford',
        })
    return jsonify({
        'total_comparacoes': len(out), 'comparacoes': out,
        'apenas_dijkstra': [{**dmap[k], 'nota': 'apenas_dijkstra'} for k in set(dmap)-set(bmap)],
        'apenas_bellman_ford': [{**bmap[k], 'nota': 'apenas_bellman_ford'} for k in set(bmap)-set(dmap)],
    })

@app.route('/api/report/resumo')
def get_report_resumo():
    report, err = require_report()
    if err: return err
    bfs, dfs, bf = report.get('BFS', []), report.get('DFS', []), report.get('BELLMAN-FORD', [])
    return jsonify({
        'BFS': tempo_stats(bfs),
        'DFS': {**tempo_stats(dfs),
                'ciclos_medio': round(sum(i.get('ciclos', 0) for i in dfs)/len(dfs), 2) if dfs else None},
        'DIJKSTRA': path_stats(report.get('DIJKSTRA', [])),
        'BELLMAN_FORD': {**path_stats(bf),
                         'com_ciclo_negativo': sum(1 for i in bf if i.get('tem_ciclo_negativo'))},
    })


# ─── ETN Graph ─────────────────────────────────────────────────

@app.route('/api/etn/graph-data')
def get_etn_graph_data():
    g = load_etn_graph()
    return jsonify({
        'nodes': [{'id': c, 'label': c, 'title': f"{c} — {p.name} ({p.country})",
                   'name': p.name, 'country': p.country, 'region': p.region}
                  for c, p in g.ports.items()],
        'edges': [{'from': src, 'to': dst, 'weight': w}
                  for src, nb in g.adjacency_list.items() for dst, w in nb],
    })

@app.route('/api/etn/dfs-path', methods=['POST'])
def calculate_etn_dfs_path():
    body = request.get_json() or {}
    start, end = body.get('start'), body.get('end')
    if not start or not end:
        return jsonify({'error': 'start e end são obrigatórios'}), 400
    g = load_etn_graph()
    if start not in g.adjacency_list or end not in g.adjacency_list:
        return jsonify({'success': False, 'message': f'Porto inválido: {start} ou {end}'}), 400

    max_depth = int(body.get('max_depth', 8))
    best_cost, best_path, calls = [float('inf')], [None], [0]

    def _dfs(node, path, visited, cost):
        calls[0] += 1
        if calls[0] > 50_000 or len(path) > max_depth: return
        if node == end:
            if cost < best_cost[0]: best_cost[0] = cost; best_path[0] = path.copy()
            return
        for nb, w in g.get_neighbors(node):
            if nb not in visited:
                visited.add(nb); path.append(nb)
                _dfs(nb, path, visited, cost + w)
                path.pop(); visited.remove(nb)

    _dfs(start, [start], {start}, 0.0)
    if best_path[0] is None:
        return jsonify({'success': False,
                        'message': f'Nenhum caminho encontrado de {start} a {end} com até {max_depth} saltos.'})
    return jsonify({'success': True, 'cost': best_cost[0], 'path': best_path[0],
                    'path_info': enrich_ports(g, best_path[0]),
                    'connections': max(len(best_path[0])-2, 0), 'max_depth': max_depth})

@app.route('/api/etn/bellman-ford', methods=['POST'])
def calculate_etn_bellman_ford():
    body = request.get_json() or {}
    start, end = body.get('start'), body.get('end')
    if not start or not end:
        return jsonify({'error': 'start e end são obrigatórios'}), 400
    g = load_etn_graph()
    from parte2.src.graphs.algorithms import bellman_ford
    if start not in g.adjacency_list or end not in g.adjacency_list:
        return jsonify({'success': False, 'hasNegativeCycle': False,
                        'message': f'Porto inválido: {start} ou {end}'}), 400
    cost, path, has_cycle = bellman_ford(g, start, end)
    if has_cycle:
        return jsonify({'success': False, 'hasNegativeCycle': True,
                        'message': 'Ciclo negativo detectado.'})
    if cost is None:
        return jsonify({'success': False, 'hasNegativeCycle': False,
                        'message': f'Não há caminho entre {start} e {end}.'})
    return jsonify({'success': True, 'hasNegativeCycle': False, 'cost': cost, 'path': path,
                    'path_info': enrich_ports(g, path), 'connections': max(len(path)-2, 0)})


# ─── Misc ──────────────────────────────────────────────────────

@app.route('/api/launch-game', methods=['POST'])
def launch_game():
    import subprocess
    gm = os.path.abspath(os.path.join(BASE, '..', 'atc', 'main.py'))
    if not os.path.exists(gm): return jsonify({'error': 'atc/main.py não encontrado'}), 404
    subprocess.Popen([sys.executable, gm], cwd=os.path.dirname(gm))
    return jsonify({'status': 'launched'})


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
