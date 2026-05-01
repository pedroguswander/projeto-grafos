#!/usr/bin/env python3
"""
Script para calcular os caminhos mais curtos entre pares de aeroportos usando Dijkstra.
"""

import sys
import os
from typing import List, Tuple, Optional

# Adicionar o diretório src ao path para importar os módulos
sys.path.insert(0, os.path.dirname(__file__))

from graphs.graph import Graph
from graphs.algorithms import dijkstra
from graphs.io import load_graph_from_csvs, load_pairs_from_csv


def main():
    # Caminhos para os arquivos
    data_dir = os.path.join(os.path.dirname(__file__), '..', 'data')
    pairs_file = os.path.join(data_dir, 'rotas.csv')  # Arquivo com os pares

    # Carregar o grafo
    print("Carregando grafo...")
    graph = load_graph_from_csvs(data_dir)
    print(f"Grafo carregado com {len(graph.airports)} aeroportos")

    # Carregar os pares
    print("Carregando pares de aeroportos...")
    pairs = load_pairs_from_csv(pairs_file)
    print(f"Encontrados {len(pairs)} pares para calcular")

    # Calcular Dijkstra para cada par
    results = []
    for i, (start, end) in enumerate(pairs, 1):
        print(f"\nCalculando caminho {i}/{len(pairs)}: {start} -> {end}")

        # Executar Dijkstra
        cost, path = dijkstra(graph, start, end)

        if cost is not None and path is not None:
            print(f"  Custo: {cost:.2f}")
            print(f"  Caminho: {' -> '.join(path)}")

            # Verificar se os aeroportos existem e mostrar nomes
            start_airport = graph.get_airport(start)
            end_airport = graph.get_airport(end)
            if start_airport and end_airport:
                print(f"  De: {start_airport.city} ({start})")
                print(f"  Para: {end_airport.city} ({end})")
        else:
            print(f"  Nenhum caminho encontrado entre {start} e {end}")

        results.append((start, end, cost, path))

    # Resumo final
    print("\n=== RESUMO DOS RESULTADOS ===")
    successful = sum(1 for _, _, cost, _ in results if cost is not None)
    total = len(results)
    print(f"Caminhos encontrados: {successful}/{total}")

    # Mostrar alguns exemplos
    print("\nExemplos de caminhos encontrados:")
    for start, end, cost, path in results[:5]:  # Mostrar os primeiros 5
        if cost is not None:
            print(f"{start} -> {end}: custo {cost:.2f}, {len(path)-1} conexões")


if __name__ == "__main__":
    main()