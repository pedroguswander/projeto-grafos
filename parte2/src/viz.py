from __future__ import annotations

from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

from graphs.io import load_graph_from_csvs

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
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
        _save(fig, "exp_01_distribuicao_graus.png")


if __name__ == "__main__":
    ctx = _carregar_metricas()
    plot_distribuicao_graus(ctx)
