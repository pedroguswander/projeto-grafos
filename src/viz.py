from __future__ import annotations

import csv
from collections import defaultdict
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import numpy as np
import pandas as pd
import seaborn as sns

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
OUT_DIR = ROOT / "out"
OUT_DIR.mkdir(parents=True, exist_ok=True)

PALETTE = {
    "Nordeste":    "#2196F3",
    "Sudeste":     "#4CAF50",
    "Norte":       "#FF9800",
    "Sul":         "#9C27B0",
    "Centro-Oeste":"#F44336",
}

CORES_REGIAO = {  
    "Nordeste":    "#1f77b4",
    "Sudeste":     "#2ca02c",
    "Norte":       "#ff7f0e",
    "Sul":         "#9467bd",
    "Centro-Oeste":"#d62728",
}

_PLT_STYLE_CONJ2 = {
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


def _densidade(num_nodos: int, num_arestas: int) -> float:
    if num_nodos < 2:
        return 0.0
    return (2 * num_arestas) / (num_nodos * (num_nodos - 1))


def _spring_layout(nodes, edges_set, seed=7, iterations=200, k=0.55):
    rng = np.random.default_rng(seed)
    nodes = list(nodes)
    pos = {n: rng.uniform(-0.5, 0.5, size=2) for n in nodes}

    t = 0.1
    dt = t / (iterations + 1)

    for _ in range(iterations):
        disp = {n: np.zeros(2) for n in nodes}

        for i, u in enumerate(nodes):
            for v in nodes[i + 1:]:
                delta = pos[u] - pos[v]
                d = float(np.linalg.norm(delta)) + 1e-9
                force = (k * k) / d
                unit = delta / d
                disp[u] += unit * force
                disp[v] -= unit * force

        for u, v in edges_set:
            delta = pos[u] - pos[v]
            d = float(np.linalg.norm(delta)) + 1e-9
            force = (d * d) / k
            unit = delta / d
            disp[u] -= unit * force
            disp[v] += unit * force

        for n in nodes:
            d = float(np.linalg.norm(disp[n])) + 1e-9
            pos[n] = pos[n] + (disp[n] / d) * min(d, t)

        t -= dt

    coords = np.array([pos[n] for n in nodes])
    coords -= coords.mean(axis=0)
    max_abs = float(np.max(np.abs(coords)))
    if max_abs > 0:
        coords /= max_abs
    return {n: coords[i] for i, n in enumerate(nodes)}


def _carregar_grafo_e_metricas():
    aeroportos: dict[str, dict] = {}
    with open(DATA_DIR / "aeroportos_data.csv", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            aeroportos[row["iata"]] = {
                "cidade": row["cidade"], "regiao": row["regiao"]
            }

    arestas: list[tuple[str, str, int]] = []
    edges_set: set[tuple[str, str]] = set()
    pesos_por_aresta: dict[tuple[str, str], int] = {}
    adj: dict[str, set[str]] = defaultdict(set)
    pesos: list[int] = []

    with open(DATA_DIR / "adjacencias_aeroportos.csv", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            u, v = row["origem"], row["destino"]
            w = int(float(row["peso"]))
            chave = tuple(sorted((u, v)))
            if chave in edges_set:
                continue
            edges_set.add(chave)
            arestas.append((u, v, w))
            pesos_por_aresta[chave] = w
            adj[u].add(v)
            adj[v].add(u)
            pesos.append(w)

    nodos = list(aeroportos.keys())
    n_nodos = len(nodos)
    n_arestas = len(arestas)

    graus = {n: len(adj[n]) for n in nodos}
    grau_medio = sum(graus.values()) / n_nodos
    densidade = _densidade(n_nodos, n_arestas)

    densidade_ego: dict[str, float] = {}
    for n in nodos:
        viz = adj[n]
        ego_nodes = {n, *viz}
        k = len(ego_nodes)
        if k <= 1:
            densidade_ego[n] = 0.0
            continue

        m = len(viz)
        viz_lista = list(viz)
        for i, a in enumerate(viz_lista):
            for b in viz_lista[i + 1:]:
                if b in adj[a]:
                    m += 1
        densidade_ego[n] = m / (k * (k - 1) / 2)

    regioes = sorted({a["regiao"] for a in aeroportos.values()})
    metricas_regiao: dict[str, dict] = {}
    for r in regioes:
        nodos_r = [c for c in nodos if aeroportos[c]["regiao"] == r]
        n_r = len(nodos_r)
        nodos_r_set = set(nodos_r)
        m_r = sum(1 for u, v, _ in arestas
                  if u in nodos_r_set and v in nodos_r_set)
        metricas_regiao[r] = {"n": n_r, "m": m_r,
                              "densidade": _densidade(n_r, m_r)}

    inter_mat = defaultdict(lambda: defaultdict(int))
    for u, v, _ in arestas:
        ru, rv = aeroportos[u]["regiao"], aeroportos[v]["regiao"]
        inter_mat[ru][rv] += 1
        if ru != rv:
            inter_mat[rv][ru] += 1

    return {
        "nodos": nodos,
        "arestas": arestas,
        "edges_set": edges_set,
        "pesos_por_aresta": pesos_por_aresta,
        "adj": adj,
        "aeroportos": aeroportos,
        "graus": graus,
        "grau_medio": grau_medio,
        "densidade": densidade,
        "peso_min": int(min(pesos)),
        "peso_max": int(max(pesos)),
        "densidade_ego": densidade_ego,
        "regioes": regioes,
        "metricas_regiao": metricas_regiao,
        "inter_mat": inter_mat,
        "top3_hubs": {c for c, _ in sorted(graus.items(), key=lambda x: -x[1])[:3]},
    }




def plot_exp_01_distribuicao_graus(ctx: dict) -> None:
    """Exploratória 1 — histograma da distribuição de graus."""
    with plt.rc_context(_PLT_STYLE_CONJ2):
        graus_lista = list(ctx["graus"].values())
        fig, ax = plt.subplots(figsize=(9, 5.5))
        bins = np.arange(0.5, max(graus_lista) + 1.5, 1)
        ax.hist(graus_lista, bins=bins,
                color="#4C9AFF", edgecolor="white", linewidth=1.2)
        ax.axvline(ctx["grau_medio"], ls="--", color="#d62728", lw=2,
                   label=f"Grau médio: {ctx['grau_medio']:.1f}")
        ax.axvline(np.median(graus_lista), ls=":", color="#444", lw=2,
                   label=f"Mediana: {np.median(graus_lista):.0f}")
        ax.set_xlabel("Grau (nº de conexões diretas)")
        ax.set_ylabel("Nº de aeroportos")
        ax.set_title("Distribuição de graus — grafo de aeroportos brasileiros")
        ax.legend()
        ax.set_xticks(range(1, max(graus_lista) + 1))
        fig.text(0.5, -0.02,
                 "Exploratória: a distribuição é fortemente assimétrica à "
                 "direita — muitos nós com grau baixo e poucos hubs (cauda longa).",
                 ha="center", fontsize=9, style="italic", color="#444")
        fig.tight_layout()
        _save(fig, "exp_01_distribuicao_graus.png")


def plot_exp_02_grau_vs_densidade_ego(ctx: dict) -> None:
    """Exploratória 2 — scatter grau × densidade do ego."""
    with plt.rc_context(_PLT_STYLE_CONJ2):
        graus = ctx["graus"]
        densidade_ego = ctx["densidade_ego"]
        aeroportos = ctx["aeroportos"]
        nodos = ctx["nodos"]

        fig, ax = plt.subplots(figsize=(10, 6.5))

        grupos: dict[tuple[int, float], list[str]] = defaultdict(list)
        for n in nodos:
            grupos[(graus[n], round(densidade_ego[n], 4))].append(n)

        for (gx, gy), nodes in grupos.items():
            nodes = sorted(nodes)
            regs_no_grupo = [aeroportos[n]["regiao"] for n in nodes]
            cores_no_grupo = list(dict.fromkeys(
                CORES_REGIAO[r] for r in regs_no_grupo
            ))
            tamanhos = [240 - i * 70 for i in range(len(cores_no_grupo))]
            for tam, cor in zip(tamanhos, cores_no_grupo):
                ax.scatter([gx], [gy], c=cor, s=tam, edgecolor="white", linewidth=1.4, alpha=0.95, zorder=3)

            rotulo = ", ".join(nodes)
            dx, dy, ha, va = 8, 6, "left", "bottom"
            if gx >= max(graus.values()) - 0.5:
                dx, ha = -8, "right"
            if gy >= 0.95:
                dy, va = -10, "top"

            ax.annotate(rotulo, (gx, gy),
                        xytext=(dx, dy), textcoords="offset points",
                        fontsize=9.5, ha=ha, va=va,
                        bbox=dict(boxstyle="round,pad=0.18", fc="white", ec="#bbb", lw=0.4, alpha=0.85))

        ax.set_xlabel("Grau (nº de conexões)")
        ax.set_ylabel("Densidade do ego-grafo (clusterização local)")
        ax.set_title("Hubs x clusters — relação grau ↔ densidade local")
        ax.set_xlim(0.5, max(graus.values()) + 1.5)
        ax.set_ylim(-0.05, 1.12)
        ax.grid(True, alpha=0.25)
        patches = [mpatches.Patch(color=c, label=r) for r, c in CORES_REGIAO.items()]
        ax.legend(handles=patches, title="Região", loc="upper right")
        fig.text(0.5, -0.02,
                 "Exploratória: aeroportos pequenos (CGH, RBR, THE) têm ego "
                 "100% denso — vivem em torno de um único hub. BSB e GRU têm "
                 "grau alto e ego pouco denso (papel de ponte estrutural).",
                 ha="center", fontsize=9, style="italic", color="#444")
        fig.tight_layout()
        _save(fig, "exp_02_grau_vs_densidade_ego.png")


def plot_expl_01_ranking_hubs(ctx: dict) -> None:
    """Explanatória 1 — ranking horizontal com destaque dos 3 hubs."""
    with plt.rc_context(_PLT_STYLE_CONJ2):
        graus = ctx["graus"]
        aeroportos = ctx["aeroportos"]
        top3 = ctx["top3_hubs"]

        ordenados = sorted(graus.items(), key=lambda x: x[1])
        codes = [c for c, _ in ordenados]
        vals = [v for _, v in ordenados]
        labels = [f"{c} – {aeroportos[c]['cidade']}" for c in codes]
        cores = [CORES_REGIAO[aeroportos[c]["regiao"]] for c in codes]

        fig, ax = plt.subplots(figsize=(11, 8))
        y_pos = np.arange(len(codes))
        bars = ax.barh(y_pos, vals, color=cores, edgecolor="white", linewidth=1.2)

        for bar, code, val in zip(bars, codes, vals):
            if code in top3:
                bar.set_edgecolor("black")
                bar.set_linewidth(2.5)
            ax.text(val + 0.15, bar.get_y() + bar.get_height() / 2, str(val),
                    va="center", fontsize=10,
                    fontweight="bold" if code in top3 else "normal")

        ax.set_yticks(y_pos)
        ax.set_yticklabels(labels, fontsize=10)
        ax.set_xlabel("Grau — nº de aeroportos diretamente conectados", fontsize=11)
        ax.set_title("Três hubs concentram a malha aérea brasileira", fontsize=15, pad=14)
        ax.set_xlim(0, max(vals) + 1.5)
        ax.grid(True, axis="x", alpha=0.25)

        ax.annotate(
            "BSB, GRU e REC aparecem\nem 28 das 50 arestas\n(56% da malha).",
            xy=(12, len(codes) - 1), xytext=(7.5, len(codes) - 6),
            fontsize=11, ha="left",
            bbox=dict(boxstyle="round,pad=0.5", fc="#FFF3CD", ec="#856404", lw=1.2),
            arrowprops=dict(arrowstyle="->", color="#856404", lw=1.4),
        )

        patches = [mpatches.Patch(color=c, label=r) for r, c in CORES_REGIAO.items()]
        ax.legend(handles=patches, title="Região", loc="lower right", framealpha=0.95)
        fig.tight_layout()
        _save(fig, "expl_01_ranking_hubs.png")


def plot_expl_02_densidade_regional(ctx: dict) -> None:
    """Explanatória 2 — densidade interna por região + heatmap inter-regional."""
    with plt.rc_context(_PLT_STYLE_CONJ2):
        metricas_regiao = ctx["metricas_regiao"]
        inter_mat = ctx["inter_mat"]
        regioes = ctx["regioes"]
        densidade = ctx["densidade"]

        fig, axes = plt.subplots(1, 2, figsize=(14, 6),
                                 gridspec_kw={"width_ratios": [1, 1.1]})

        regs = list(metricas_regiao.keys())
        dens = [metricas_regiao[r]["densidade"] for r in regs]
        order = np.argsort(dens)[::-1]
        regs_o = [regs[i] for i in order]
        dens_o = [dens[i] for i in order]
        cores_o = [CORES_REGIAO[r] for r in regs_o]

        bars = axes[0].bar(regs_o, dens_o, color=cores_o,
                           edgecolor="white", linewidth=1.5)
        for bar, v in zip(bars, dens_o):
            axes[0].text(bar.get_x() + bar.get_width() / 2, v + 0.02,
                         f"{v*100:.0f}%", ha="center", fontsize=11, fontweight="bold")
        axes[0].set_ylim(0, 1.15)
        axes[0].set_ylabel("Densidade interna da região")
        axes[0].set_title("Sul e Centro-Oeste são internamente completos", fontsize=13)
        axes[0].set_yticks([0, 0.25, 0.5, 0.75, 1.0])
        axes[0].set_yticklabels(["0%", "25%", "50%", "75%", "100%"])
        axes[0].axhline(densidade, ls="--", color="#666", lw=1.2, label=f"Densidade global ({densidade*100:.0f}%)")
        axes[0].legend(loc="upper right", fontsize=9)

        mat = np.zeros((len(regioes), len(regioes)))
        for i, ri in enumerate(regioes):
            for j, rj in enumerate(regioes):
                mat[i, j] = inter_mat[ri][rj]
        im = axes[1].imshow(mat, cmap="YlOrRd", aspect="equal")
        axes[1].set_xticks(range(len(regioes)))
        axes[1].set_yticks(range(len(regioes)))
        axes[1].set_xticklabels(regioes, rotation=30, ha="right")
        axes[1].set_yticklabels(regioes)
        for i in range(len(regioes)):
            for j in range(len(regioes)):
                v = int(mat[i, j])
                cor = "white" if v > mat.max() * 0.55 else "black"
                axes[1].text(j, i, str(v), ha="center", va="center", fontsize=11, color=cor, fontweight="bold")
        axes[1].set_title("Sudeste e Centro-Oeste fazem a costura inter-regional",
                          fontsize=13)
        plt.colorbar(im, ax=axes[1], shrink=0.85, label="Nº de rotas diretas")

        fig.suptitle("Como cada região se conecta — internamente e com as outras",
                     fontsize=15, fontweight="bold", y=1.02)
        fig.tight_layout()
        _save(fig, "expl_02_densidade_regional.png")


def plot_expl_03_grafo_anotado(ctx: dict) -> None:
    with plt.rc_context(_PLT_STYLE_CONJ2):
        nodos = ctx["nodos"]
        edges_set = ctx["edges_set"]
        pesos = ctx["pesos_por_aresta"]
        graus = ctx["graus"]
        aeroportos = ctx["aeroportos"]
        peso_min, peso_max = ctx["peso_min"], ctx["peso_max"]
        top3 = ctx["top3_hubs"]

        pos = _spring_layout(nodos, edges_set, seed=7, iterations=200, k=0.55)

        fig, ax = plt.subplots(figsize=(13, 9))

        for (u, v) in edges_set:
            w = pesos[(u, v)]
            lw = 0.4 + (w - peso_min) / max(1, peso_max - peso_min) * 2.6
            xu, yu = pos[u]
            xv, yv = pos[v]
            ax.plot([xu, xv], [yu, yv],
                    color="#999", linewidth=lw, alpha=0.55, zorder=1)

        xs = [pos[n][0] for n in nodos]
        ys = [pos[n][1] for n in nodos]
        sizes = [180 + graus[n] * 120 for n in nodos]
        node_colors = [CORES_REGIAO[aeroportos[n]["regiao"]] for n in nodos]
        ax.scatter(xs, ys, s=sizes, c=node_colors,
                   edgecolors="white", linewidths=1.6, alpha=0.95, zorder=3)

        for n in nodos:
            ax.text(pos[n][0], pos[n][1], n,
                    ha="center", va="center",
                    fontsize=9, fontweight="bold", zorder=4)

        for h in top3:
            x, y = pos[h]
            circ = plt.Circle((x, y), radius=0.085, fill=False,
                              ec="black", lw=2.2, ls="--", zorder=5)
            ax.add_patch(circ)

        margin = 0.15
        ax.set_xlim(min(xs) - margin, max(xs) + margin)
        ax.set_ylim(min(ys) - margin, max(ys) + margin)
        ax.set_aspect("equal")
        ax.set_axis_off()
        ax.set_title("Grafo completo — tamanho do nó = grau, cor = região, "
                     "círculo = hub", fontsize=14, pad=14)
        patches = [mpatches.Patch(color=c, label=r) for r, c in CORES_REGIAO.items()]
        ax.legend(handles=patches, title="Região", loc="lower left",
                  framealpha=0.95)
        fig.tight_layout()
        _save(fig, "expl_03_grafo_anotado.png")


def main() -> None:
    ctx = _carregar_grafo_e_metricas()
    plot_exp_01_distribuicao_graus(ctx)
    plot_exp_02_grau_vs_densidade_ego(ctx)
    plot_expl_01_ranking_hubs(ctx)
    plot_expl_02_densidade_regional(ctx)
    plot_expl_03_grafo_anotado(ctx)

    print("Todas as visualizações geradas em", OUT_DIR)


if __name__ == "__main__":
    main()
