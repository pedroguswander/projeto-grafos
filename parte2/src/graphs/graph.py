import csv
from typing import Dict, List, Tuple, Optional


class Port:
    def __init__(self, code, name, country, region, longitude, latitude):
        self.code = code
        self.name = name
        self.country = country
        self.region = region
        self.longitude = longitude
        self.latitude = latitude

    def __repr__(self):
        return f"Port({self.code!r}, {self.name!r})"


class Graph:
    def __init__(self):
        self.ports: Dict[str, Port] = {}
        self.adjacency_list: Dict[str, List[Tuple[str, float]]] = {}

    def add_port(self, port: Port):
        self.ports[port.code] = port
        if port.code not in self.adjacency_list:
            self.adjacency_list[port.code] = []

    def add_route(self, from_code: str, to_code: str, distance: float):
        if from_code not in self.adjacency_list:
            self.adjacency_list[from_code] = []
        if to_code not in self.adjacency_list:
            self.adjacency_list[to_code] = []
        self.adjacency_list[from_code].append((to_code, distance))

    def load_ports(self, filepath: str):
        with open(filepath, encoding="utf-8") as f:
            reader = csv.DictReader(f, delimiter=",")
            for row in reader:
                port = Port(
                    code=row["UNLocode"],
                    name=row["name"],
                    country=row["Country"],
                    region=row["D_Region"],
                    longitude=float(row["Longitude"]) if row["Longitude"].strip() else 0.0,
                    latitude=float(row["Latitude"]) if row["Latitude"].strip() else 0.0,
                )
                self.add_port(port)

    def load_routes(self, filepath: str):
        with open(filepath, encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                self.add_route(row["origem"], row["destino"], float(row["peso"]))

    def get_neighbors(self, node: str) -> List[Tuple[str, float]]:
        return self.adjacency_list.get(node, [])

    def get_port(self, code: str) -> Optional[Port]:
        return self.ports.get(code)
