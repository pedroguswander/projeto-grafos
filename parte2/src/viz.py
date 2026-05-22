from __future__ import annotations

import json
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.patches as mpatches
import matplotlib.pyplot as plt
import matplotlib.ticker as ticker
import numpy as np

from graphs.io import load_graph_from_csvs

ROOT = Path(__file__).resolve().parent.parent.parent
DATA_DIR = ROOT / "data" / "ETN"
OUT_DIR = ROOT / "out"
OUT_DIR.mkdir(parents=True, exist_ok=True)

_PLT_STYLE = {
    "font.family": "DejaVu Sans",
    "font.size": 11,
    "axes.titleweight": "bold",
    "axes.titlesize": 14,
    "axes.spines.top": False,
    "axes.spines.right": False,
}


def _save(fig, name: str) -> None:
    path = OUT_DIR / name
    fig.savefig(path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"Salvo: {path}")


def _carregar_metricas() -> dict:
    graph = load_graph_from_csvs(str(DATA_DIR))
    graus = {node: len(neighbors) for node, neighbors in graph.adjacency_list.items()}
    n = len(graus)
    grau_medio = sum(graus.values()) / n if n > 0 else 0.0
    return {"graus": graus, "grau_medio": grau_medio}


def plot_distribuicao_graus(ctx: dict) -> None:
    with plt.rc_context(_PLT_STYLE):
        graus_lista = list(ctx["graus"].values())
        fig, ax = plt.subplots(figsize=(9, 5.5))
        bins = np.arange(0.5, max(graus_lista) + 1.5, 1)
        ax.hist(graus_lista, bins=bins, color="#4C9AFF", edgecolor="white", linewidth=1.2)
        ax.axvline(ctx["grau_medio"], ls="--", color="#d62728", lw=2,
                   label=f"Grau médio: {ctx['grau_medio']:.1f}")
        mediana = np.median(graus_lista)
        ax.axvline(mediana, ls=":", color="#444", lw=2,
                   label=f"Mediana: {mediana:.0f}")
        ax.set_xlabel("Grau de saída (nº de rotas diretas)")
        ax.set_ylabel("Nº de portos")
        ax.set_title("Distribuição de graus — grafo de portos marítimos")
        ax.legend()
        fig.text(
            0.5, -0.02,
            "Exploratória: distribuição assimétrica — muitos portos com poucas rotas e poucos hubs com muitas conexões.",
            ha="center", fontsize=9, style="italic", color="#444",
        )
        fig.tight_layout()
        _save(fig, "part2_exp_01_distribuicao_graus.png")


_CORES_ALGORITMO = {
    "BFS":          "#4C9AFF",
    "DFS":          "#FF6B35",
    "DIJKSTRA":     "#2CA02C",
    "BELLMAN-FORD": "#D62728",
}

_NOTA_TEMPOS = (
    "O gráfico: tempo total acumulado (s) por algoritmo no dataset ETN — escala log para acomodar diferenças de ordens de grandeza.\n"
    "Insight: Bellman-Ford consome ~100× mais tempo que Dijkstra por iterar |V|−1 vezes sobre todas as arestas; BFS e DFS são os mais rápidos por não calcular pesos.\n"
    "Escolha: barras horizontais facilitam leitura dos rótulos e comparação intuitiva de magnitude entre categorias discretas.\n"
    "Gestalt — Similaridade (cor única por algoritmo) e Continuidade (barra guia o olhar do rótulo ao valor)."
)


def plot_tempos_algoritmos(report_path: Path) -> None:
    with open(report_path, encoding="utf-8") as f:
        report = json.load(f)

    algoritmos = ["BFS", "DFS", "DIJKSTRA", "BELLMAN-FORD"]
    totais = {alg: sum(e["tempo"] for e in report[alg]) for alg in algoritmos}
    ordenado = sorted(totais.items(), key=lambda x: x[1])
    labels = [item[0] for item in ordenado]
    values = [item[1] for item in ordenado]
    cores = [_CORES_ALGORITMO[l] for l in labels]

    with plt.rc_context(_PLT_STYLE):
        fig, ax = plt.subplots(figsize=(9, 5))
        container = ax.barh(labels, values, color=cores, edgecolor="white", linewidth=0.8)

        ax.set_xscale("log")
        ax.xaxis.set_major_formatter(ticker.LogFormatterSciNotation())
        ax.set_xlim(right=max(values) * 30)

        ax.bar_label(
            container,
            labels=[f"{v:.2e} s" for v in values],
            padding=6,
            fontsize=9,
        )

        ax.set_xlabel("Tempo total de execução (s) — escala logarítmica")
        ax.set_ylabel("Algoritmo")
        ax.set_title("Comparação de tempos de execução — ETN (Portos Marítimos)")

        patches = [mpatches.Patch(color=_CORES_ALGORITMO[alg], label=alg) for alg in algoritmos]
        ax.legend(handles=patches, loc="lower right", fontsize=9)

        fig.text(
            0.5, -0.12,
            _NOTA_TEMPOS,
            ha="center", fontsize=8, style="italic", color="#444",
        )
        fig.tight_layout()
        _save(fig, "parte2_exp_02_tempos_algoritmos.png")


_NOTA_BFS_VS_DFS = (
    "Cada barra representa uma execução a partir de uma fonte diferente — mesmas 3 fontes para BFS e DFS.\n"
    "BFS é iterativo: um loop com única lookup em set por vizinho. "
    "DFS é recursivo e classifica cada aresta (tree/back/forward/cross),\n"
    "executando 5–6 operações de dict por aresta; em um grafo denso de 1764 arestas o custo acumula ~10–40× sobre o BFS.\n"
    "Gestalt — Similaridade: cor única por algoritmo agrupa visualmente as barras sem rótulo extra; "
    "Continuidade: barra horizontal guia o olhar do rótulo ao valor numérico."
)


def plot_bfs_vs_dfs(report_path: Path) -> None:
    with open(report_path, encoding="utf-8") as f:
        report = json.load(f)

    entries = []
    for alg, cor in [("BFS", _CORES_ALGORITMO["BFS"]), ("DFS", _CORES_ALGORITMO["DFS"])]:
        for i, e in enumerate(report[alg], 1):
            fonte = e.get(f"source {alg} {i}", f"#{i}")
            entries.append((f"{alg} · {fonte}", e["tempo"], cor, alg))

    entries.sort(key=lambda x: x[1])
    labels = [e[0] for e in entries]
    values = [e[1] for e in entries]
    cores  = [e[2] for e in entries]

    with plt.rc_context(_PLT_STYLE):
        fig, ax = plt.subplots(figsize=(9, 5))
        container = ax.barh(labels, values, color=cores, edgecolor="white", linewidth=0.8)

        ax.set_xscale("log")
        ax.xaxis.set_major_formatter(ticker.LogFormatterSciNotation())
        ax.set_xlim(right=max(values) * 30)

        ax.bar_label(
            container,
            labels=[f"{v:.2e} s" for v in values],
            padding=6,
            fontsize=9,
        )

        ax.set_xlabel("Tempo de execução (s) — escala logarítmica")
        ax.set_ylabel("Algoritmo · Fonte")
        ax.set_title("BFS vs DFS — tempo de execução por fonte (ETN)")

        patches = [
            mpatches.Patch(color=_CORES_ALGORITMO["BFS"], label="BFS"),
            mpatches.Patch(color=_CORES_ALGORITMO["DFS"], label="DFS"),
        ]
        ax.legend(handles=patches, loc="lower right", fontsize=9)

        fig.text(
            0.5, -0.14,
            _NOTA_BFS_VS_DFS,
            ha="center", fontsize=8, style="italic", color="#444",
        )
        fig.tight_layout()
        _save(fig, "parte2_exp_03_bfs_vs_dfs.png")


if __name__ == "__main__":
    ctx = _carregar_metricas()
    plot_distribuicao_graus(ctx)
    report_path = ROOT / "out" / "part2_report.json"
    plot_tempos_algoritmos(report_path)
    plot_bfs_vs_dfs(report_path)
