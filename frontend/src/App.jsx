import React, { useState, useEffect, useRef } from 'react'
import { Network } from 'vis-network/standalone'
import axios from 'axios'
import './App.css'

/* Plane icon as inline SVG */
const PlaneIcon = () => (
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2 1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z" />
  </svg>
)

function App() {
  const [startAirport, setStartAirport] = useState('')
  const [endAirport, setEndAirport] = useState('')
  const [pathResult, setPathResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] })
  const networkRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => { loadGraphData() }, [])

  useEffect(() => {
    if (containerRef.current && graphData.nodes.length > 0) initializeNetwork()
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
    if (networkRef.current) networkRef.current.destroy()

    const options = {
      nodes: {
        shape: 'dot',
        size: 16,
        font: {
          size: 11,
          color: '#00C8E8',
          face: 'IBM Plex Mono',
          bold: 'bold' // CORREÇÃO: Valor string para evitar erro de tipo[cite: 1, 3]
        },
        borderWidth: 1.5,
        color: {
          background: '#0D1628',
          border: '#00C8E8',
          highlight: { background: '#162444', border: '#00E5A0' },
          hover: { background: '#162444', border: '#F5A623' },
        },
        shadow: { enabled: true, color: 'rgba(0,200,232,0.3)', size: 12, x: 0, y: 0 },
      },
      edges: {
        width: 1.2,
        color: { color: 'rgba(0,200,232,0.2)', highlight: '#F5A623', hover: '#00E5A0' },
        font: { size: 9, color: '#2E5470', face: 'IBM Plex Mono', align: 'middle' },
        smooth: { type: 'dynamic' },
        shadow: false,
      },
      physics: {
        enabled: true,
        barnesHut: {
          gravitationalConstant: -2000,
          centralGravity: 0.3,
          springLength: 110,
          springConstant: 0.04,
          damping: 0.09,
          avoidOverlap: 0.2,
        },
      },
      interaction: { hover: true, tooltipDelay: 180 }
      // CORREÇÃO: Propriedade background inválida removida[cite: 1, 3]
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
        end: endAirport,
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

    const updatedNodes = graphData.nodes.map(node => {
      if (node.id === startAirport)
        return { ...node, color: { background: '#002244', border: '#00C8E8' }, size: 22 }
      if (node.id === endAirport)
        return { ...node, color: { background: '#281500', border: '#F5A623' }, size: 22 }
      if (path.includes(node.id))
        return { ...node, color: { background: '#0A2010', border: '#00E5A0' }, size: 18 }
      return { ...node, color: { background: '#0D1628', border: 'rgba(0,200,232,0.25)' } }
    })

    const updatedEdges = graphData.edges.map(edge => {
      const inPath = path.some((_, i) =>
        i < path.length - 1 &&
        ((edge.from === path[i] && edge.to === path[i + 1]) ||
          (edge.from === path[i + 1] && edge.to === path[i]))
      )
      return inPath
        ? { ...edge, color: { color: '#F5A623' }, width: 3 }
        : { ...edge, color: { color: 'rgba(0,200,232,0.15)' }, width: 1 }
    })

    networkRef.current.setData({ nodes: updatedNodes, edges: updatedEdges })
  }

  const resetSelection = () => {
    setStartAirport('')
    setEndAirport('')
    setPathResult(null)
    loadGraphData()
  }

  const buildWaypoints = () => {
    if (!pathResult) return []
    return pathResult.path_info.map((ap, i) => ({
      ...ap,
      type: i === 0 ? 'first' : i === pathResult.path_info.length - 1 ? 'last' : 'middle',
    }))
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-brand">
          <div className="header-image">
            <img src="https://res.cloudinary.com/dbusjfoxq/image/upload/v1777833368/logo_completa_colorida_lpdmia.png" alt="" />
          </div>
          <div>
            <h1>Malha Aérea BR</h1>
            <div className="header-sub">DIJKSTRA PATHFINDER · v1.0</div>
          </div>
        </div>
        <div className="header-status">
          <span className="status-dot" />
          SISTEMA ONLINE
        </div>
      </header>

      <div className="main-content">
        <aside className="controls">
          <div className="panel">
            <div className="panel-header">
              <span className="panel-tag">01</span>
              <span className="panel-title">Selecionar Rota</span>
            </div>
            <div className="panel-body">
              <div className="route-field airport-select">
                <div className="field-label">
                  <span className="field-badge badge-origin">ORIG</span>
                  <span className="field-name">Aeroporto de Origem</span>
                </div>
                <input
                  type="text"
                  value={startAirport}
                  onChange={(e) => setStartAirport(e.target.value.toUpperCase())}
                  placeholder="clique no grafo ou digite"
                  maxLength={3}
                />
              </div>
              <div className="route-field airport-select">
                <div className="field-label">
                  <span className="field-badge badge-dest">DEST</span>
                  <span className="field-name">Aeroporto de Destino</span>
                </div>
                <input
                  type="text"
                  value={endAirport}
                  onChange={(e) => setEndAirport(e.target.value.toUpperCase())}
                  placeholder="clique no grafo ou digite"
                  maxLength={3}
                />
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <span className="panel-tag">02</span>
              <span className="panel-title">Calcular</span>
            </div>
            <div className="panel-body buttons">
              <button
                onClick={calculatePath}
                disabled={loading || !startAirport || !endAirport}
                className="calculate-btn"
              >
                {loading ? 'CALCULANDO…' : '▶ EXECUTAR DIJKSTRA'}
              </button>
              <button onClick={resetSelection} className="reset-btn">
                ↺ RESETAR GRAFO
              </button>
            </div>
          </div>

          {pathResult && (
            <div className="result">
              <div className="result-header">
                <span className="result-status">● ROTA CALCULADA</span>
                <span className="result-cost-badge">CUSTO {pathResult.cost}</span>
              </div>
              <div className="result-body">
                <div className="result-route-line" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <span className="route-iata origin">{pathResult.path[0]}</span>
                  <div className="route-arrow" />
                  <span className="route-iata dest">{pathResult.path[pathResult.path.length - 1]}</span>
                </div>

                <div className="result-stat">
                  <span className="stat-key">Conexões</span>
                  <span className="stat-val">{pathResult.connections}</span>
                </div>
                <div className="result-stat">
                  <span className="stat-key">Segmentos</span>
                  <span className="stat-val">{pathResult.path.length - 1}</span>
                </div>

                <div className="path-waypoints">
                  {buildWaypoints().map((wp, i, arr) => (
                    <React.Fragment key={`wp-group-${i}`}>
                      <div className="waypoint">
                        <span className={`wp-dot ${wp.type}`} />
                        <span className="wp-label">
                          <span className="wp-code">{wp.code}</span>
                          <span className="wp-city">{wp.city}</span>
                        </span>
                      </div>
                      {i < arr.length - 1 && (
                        <div className="wp-connector" />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          )}
        </aside>

        <div className="graph-container">
          <div className="graph-header">
            <span className="graph-title">Visualização do Grafo</span>
            <span className="graph-hint">clique nos nós para selecionar origem / destino</span>
          </div>
          <div ref={containerRef} className="network-canvas" />
        </div>
      </div>

      <footer className="footer">
        <span className="footer-text">MALHA AÉREA BRASILEIRA · ALGORITMO DE DIJKSTRA</span>
        <div className="footer-stack">
          <span className="tech-tag">React</span>
          <span className="tech-tag">Vis.js</span>
          <span className="tech-tag">Flask</span>
        </div>
      </footer>
    </div>
  )
}

export default App