# Projeto Grafos — Malha Aérea BR & Rede Marítima Global

> **Disciplina:** Teoria dos Grafos  
> **Equipe:** Carlos Eduardo · Mateus Ribeiro · Pedro Gusmão · Caio Ferreira

Uma aplicação completa para visualização, análise e comparação de algoritmos de caminhos em dois domínios distintos: a malha aérea doméstica brasileira (**Parte 1 — ETA Airlines**) e a rede de rotas marítimas globais (**Parte 2 — ETN / LINERLIB**).

---

## Sumário

- [Visão Geral](#visão-geral)
- [Arquitetura](#arquitetura)
- [Parte 1 — ETA Airlines (Malha Aérea Brasileira)](#parte-1--eta-airlines-malha-aérea-brasileira)
- [Parte 2 — ETN / Rede Marítima Global](#parte-2--etn--rede-marítima-global)
- [Algoritmos Implementados](#algoritmos-implementados)
- [Interface e Visualizações](#interface-e-visualizações)
- [Como Executar](#como-executar)
- [Testes](#testes)
- [Tecnologias](#tecnologias)

---

## Visão Geral

O projeto é dividido em duas partes independentes, cada uma com seu próprio dataset, modelagem de grafo e conjunto de análises:

| | Parte 1 — ETA Airlines | Parte 2 — ETN / LINERLIB |
|---|---|---|
| **Domínio** | Malha aérea doméstica brasileira | Rotas marítimas globais |
| **Tipo de grafo** | Não-direcionado, ponderado | Dígrafo simples ponderado |
| **Nós (V)** | 20 aeroportos brasileiros | 47 portos marítimos |
| **Arestas (E)** | 50 conexões | 1.764 rotas dirigidas |
| **Densidade** | 0,263 (26,3%) | 0,816 (81,6%) |
| **Pesos negativos** | Não | Sim |
| **Ciclos negativos** | Não | Sim (262 ciclos) |
| **Algoritmos** | Dijkstra | BFS, DFS, Dijkstra, Bellman-Ford |

---

## Arquitetura

```
projeto-grafos/
├── data/
│   ├── ETN/                         # Dados da Parte 2 (LINERLIB)
│   │   ├── arestas.csv              # 1.764 rotas marítimas com pesos econômicos
│   │   ├── vertices.csv             # 47 portos (UNLocode)
│   │   ├── dist_dense.csv           # Distâncias em milhas náuticas
│   │   ├── fleet_data.csv           # Dados de frota (derivação do coeficiente 25,46 USD/nm)
│   │   ├── Demand_WorldSmall.csv    # Demanda semanal e receita por contêiner
│   │   └── ports..csv               # Custos portuários
│   ├── adjacencias_aeroportos.csv   # Arestas da Parte 1 (origem, destino, peso)
│   ├── aeroportos_data.csv          # Dados dos 20 aeroportos com código IATA
│   ├── ego_aeroportos.csv           # Métricas de ego-rede por aeroporto
│   ├── rotas_possiveis.csv          # Pares de origem-destino para cálculo de rotas
│   └── rotas.csv                    # Resultado das rotas calculadas
├── frontend/                        # Frontend React (Vite)
│   ├── components/
│   │   └── InsightPanel.jsx
│   ├── src/
│   │   ├── assets/
│   │   ├── css/
│   │   ├── Dashboard/
│   │   ├── hooks/
│   │   ├── AirportGame.jsx          # Jogo interativo de aeroportos
│   │   ├── AirportGameEngine.jsx
│   │   ├── AirportTooltip.jsx
│   │   ├── App.jsx                  # Componente raiz — Malha Aérea BR
│   │   ├── ContainerGame.jsx        # Jogo de contêineres (ETN)
│   │   ├── ContainerGameEngine.jsx
│   │   ├── DataBase.jsx             # Visualização da base de dados ETA
│   │   ├── DataBaseETN.jsx          # Visualização da base de dados ETN
│   │   ├── DeclaracaoIA.jsx
│   │   ├── GlobalMetrics.jsx        # Métricas globais do grafo ETA
│   │   ├── Home.jsx                 # Página inicial ETA
│   │   ├── HomeETN.jsx              # Página inicial ETN
│   │   ├── PainelRotasETN.jsx       # Painel de rotas ETN
│   │   ├── Regras.jsx               # Regras e pesos ETA
│   │   ├── RegrasETN.jsx            # Regras e pesos ETN
│   │   ├── RelatorioETN.jsx         # Relatório comparativo ETN
│   │   ├── Requisitos.jsx           # Requisitos do projeto
│   │   └── Splash.jsx               # Tela de splash
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── src/                             # Backend Python
│   └── graphs/
│       ├── api.py                   # API REST Flask
│       ├── cli.py                   # Interface de linha de comando
│       ├── solve.py                 # Implementações dos algoritmos
│       └── viz.py                   # Geração de visualizações
├── out/                             # Saídas geradas
│   ├── global.json
│   ├── regioes.json
│   ├── ego_aeroportos.csv
│   ├── graus.csv
│   ├── distancias_rotas.csv
│   ├── arvore_percurso.html
│   ├── grafo_interativo.html
│   └── parte2_report.json
├── parte2/                          # Módulo da Parte 2 (ETN)
├── tests/                           # Testes automatizados (pytest)
│   ├── test_dijkstra.py
│   ├── test_bellman_ford.py
│   ├── test_bfs.py
│   ├── test_dfs.py
│   └── test_part2_report.py
├── requirements.txt
├── build.cmd
└── build.ps1
```

---

## Parte 1 — ETA Airlines (Malha Aérea Brasileira)

### Descrição do Grafo

O grafo representa a malha aérea doméstica brasileira como uma **rede não-direcionada e ponderada**, em que cada nó é um aeroporto (identificado pelo código IATA) e cada aresta representa uma conexão direta entre dois aeroportos. O grafo cobre as cinco regiões do país, incluindo dois aeroportos de São Paulo (GRU e CGH).

| Métrica | Valor |
|---|---|
| Ordem (V) | 20 aeroportos |
| Tamanho (E) | 50 conexões |
| Densidade global | 0,263 (26,3%) |
| Grau médio | 5,0 conexões/aeroporto |
| Peso médio das arestas | 19,4 (faixa: 12–25) |
| Aeroporto mais conectado | BSB — Brasília (grau 12) |

### Aeroportos Incluídos

| Região | Aeroportos |
|---|---|
| **Norte** | MAO (Manaus), BEL (Belém), PVH (Porto Velho), RBR (Rio Branco) |
| **Nordeste** | REC (Recife), FOR (Fortaleza), SSA (Salvador), NAT (Natal), JPA (João Pessoa), THE (Teresina) |
| **Sudeste** | GRU (São Paulo/Guarulhos), CGH (São Paulo/Congonhas), GIG (Rio de Janeiro), CNF (Belo Horizonte), VIX (Vitória) |
| **Sul** | POA (Porto Alegre), FLN (Florianópolis), CWB (Curitiba) |
| **Centro-Oeste** | BSB (Brasília), GYN (Goiânia) |

### Regra de Pesos

Os pesos das arestas foram definidos por um **modelo híbrido** que combina seis critérios, calibrados para diferenciar conexões regionais simples de eixos estruturais nacionais:

| Critério | Peso | Justificativa |
|---|---|---|
| Relevância econômica/política | 6 | Fator mais estrutural: concentração de negócios, gestão pública e articulação institucional |
| Capacidade da ligação | 5 | Representa robustez operacional e potencial de articulação da rede |
| Tempo médio de voo | 5 | Diferencia rotas curtas regionais de eixos transcontinentais |
| Proximidade regional | 3 | Valoriza coesão interna sem sobrepor os eixos nacionais |
| Densidade populacional | 2 | Critério complementar; cidades densas geram demanda, mas não determinam sozinhas a importância da rota |
| Relevância turística | 2 | Módulo de ajuste para capitais como REC, NAT, SSA e FLN |

**Resultado:** as arestas inter-regionais são em média **23% mais pesadas** que as intra-regionais (21,3 vs 17,3). Das 11 arestas com peso ≥ 22, nove (82%) tocam BSB ou GRU. A correlação de Pearson entre o peso da aresta e a soma dos graus dos seus extremos é **r = 0,56**, indicando que o modelo de pesos é coerente com a topologia, mas não redutível a ela — os outros ~70% da variação vêm dos demais critérios.

**Cinco arestas mais pesadas:**

| Aresta | Regiões | Peso |
|---|---|---|
| MAO – GRU | Norte ↔ Sudeste | 25 |
| BSB – GRU | Centro-Oeste ↔ Sudeste | 24 |
| BSB – MAO | Centro-Oeste ↔ Norte | 24 |
| BEL – GRU | Norte ↔ Sudeste | 24 |
| RBR – BSB | Norte ↔ Centro-Oeste | 24 |

**Cinco arestas mais leves:**

| Aresta | Regiões | Peso |
|---|---|---|
| NAT – JPA | intra-Nordeste | 12 |
| REC – JPA | intra-Nordeste | 13 |
| BSB – GYN | intra-Centro-Oeste | 14 |
| REC – NAT | intra-Nordeste | 15 |
| FOR – NAT | intra-Nordeste | 15 |

### Métricas de Centralidade

Quatro métricas de centralidade convergem nos mesmos protagonistas, indicando que BSB, GRU e REC não são apenas bem conectados, mas também estão estrategicamente posicionados como pontes e vizinhos de outros aeroportos importantes:

| Posição | Grau | Intermediação | Proximidade | Autovetor |
|---|---|---|---|---|
| 1º | BSB (12) | BSB (0,372) | BSB (0,704) | BSB (0,407) |
| 2º | GRU (10) | GRU (0,228) | GRU (0,679) | GRU (0,371) |
| 3º | REC (8) | CNF (0,085) | CNF (0,613) | REC (0,302) |
| 4º | GIG (7) | REC (0,082) | REC (0,576) | CNF (0,298) |
| 5º | CNF (7) | GIG (0,081) | FOR (0,576) | FOR (0,290) |

### Padrões Identificados

**Estrutura hub-and-spoke parcial:** a rede combina concentração em torno de três grandes hubs (BSB, GRU, REC), um anel de aeroportos médios (CNF, GIG, FOR, SSA, BEL, VIX) e folhas de baixo grau (CGH, GYN, RBR, THE). Sul e Centro-Oeste, porém, mantêm malha interna densa sem depender dos hubs nacionais para viagens regionais.

**Dependência de Brasília:** a centralidade de intermediação de BSB é 0,37 — 63% superior à de GRU (0,23). BSB é passagem obrigatória nas rotas REC → POA, JPA → POA, RBR → VIX e THE → FLN. A remoção hipotética de BSB desconectaria diversas rotas mínimas do grafo.

**Integração regional assimétrica:** Sul (3 capitais) e Centro-Oeste (2 capitais) atingem 100% de conectividade interna. O Nordeste, apesar de ter o maior número de aeroportos da amostra, tem a menor densidade interna (53%). Não existem conexões diretas Norte–Nordeste, Norte–Sul nem Sul–Nordeste: o caminho entre essas regiões passa obrigatoriamente por BSB ou GRU.

### Exemplos de Caminhos (Dijkstra)

| Rota | Percurso | Custo |
|---|---|---|
| REC → POA | Recife → Vitória → Florianópolis → Porto Alegre | 55 |
| MAO → GRU | Manaus → São Paulo | 25 |
| JPA → POA | João Pessoa → Brasília → Belo Horizonte → Porto Alegre | 60 |

---

## Parte 2 — ETN / Rede Marítima Global

### Dataset — LINERLIB

O dataset é um benchmark acadêmico desenvolvido pela **Technical University of Denmark (DTU)**, construído a partir de dados reais da **Maersk Line** (maior operadora de contêineres do mundo). Foi criado especificamente para resolver o **Liner Shipping Network Design Problem (LSNDP)**: dado um conjunto de portos, frota de navios e demanda de carga, qual é a melhor malha de rotas?

> Referência: [paper original do LSNDP](https://backend.orbit.dtu.dk/ws/portalfiles/portal/5578448/rapport_19_2010.pdf) | [repositório](https://github.com/blof/LINERLIB)

### Modelagem do Grafo

| Elemento | Representação |
|---|---|
| Nó v ∈ V | Porto marítimo (código UNLocode como identificador único) |
| Aresta (u, v) | Rota de navegação direta saindo de u com destino a v |
| Peso w(u, v) | Resultado econômico líquido da operação da rota (USD) |

| Métrica | Valor |
|---|---|
| Ordem (V) | 47 portos |
| Tamanho (E) | 1.764 rotas dirigidas |
| Densidade | 0,816 (81,6%) |
| Tipo | Dígrafo simples ponderado |
| Conexo | Sim |
| Pesos negativos | Sim (379 rotas lucrativas) |
| Ciclos negativos | Sim (262 ciclos de 2 nós) |
| Grau médio | 37,5 arestas/porto |

**Portos de destaque:**

| Critério | Porto | Grau | Grau-entrada | Grau-saída |
|---|---|---|---|---|
| Maior grau | AEJEA — Jebel Ali (Dubai) | 89 | 45 | 44 |
| Mediana | CNYTN — Shenzhen (China) | 79 | 37 | 42 |
| Menor grau | CAMTR — Montreal (Canadá) | 31 | 12 | 19 |

### Arquivos do Dataset

| Arquivo original | Arquivo no projeto | Conteúdo |
|---|---|---|
| `ports.csv` | `vertices.csv` | 47 portos com colunas metrificáveis (UNLocode, custos portuários) |
| `Demand_WorldSmall.csv` | `arestas.csv` | 1.764 rotas com peso econômico calculado |
| `dist_dense.csv` | (referência) | Distâncias em milhas náuticas entre pares de portos |
| `fleet_data.csv` | (referência) | Dados de frota para derivação do coeficiente 25,46 USD/nm |

### Regra de Pesos Econômicos

O peso de cada aresta representa o **resultado econômico líquido** da operação de uma rota:

```
w(u, v) = distância × 25,46
        + PortCallCostFixed[destino]
        + CostPerFULL[destino] × FFEPerWeek
        − Revenue_1 × FFEPerWeek
```

**Derivação do coeficiente 25,46 USD/nm:**
```
TC por nm = TC rate diário ÷ (designSpeed × 24)
Panamax_1200: 11.000 ÷ (18 × 24) = 11.000 ÷ 432 = 25,46 USD/nm
```

A classe **Panamax_1200** foi escolhida por ser a mais equilibrada entre as 6 classes do dataset, minimizando subestimações ou superestimações de rota. `PortCallCostFixed` pode ser negativo porque alguns portos pagam o navio para atracar (valor econômico indireto da movimentação de carga).

**Interpretação dos pesos:**
- **Peso negativo** → rota lucrativa (receita > custo): 379 rotas (21,4%)
- **Peso positivo** → rota deficitária (custo > receita): 1.385 rotas (78,5%)

Na prática, um armador não opera cada rota isoladamente: monta circuitos completos em que rotas lucrativas subsidiam as deficitárias, maximizando o resultado do conjunto.

**Exemplo de ciclo negativo:**
```
HKHKG → ZADUR: -661.649 USD
ZADUR → HKHKG: -60.682 USD
Total do ciclo: -722.331 USD
```

### Insights da Análise Comparativa de Algoritmos

| # | Insight |
|---|---|
| 1 | **DFS surpreendentemente mais lento que Bellman-Ford** — O DFS tem complexidade O(V+E), mas é mais lento porque precisa registrar em strings todas as arestas classificadas (tree, back, forward, cross). |
| 2 | **Dijkstra mais rápido que o usual** — Aplicado ao problema *Single Pair Shortest Path*, o Dijkstra faz "break" ao encontrar o destino, operando com menos overhead que sua aplicação padrão SSSP. |
| 3 | **BFS mais rápido que Dijkstra** — BFS ignora pesos e opera com O(V+E), enquanto Dijkstra gasta tempo em comparações de peso O((V+E) log V). |
| 4 | **Indiferença entre casos de teste (BFS/DFS)** — O grafo é fortemente conexo com grau médio de 37,5; trocar a fonte não gera diferença significativa de tempo. |
| 5 | **Gap DFS × BFS** — DFS armazena todos os vizinhos no stack (inclusive já visitados), enquanto BFS enfileira cada nó exatamente uma vez. |
| 6 | **Largura × Profundidade importa mais que densidade** — BFS encontra nós próximos na 1ª camada; DFS gera gargalo ao mergulhar em profundidade para um destino vizinho. |
| 9 | **Desistência rápida = caso mais rápido no Dijkstra** — O par (LKCMB, MYTPP) envolve o grafo com pesos negativos, levando o Dijkstra a retornar null imediatamente. |
| 12 | **Bellman-Ford com ciclos negativos** — Foi necessário adotar heurística de remoção das arestas mais negativas de todos os ciclos antes de rodar o algoritmo, construindo um subgrafo seguro. |
| 13 | **Bellman-Ford só com pesos positivos** — Caso mais rápido: o algoritmo considera apenas arestas com w > 0, reduzindo drasticamente o número de relaxamentos. |
| 14 | **Bellman-Ford com ciclo negativo** — Caso mais lento: executa as 46 iterações completas (V−1), processa 1.764 relaxamentos e só detecta o ciclo na passada final de verificação. |

---

## Algoritmos Implementados

Todos os algoritmos foram implementados **do zero, sem bibliotecas externas de grafos**.

| Algoritmo | Arquivo | Aplicação |
|---|---|---|
| **Dijkstra** | `src/graphs/solve.py` | Caminhos mínimos com pesos ≥ 0 (Parte 1 e Parte 2) |
| **Bellman-Ford** | `src/graphs/solve.py` | Caminhos com pesos negativos; detecção de ciclos negativos (Parte 2) |
| **BFS** | `src/graphs/solve.py` | Travessia por níveis; caminhos sem peso (Parte 2) |
| **DFS** | `src/graphs/solve.py` | Travessia profunda; classificação de arestas (Parte 2) |

### Saídas Obrigatórias

```
out/global.json           → ordem, tamanho e densidade do grafo
out/regioes.json          → métricas por região (Parte 1)
out/ego_aeroportos.csv    → grau, ordem, tamanho e densidade do ego-grafo por aeroporto
out/graus.csv             → ranking de graus
out/distancias_rotas.csv  → origem, destino, custo e caminho (Dijkstra)
out/arvore_percurso.html  → subgrafo do caminho mínimo (interativo)
out/grafo_interativo.html → grafo completo com tooltip e busca
out/parte2_report.json    → métricas de desempenho por algoritmo/tarefa (Parte 2)
```

---

## Interface e Visualizações

### Backend — API Flask

| Método | Endpoint | Payload | Retorno |
|---|---|---|---|
| GET | `/api/graph-data` | — | `{ nodes, edges }` |
| POST | `/api/dijkstra` | `{ start, end }` | `{ success, path, cost, connections, path_info }` |

### Frontend React

A interface foi construída em React 19 + Vite com identidade visual **ETA Airlines** e inclui:

- **Home ETA / Home ETN** — páginas iniciais de cada parte
- **Malha Aérea Interativa** — grafo renderizado com Vis.js Network; clique em aeroportos para selecionar origem/destino
- **Dijkstra Pathfinder** — executa o algoritmo e destaca a rota em amarelo/dourado no canvas
- **Boarding Pass** — resultado exibido em formato de cartão de embarque com waypoints coloridos
- **Database ETA / ETN** — tabelas interativas dos dados de cada grafo
- **Métricas Globais** — dashboard com as métricas calculadas
- **Regras ETA / ETN** — documentação dos critérios de peso de cada parte
- **Relatório ETN** — comparativo de algoritmos com gráficos de desempenho
- **Painel de Rotas ETN** — visualização das rotas marítimas
- **Jogos interativos** — Airport Game e Container Game

**Destaque visual do caminho:**

| Tipo de nó | Cor de fundo | Borda | Tamanho |
|---|---|---|---|
| Origem | `#002244` (navy escuro) | cyan | 22 |
| Destino | `#281500` (laranja escuro) | dourado `#F5A623` | 22 |
| Escala | `#0A2010` (verde escuro) | verde `#00E5A0` | 18 |
| Aresta na rota | dourado `#F5A623` | — | largura 3 |
| Aresta fora da rota | cyan 15% opacidade | — | largura 1 |

---

## Como Executar

### 1. Configurar o ambiente

```bash
python -m venv venv
.\venv\Scripts\Activate        # Windows
source venv/bin/activate       # Linux/macOS
pip install -r requirements.txt
```

### 2. Executar o Backend

```bash
cd src
python api.py
# API disponível em: http://localhost:5000
```

### 3. Executar o Frontend

```bash
cd frontend
npm i vite
npm run dev
# Interface disponível em: http://localhost:5173
```

### 4. Executar via CLI

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

Os testes ficam na pasta `tests/` e usam **pytest**:

```bash
# Rodar todos os testes
.\venv\Scripts\python.exe -m pytest tests/ -v

# Rodar um arquivo específico
.\venv\Scripts\python.exe -m pytest tests/test_dijkstra.py -v
```

| Arquivo | Algoritmo | O que testa |
|---|---|---|
| `test_dijkstra.py` | Dijkstra | Caminhos corretos com pesos ≥ 0; rejeição de pesos negativos |
| `test_bellman_ford.py` | Bellman-Ford | Pesos negativos sem ciclo (distâncias corretas); ciclo negativo (flag) |
| `test_bfs.py` | BFS | Níveis corretos em grafo pequeno |
| `test_dfs.py` | DFS | Detecção de ciclo; classificação de arestas (tree, back, forward, cross) |
| `test_part2_report.py` | Relatório Parte 2 | Validação das métricas de desempenho |

---

## Tecnologias

| Camada | Tecnologia |
|---|---|
| **Backend** | Python 3.12 · Flask · Flask-CORS |
| **Frontend** | React 19 · Vite · Vis.js Network · Axios |
| **Visualização** | Vis Network (grafos interativos) · Matplotlib / Plotly (análises) |
| **Testes** | pytest |
| **Dados (Parte 1)** | CSV customizado com critérios definidos pelo grupo |
| **Dados (Parte 2)** | LINERLIB — benchmark acadêmico baseado em dados reais da Maersk Line |
| **Estilo** | CSS moderno com gradientes, animações e identidade ETA Airlines |

---

> **Nota acadêmica:** todos os algoritmos (Dijkstra, Bellman-Ford, BFS, DFS) foram implementados manualmente, sem uso de bibliotecas externas de grafos, como exigido pela disciplina.
