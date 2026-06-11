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

>**Disciplina:**Teoria dos Grafos &nbsp;|&nbsp;**Equipe:**Carlos Eduardo · Mateus · Ribeiro · Pedro Gusmão · Caio Ferreira &nbsp;|&nbsp;**Orientadora:**Laura

</div>

---

## Sumário

- [Visão Geral](#-visão-geral)
- [Arquitetura](#-arquitetura)
- [Parte 1 — ETA Airlines](#-parte-1--eta-airlines-malha-aérea-brasileira)
- [Parte 2 — ETN / Rede Marítima Global](#-parte-2--etn--rede-marítima-global)
- [Algoritmos Implementados](#-algoritmos-implementados)
- [Interface e Visualizações](#-interface-e-visualizações)
- [Como Executar](#-como-executar)
- [Docker](#-docker)
- [Testes](#-testes)
- [Tecnologias](#-tecnologias)

---

## Visão Geral

Uma aplicação completa para**visualização, análise e comparação de algoritmos de caminhos**em dois domínios distintos:

<div align="center">

| | Parte 1 — ETA Airlines | Parte 2 — ETN / LINERLIB |
|:---:|:---:|:---:|
|**Domínio**| Malha aérea doméstica brasileira | Rotas marítimas globais |
|**Tipo de grafo**| Não-direcionado, ponderado | Dígrafo simples ponderado |
|**Nós (V)**| 20 aeroportos brasileiros | 47 portos marítimos |
|**Arestas (E)**| 50 conexões | 1.764 rotas dirigidas |
|**Densidade**| 0,263 (26,3%) | 0,816 (81,6%) |
|**Pesos negativos**| Não | Sim |
|**Ciclos negativos**| Não | Sim (262 ciclos) |
|**Algoritmos**| Dijkstra | BFS, DFS, Dijkstra, Bellman-Ford |

</div>

---

## Arquitetura

```
projeto-grafos/
 data/
 ETN/ # Dados da Parte 2 (LINERLIB)
 arestas.csv # 1.764 rotas marítimas com pesos econômicos
 vertices.csv # 47 portos (UNLocode)
 dist_dense.csv # Distâncias em milhas náuticas
 fleet_data.csv # Dados de frota (coeficiente 25,46 USD/nm)
 Demand_WorldSmall.csv # Demanda semanal e receita por contêiner
 ports.csv # Custos portuários
 adjacencias_aeroportos.csv # Arestas da Parte 1
 aeroportos_data.csv # Dados dos 20 aeroportos (código IATA)
 ego_aeroportos.csv # Métricas de ego-rede
 rotas_possiveis.csv # Pares origem-destino
 rotas.csv # Resultado das rotas calculadas
 frontend/ # Frontend React (Vite)
 src/
 App.jsx # Componente raiz — Malha Aérea BR
 PainelRotasETN.jsx # Painel de rotas ETN
 utils/
 apiFetch.js # Fetch com fallback automático (Docker ↔ localhost)
 Dashboard/ # Dashboards analíticos
 src/ # Backend Python
 api.py # API REST Flask
 cli.py # Interface de linha de comando
 solve.py # Implementações dos algoritmos
 viz.py # Geração de visualizações
 parte2/ # Módulo da Parte 2 (ETN)
 tests/ # Testes automatizados (pytest)
 out/ # Saídas geradas
 Dockerfile.backend
 Dockerfile.frontend
 docker-compose.yml
 requirements.txt
```

---

## Parte 1 — ETA Airlines (Malha Aérea Brasileira)

### Descrição do Grafo

Grafo**não-direcionado e ponderado**representando a malha aérea doméstica brasileira. Cada nó é um aeroporto (código IATA) e cada aresta é uma conexão direta entre dois aeroportos, cobrindo as cinco regiões do país.

<div align="center">

| Métrica | Valor |
|:---|:---:|
| Ordem (V) | 20 aeroportos |
| Tamanho (E) | 50 conexões |
| Densidade global | 0,263 (26,3%) |
| Grau médio | 5,0 conexões/aeroporto |
| Peso médio das arestas | 19,4 (faixa: 12–25) |
| Aeroporto mais conectado |**BSB — Brasília**(grau 12) |

</div>

### Aeroportos Incluídos

| Região | Aeroportos |
|:---|:---|
|**Norte**| MAO (Manaus), BEL (Belém), PVH (Porto Velho), RBR (Rio Branco) |
|**Nordeste**| REC (Recife), FOR (Fortaleza), SSA (Salvador), NAT (Natal), JPA (João Pessoa), THE (Teresina) |
|**Sudeste**| GRU (São Paulo/Guarulhos), CGH (Congonhas), GIG (Rio de Janeiro), CNF (Belo Horizonte), VIX (Vitória) |
|**Sul**| POA (Porto Alegre), FLN (Florianópolis), CWB (Curitiba) |
|**Centro-Oeste**| BSB (Brasília), GYN (Goiânia) |

### Regra de Pesos — Modelo Híbrido

Os pesos foram definidos por um modelo que combina**6 critérios**, calibrados para diferenciar conexões regionais simples de eixos estruturais nacionais:

| Critério | Peso | Justificativa |
|:---|:---:|:---|
| Relevância econômica/política |**6**| Concentração de negócios, gestão pública e articulação institucional |
| Capacidade da ligação |**5**| Robustez operacional e potencial de articulação da rede |
| Tempo médio de voo |**5**| Diferencia rotas curtas regionais de eixos transcontinentais |
| Proximidade regional |**3**| Valoriza coesão interna sem sobrepor os eixos nacionais |
| Densidade populacional |**2**| Cidades densas geram demanda, mas não determinam sozinhas a importância |
| Relevância turística |**2**| Ajuste para capitais como REC, NAT, SSA e FLN |

> As arestas inter-regionais são em média**23% mais pesadas**que as intra-regionais (21,3 vs 17,3). Das 11 arestas com peso 22,**9 (82%) tocam BSB ou GRU**.

<details>
<summary>Ver top 5 arestas mais pesadas e mais leves</summary>

**Cinco arestas mais pesadas:**

| Aresta | Regiões | Peso |
|:---|:---|:---:|
| MAO → GRU | Norte → Sudeste |**25**|
| BSB → GRU | Centro-Oeste → Sudeste |**24**|
| BSB → MAO | Centro-Oeste → Norte |**24**|
| BEL → GRU | Norte → Sudeste |**24**|
| RBR → BSB | Norte → Centro-Oeste |**24**|

**Cinco arestas mais leves:**

| Aresta | Regiões | Peso |
|:---|:---|:---:|
| NAT → JPA | intra-Nordeste |**12**|
| REC → JPA | intra-Nordeste |**13**|
| BSB → GYN | intra-Centro-Oeste |**14**|
| REC → NAT | intra-Nordeste |**15**|
| FOR → NAT | intra-Nordeste |**15**|

</details>

### Métricas de Centralidade

<div align="center">

| Posição | Grau | Intermediação | Proximidade | Autovetor |
|:---:|:---|:---|:---|:---|
| 1 | BSB (12) | BSB (0,372) | BSB (0,704) | BSB (0,407) |
| 2 | GRU (10) | GRU (0,228) | GRU (0,679) | GRU (0,371) |
| 3 | REC (8) | CNF (0,085) | CNF (0,613) | REC (0,302) |
| 4 | GIG (7) | REC (0,082) | REC (0,576) | CNF (0,298) |
| 5 | CNF (7) | GIG (0,081) | FOR (0,576) | FOR (0,290) |

</div>

### Padrões Identificados

>**Hub-and-spoke parcial:**rede concentrada em BSB, GRU e REC, com um anel médio (CNF, GIG, FOR, SSA, BEL, VIX) e folhas de baixo grau.

>**Dependência de Brasília:**a centralidade de intermediação de BSB (0,37) é**63% superior**à de GRU (0,23). A remoção hipotética de BSB desconectaria diversas rotas mínimas.

>**Integração assimétrica:**Sul e Centro-Oeste têm 100% de conectividade interna. Nordeste, apesar de ter mais aeroportos, tem a menor densidade interna (53%).**Não existem conexões diretas Norte–Nordeste, Norte–Sul nem Sul–Nordeste**.

### Exemplos de Caminhos (Dijkstra)

| Rota | Percurso | Custo |
|:---|:---|:---:|
| REC → POA | Recife → Vitória → Florianópolis → Porto Alegre | 55 |
| MAO → GRU | Manaus → São Paulo | 25 |
| JPA → POA | João Pessoa → Brasília → Belo Horizonte → Porto Alegre | 60 |

---

## Parte 2 — ETN / Rede Marítima Global

### Dataset LINERLIB

> Benchmark acadêmico desenvolvido pela**Technical University of Denmark (DTU)**, construído a partir de dados reais da**Maersk Line**(maior operadora de contêineres do mundo), criado para resolver o**Liner Shipping Network Design Problem (LSNDP)**.
>
> [ Paper original do LSNDP](https://backend.orbit.dtu.dk/ws/portalfiles/portal/5578448/rapport_19_2010.pdf) · [ Repositório LINERLIB](https://github.com/blof/LINERLIB)

### Modelagem do Grafo

<div align="center">

| Métrica | Valor |
|:---|:---:|
| Ordem (V) | 47 portos |
| Tamanho (E) | 1.764 rotas dirigidas |
| Densidade | 0,816 (81,6%) |
| Tipo | Dígrafo simples ponderado |
| Conexo | Sim |
| Pesos negativos | Sim (379 rotas lucrativas) |
| Ciclos negativos | Sim (262 ciclos de 2 nós) |
| Grau médio | 37,5 arestas/porto |

</div>

**Portos de destaque:**

| Critério | Porto | Grau | Entrada | Saída |
|:---|:---|:---:|:---:|:---:|
| Maior grau | AEJEA — Jebel Ali (Dubai) | 89 | 45 | 44 |
| Mediana | CNYTN — Shenzhen (China) | 79 | 37 | 42 |
| Menor grau | CAMTR — Montreal (Canadá) | 31 | 12 | 19 |

### Regra de Pesos Econômicos

O peso de cada aresta representa o**resultado econômico líquido**da operação de uma rota:

```
w(u, v) = distância × 25,46
 + PortCallCostFixed[destino]
 + CostPerFULL[destino] × FFEPerWeek
 − Revenue_1 × FFEPerWeek
```

<details>
<summary>Ver derivação do coeficiente 25,46 USD/nm</summary>

```
TC por nm = TC rate diário ÷ (designSpeed × 24)
Panamax_1200: 11.000 ÷ (18 × 24) = 11.000 ÷ 432 = 25,46 USD/nm
```

A classe**Panamax_1200**foi escolhida por ser a mais equilibrada entre as 6 classes do dataset, minimizando subestimações ou superestimações de rota.

</details>

| Peso | Interpretação | Quantidade |
|:---|:---|:---:|
|**Negativo**| Rota lucrativa (receita > custo) | 379 (21,4%) |
|**Positivo**| Rota deficitária (custo > receita) | 1.385 (78,5%) |

**Exemplo de ciclo negativo:**
```
HKHKG → ZADUR: −661.649 USD
ZADUR → HKHKG: −60.682 USD

Total do ciclo: −722.331 USD
```

### Insights da Análise Comparativa de Algoritmos

<details>
<summary>Ver todos os insights (14 no total)</summary>

| # | Insight |
|:---:|:---|
| 1 |**DFS surpreendentemente mais lento que Bellman-Ford**— O DFS tem complexidade O(V+E), mas registrar em strings todas as arestas classificadas gera overhead. |
| 2 |**Dijkstra mais rápido que o usual**— Aplicado ao *Single Pair Shortest Path*, o Dijkstra faz `break` ao encontrar o destino. |
| 3 |**BFS mais rápido que Dijkstra**— BFS ignora pesos com O(V+E); Dijkstra gasta tempo em comparações de peso O((V+E) log V). |
| 4 |**Indiferença entre casos de teste (BFS/DFS)**— O grafo é fortemente conexo com grau médio 37,5; trocar a fonte não gera diferença significativa. |
| 5 |**Gap DFS → BFS**— DFS armazena todos os vizinhos no stack (inclusive já visitados); BFS enfileira cada nó exatamente uma vez. |
| 6 |**Largura > Profundidade importa mais que densidade**— BFS encontra nós próximos na 1ª camada; DFS gera gargalo ao mergulhar em profundidade. |
| 9 |**Desistência rápida = caso mais rápido no Dijkstra**— O par (LKCMB, MYTPP) envolve pesos negativos; Dijkstra retorna null imediatamente. |
| 12 |**Bellman-Ford com ciclos negativos**— Heurística de remoção das arestas mais negativas de todos os ciclos antes de rodar o algoritmo. |
| 13 |**Bellman-Ford só com pesos positivos**— Caso mais rápido: considera apenas arestas com w > 0, reduzindo drasticamente os relaxamentos. |
| 14 |**Bellman-Ford com ciclo negativo**— Caso mais lento: executa as 46 iterações completas (V−1), processa 1.764 relaxamentos e só detecta o ciclo na passada final. |

</details>

---

## Algoritmos Implementados

>**Todos os algoritmos foram implementados do zero, sem bibliotecas externas de grafos.**

| Algoritmo | Arquivo | Complexidade | Aplicação |
|:---|:---|:---:|:---|
|**Dijkstra**| `src/graphs/solve.py` | O((V+E) log V) | Caminhos mínimos com pesos ≥ 0 |
|**Bellman-Ford**| `src/graphs/solve.py` | O(V·E) | Caminhos com pesos negativos; detecção de ciclos |
|**BFS**| `src/graphs/solve.py` | O(V+E) | Travessia por níveis; caminhos sem peso |
|**DFS**| `src/graphs/solve.py` | O(V+E) | Travessia profunda; classificação de arestas |

### Saídas Geradas

```
out/
 global.json → ordem, tamanho e densidade do grafo
 regioes.json → métricas por região (Parte 1)
 ego_aeroportos.csv → grau, ordem, tamanho e densidade do ego-grafo
 graus.csv → ranking de graus
 distancias_rotas.csv → origem, destino, custo e caminho (Dijkstra)
 arvore_percurso.html → subgrafo do caminho mínimo (interativo)
 grafo_interativo.html → grafo completo com tooltip e busca
 parte2_report.json → métricas de desempenho por algoritmo (Parte 2)
```

---

## Interface e Visualizações

### Backend API Flask

| Método | Endpoint | Payload | Retorno |
|:---:|:---|:---|:---|
| `GET` | `/api/graph-data` | — | `{ nodes, edges }` |
| `POST` | `/api/dijkstra` | `{ start, end }` | `{ success, path, cost, connections, path_info }` |

### Frontend React

A interface foi construída em**React 19 + Vite**com identidade visual ETA Airlines e inclui:

| Componente | Descrição |
|:---|:---|
| Home ETA / ETN | Páginas iniciais de cada parte |
| Malha Aérea Interativa | Grafo renderizado com Vis.js Network |
| Dijkstra Pathfinder | Executa o algoritmo e destaca a rota em dourado no canvas |
| Boarding Pass | Resultado em formato de cartão de embarque com waypoints |
| Database ETA / ETN | Tabelas interativas dos dados de cada grafo |
| Métricas Globais | Dashboard com métricas calculadas |
| Regras ETA / ETN | Documentação dos critérios de peso |
| Relatório ETN | Comparativo de algoritmos com gráficos de desempenho |
| Painel de Rotas ETN | Visualização das rotas marítimas globais |
| Jogos Interativos | Airport Game e Container Game |

**Sistema de cores do grafo:**

| Tipo de nó | Cor | Borda | Tamanho |
|:---|:---:|:---:|:---:|
| Origem | `#002244` navy | cyan | 22 |
| Destino | `#281500` laranja | `#F5A623` dourado | 22 |
| Escala | `#0A2010` verde | `#00E5A0` | 18 |
| Aresta na rota | — | `#F5A623` | largura 3 |
| Aresta fora | — | cyan 15% | largura 1 |

---

## Como Executar

### Opção A — Docker (recomendado)

A forma mais simples de subir o projeto inteiro sem configurar ambiente:

```bash
docker-compose up --build
```

| Serviço | URL |
|:---|:---|
| Frontend | http://localhost |
| Backend API | http://localhost:5000 |

> O Nginx faz proxy automático das chamadas `/api/*` para o backend, sem necessidade de configuração adicional.

---

### Opção B — Ambiente local (sem Docker)

> Use esta opção quando o Docker não estiver disponível. O frontend detecta automaticamente que não há proxy e conecta direto ao Flask na porta 5000.

#### 1 — Configurar o ambiente Python

```bash
python -m venv venv
.\venv\Scripts\Activate # Windows
source venv/bin/activate # Linux/macOS
pip install -r requirements.txt
```

#### 2 — Executar o Backend

```bash
cd src
python api.py
# API disponível em: http://localhost:5000
```

#### 3 — Executar o Frontend

```bash
cd frontend
npm install
npm run dev
# Interface disponível em: http://localhost:5173
```

>**Como funciona o fallback automático:**o utilitário `src/utils/apiFetch.js` tenta primeiro a URL relativa (via proxy do Docker/Nginx). Se receber uma página HTML em vez de JSON (sinal de que o proxy não está ativo), refaz a requisição direto para `http://localhost:5000`. Nenhuma configuração manual é necessária.

#### 4 — Executar via CLI (opcional)

```bash
# Parte 1 — ETA Airlines
python -m src.cli --dataset ./data/aeroportos_data.csv --alg BFS --source REC --out ./out/
python -m src.cli --dataset ./data/aeroportos_data.csv --alg DIJKSTRA --source REC --target POA --out ./out/

# Parte 2 — ETN / LINERLIB
python -m src.cli --dataset ./data/ETN/ --alg DIJKSTRA --source AEJEA --target CAMTR --out ./out/
python -m src.cli --dataset ./data/ETN/ --alg BELLMAN_FORD --source AEJEA --target CAMTR --out ./out/
```

---

## Testes

```bash
# Rodar todos os testes
.\venv\Scripts\python.exe -m pytest tests/ -v

# Rodar um arquivo específico
.\venv\Scripts\python.exe -m pytest tests/test_dijkstra.py -v
```

| Arquivo | Algoritmo | O que testa |
|:---|:---|:---|
| `test_dijkstra.py` | Dijkstra | Caminhos corretos com pesos ≥ 0; rejeição de pesos negativos |
| `test_bellman_ford.py` | Bellman-Ford | Pesos negativos sem ciclo; detecção de ciclo negativo |
| `test_bfs.py` | BFS | Níveis corretos em grafo pequeno |
| `test_dfs.py` | DFS | Detecção de ciclo; classificação de arestas (tree, back, forward, cross) |
| `test_part2_report.py` | Relatório Parte 2 | Validação das métricas de desempenho |

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
|**Backend**| Python 3.12 · Flask 3.0 · Flask-CORS |
|**Frontend**| React 19 · Vite 6 · Vis.js Network · Recharts |
|**Visualização**| Vis Network · react-force-graph-3d · react-globe.gl · Matplotlib |
|**Testes**| pytest |
|**Infra**| Docker · Docker Compose · Nginx |
|**Dados Parte 1**| CSV customizado com critérios definidos pelo grupo |
|**Dados Parte 2**| LINERLIB — benchmark acadêmico baseado em dados reais da Maersk Line |
