import csv
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass


@dataclass
class Airport:
    code: str
    name: str
    city: str
    country: str
    latitude: float
    longitude: float


class Graph:
    def __init__(self):
        self.airports: Dict[str, Airport] = {}
        self.adjacency_list: Dict[str, List[Tuple[str, float]]] = {}

    def add_airport(self, airport: Airport):
        self.airports[airport.code] = airport
        if airport.code not in self.adjacency_list:
            self.adjacency_list[airport.code] = []

    def add_route(self, from_code: str, to_code: str, distance: float):
        if from_code not in self.adjacency_list:
            self.adjacency_list[from_code] = []
        if to_code not in self.adjacency_list:
            self.adjacency_list[to_code] = []
        self.adjacency_list[from_code].append((to_code, distance))
        # Assuming undirected graph for simplicity
        self.adjacency_list[to_code].append((from_code, distance))

    def load_airports(self, filepath: str):
        with open(filepath, 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            for row in reader:
                airport = Airport(
                    code=row['iata'],
                    name=row['cidade'],  # Usando cidade como nome
                    city=row['cidade'],
                    country='Brasil',  # Assumindo Brasil como país
                    latitude=0.0,  # Valores padrão já que não temos coordenadas
                    longitude=0.0
                )
                self.add_airport(airport)

    def load_routes(self, filepath: str):
        with open(filepath, 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            for row in reader:
                from_code = row['origem']
                to_code = row['destino']
                distance = float(row['peso'])
                self.add_route(from_code, to_code, distance)

    def get_neighbors(self, node: str) -> List[Tuple[str, float]]:
        return self.adjacency_list.get(node, [])

    def get_airport(self, code: str) -> Optional[Airport]:
        return self.airports.get(code)