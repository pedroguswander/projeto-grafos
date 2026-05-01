#!/usr/bin/env python3
"""
CLI para executar os cálculos de caminhos no grafo.
"""

import argparse
import sys
import os

# Adicionar o diretório atual ao path
sys.path.insert(0, os.path.dirname(__file__))

from solve import main


def main_cli():
    parser = argparse.ArgumentParser(description="Calcular caminhos mais curtos em grafo de aeroportos")
    parser.add_argument("--data-dir", default="../data",
                       help="Diretório com os arquivos CSV (padrão: ../data)")

    args = parser.parse_args()

    # Ajustar o caminho relativo se necessário
    if not os.path.isabs(args.data_dir):
        args.data_dir = os.path.join(os.path.dirname(__file__), args.data_dir)

    # Executar o cálculo
    main()


if __name__ == "__main__":
    main_cli()