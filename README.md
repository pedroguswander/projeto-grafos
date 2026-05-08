# Projeto Grafos - Algoritmo de Dijkstra

Uma aplicação completa para visualização e cálculo de caminhos mais curtos em grafos de aeroportos brasileiros usando o algoritmo de Dijkstra implementado manualmente.

## Funcionalidades

- **Visualização Interativa**: Grafo interativo dos aeroportos brasileiros
- **Seleção por Clique**: Clique nos aeroportos para selecionar origem e destino
- **Dijkstra Manual**: Implementação completa do algoritmo sem bibliotecas externas
- **Destaque Visual**: Caminho encontrado é destacado em amarelo/vermelho
- **API REST**: Backend Flask servindo dados do grafo
- **Interface Moderna**: Frontend React com design responsivo

## 🏗️ Arquitetura

```
projeto-grafos/
├── data/                        # Dados dos aeroportos
├── frontend/                    # Frontend React (Vite)
│   ├── node_modules/
│   ├── public/
│   └── src/
│       ├── assets/
│       ├── Dashboard/
│       ├── airport-ego-panel-horizontal.css
│       ├── AirportTooltip.css
│       ├── AirportTooltip.jsx
│       ├── App.css
│       ├── App.jsx
│       ├── DataBase.css
│       ├── DataBase.jsx
│       ├── GlobalMetrics.css
│       ├── GlobalMetrics.jsx
│       ├── Home.css
│       ├── Home.jsx
│       ├── index.css
│       ├── main.jsx
│       ├── Regras.css
│       ├── Regras.jsx
│       └── SearchBar.css
│   ├── .gitignore
│   ├── eslint.config.js
│   ├── index.html
│   ├── package-lock.json
│   ├── package.json
│   ├── README.md
│   └── vite.config.js
├── out/
├── src/                         # Backend Python
│   └── graphs/
│       ├── api.py
│       ├── cli.py
│       ├── solve.py
│       └── viz.py
├── tests/
├── venv/
├── build.cmd
├── build.ps1
├── README.md
└── requirements.txt
```

## 🧪 Como Executar os Testes

Os testes ficam na pasta `tests/` e usam **pytest**.

```powershell
# Com a venv ativada:
.\venv\Scripts\python.exe -m pytest tests/ -v
```

Testes disponíveis:

| Arquivo | Algoritmo |
|---|---|
| `test_dijkstra.py` | Dijkstra |
| `test_bellman_ford.py` | Bellman-Ford |
| `test_bfs.py` | BFS |
| `test_dfs.py` | DFS |

Para rodar apenas um arquivo específico:

```powershell
.\venv\Scripts\python.exe -m pytest tests/test_bellman_ford.py -v
```

---

## 🛠️ Como Executar

### Passo a Passo

1. **Criar e ativar a Virtual Environment:**
```powershell
python -m venv venv
.\venv\Scripts\Activate
```

2. **Instalar dependências do Backend:**
```powershell
pip install -r requirements.txt
```

3. **Executar o Backend:**
```powershell
cd src
python api.py
# API disponível em: http://localhost:5000
```

4. **Entrar na pasta do Frontend:**
```powershell
cd frontend
```

5. **Instalar o Vite:**
```powershell
npm i vite
```

6. **Executar o Frontend:**
```powershell
npm run dev
# Interface disponível em: http://localhost:5173
```

## 🎯 Como Usar

1. **Visualizar Grafo**: O grafo dos aeroportos é carregado automaticamente
2. **Selecionar Aeroportos**:
   - Clique em um aeroporto para definir como origem (verde)
   - Clique em outro para definir como destino (vermelho)
3. **Calcular Caminho**: Clique em "🔍 Calcular Caminho (Dijkstra)"
4. **Ver Resultado**: O caminho é destacado e mostrado com custo total

## 📊 Dados Utilizados

- **Aeroportos**: 20 aeroportos brasileiros com códigos IATA
- **Rotas**: Conexões diretas com custos/distâncias
- **Algoritmo**: Dijkstra implementado manualmente (sem heapq para filas)

## 🔧 Tecnologias

- **Backend**: Python 3.12 + Flask + CORS
- **Frontend**: React 19 + Vite + Vis.js + Axios
- **Visualização**: Vis Network para grafos interativos
- **Estilo**: CSS moderno com gradientes e animações

## 📈 Exemplos de Caminhos Calculados

- **REC → POA**: Recife → Vitória → Florianópolis → Porto Alegre (Custo: 55)
- **MAO → GRU**: Manaus → São Paulo (Custo: 25)
- **JPA → POA**: João Pessoa → Brasília → Belo Horizonte → Porto Alegre (Custo: 60)

## 🎨 Interface

- **Design Responsivo**: Funciona em desktop e mobile
- **Interação Intuitiva**: Clique para selecionar, botões para calcular
- **Feedback Visual**: Destaque de caminhos, loading states
- **Informações Detalhadas**: Custo, conexões e lista de aeroportos

---

**Implementação Acadêmica**: Algoritmo de Dijkstra sem uso de bibliotecas externas, apenas estruturas básicas do Python.
