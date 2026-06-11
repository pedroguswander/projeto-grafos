<div align="center">

<!-- BANNER ANIMADO -->
<img src="https://capsule-render.vercel.app/api?type=waving&color=0:0a0f1e,50:0d2137,100:1a4a7a&height=200&section=header&text=Projeto%20Grafos&fontSize=52&fontColor=ffffff&fontAlignY=38&desc=Malha%20Area%20BR%20%E2%9C%88%EF%B8%8F%20%7C%20Rede%20Martima%20Global%20%F0%9F%9A%A2&descAlignY=60&descSize=18&animation=fadeIn" />

<!-- BADGES -->
<p>
<img src="https://img.shields.io/badge/Python-3.12-3776AB?style=for-the-badge&logo=python&logoColor=white"/>
<img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black"/>
<img src="https://img.shields.io/badge/Flask-3.0-000000?style=for-the-badge&logo=flask&logoColor=white"/>
<img src="https://img.shields.io/badge/Vite-6-646CFF?style=for-the-badge&logo=vite&logoColor=white"/>
<img src="https://img.shields.io/badge/Docker-ready-2496ED?style=for-the-badge&logo=docker&logoColor=white"/>
</p>

<p>
<img src="https://img.shields.io/badge/Dijkstra-%E2%9C%94-success?style=flat-square"/>
<img src="https://img.shields.io/badge/Bellman--Ford-%E2%9C%94-success?style=flat-square"/>
<img src="https://img.shields.io/badge/BFS-%E2%9C%94-success?style=flat-square"/>
<img src="https://img.shields.io/badge/DFS-%E2%9C%94-success?style=flat-square"/>
</p>

> **Disciplina:** Teoria dos Grafos &nbsp;|&nbsp; **Equipe:** Carlos Eduardo Mateus Ribeiro Pedro Gusmo Caio Ferreira |&nbsp; **Orientadora:** Laura

</div>

---

## Sumrio

- [ Viso Geral](#-viso-geral)
- [ Arquitetura](#-arquitetura)
- [ Parte 1 ETA Airlines](#-parte-1--eta-airlines-malha-area-brasileira)
- [ Parte 2 ETN / Rede Martima Global](#-parte-2--etn--rede-martima-global)
- [ Algoritmos Implementados](#-algoritmos-implementados)
- [ Interface e Visualizaes](#-interface-e-visualizaes)
- [ Como Executar](#-como-executar)
- [ Docker](#-docker)
- [ Testes](#-testes)
- [ Tecnologias](#-tecnologias)

---

## Viso Geral

Uma aplicao completa para **visualizao, anlise e comparao de algoritmos de caminhos** em dois domnios distintos:

<div align="center">

| | Parte 1 ETA Airlines | Parte 2 ETN / LINERLIB |
|:---:|:---:|:---:|
| **Domnio** | Malha area domstica brasileira | Rotas martimas globais |
| **Tipo de grafo** | No-direcionado, ponderado | Dgrafo simples ponderado |
| **Ns (V)** | 20 aeroportos brasileiros | 47 portos martimos |
| **Arestas (E)** | 50 conexes | 1.764 rotas dirigidas |
| **Densidade** | 0,263 (26,3%) | 0,816 (81,6%) |
| **Pesos negativos** | No | Sim |
| **Ciclos negativos** | No | Sim (262 ciclos) |
| **Algoritmos** | Dijkstra | BFS, DFS, Dijkstra, Bellman-Ford |

</div>

---

## Arquitetura

```
projeto-grafos/
data/
ETN/ # Dados da Parte 2 (LINERLIB)
arestas.csv # 1.764 rotas martimas com pesos econmicos
vertices.csv # 47 portos (UNLocode)
dist_dense.csv # Distncias em milhas nuticas
fleet_data.csv # Dados de frota (coeficiente 25,46 USD/nm)
Demand_WorldSmall.csv # Demanda semanal e receita por continer
ports.csv # Custos porturios
adjacencias_aeroportos.csv # Arestas da Parte 1
aeroportos_data.csv # Dados dos 20 aeroportos (cdigo IATA)
ego_aeroportos.csv # Mtricas de ego-rede
rotas_possiveis.csv # Pares origem-destino
rotas.csv # Resultado das rotas calculadas
frontend/ # Frontend React (Vite)
src/
App.jsx # Componente raiz Malha Area BR
PainelRotasETN.jsx # Painel de rotas ETN
Dashboard/ # Dashboards analticos
...
src/ # Backend Python
api.py # API REST Flask
cli.py # Interface de linha de comando
solve.py # Implementaes dos algoritmos
viz.py # Gerao de visualizaes
parte2/ # Mdulo da Parte 2 (ETN)
tests/ # Testes automatizados (pytest)
out/ # Sadas geradas
Dockerfile.backend
Dockerfile.frontend
docker-compose.yml
requirements.txt
```

---

## Parte 1 ETA Airlines (Malha Area Brasileira)

### Descrio do Grafo

Grafo **no-direcionado e ponderado** representando a malha area domstica brasileira. Cada n um aeroporto (cdigo IATA) e cada aresta uma conexo direta entre dois aeroportos, cobrindo as cinco regies do pas.

<div align="center">

| Mtrica | Valor |
|:---|:---:|
| Ordem (V) | 20 aeroportos |
| Tamanho (E) | 50 conexes |
| Densidade global | 0,263 (26,3%) |
| Grau mdio | 5,0 conexes/aeroporto |
| Peso mdio das arestas | 19,4 (faixa: 1225) |
| Aeroporto mais conectado | **BSB Braslia** (grau 12) |

</div>

### Aeroportos Includos

| Regio | Aeroportos |
|:---|:---|
| **Norte** | MAO (Manaus), BEL (Belm), PVH (Porto Velho), RBR (Rio Branco) |
| **Nordeste** | REC (Recife), FOR (Fortaleza), SSA (Salvador), NAT (Natal), JPA (Joo Pessoa), THE (Teresina) |
| **Sudeste** | GRU (So Paulo/Guarulhos), CGH (Congonhas), GIG (Rio de Janeiro), CNF (Belo Horizonte), VIX (Vitria) |
| **Sul** | POA (Porto Alegre), FLN (Florianpolis), CWB (Curitiba) |
| **Centro-Oeste** | BSB (Braslia), GYN (Goinia) |

### Regra de Pesos Modelo Hbrido

Os pesos foram definidos por um modelo que combina **6 critrios**, calibrados para diferenciar conexes regionais simples de eixos estruturais nacionais:

| Critrio | Peso | Justificativa |
|:---|:---:|:---|
| Relevncia econmica/poltica | **6** | Concentrao de negcios, gesto pblica e articulao institucional |
| Capacidade da ligao | **5** | Robustez operacional e potencial de articulao da rede |
| Tempo mdio de voo | **5** | Diferencia rotas curtas regionais de eixos transcontinentais |
| Proximidade regional | **3** | Valoriza coeso interna sem sobrepor os eixos nacionais |
| Densidade populacional | **2** | Cidades densas geram demanda, mas no determinam sozinhas a importncia |
| Relevncia turstica | **2** | Ajuste para capitais como REC, NAT, SSA e FLN |

> As arestas inter-regionais so em mdia **23% mais pesadas** que as intra-regionais (21,3 vs 17,3). Das 11 arestas com peso 22, **9 (82%) tocam BSB ou GRU**.

<details>
<summary> Ver top 5 arestas mais pesadas e mais leves</summary>

** Cinco arestas mais pesadas:**

| Aresta | Regies | Peso |
|:---|:---|:---:|
| MAO GRU | Norte Sudeste | **25** |
| BSB GRU | Centro-Oeste Sudeste | **24** |
| BSB MAO | Centro-Oeste Norte | **24** |
| BEL GRU | Norte Sudeste | **24** |
| RBR BSB | Norte Centro-Oeste | **24** |

** Cinco arestas mais leves:**

| Aresta | Regies | Peso |
|:---|:---|:---:|
| NAT JPA | intra-Nordeste | **12** |
| REC JPA | intra-Nordeste | **13** |
| BSB GYN | intra-Centro-Oeste | **14** |
| REC NAT | intra-Nordeste | **15** |
| FOR NAT | intra-Nordeste | **15** |

</details>

### Mtricas de Centralidade

<div align="center">

| Posio | Grau | Intermediao | Proximidade | Autovetor |
|:---:|:---|:---|:---|:---|
| | BSB (12) | BSB (0,372) | BSB (0,704) | BSB (0,407) |
| | GRU (10) | GRU (0,228) | GRU (0,679) | GRU (0,371) |
| | REC (8) | CNF (0,085) | CNF (0,613) | REC (0,302) |
| 4 | GIG (7) | REC (0,082) | REC (0,576) | CNF (0,298) |
| 5 | CNF (7) | GIG (0,081) | FOR (0,576) | FOR (0,290) |

</div>

### Padres Identificados

> **Hub-and-spoke parcial:** rede concentrada em BSB, GRU e REC, com um anel mdio (CNF, GIG, FOR, SSA, BEL, VIX) e folhas de baixo grau.

> **Dependncia de Braslia:** a centralidade de intermediao de BSB (0,37) **63% superior** de GRU (0,23). A remoo hipottica de BSB desconectaria diversas rotas mnimas.

> **Integrao assimtrica:** Sul e Centro-Oeste tm 100% de conectividade interna. Nordeste, apesar de ter mais aeroportos, tem a menor densidade interna (53%). **No existem conexes diretas NorteNordeste, NorteSul nem SulNordeste**.

### Exemplos de Caminhos (Dijkstra)

| Rota | Percurso | Custo |
|:---|:---|:---:|
| REC POA | Recife Vitria Florianpolis Porto Alegre | 55 |
| MAO GRU | Manaus So Paulo | 25 |
| JPA POA | Joo Pessoa Braslia Belo Horizonte Porto Alegre | 60 |

---

## Parte 2 ETN / Rede Martima Global

### Dataset LINERLIB

> Benchmark acadmico desenvolvido pela **Technical University of Denmark (DTU)**, construdo a partir de dados reais da **Maersk Line** (maior operadora de contineres do mundo), criado para resolver o **Liner Shipping Network Design Problem (LSNDP)**.
>
> [Paper original do LSNDP](https://backend.orbit.dtu.dk/ws/portalfiles/portal/5578448/rapport_19_2010.pdf) [Repositrio LINERLIB](https://github.com/blof/LINERLIB)

### Modelagem do Grafo

<div align="center">

| Mtrica | Valor |
|:---|:---:|
| Ordem (V) | 47 portos |
| Tamanho (E) | 1.764 rotas dirigidas |
| Densidade | 0,816 (81,6%) |
| Tipo | Dgrafo simples ponderado |
| Conexo | Sim |
| Pesos negativos | Sim (379 rotas lucrativas) |
| Ciclos negativos | Sim (262 ciclos de 2 ns) |
| Grau mdio | 37,5 arestas/porto |

</div>

** Portos de destaque:**

| Critrio | Porto | Grau | Entrada | Sada |
|:---|:---|:---:|:---:|:---:|
| Maior grau | AEJEA Jebel Ali (Dubai) | 89 | 45 | 44 |
| Mediana | CNYTN Shenzhen (China) | 79 | 37 | 42 |
| Menor grau | CAMTR Montreal (Canad) | 31 | 12 | 19 |

### Regra de Pesos Econmicos

O peso de cada aresta representa o **resultado econmico lquido** da operao de uma rota:

```
w(u, v) = distncia 25,46
+ PortCallCostFixed[destino]
+ CostPerFULL[destino] FFEPerWeek
Revenue_1 FFEPerWeek
```

<details>
<summary> Ver derivao do coeficiente 25,46 USD/nm</summary>

```
TC por nm = TC rate dirio (designSpeed 24)
Panamax_1200: 11.000 (18 24) = 11.000 432 = 25,46 USD/nm
```

A classe **Panamax_1200** foi escolhida por ser a mais equilibrada entre as 6 classes do dataset, minimizando subestimaes ou superestimaes de rota.

</details>

| Peso | Interpretao | Quantidade |
|:---|:---|:---:|
| **Negativo** | Rota lucrativa (receita > custo) | 379 (21,4%) |
| **Positivo** | Rota deficitria (custo > receita) | 1.385 (78,5%) |

**Exemplo de ciclo negativo:**
```
HKHKG ZADUR: -661.649 USD
ZADUR HKHKG: -60.682 USD

Total do ciclo: -722.331 USD
```

### Insights da Anlise Comparativa de Algoritmos

<details>
<summary> Ver todos os insights (14 no total)</summary>

| # | Insight |
|:---:|:---|
| 1 | **DFS surpreendentemente mais lento que Bellman-Ford** O DFS tem complexidade O(V+E), mas registrar em strings todas as arestas classificadas gera overhead. |
| 2 | **Dijkstra mais rpido que o usual** Aplicado ao *Single Pair Shortest Path*, o Dijkstra faz `break` ao encontrar o destino. |
| 3 | **BFS mais rpido que Dijkstra** BFS ignora pesos com O(V+E); Dijkstra gasta tempo em comparaes de peso O((V+E) log V). |
| 4 | **Indiferena entre casos de teste (BFS/DFS)** O grafo fortemente conexo com grau mdio 37,5; trocar a fonte no gera diferena significativa. |
| 5 | **Gap DFS BFS** DFS armazena todos os vizinhos no stack (inclusive j visitados); BFS enfileira cada n exatamente uma vez. |
| 6 | **Largura Profundidade importa mais que densidade** BFS encontra ns prximos na 1 camada; DFS gera gargalo ao mergulhar em profundidade. |
| 9 | **Desistncia rpida = caso mais rpido no Dijkstra** O par (LKCMB, MYTPP) envolve pesos negativos; Dijkstra retorna null imediatamente. |
| 12 | **Bellman-Ford com ciclos negativos** Heurstica de remoo das arestas mais negativas de todos os ciclos antes de rodar o algoritmo. |
| 13 | **Bellman-Ford s com pesos positivos** Caso mais rpido: considera apenas arestas com w > 0, reduzindo drasticamente os relaxamentos. |
| 14 | **Bellman-Ford com ciclo negativo** Caso mais lento: executa as 46 iteraes completas (V1), processa 1.764 relaxamentos e s detecta o ciclo na passada final. |

</details>

---

## Algoritmos Implementados

> **Todos os algoritmos foram implementados do zero, sem bibliotecas externas de grafos.**

| Algoritmo | Arquivo | Complexidade | Aplicao |
|:---|:---|:---:|:---|
| **Dijkstra** | `src/graphs/solve.py` | O((V+E) log V) | Caminhos mnimos com pesos 0 |
| **Bellman-Ford** | `src/graphs/solve.py` | O(VE) | Caminhos com pesos negativos; deteco de ciclos |
| **BFS** | `src/graphs/solve.py` | O(V+E) | Travessia por nveis; caminhos sem peso |
| **DFS** | `src/graphs/solve.py` | O(V+E) | Travessia profunda; classificao de arestas |

### Sadas Geradas

```
out/
global.json ordem, tamanho e densidade do grafo
regioes.json mtricas por regio (Parte 1)
ego_aeroportos.csv grau, ordem, tamanho e densidade do ego-grafo
graus.csv ranking de graus
distancias_rotas.csv origem, destino, custo e caminho (Dijkstra)
arvore_percurso.html subgrafo do caminho mnimo (interativo)
grafo_interativo.html grafo completo com tooltip e busca
parte2_report.json mtricas de desempenho por algoritmo (Parte 2)
```

---

## Interface e Visualizaes

### Backend API Flask

| Mtodo | Endpoint | Payload | Retorno |
|:---:|:---|:---|:---|
| `GET` | `/api/graph-data` | | `{ nodes, edges }` |
| `POST` | `/api/dijkstra` | `{ start, end }` | `{ success, path, cost, connections, path_info }` |

### Frontend React

A interface foi construda em **React 19 + Vite** com identidade visual ETA Airlines e inclui:

| Componente | Descrio |
|:---|:---|
| Home ETA / ETN | Pginas iniciais de cada parte |
| Malha Area Interativa | Grafo renderizado com Vis.js Network |
| Dijkstra Pathfinder | Executa o algoritmo e destaca a rota em dourado no canvas |
| Boarding Pass | Resultado em formato de carto de embarque com waypoints |
| Database ETA / ETN | Tabelas interativas dos dados de cada grafo |
| Mtricas Globais | Dashboard com mtricas calculadas |
| Regras ETA / ETN | Documentao dos critrios de peso |
| Relatrio ETN | Comparativo de algoritmos com grficos de desempenho |
| Painel de Rotas ETN | Visualizao das rotas martimas globais |
| Jogos Interativos | Airport Game e Container Game |

** Sistema de cores do grafo:**

| Tipo de n | Cor | Borda | Tamanho |
|:---|:---:|:---:|:---:|
| Origem | `#002244` navy | cyan | 22 |
| Destino | `#281500` laranja | `#F5A623` dourado | 22 |
| Escala | `#0A2010` verde | `#00E5A0` | 18 |
| Aresta na rota | | `#F5A623` | largura 3 |
| Aresta fora | | cyan 15% | largura 1 |

---

## Como Executar

### 1 Configurar o ambiente

```bash
python -m venv venv
.\venv\Scripts\Activate # Windows
source venv/bin/activate # Linux/macOS
pip install -r requirements.txt
```

### 2 Executar o Backend

```bash
cd src
python api.py
# API disponvel em: http://localhost:5000
```

### 3 Executar o Frontend

```bash
cd frontend
npm install
npm run dev
# Interface disponvel em: http://localhost:5173
```

### 4 Executar via CLI

```bash
# Parte 1 ETA Airlines
python -m src.cli --dataset ./data/aeroportos_data.csv --alg BFS --source REC --out ./out/
python -m src.cli --dataset ./data/aeroportos_data.csv --alg DIJKSTRA --source REC --target POA --out ./out/

# Parte 2 ETN / LINERLIB
python -m src.cli --dataset ./data/ETN/ --alg DIJKSTRA --source AEJEA --target CAMTR --out ./out/
python -m src.cli --dataset ./data/ETN/ --alg BELLMAN_FORD --source AEJEA --target CAMTR --out ./out/
```

---

## Docker

A forma mais simples de subir o projeto inteiro sem configurar ambiente:

```bash
docker-compose up --build
```

| Servio | URL |
|:---|:---|
| Frontend | http://localhost |
| Backend API | http://localhost:5000 |

> O Nginx faz proxy automtico das chamadas `/api/*` para o backend, sem necessidade de configurao adicional.

---

## Testes

```bash
# Rodar todos os testes
.\venv\Scripts\python.exe -m pytest tests/ -v

# Rodar um arquivo especfico
.\venv\Scripts\python.exe -m pytest tests/test_dijkstra.py -v
```

| Arquivo | Algoritmo | O que testa |
|:---|:---|:---|
| `test_dijkstra.py` | Dijkstra | Caminhos corretos com pesos 0; rejeio de pesos negativos |
| `test_bellman_ford.py` | Bellman-Ford | Pesos negativos sem ciclo; deteco de ciclo negativo |
| `test_bfs.py` | BFS | Nveis corretos em grafo pequeno |
| `test_dfs.py` | DFS | Deteco de ciclo; classificao de arestas (tree, back, forward, cross) |
| `test_part2_report.py` | Relatrio Parte 2 | Validao das mtricas de desempenho |

---

## Tecnologias

<div align="center">

![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-000000?style=for-the-badge&logo=flask&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)
![Docker](https://img.shields.io/badge/Docker-2CA5E0?style=for-the-badge&logo=docker&logoColor=white)
![Nginx](https://img.shields.io/badge/Nginx-009639?style=for-the-badge&logo=nginx&logoColor=white)
![Pytest](https://img.shields.io/badge/Pytest-0A9EDC?style=for-the-badge&logo=pytest&logoColor=white)

</div>

| Camada | Tecnologia |
|:---|:---|
| **Backend** | Python 3.12 Flask 3.0 Flask-CORS |
| **Frontend** | React 19 Vite 6 Vis.js Network Axios Recharts |
| **Visualizao** | Vis Network react-force-graph-3d react-globe.gl Matplotlib |
| **Testes** | pytest |
| **Infra** | Docker Docker Compose Nginx |
| **Dados Parte 1** | CSV customizado com critrios definidos pelo grupo |
| **Dados Parte 2** | LINERLIB benchmark acadmico baseado em dados reais da Maersk Line |
