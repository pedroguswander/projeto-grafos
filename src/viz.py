import os
from collections import defaultdict

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import seaborn as sns
import pandas as pd

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(ROOT, "data")
OUT_DIR = os.path.join(ROOT, "out")
os.makedirs(OUT_DIR, exist_ok=True)

PALETTE = {
    "Nordeste":    "#2196F3",
    "Sudeste":     "#4CAF50",
    "Norte":       "#FF9800",
    "Sul":         "#9C27B0",
    "Centro-Oeste":"#F44336",
}


def _save(fig, name: str) -> None:
    path = os.path.join(OUT_DIR, name)
    fig.savefig(path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"Salvo: {path}")


def load_data():
    airports = pd.read_csv(os.path.join(DATA_DIR, "aeroportos_data.csv"))
    edges = pd.read_csv(os.path.join(DATA_DIR, "adjacencias_aeroportos.csv"))

    degree = edges.groupby("origem").size()
    airports["grau"] = airports["iata"].map(degree).fillna(0).astype(int)
    return airports, edges


def plot_histograma(airports: pd.DataFrame) -> None:
    graus = airports["grau"].values
    min_g, max_g = int(graus.min()), int(graus.max())

    fig, ax = plt.subplots(figsize=(7, 5))
    ax.hist(
        graus,
        bins=range(min_g, max_g + 2),
        color="#2196F3",
        edgecolor="white",
        rwidth=0.75,
    )
    media = graus.mean()
    ax.axvline(media, color="#F44336", linestyle="--", linewidth=1.5,
               label=f"Média: {media:.1f}")
    ax.set_xlabel("Grau (nº de conexões diretas)", fontsize=11)
    ax.set_ylabel("Número de aeroportos", fontsize=11)
    ax.set_title("Distribuição de Graus — Grafo de Aeroportos Brasileiros", fontsize=13, fontweight="bold")
    ax.set_xticks(range(min_g, max_g + 1))
    ax.legend(fontsize=10)
    ax.yaxis.set_major_locator(plt.MaxNLocator(integer=True))

    note = (
        "O que mostra: frequência de aeroportos por quantidade de conexões diretas.\n"
        "Insight: rede com poucos hubs de alta conectividade e muitos aeroportos periféricos — padrão típico de redes de transporte.\n"
        "Por que histograma: grau é variável discreta de contagem; histograma revela a forma da distribuição."
    )
    fig.text(0.5, 0.01, note, ha="center", va="bottom", fontsize=7.5,
             color="#444444", style="italic",
             bbox=dict(boxstyle="round,pad=0.4", facecolor="#f5f5f5", edgecolor="#cccccc"))

    fig.tight_layout(rect=[0, 0.12, 1, 1])
    _save(fig, "histograma_distribuicao_graus.png")


def plot_ranking(airports: pd.DataFrame) -> None:
    df = airports.sort_values("grau", ascending=True).copy()
    df["label"] = df["iata"] + " – " + df["cidade"]
    colors = [PALETTE.get(r, "#999999") for r in df["regiao"]]

    fig, ax = plt.subplots(figsize=(9, 7))
    bars = ax.barh(df["label"], df["grau"], color=colors, edgecolor="white", height=0.7)

    for bar, val in zip(bars, df["grau"]):
        ax.text(bar.get_width() + 0.05, bar.get_y() + bar.get_height() / 2,
                str(val), va="center", ha="left", fontsize=9, color="#333333")

    ax.set_xlabel("Grau (nº de conexões diretas)", fontsize=11)
    ax.set_title("Ranking de Conectividade dos Aeroportos Brasileiros", fontsize=13, fontweight="bold")
    ax.set_xlim(0, df["grau"].max() + 1.2)
    ax.xaxis.set_major_locator(plt.MaxNLocator(integer=True))

    patches = [mpatches.Patch(color=c, label=r) for r, c in PALETTE.items()]
    ax.legend(handles=patches, title="Região", loc="lower right", fontsize=9, title_fontsize=9)

    note = (
        "O que mostra: aeroportos ordenados pelo número de conexões diretas, coloridos por região.\n"
        "Insight: GRU e BSB concentram conexões nacionais; aeroportos do Norte e do interior têm grau 2–3.\n"
        "Por que barras ordenadas: comparação de magnitude entre categorias com leitura imediata da hierarquia."
    )
    fig.text(0.5, 0.01, note, ha="center", va="bottom", fontsize=7.5,
             color="#444444", style="italic",
             bbox=dict(boxstyle="round,pad=0.4", facecolor="#f5f5f5", edgecolor="#cccccc"))

    fig.tight_layout(rect=[0, 0.10, 1, 1])
    _save(fig, "barras_ranking_conectividade.png")


def plot_heatmap_regional(airports: pd.DataFrame, edges: pd.DataFrame) -> None:
    seen: set = set()
    unique_rows = []
    for _, row in edges.iterrows():
        key = frozenset([row["origem"], row["destino"]])
        if key not in seen:
            seen.add(key)
            unique_rows.append(row)
    edges_u = pd.DataFrame(unique_rows)

    region_map = dict(zip(airports["iata"], airports["regiao"]))
    edges_u = edges_u.copy()
    edges_u["reg_orig"] = edges_u["origem"].map(region_map)
    edges_u["reg_dest"] = edges_u["destino"].map(region_map)

    regioes = sorted(airports["regiao"].unique())
    matrix = pd.DataFrame(0, index=regioes, columns=regioes)

    for _, row in edges_u.iterrows():
        o, d = row["reg_orig"], row["reg_dest"]
        if pd.notna(o) and pd.notna(d):
            matrix.loc[o, d] += 1
            if o != d:
                matrix.loc[d, o] += 1 

    fig, ax = plt.subplots(figsize=(7, 6))
    sns.heatmap(
        matrix,
        annot=True,
        fmt="d",
        cmap="YlOrRd",
        linewidths=0.8,
        linecolor="#dddddd",
        ax=ax,
        cbar_kws={"label": "Nº de rotas"},
    )
    ax.set_title("Conectividade Inter-Regional — Número de Rotas Diretas",
                 fontsize=13, fontweight="bold", pad=14)
    ax.set_xlabel("Região Destino", fontsize=11)
    ax.set_ylabel("Região Origem", fontsize=11)
    ax.tick_params(axis="x", rotation=30)
    ax.tick_params(axis="y", rotation=0)

    note = (
        "O que mostra: número de rotas diretas entre cada par de regiões (matriz simétrica).\n"
        "Insight: Centro-Oeste (BSB) é o principal articulador inter-regional; maior parte das arestas liga regiões distintas.\n"
        "Por que heatmap: matriz simétrica pequena (5×5); cor codifica magnitude e facilita identificar padrões de isolamento."
    )
    fig.text(0.5, 0.01, note, ha="center", va="bottom", fontsize=7.5,
             color="#444444", style="italic",
             bbox=dict(boxstyle="round,pad=0.4", facecolor="#f5f5f5", edgecolor="#cccccc"))

    fig.tight_layout(rect=[0, 0.12, 1, 1])
    _save(fig, "heatmap_conexoes_regionais.png")


def main() -> None:
    airports, edges = load_data()
    plot_histograma(airports)
    plot_ranking(airports)
    plot_heatmap_regional(airports, edges)
    print("Todas as visualizações geradas em", OUT_DIR)


if __name__ == "__main__":
    main()
