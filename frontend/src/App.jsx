import { useState, useEffect, useRef } from 'react'
import { Network } from 'vis-network/standalone'
import axios from 'axios'
import './App.css'

function App() {
  const [startAirport, setStartAirport] = useState('')
  const [endAirport, setEndAirport] = useState('')
  const [pathResult, setPathResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] })
  const networkRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    loadGraphData()
  }, [])

  useEffect(() => {
    if (containerRef.current && graphData.nodes.length > 0) {
      initializeNetwork()
    }
  }, [graphData])

  const loadGraphData = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/graph-data')
      setGraphData(response.data)
    } catch (error) {
      console.error('Erro ao carregar dados do grafo:', error)
    }
  }

  const initializeNetwork = () => {
    if (networkRef.current) {
      networkRef.current.destroy()
    }

    const options = {
      nodes: {
        shape: 'circle',
        size: 25,
        font: {
          size: 12,
          color: '#ffffff'
        },
        borderWidth: 2,
        shadow: true
      },
      edges: {
        width: 2,
        shadow: true,
        font: {
          size: 10,
          align: 'middle'
        },
        color: {
          color: '#848484',
          highlight: '#ff0000'
        }
      },
      physics: {
        enabled: true,
        barnesHut: {
          gravitationalConstant: -2000,
          centralGravity: 0.3,
          springLength: 95,
          springConstant: 0.04,
          damping: 0.09,
          avoidOverlap: 0.1
        }
      },
      interaction: {
        hover: true,
        tooltipDelay: 200
      }
    }

    networkRef.current = new Network(containerRef.current, graphData, options)

    networkRef.current.on('click', (params) => {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0]
        if (!startAirport) {
          setStartAirport(nodeId)
        } else if (!endAirport && nodeId !== startAirport) {
          setEndAirport(nodeId)
        } else if (nodeId === startAirport) {
          setStartAirport('')
        } else if (nodeId === endAirport) {
          setEndAirport('')
        }
      }
    })
  }

  const calculatePath = async () => {
    if (!startAirport || !endAirport) {
      alert('Selecione aeroporto de origem e destino!')
      return
    }

    setLoading(true)
    try {
      const response = await axios.post('http://localhost:5000/api/dijkstra', {
        start: startAirport,
        end: endAirport
      })

      if (response.data.success) {
        setPathResult(response.data)
        highlightPath(response.data.path)
      } else {
        alert(response.data.message)
        setPathResult(null)
      }
    } catch (error) {
      console.error('Erro ao calcular caminho:', error)
      alert('Erro ao calcular caminho')
    } finally {
      setLoading(false)
    }
  }

  const highlightPath = (path) => {
    if (!networkRef.current) return

    const updatedNodes = graphData.nodes.map(node => ({
      ...node,
      color: node.id === startAirport ? '#00ff00' : node.id === endAirport ? '#ff0000' : '#97C2FC'
    }))

    const updatedEdges = graphData.edges.map(edge => ({
      ...edge,
      color: { color: '#848484' },
      width: 2
    }))

    path.forEach(nodeId => {
      const nodeIndex = updatedNodes.findIndex(n => n.id === nodeId)
      if (nodeIndex !== -1) {
        updatedNodes[nodeIndex].color = '#ffff00'
      }
    })

    for (let i = 0; i < path.length - 1; i++) {
      const edgeIndex = updatedEdges.findIndex(e =>
        (e.from === path[i] && e.to === path[i + 1]) ||
        (e.from === path[i + 1] && e.to === path[i])
      )
      if (edgeIndex !== -1) {
        updatedEdges[edgeIndex].color = { color: '#ff0000' }
        updatedEdges[edgeIndex].width = 4
      }
    }

    networkRef.current.setData({ nodes: updatedNodes, edges: updatedEdges })
  }

  const resetSelection = () => {
    setStartAirport('')
    setEndAirport('')
    setPathResult(null)
    loadGraphData()
  }

  return (
    <div className="app">
      <header className="header">
        <h1>🛩️ Grafo de Aeroportos - Dijkstra</h1>
        <p>Clique nos aeroportos para selecionar origem e destino</p>
      </header>

      <div className="main-content">
        <div className="controls">
          <div className="selection">
            <div className="airport-select">
              <label>Origem:</label>
              <input
                type="text"
                value={startAirport}
                onChange={(e) => setStartAirport(e.target.value)}
                placeholder="Clique no grafo ou digite"
              />
            </div>
            <div className="airport-select">
              <label>Destino:</label>
              <input
                type="text"
                value={endAirport}
                onChange={(e) => setEndAirport(e.target.value)}
                placeholder="Clique no grafo ou digite"
              />
            </div>
          </div>

          <div className="buttons">
            <button
              onClick={calculatePath}
              disabled={loading || !startAirport || !endAirport}
              className="calculate-btn"
            >
              {loading ? 'Calculando...' : '🔍 Calcular Caminho (Dijkstra)'}
            </button>
            <button onClick={resetSelection} className="reset-btn">
              🔄 Resetar
            </button>
          </div>

          {pathResult && (
            <div className="result">
              <h3>✅ Caminho Encontrado!</h3>
              <p><strong>Custo Total:</strong> {pathResult.cost}</p>
              <p><strong>Conexões:</strong> {pathResult.connections}</p>
              <p><strong>Caminho:</strong> {pathResult.path.join(' → ')}</p>
              <div className="path-details">
                {pathResult.path_info.map((airport, index) => (
                  <div key={index} className="path-airport">
                    <strong>{airport.code}</strong> - {airport.city}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="graph-container">
          <div ref={containerRef} className="network-canvas"></div>
        </div>
      </div>

      <footer className="footer">
        <p>Implementação manual do algoritmo de Dijkstra | Frontend: React + Vis.js | Backend: Flask</p>
      </footer>
    </div>
  )
}

export default App
