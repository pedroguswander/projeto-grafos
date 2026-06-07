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
    pesos_pos = [w for w in pesos if w > 0]
    peso_medio_positivo = round(sum(pesos_pos) / len(pesos_pos)) if pesos_pos else 0
    rotas_deficitarias = sum(1 for w in pesos if w < 0)
    perc_deficitarias = round(rotas_deficitarias / len(pesos) * 100, 1) if pesos else 0
    peso_min = round(min(pesos)) if pesos else 0
    peso_max = round(max(pesos)) if pesos else 0
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

    vertex_info = {v.get('UNLocode', ''): v for v in vertices}

    # conexões por nó: destinos de cada origem
    conexoes_map = {}
    for a in arestas:
        orig = get_endpoint(a, 'origem', 'from')
        dest = get_endpoint(a, 'destino', 'to')
        if orig:
            conexoes_map.setdefault(orig, []).append(dest)

    top = []
    for n, g in graus.most_common(10):
        info = vertex_info.get(n, {})
        top.append({
            'nome': n,
            'nome_completo': info.get('name', n),
            'grau': g,
            'conexoes': conexoes_map.get(n, []),
        })

    return {
        'totalV': total_v,
        'totalE': total_e,
        'pesoMedio': peso_medio,
        'pesoMedioPositivo': peso_medio_positivo,
        'rotasDeficitarias': rotas_deficitarias,
        'percDeficitarias': perc_deficitarias,
        'pesoMin': peso_min,
        'pesoMax': peso_max,
        'grauMedio': grau_medio,
        'distribuicaoRegiao': dist_regiao,
        'distribuicaoGraus': dist_graus,
        'topVertices': top,
    }

def load_etn():
    etn = data_path('ETN')
    vpath, apath = os.path.join(etn, 'vertices.csv'), os.path.join(etn, 'arestas.csv')
    if not os.path.exists(vpath) or not os.path.exists(apath):
        return None, None, jsonify({'error': 'arquivos ETN não encontrados'}), 404
    return read_csv(vpath), read_csv(apath), None, None


# ─── Helpers de Report ─────────────────────────────────────────

def source_key(i):
    return i.get('source') or i.get('origem') or next(
        (v for v in i.values() if isinstance(v, str)), None
    )

def filter_by(items, source=None, target=None):
    if source:
        items = [i for i in items if i.get('source') == source]
    if target:
        items = [i for i in items if i.get('target') == target]
    return items

def resultados_comparacoes():
    return [
        os.path.join(BASE, '..', 'out', 'part2_report.json'),
        os.path.join(BASE, 'part2_report.json'),
        os.path.join(BASE, '..', 'data', 'part2_report.json'),
        os.path.join(BASE, '..', 'part2_report.json'),
        os.path.join(BASE, 'data', 'part2_report.json'),
    ]

def load_report():
    for p in resultados_comparacoes():
        r = os.path.abspath(p)
        if os.path.exists(r):
            with open(r, encoding='utf-8') as f:
                return json.load(f)
    return None

def require_report():
    report = load_report()
    if report is None:
        return None, (jsonify({'error': 'report não encontrado'}), 404)
    return report, None

def tempo_stats(items):
    vals = [i.get('tempo', 0) for i in items]
    return {
        'total': len(vals),
        'media': round(sum(vals) / len(vals), 6) if vals else None,
        'total_s': round(sum(vals), 6),
    }

def path_stats(items):
    validos = [i for i in items if i.get('custo') is not None]
    return {
        **tempo_stats(items),
        'validos': len(validos),
        'invalidos': len(items) - len(validos),
        'custo_medio': round(sum(i['custo'] for i in validos) / len(validos), 2) if validos else None,
    }


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

@app.route('/api/adjacencias')
def get_adjacencias():
    return csv_endpoint('adjacencias_aeroportos.csv')

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

    top = [{**r, 'path_info': enrich(r['path'])} for r in find_routes()]

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


@app.route('/api/etn/arestas')
def get_etn_arestas():
    vertices, arestas, err, code = load_etn()
    if err:
        return err, code
    return jsonify(arestas)

@app.route('/api/etn/vertices')
def get_etn_vertices():
    vertices, arestas, err, code = load_etn()
    if err:
        return err, code
    return jsonify(vertices)

@app.route('/api/dashboard-stats/etn/filtros')
def get_etn_filtros():
    vertices, arestas, err, code = load_etn()
    if err:
        return err, code

    # Metadados de região/país (mantidos para compatibilidade)
    mapa = {}
    for v in vertices:
        r, c = v.get('D_Region', ''), v.get('Country', '')
        if r and c:
            mapa.setdefault(r, set()).add(c)

    # Limites de grau
    endpoints = (
        [a.get('source') or a.get('origem') for a in arestas] +
        [a.get('target') or a.get('destino') for a in arestas]
    )
    graus = Counter(filter(None, endpoints))
    grau_vals = list(graus.values()) or [0]

    # Limites de peso
    pesos = [w for a in arestas if (w := get_weight(a)) is not None]

    return jsonify({
        'regioes': sorted(mapa),
        'paises_por_regiao': {r: sorted(ps) for r, ps in sorted(mapa.items())},
        'grau_min': min(grau_vals),
        'grau_max': max(grau_vals),
        'peso_min': round(min(pesos)) if pesos else 0,
        'peso_max': round(max(pesos)) if pesos else 0,
    })


@app.route('/api/dashboard-stats/etn/filtrado')
def get_etn_filtrado():
    vertices, arestas, err, code = load_etn()
    if err:
        return err, code

    regiao  = request.args.get('regiao')
    pais    = request.args.get('pais')
    grau_min = request.args.get('grau_min', type=float)
    grau_max = request.args.get('grau_max', type=float)
    peso_min = request.args.get('peso_min', type=float)
    peso_max = request.args.get('peso_max', type=float)

    # Filtro por região/país
    if regiao:
        vertices = [v for v in vertices if v.get('D_Region') == regiao]
    if pais:
        vertices = [v for v in vertices if v.get('Country') == pais]

    codigos = {v['UNLocode'] for v in vertices}

    # Calcula grau de cada nó para filtro de grau
    endpoints = (
        [a.get('source') or a.get('origem') for a in arestas] +
        [a.get('target') or a.get('destino') for a in arestas]
    )
    graus_full = Counter(filter(None, endpoints))

    nos_validos = {
        n for n, g in graus_full.items()
        if (grau_min is None or g >= grau_min)
        and (grau_max is None or g <= grau_max)
    }

    # Filtra arestas por região, grau e peso
    arestas_filtradas = []
    for a in arestas:
        src = a.get('source') or a.get('origem') or get_endpoint(a, 'origem', 'from')
        tgt = a.get('target') or a.get('destino') or get_endpoint(a, 'destino', 'to')

        # Filtro região/país: ao menos um lado no subgrafo
        if codigos and src not in codigos and tgt not in codigos:
            continue

        # Filtro grau
        if src not in nos_validos or tgt not in nos_validos:
            continue

        # Filtro peso
        w = get_weight(a)
        if peso_min is not None and (w is None or w < peso_min):
            continue
        if peso_max is not None and (w is None or w > peso_max):
            continue

        arestas_filtradas.append(a)

    return jsonify(calc_stats(vertices, arestas_filtradas))


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


# ─── BFS / DFS ─────────────────────────────────────────────────

@app.route('/api/report/bfs')
def get_report_bfs():
    report, err = require_report()
    if err: return err
    items = report.get('BFS', [])
    if src := request.args.get('source'):
        items = [i for i in items if any(v == src for v in i.values() if isinstance(v, str))]
    return jsonify([{
        'source': source_key(i), 'tempo_segundos': i.get('tempo'),
        'total_vertices': i.get('ordem'),
        'num_camadas': len(i.get('camadas', {})), 'camadas': i.get('camadas', {}),
    } for i in items])

@app.route('/api/report/dfs')
def get_report_dfs():
    report, err = require_report()
    if err: return err
    items = report.get('DFS', [])
    if src := request.args.get('source'):
        items = [i for i in items if any(v == src for v in i.values() if isinstance(v, str))]
    return jsonify([{
        'source': source_key(i), 'tempo_segundos': i.get('tempo'),
        'total_vertices': i.get('ordem'), 'ciclos': i.get('ciclos'),
        'arestas_tree':  len(i.get('arestas', {}).get('tree', [])),
        'arestas_back':  len(i.get('arestas', {}).get('back', [])),
        'arestas_cross': len(i.get('arestas', {}).get('cross', [])),
        'arestas_detalhe': i.get('arestas', {}),
    } for i in items])


# ─── Dijkstra / Bellman-Ford ───────────────────────────────────

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
        if (val := request.args.get(flag)) is not None:
            data = [d for d in data if d.get(flag) == (val.lower() == 'true')]
    return jsonify(data)


# ─── Comparações ───────────────────────────────────────────────

@app.route('/api/report/comparacao/bfs-dfs')
def comparar_bfs_dfs():
    report, err = require_report()
    if err: return err

    bfs_map = {source_key(i): i for i in report.get('BFS', [])}
    dfs_map = {source_key(i): i for i in report.get('DFS', [])}

    comparacoes = []
    for src in sorted(set(bfs_map) & set(dfs_map)):
        b, d = bfs_map[src], dfs_map[src]
        bt, dt = b.get('tempo', 0), d.get('tempo', 0)
        comparacoes.append({
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
    return jsonify({'total_comparacoes': len(comparacoes), 'comparacoes': comparacoes})

@app.route('/api/report/comparacao/dijkstra-bellman')
def comparar_dijkstra_bellman():
    report, err = require_report()
    if err: return err

    def pair(i): return (i.get('source'), i.get('target'))
    dmap = {pair(i): i for i in report.get('DIJKSTRA', [])}
    bmap = {pair(i): i for i in report.get('BELLMAN-FORD', [])}

    def fmt_d(i): return {
        'tempo_segundos': i.get('tempo'), 'custo': i.get('custo'),
        'tamanho_caminho': i.get('tamanho_caminho'), 'caminho': i.get('caminho'),
        'eh_subgrafo': i.get('eh_subgrafo'), 'tem_peso_negativo': i.get('tem_peso_negativo'),
    }
    def fmt_b(i): return {
        **fmt_d(i),
        'tem_ciclo_negativo': i.get('tem_ciclo_negativo'), 'descricao': i.get('descricao'),
    }

    comparacoes = []
    for par in sorted(set(dmap) & set(bmap)):
        d, b = dmap[par], bmap[par]
        dt, bt = d.get('tempo', 0), b.get('tempo', 0)
        dc, bc = d.get('custo'), b.get('custo')
        comparacoes.append({
            'source': par[0], 'target': par[1],
            'dijkstra': fmt_d(d), 'bellman_ford': fmt_b(b),
            'custo_identico': (dc == bc) if None not in (dc, bc) else None,
            'delta_tempo_ms': round((bt - dt) * 1000, 4),
            'mais_rapido': 'Dijkstra' if dt < bt else 'Bellman-Ford',
        })

    return jsonify({
        'total_comparacoes': len(comparacoes), 'comparacoes': comparacoes,
        'apenas_dijkstra':    [{**dmap[k], 'nota': 'apenas_dijkstra'}    for k in set(dmap) - set(bmap)],
        'apenas_bellman_ford': [{**bmap[k], 'nota': 'apenas_bellman_ford'} for k in set(bmap) - set(dmap)],
    })


# ─── Resumo ────────────────────────────────────────────────────

@app.route('/api/report/resumo')
def get_report_resumo():
    report, err = require_report()
    if err: return err

    bfs = report.get('BFS', [])
    dfs = report.get('DFS', [])
    bf  = report.get('BELLMAN-FORD', [])

    return jsonify({
        'BFS': tempo_stats(bfs),
        'DFS': {
            **tempo_stats(dfs),
            'ciclos_medio': round(sum(i.get('ciclos', 0) for i in dfs) / len(dfs), 2) if dfs else None,
        },
        'DIJKSTRA': path_stats(report.get('DIJKSTRA', [])),
        'BELLMAN_FORD': {
            **path_stats(bf),
            'com_ciclo_negativo': sum(1 for i in bf if i.get('tem_ciclo_negativo')),
        },
    })


# ─── ETN: Painel de Rotas (Bellman-Ford / parte 2) ─────────────

etn_graph = None


def load_etn_graph():
    """Carrega (lazy + cache) o grafo de portos da parte 2.

    Insere a raiz do projeto no sys.path para importar `parte2.src.graphs`
    como pacote de topo `parte2`, evitando colisão com o pacote `graphs`
    da parte 1 já importado acima. Mesmo padrão de tests/test_part2_report.py.
    """
    global etn_graph
    if etn_graph is None:
        root = os.path.abspath(os.path.join(BASE, '..'))
        if root not in sys.path:
            sys.path.insert(0, root)
        from parte2.src.graphs.io import load_graph_from_csvs as _load_etn_csvs
        etn_graph = _load_etn_csvs(data_path('ETN'))
    return etn_graph


def port_info(port):
    return {'code': port.code, 'name': port.name,
            'country': port.country, 'region': port.region}


@app.route('/api/etn/graph-data')
def get_etn_graph_data():
    g = load_etn_graph()
    nodes = [
        {'id': c, 'label': c, 'title': f"{c} — {p.name} ({p.country})",
         'name': p.name, 'country': p.country, 'region': p.region}
        for c, p in g.ports.items()
    ]
    edges = [
        {'from': src, 'to': dst, 'weight': w}
        for src, neighbors in g.adjacency_list.items()
        for dst, w in neighbors
    ]
    return jsonify({'nodes': nodes, 'edges': edges})


@app.route('/api/etn/dfs-path', methods=['POST'])
def calculate_etn_dfs_path():
    body = request.get_json() or {}
    start, end = body.get('start'), body.get('end')
    max_depth = int(body.get('max_depth', 8))

    if not start or not end:
        return jsonify({'error': 'start e end são obrigatórios'}), 400

    g = load_etn_graph()

    if start not in g.adjacency_list or end not in g.adjacency_list:
        return jsonify({'success': False,
                        'message': f'Porto inválido: {start} ou {end}'}), 400

    # DFS de caminho simples (sem ciclos), com limite de profundidade e de
    # chamadas recursivas para garantir tempo de resposta no grafo denso.
    MAX_DFS_CALLS = 50_000
    best_cost = [float('inf')]
    best_path = [None]
    calls = [0]

    def _dfs(node, path, visited, cost):
        calls[0] += 1
        if calls[0] > MAX_DFS_CALLS:
            return
        if node == end:
            if cost < best_cost[0]:
                best_cost[0] = cost
                best_path[0] = path.copy()
            return
        if len(path) > max_depth:
            return
        for neighbor, weight in g.get_neighbors(node):
            if neighbor not in visited:
                visited.add(neighbor)
                path.append(neighbor)
                _dfs(neighbor, path, visited, cost + weight)
                path.pop()
                visited.remove(neighbor)

    _dfs(start, [start], {start}, 0.0)

    if best_path[0] is None:
        return jsonify({
            'success': False,
            'message': (f'Nenhum caminho simples encontrado de {start} a {end} '
                        f'com até {max_depth} saltos.')
        })

    def enrich(codes):
        return [port_info(g.get_port(c)) for c in codes if g.get_port(c)]

    return jsonify({
        'success': True,
        'cost': best_cost[0],
        'path': best_path[0],
        'path_info': enrich(best_path[0]),
        'connections': max(len(best_path[0]) - 2, 0),
        'max_depth': max_depth,
    })


@app.route('/api/etn/bellman-ford', methods=['POST'])
def calculate_etn_bellman_ford():
    body = request.get_json() or {}
    start, end = body.get('start'), body.get('end')

    if not start or not end:
        return jsonify({'error': 'start e end são obrigatórios'}), 400

    g = load_etn_graph()  # garante sys.path + grafo carregado
    from parte2.src.graphs.algorithms import bellman_ford

    if start not in g.adjacency_list or end not in g.adjacency_list:
        return jsonify({'success': False, 'hasNegativeCycle': False,
                        'message': f'Porto inválido: {start} ou {end}'}), 400

    cost, path, has_cycle = bellman_ford(g, start, end)

    if has_cycle:
        return jsonify({
            'success': False, 'hasNegativeCycle': True,
            'message': 'Ciclo negativo detectado — o problema do menor caminho é indefinido.',
        })

    if cost is None or path is None:
        return jsonify({'success': False, 'hasNegativeCycle': False,
                        'message': f'Não há caminho entre {start} e {end}.'})

    def enrich(codes):
        return [port_info(g.get_port(c)) for c in codes if g.get_port(c)]

    return jsonify({
        'success': True,
        'hasNegativeCycle': False,
        'cost': cost,
        'path': path,
        'path_info': enrich(path),
        'connections': max(len(path) - 2, 0),
    })


# ─── Airport Game ──────────────────────────────────────────────

@app.route('/api/launch-game', methods=['POST'])
def launch_game():
    import subprocess
    game_main = os.path.abspath(os.path.join(BASE, '..', 'atc', 'main.py'))
    if not os.path.exists(game_main):
        return jsonify({'error': 'atc/main.py não encontrado'}), 404
    subprocess.Popen(
        [sys.executable, game_main],
        cwd=os.path.dirname(game_main),
    )
    return jsonify({'status': 'launched'})


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
