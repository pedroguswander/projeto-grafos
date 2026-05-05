# # 🛩️ Projeto Grafos - Algoritmo de Dijkstra

Uma aplicação completa para visualização e cálculo de caminhos mais curtos em grafos de aeroportos brasileiros usando o algoritmo de Dijkstra implementado manualmente.

## 🚀 Funcionalidades

- **Visualização Interativa**: Grafo interativo dos aeroportos brasileiros
- **Seleção por Clique**: Clique nos aeroportos para selecionar origem e destino
- **Dijkstra Manual**: Implementação completa do algoritmo sem bibliotecas externas
- **Destaque Visual**: Caminho encontrado é destacado em amarelo/vermelho
- **API REST**: Backend Flask servindo dados do grafo
- **Interface Moderna**: Frontend React com design responsivo

## 🏗️ Arquitetura

```
projeto-grafos/
├── src/                    # Backend Python
│   ├── graphs/            # Módulos do grafo
│   │   ├── graph.py       # Estrutura do grafo
│   │   ├── algorithms.py  # Dijkstra implementado manualmente
│   │   └── io.py          # Carregamento de dados
│   ├── api.py             # API REST Flask
│   └── solve.py           # Script de cálculo
├── frontend/              # Frontend React
│   ├── src/
│   │   ├── App.jsx        # Interface principal
│   │   └── App.css        # Estilos
│   └── package.json
├── data/                  # Dados dos aeroportos
│   ├── aeroportos_data.csv
│   ├── adjacencias_aeroportos.csv
│   └── rotas.csv
└── requirements.txt       # Dependências Python
```

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
