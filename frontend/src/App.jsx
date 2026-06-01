import { useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import { Network } from 'vis-network/standalone'

import logo from './assets/logo/logo_branca_isolada.png'
import AirportTooltip from './AirportTooltip'

// ---------------------------------------------------------------------------
// Coordenadas geográficas reais de cada aeroporto para o mapa Plotly
// ---------------------------------------------------------------------------
const AIRPORT_COORDS = {
  REC: { lat: -8.126,  lon: -34.923 },
  SSA: { lat: -12.908, lon: -38.322 },
  FOR: { lat: -3.776,  lon: -38.532 },
  NAT: { lat: -5.768,  lon: -35.376 },
  JPA: { lat: -7.148,  lon: -34.95  },
  GRU: { lat: -23.431, lon: -46.469 },
  CGH: { lat: -23.626, lon: -46.656 },
  GIG: { lat: -22.81,  lon: -43.25  },
  CNF: { lat: -19.624, lon: -43.972 },
  VIX: { lat: -20.258, lon: -40.286 },
  BSB: { lat: -15.869, lon: -47.921 },
  GYN: { lat: -16.632, lon: -49.221 },
  CWB: { lat: -25.528, lon: -49.176 },
  FLN: { lat: -27.67,  lon: -48.547 },
  POA: { lat: -29.994, lon: -51.171 },
  MAO: { lat: -3.038,  lon: -60.05  },
  BEL: { lat: -1.379,  lon: -48.477 },
  PVH: { lat: -8.709,  lon: -63.902 },
  RBR: { lat: -9.869,  lon: -67.898 },
  THE: { lat: -5.06,   lon: -42.823 },
}

const REGION_COLORS = {
  'Nordeste':     '#f97316',
  'Sudeste':      '#3b82f6',
  'Sul':          '#10b981',
  'Centro-Oeste': '#a855f7',
  'Norte':        '#ec4899',
}

function BrazilMap({ graphData, pathResult, startAirport, endAirport, aeroportosData, egoAeroportos, onNodeClick }) {
  const plotRef = useRef(null)
  const wrapRef = useRef(null)
  const [plotlyLoaded, setPlotlyLoaded] = useState(!!window.Plotly)
  const [edgeTooltip, setEdgeTooltip] = useState(null) // { x, y, from, to, weight, inPath }

  useEffect(() => {
    if (window.Plotly) { setPlotlyLoaded(true); return }
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/plotly.js/2.27.1/plotly.min.js'
    script.onload = () => setPlotlyLoaded(true)
    document.head.appendChild(script)
  }, [])

  useEffect(() => {
    if (!plotlyLoaded || !plotRef.current) return
    renderMap()
  }, [plotlyLoaded, graphData, pathResult, startAirport, endAirport])

  function renderMap() {
    const Plotly = window.Plotly
    const activePath = pathResult?.path || []

    // Build edge line traces from graphData
    const edgeTraces = graphData.edges.map((edge) => {
      const A = AIRPORT_COORDS[edge.from]
      const B = AIRPORT_COORDS[edge.to]
      if (!A || !B) return null
      const inPath = activePath.length > 1 && activePath.some((n, i) =>
        i < activePath.length - 1 &&
        ((activePath[i] === edge.from && activePath[i + 1] === edge.to) ||
         (activePath[i] === edge.to   && activePath[i + 1] === edge.from))
      )
      return {
        type: 'scattergeo',
        lon: [A.lon, B.lon],
        lat: [A.lat, B.lat],
        mode: 'lines',
        line: { width: inPath ? 3.5 : 1, color: inPath ? '#f6c56f' : 'rgba(148,163,184,0.25)' },
        hoverinfo: 'none',
        showlegend: false,
      }
    }).filter(Boolean)

    // Invisible midpoint markers — one per edge — that trigger the custom hover tooltip
    const edgeMidpointData = graphData.edges.map((edge) => {
      const A = AIRPORT_COORDS[edge.from]
      const B = AIRPORT_COORDS[edge.to]
      if (!A || !B) return null
      const inPath = activePath.length > 1 && activePath.some((n, i) =>
        i < activePath.length - 1 &&
        ((activePath[i] === edge.from && activePath[i + 1] === edge.to) ||
         (activePath[i] === edge.to   && activePath[i + 1] === edge.from))
      )
      const rawLabel = edge.label ?? edge.weight ?? edge.peso ?? ''
      const match = String(rawLabel).match(/-?\d+(\.\d+)?/)
      const weight = match ? Math.trunc(Number(match[0])) : null
      return {
        midLon: (A.lon + B.lon) / 2,
        midLat: (A.lat + B.lat) / 2,
        from: edge.from,
        to: edge.to,
        weight,
        inPath,
      }
    }).filter(Boolean)

    const weightHoverTrace = {
      type: 'scattergeo',
      lon: edgeMidpointData.map((e) => e.midLon),
      lat: edgeMidpointData.map((e) => e.midLat),
      mode: 'markers',
      marker: { size: 12, color: 'rgba(0,0,0,0)', opacity: 0 },
      customdata: edgeMidpointData.map((e) => [e.from, e.to, e.weight, e.inPath ? 1 : 0]),
      hoverinfo: 'none',
      showlegend: false,
    }

    // Group nodes by region for legend
    const regionMap = {}
    graphData.nodes.forEach((node) => {
      const regiao = aeroportosData[node.id]?.regiao || 'Outro'
      if (!regionMap[regiao]) regionMap[regiao] = []
      regionMap[regiao].push(node)
    })

    const nodeTraces = Object.entries(regionMap).map(([region, nodes]) => ({
      type: 'scattergeo',
      lon: nodes.map((n) => AIRPORT_COORDS[n.id]?.lon).filter(Boolean),
      lat: nodes.map((n) => AIRPORT_COORDS[n.id]?.lat).filter(Boolean),
      mode: 'markers+text',
      name: region,
      text: nodes.filter((n) => AIRPORT_COORDS[n.id]).map((n) => n.id),
      textposition: 'top center',
      textfont: { family: 'Inter, sans-serif', size: 11, color: '#f1f5f9' },
      marker: {
        size: nodes.filter((n) => AIRPORT_COORDS[n.id]).map((n) =>
          n.id === startAirport || n.id === endAirport ? 20 :
          activePath.includes(n.id) ? 16 : 12
        ),
        color: nodes.filter((n) => AIRPORT_COORDS[n.id]).map((n) =>
          n.id === startAirport ? '#26c281' :
          n.id === endAirport   ? '#ff6b6b' :
          activePath.includes(n.id) ? '#f6c56f' :
          REGION_COLORS[region] || '#4da3ff'
        ),
        line: {
          color: nodes.filter((n) => AIRPORT_COORDS[n.id]).map((n) =>
            n.id === startAirport || n.id === endAirport || activePath.includes(n.id)
              ? '#ffffff' : 'rgba(255,255,255,0.3)'
          ),
          width: nodes.filter((n) => AIRPORT_COORDS[n.id]).map((n) =>
            n.id === startAirport || n.id === endAirport || activePath.includes(n.id) ? 2.5 : 1
          ),
        },
      },
      customdata: nodes.filter((n) => AIRPORT_COORDS[n.id]).map((n) => [
        n.id,
        n.city || aeroportosData[n.id]?.cidade || '',
        region,
        egoAeroportos[n.id]?.grau || '-',
      ]),
      hovertemplate:
        '<b>%{customdata[0]}</b> — %{customdata[1]}<br>' +
        '<i>%{customdata[2]}</i> · Grau: %{customdata[3]}<extra></extra>',
      hoverlabel: {
        bgcolor: '#0f172a',
        bordercolor: REGION_COLORS[region] || '#4da3ff',
        font: { family: 'Inter', color: '#f1f5f9', size: 13 },
      },
    }))

    const layout = {
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent',
      geo: {
        scope: 'south america',
        resolution: 50,
        showland: true,
        landcolor: '#1e293b',
        showocean: true,
        oceancolor: '#0c1829',
        showlakes: true,
        lakecolor: '#0c1829',
        showcountries: true,
        countrycolor: '#334155',
        showcoastlines: true,
        coastlinecolor: '#475569',
        showsubunits: true,
        subunitcolor: '#334155',
        bgcolor: 'transparent',
        lonaxis: { range: [-74, -29] },
        lataxis: { range: [-34, 6] },
        projection: { type: 'mercator' },
        framewidth: 0,
      },
      margin: { t: 0, b: 0, l: 0, r: 0 },
      showlegend: true,
      legend: {
        x: 0.01, y: 0.01,
        bgcolor: 'rgba(15,23,42,0.85)',
        bordercolor: '#334155',
        borderwidth: 1,
        font: { family: 'Inter', color: '#94a3b8', size: 11 },
      },
      autosize: true,
      height: 600,
    }

    const config = { responsive: true, displayModeBar: false, scrollZoom: false }

    Plotly.react(plotRef.current, [...edgeTraces, weightHoverTrace, ...nodeTraces], layout, config).then(() => {
      // Remove previous listeners to avoid stacking
      plotRef.current.removeAllListeners('plotly_hover')
      plotRef.current.removeAllListeners('plotly_unhover')
      plotRef.current.removeAllListeners('plotly_click')

      plotRef.current.on('plotly_hover', (data) => {
        const pt = data.points?.[0]
        if (!pt || !pt.customdata || !Array.isArray(pt.customdata)) return
        const [from, to, weight, inPathFlag] = pt.customdata
        // Only show tooltip for the weightHoverTrace points (they have from/to/weight)
        if (from === undefined || to === undefined) return
        const event = data.event
        if (!event) return
        const rect = wrapRef.current?.getBoundingClientRect() || { left: 0, top: 0 }
        setEdgeTooltip({
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
          from,
          to,
          weight,
          inPath: inPathFlag === 1,
        })
      })

      plotRef.current.on('plotly_unhover', () => {
        setEdgeTooltip(null)
      })

      plotRef.current.on('plotly_click', (data) => {
        const pt = data.points?.[0]
        if (!pt || !pt.customdata) return
        // Node click: customdata[0] is the IATA code (string)
        const nodeId = pt.customdata[0]
        if (typeof nodeId === 'string' && nodeId.length <= 4 && onNodeClick) onNodeClick(nodeId)
      })
    })
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%' }}>
      <div ref={plotRef} style={{ width: '100%', minHeight: 600, background: 'transparent' }}>
        {!plotlyLoaded && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 600, color: '#64748b', fontSize: 14 }}>
            Carregando mapa...
          </div>
        )}
      </div>

      {edgeTooltip && (
        <div
          style={{
            position: 'absolute',
            left: edgeTooltip.x + 14,
            top: edgeTooltip.y - 10,
            pointerEvents: 'none',
            zIndex: 200,
            background: 'rgba(15,23,42,0.95)',
            border: `1px solid ${edgeTooltip.inPath ? '#f6c56f' : '#334155'}`,
            borderRadius: 8,
            padding: '6px 12px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            minWidth: 100,
          }}
        >
          <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'Inter, sans-serif', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Aresta
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', fontFamily: 'Inter, sans-serif' }}>
            {edgeTooltip.from} → {edgeTooltip.to}
          </div>
          <div style={{
            fontSize: 13,
            fontWeight: 700,
            color: edgeTooltip.inPath ? '#f6c56f' : '#94a3b8',
            fontFamily: 'Inter, sans-serif',
            marginTop: 2,
          }}>
            ⚖ Peso: {edgeTooltip.weight ?? '-'}
          </div>
          {edgeTooltip.inPath && (
            <div style={{ fontSize: 10, color: '#f6c56f', fontFamily: 'Inter, sans-serif', opacity: 0.8 }}>
              ✦ Rota ativa
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function App({ onNavigate }) {
  const [startAirport, setStartAirport] = useState('')
  const [endAirport, setEndAirport] = useState('')
  const [pathResult, setPathResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] })
  const [selectedConnectionAirport, setSelectedConnectionAirport] = useState(null)
  // Carrega aeroportosData e egoAeroportos via API/backend
  const [aeroportosData, setAeroportosData] = useState({})
  const [egoAeroportos, setEgoAeroportos] = useState({})

  // Carregar dados dos CSVs ao iniciar
  useEffect(() => {
    async function fetchCSVs() {
      try {
        const [aeroData, egoData] = await Promise.all([
          axios.get('http://localhost:5000/api/aeroportos-data'),
          axios.get('http://localhost:5000/api/ego-aeroportos')
        ])
        // aeroportos_data.csv: { iata, cidade, regiao }
        const aeroObj = {}
        for (const row of aeroData.data) {
          aeroObj[row.iata] = { cidade: row.cidade, regiao: row.regiao }
        }
        setAeroportosData(aeroObj)
        // ego_aeroportos.csv: { aeroporto, grau, ordem_ego, tamanho_ego, densidade_ego }
        const egoObj = {}
        for (const row of egoData.data) {
          egoObj[row.aeroporto] = {
            grau: row.grau,
            ordem_ego: row.ordem_ego,
            tamanho_ego: row.tamanho_ego,
            densidade_ego: row.densidade_ego
          }
        }
        setEgoAeroportos(egoObj)
      } catch (err) {
        console.error('Erro ao carregar CSVs:', err)
      }
    }
    fetchCSVs()
  }, [])
  const [dijkstraSteps, setDijkstraSteps] = useState([])
  const [isSimulatingSteps, setIsSimulatingSteps] = useState(false)
  const [visibleTopRoutes, setVisibleTopRoutes] = useState(5)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  // Tooltip de hover no grafo
  const [hoveredNode, setHoveredNode] = useState(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const searchRef = useRef(null)
  const networkRef = useRef(null)
  const containerRef = useRef(null)
  const pendingSwapTypeRef = useRef(null)
  const skipAutoCalculateRef = useRef(false)
  const startAirportRef = useRef('')
  const endAirportRef = useRef('')
  const pathResultRef = useRef(null)
  const simulationTimeoutsRef = useRef([])

  const handleGoBack = () => onNavigate?.('home')

  function formatWeightLabel(value) {
    const text = String(value ?? '').trim()
    if (!text) return ''
    const match = text.match(/-?\d+(\.\d+)?/)
    if (!match) return text.replace(/dist[aâ]ncia/gi, 'Peso')
    const num = Number(match[0])
    return Number.isNaN(num) ? text.replace(/dist[aâ]ncia/gi, 'Peso') : `Peso: ${Math.trunc(num)}`
  }

  function extractWeightNumber(value) {
    const match = String(value ?? '').match(/-?\d+(\.\d+)?/)
    if (!match) return ''
    const num = Number(match[0])
    return Number.isNaN(num) ? '' : `${Math.trunc(num)}`
  }

  const normalizeGraphData = (data) => {
    const nodes = data.nodes.map((node) => ({
      ...node,
      x: undefined,
      y: undefined,
      fixed: false,
      label: node.id,
      title: '',
      font: {
        color: '#e8eef7',
        size: 18,
        face: 'Inter',
        strokeWidth: 0
      }
    }))

    const edges = data.edges.map((edge) => ({
      ...edge,
      label: formatWeightLabel(edge.label ?? edge.weight ?? edge.peso ?? ''),
      font: {
        color: 'rgba(232, 238, 247, 0.78)',
        size: 11,
        align: 'middle',
        face: 'Inter',
        strokeWidth: 0,
        background: 'rgba(6, 18, 31, 0.4)'
      }
    }))

    return { nodes, edges }
  }

  const loadGraphData = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/graph-data')
      setGraphData(normalizeGraphData(response.data))
    } catch (error) {
      console.error('Erro ao carregar dados do grafo:', error)
    }
  }

  const clearSimulationTimeouts = () => {
    simulationTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId))
    simulationTimeoutsRef.current = []
  }

  const resetDijkstraSimulation = () => {
    clearSimulationTimeouts()
    setDijkstraSteps([])
    setIsSimulatingSteps(false)
  }

  useEffect(() => {
    loadGraphData()
  }, [])

  useEffect(() => { startAirportRef.current = startAirport }, [startAirport])
  useEffect(() => { endAirportRef.current = endAirport }, [endAirport])
  useEffect(() => { pathResultRef.current = pathResult }, [pathResult])

  useEffect(() => {
    if (containerRef.current && graphData.nodes.length > 0) {
      initializeNetwork()
    }
  }, [graphData])

  useEffect(() => {
    const handleResize = () => networkRef.current?.redraw()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    return () => {
      clearSimulationTimeouts()
      if (networkRef.current) {
        networkRef.current.destroy()
      }
    }
  }, [])

  useEffect(() => {
    if (skipAutoCalculateRef.current) {
      skipAutoCalculateRef.current = false
      return
    }

    if (startAirport && endAirport && startAirport !== endAirport) {
      calculatePath(startAirport, endAirport)
    } else {
      setPathResult(null)
      setVisibleTopRoutes(5)
      resetDijkstraSimulation()
      updateGraphVisual([], startAirport, endAirport, pendingSwapTypeRef.current)
    }
  }, [startAirport, endAirport])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchResults([])
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const airportOptions = useMemo(() => {
    return [...graphData.nodes]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((node) => ({
        value: node.id,
        label: node.city ? `${node.id} — ${node.city}` : node.id
      }))
  }, [graphData.nodes])

  const nodeById = useMemo(() => {
    return new Map(graphData.nodes.map((node) => [node.id, node]))
  }, [graphData.nodes])

  const connectionMap = useMemo(() => {
    const map = new Map()

    graphData.nodes.forEach((node) => {
      map.set(node.id, [])
    })

    graphData.edges.forEach((edge) => {
      const fromNode = nodeById.get(edge.from)
      const toNode = nodeById.get(edge.to)
      const weight = extractWeightNumber(edge.label ?? edge.weight ?? edge.peso ?? '')

      if (!map.has(edge.from)) map.set(edge.from, [])
      if (!map.has(edge.to)) map.set(edge.to, [])

      map.get(edge.from).push({
        code: edge.to,
        city: toNode?.city || '',
        weight
      })

      map.get(edge.to).push({
        code: edge.from,
        city: fromNode?.city || '',
        weight
      })
    })

    for (const [key, values] of map.entries()) {
      const unique = values.filter(
        (item, index, arr) =>
          index ===
          arr.findIndex(
            (candidate) =>
              candidate.code === item.code &&
              candidate.weight === item.weight
          )
      )

      unique.sort((a, b) => a.code.localeCompare(b.code))
      map.set(key, unique)
    }

    return map
  }, [graphData.edges, graphData.nodes, nodeById])

  const dijkstraTableNodes = useMemo(() => {
    return [...graphData.nodes].map((node) => node.id).sort((a, b) => a.localeCompare(b))
  }, [graphData.nodes])

  const topRoutesToShow = useMemo(() => {
    if (pathResult?.topRoutes?.length > 0) {
      return pathResult.topRoutes
    }

    if (pathResult?.path?.length > 0) {
      return [
        {
          path: pathResult.path,
          cost: pathResult.cost,
          connections: pathResult.connections
        }
      ]
    }

    return []
  }, [pathResult])

  const buildAdjacencyMap = () => {
    const adjacency = new Map()

    graphData.nodes.forEach((node) => {
      adjacency.set(node.id, [])
    })

    graphData.edges.forEach((edge) => {
      const rawWeight = extractWeightNumber(edge.label ?? edge.weight ?? edge.peso ?? '')
      const weight = Number(rawWeight)

      if (Number.isNaN(weight)) return

      if (!adjacency.has(edge.from)) adjacency.set(edge.from, [])
      if (!adjacency.has(edge.to)) adjacency.set(edge.to, [])

      adjacency.get(edge.from).push({ to: edge.to, weight })
      adjacency.get(edge.to).push({ to: edge.from, weight })
    })

    return adjacency
  }

  const generateDijkstraSteps = (start, end) => {
    if (!start || !end) return []

    const adjacency = buildAdjacencyMap()
    const nodeIds = [...graphData.nodes].map((node) => node.id).sort((a, b) => a.localeCompare(b))
    const distances = {}
    const previous = {}
    const visited = new Set()
    const steps = []

    nodeIds.forEach((nodeId) => {
      distances[nodeId] = Infinity
      previous[nodeId] = null
    })

    distances[start] = 0
    previous[start] = start

    while (visited.size < nodeIds.length) {
      const unvisited = nodeIds.filter((nodeId) => !visited.has(nodeId))
      let current = null

      for (const nodeId of unvisited) {
        if (distances[nodeId] !== Infinity) {
          if (current === null || distances[nodeId] < distances[current]) {
            current = nodeId
          }
        }
      }

      if (current === null) break

      visited.add(current)
      const neighbors = adjacency.get(current) || []

      neighbors.forEach(({ to, weight }) => {
        if (visited.has(to)) return
        const alt = distances[current] + weight
        if (alt < distances[to]) {
          distances[to] = alt
          previous[to] = current
        }
      })

      const snapshot = {
        selectedNode: current,
        rows: {}
      }

      nodeIds.forEach((nodeId) => {
        if (distances[nodeId] === Infinity) {
          snapshot.rows[nodeId] = '-'
          return
        }
        const parent = previous[nodeId] || nodeId
        snapshot.rows[nodeId] = `(${Math.trunc(distances[nodeId])}, ${parent})`
      })

      steps.push(snapshot)

      if (current === end) break
    }

    return steps
  }

  const playDijkstraSteps = (start, end) => {
    resetDijkstraSimulation()
    if (!start || !end) return

    const steps = generateDijkstraSteps(start, end)
    if (!steps.length) return

    setIsSimulatingSteps(true)

    steps.forEach((step, index) => {
      const timeoutId = setTimeout(() => {
        setDijkstraSteps((prev) => [...prev, step])
        if (index === steps.length - 1) {
          setIsSimulatingSteps(false)
        }
      }, index * 1100)

      simulationTimeoutsRef.current.push(timeoutId)
    })
  }

  const isIntermediatePathNode = (
    nodeId,
    customPath = pathResultRef.current?.path || [],
    customStart = startAirportRef.current,
    customEnd = endAirportRef.current
  ) => {
    if (!customPath.length) return false
    if (nodeId === customStart || nodeId === customEnd) return false
    return customPath.includes(nodeId)
  }

  const getNodeVisualState = (
    nodeId,
    path = [],
    customStart = startAirport,
    customEnd = endAirport,
    pendingSwapType = pendingSwapTypeRef.current
  ) => {
    const isStart = !!customStart && nodeId === customStart
    const isEnd = !!customEnd && nodeId === customEnd
    const isIntermediate = path.includes(nodeId) && !isStart && !isEnd

    if (isStart && pendingSwapType === 'start') {
      return { background: '#7c5cff', border: '#ffffff' }
    }
    if (isEnd && pendingSwapType === 'end') {
      return { background: '#f6c56f', border: '#ffffff' }
    }
    if (isStart) {
      return { background: '#26c281', border: '#ffffff' }
    }
    if (isEnd) {
      return { background: '#ff6b6b', border: '#ffffff' }
    }
    if (isIntermediate) {
      return { background: '#f6c56f', border: '#ffe29e' }
    }

    return { background: '#4da3ff', border: '#9fcbff' }
  }

  const applyGraphVisual = (
    path = [],
    customStart = startAirportRef.current,
    customEnd = endAirportRef.current,
    pendingSwapType = pendingSwapTypeRef.current,
    fitAfter = false
  ) => {
    if (!networkRef.current) return

    const isPathEdge = (edge) =>
      path.some(
        (node, i) =>
          i < path.length - 1 &&
          ((edge.from === path[i] && edge.to === path[i + 1]) ||
            (edge.from === path[i + 1] && edge.to === path[i]))
      )

    networkRef.current.setData({
      nodes: graphData.nodes.map((node) => ({
        ...node,
        color: getNodeVisualState(node.id, path, customStart, customEnd, pendingSwapType)
      })),
      edges: graphData.edges.map((edge) => ({
        ...edge,
        color: { color: isPathEdge(edge) ? '#f6c56f' : 'rgba(185, 203, 227, 0.28)' },
        width: isPathEdge(edge) ? 4.5 : 1.6
      }))
    })

    if (fitAfter) {
      setTimeout(() => {
        networkRef.current?.fit({ animation: { duration: 350, easingFunction: 'easeInOutQuad' } })
      }, 120)
    }
  }

  // Aliases for backwards compat within this file
  const updateGraphVisual = (path, start, end, pending) => applyGraphVisual(path, start, end, pending, false)
  const highlightPath = (path, start, end, pending) => applyGraphVisual(path, start, end, pending, true)

  const calculatePath = async (
    customStart = startAirportRef.current,
    customEnd = endAirportRef.current
  ) => {
    if (!customStart || !customEnd || customStart === customEnd) {
      setPathResult(null)
      setVisibleTopRoutes(5)
      resetDijkstraSimulation()
      updateGraphVisual([], customStart, customEnd, pendingSwapTypeRef.current)
      return
    }

    setLoading(true)

    try {
      const response = await axios.post('http://localhost:5000/api/dijkstra', {
        start: customStart,
        end: customEnd
      })

      if (response.data.success) {
        setVisibleTopRoutes(5)
        setPathResult(response.data)
        highlightPath(response.data.path, customStart, customEnd, pendingSwapTypeRef.current)
        playDijkstraSteps(customStart, customEnd)
      } else {
        alert(response.data.message)
        setPathResult(null)
        setVisibleTopRoutes(5)
        resetDijkstraSimulation()
        updateGraphVisual([], customStart, customEnd, pendingSwapTypeRef.current)
      }
    } catch (error) {
      console.error('Erro ao calcular caminho:', error)
      alert('Erro ao calcular caminho')
      setPathResult(null)
      setVisibleTopRoutes(5)
      resetDijkstraSimulation()
      updateGraphVisual([], customStart, customEnd, pendingSwapTypeRef.current)
    } finally {
      setLoading(false)
    }
  }

  const clearStartAndWaitForNewSelection = () => {
    const currentEnd = endAirportRef.current
    pendingSwapTypeRef.current = 'start'
    skipAutoCalculateRef.current = true
    setPathResult(null)
    setVisibleTopRoutes(5)
    resetDijkstraSimulation()
    setStartAirport('')
    updateGraphVisual([], '', currentEnd, 'start')
  }

  const clearEndAndWaitForNewSelection = () => {
    const currentStart = startAirportRef.current
    pendingSwapTypeRef.current = 'end'
    skipAutoCalculateRef.current = true
    setPathResult(null)
    setVisibleTopRoutes(5)
    resetDijkstraSimulation()
    setEndAirport('')
    updateGraphVisual([], currentStart, '', 'end')
  }

  const initializeNetwork = () => {
    if (networkRef.current) {
      networkRef.current.destroy()
    }

    const options = {
      autoResize: true,
      layout: {
        improvedLayout: true,
        randomSeed: 12
      },
      nodes: {
        shape: 'dot',
        size: 26,
        borderWidth: 2.5,
        shadow: {
          enabled: true,
          color: 'rgba(0,0,0,0.28)',
          size: 16,
          x: 0,
          y: 8
        },
        font: {
          size: 18,
          color: '#e8eef7',
          face: 'Inter'
        },
        color: {
          background: '#4da3ff',
          border: '#9fcbff',
          highlight: {
            background: '#7c5cff',
            border: '#ffffff'
          },
          hover: {
            background: '#69b3ff',
            border: '#ffffff'
          }
        }
      },
      edges: {
        width: 2.2,
        selectionWidth: 3,
        hoverWidth: 2.8,
        shadow: {
          enabled: false
        },
        font: {
          size: 11,
          align: 'middle',
          color: 'rgba(232, 238, 247, 0.78)',
          face: 'Inter',
          strokeWidth: 0,
          background: 'rgba(6, 18, 31, 0.35)'
        },
        color: {
          color: 'rgba(185, 203, 227, 0.48)',
          highlight: '#f6c56f',
          hover: '#8fc5ff',
          inherit: false
        },
        smooth: {
          enabled: true,
          type: 'continuous',
          roundness: 0.18
        }
      },
      physics: {
        enabled: true,
        solver: 'barnesHut',
        stabilization: {
          enabled: true,
          iterations: 350,
          updateInterval: 25,
          fit: true
        },
        barnesHut: {
          gravitationalConstant: -5400,
          centralGravity: 0.16,
          springLength: 170,
          springConstant: 0.026,
          damping: 0.16,
          avoidOverlap: 0.8
        }
      },
      interaction: {
        hover: true,
        hoverConnectedEdges: true,
        tooltipDelay: 0,
        navigationButtons: false,
        zoomView: true,
        dragView: true,
        multiselect: false,
        selectable: true
      }
    }

    networkRef.current = new Network(containerRef.current, graphData, options)

    // Evento de hover para mostrar tooltip
    networkRef.current.on('hoverNode', function(params) {
      const nodeId = params.node
      setHoveredNode(nodeId)
      // Pega posição do mouse relativa ao container
      if (params.event && params.event.pointer && params.event.pointer.DOM) {
        setTooltipPos({
          x: params.event.pointer.DOM.x,
          y: params.event.pointer.DOM.y
        })
      }
    })
    networkRef.current.on('blurNode', function() {
      setHoveredNode(null)
    })

    networkRef.current.once('stabilizationIterationsDone', () => {
      if (!networkRef.current) return

      networkRef.current.setOptions({
        physics: false
      })

      const currentPath = pathResultRef.current?.path || []
      const currentStart = startAirportRef.current
      const currentEnd = endAirportRef.current

      if (currentPath.length) {
        highlightPath(currentPath, currentStart, currentEnd, pendingSwapTypeRef.current)
      } else {
        updateGraphVisual([], currentStart, currentEnd, pendingSwapTypeRef.current)
      }

      networkRef.current.redraw()
    })

    networkRef.current.on('doubleClick', () => {
      if (networkRef.current) {
        networkRef.current.fit({
          animation: {
            duration: 300,
            easingFunction: 'easeInOutQuad'
          }
        })
      }
    })

    networkRef.current.on('click', (params) => {
      const currentStart = startAirportRef.current
      const currentEnd = endAirportRef.current
      const currentPath = pathResultRef.current?.path || []
      const pendingType = pendingSwapTypeRef.current

      if (params.nodes.length === 0) {
        pendingSwapTypeRef.current = null
        if (currentPath.length) {
          highlightPath(currentPath, currentStart, currentEnd, null)
        } else {
          updateGraphVisual([], currentStart, currentEnd, null)
        }
        return
      }

      const nodeId = params.nodes[0]
      const clickedIsStart = !!currentStart && nodeId === currentStart
      const clickedIsEnd = !!currentEnd && nodeId === currentEnd
      const clickedIsIntermediate = isIntermediatePathNode(
        nodeId,
        currentPath,
        currentStart,
        currentEnd
      )

      if (clickedIsIntermediate) return

      if (clickedIsStart) {
        clearStartAndWaitForNewSelection()
        return
      }

      if (clickedIsEnd) {
        clearEndAndWaitForNewSelection()
        return
      }

      if (pendingType === 'start') {
        if (nodeId === currentEnd) return
        pendingSwapTypeRef.current = null
        setStartAirport(nodeId)
        return
      }

      if (pendingType === 'end') {
        if (nodeId === currentStart) return
        pendingSwapTypeRef.current = null
        setEndAirport(nodeId)
        return
      }

      if (!currentStart && !currentEnd) {
        setStartAirport(nodeId)
        return
      }

      if (currentStart && !currentEnd) {
        if (nodeId === currentStart) return
        setEndAirport(nodeId)
        return
      }

      if (!currentStart && currentEnd) {
        if (nodeId === currentEnd) return
        setStartAirport(nodeId)
      }
    })
  }

  const resetSelection = async () => {
    pendingSwapTypeRef.current = null
    skipAutoCalculateRef.current = true
    setSelectedConnectionAirport(null)
    setSearchQuery('')
    setSearchResults([])
    setStartAirport('')
    setEndAirport('')
    setPathResult(null)
    setVisibleTopRoutes(5)
    resetDijkstraSimulation()
    await loadGraphData()
  }

  const handleSearch = (e) => {
    const q = e.target.value
    setSearchQuery(q)

    if (!q.trim()) {
      setSearchResults([])
      setSelectedConnectionAirport(null)
      return
    }

    const lower = q.toLowerCase()
    const matches = graphData.nodes
      .filter(
        (n) =>
          n.id.toLowerCase().includes(lower) ||
          (n.city && n.city.toLowerCase().includes(lower))
      )
      .slice(0, 8)

    setSearchResults(matches)
  }

  const handleSearchSelect = (nodeId) => {
    const node = nodeById.get(nodeId)

    setSearchQuery(node ? `${node.id}${node.city ? ` — ${node.city}` : ''}` : nodeId)
    setSearchResults([])

    setSelectedConnectionAirport({
      id: nodeId,
      city: node?.city || '',
      connections: connectionMap.get(nodeId) || []
    })

    if (networkRef.current) {
      networkRef.current.focus(nodeId, {
        scale: 1.8,
        animation: {
          duration: 700,
          easingFunction: 'easeInOutQuad'
        }
      })
      networkRef.current.selectNodes([nodeId])
    }
  }

  const handleStartChange = (value) => {
    const currentEnd = endAirportRef.current

    if (!value) {
      clearStartAndWaitForNewSelection()
      return
    }

    pendingSwapTypeRef.current = null
    if (value === currentEnd) return
    setStartAirport(value)
  }

  const handleEndChange = (value) => {
    const currentStart = startAirportRef.current

    if (!value) {
      clearEndAndWaitForNewSelection()
      return
    }

    pendingSwapTypeRef.current = null
    if (value === currentStart) return
    setEndAirport(value)
  }

  const getRouteRankMeta = (index) => {
    const medals = [
      { badge: '🥇 Melhor rota', className: 'route-rank-card top-1' },
      { badge: '🥈 2ª melhor',   className: 'route-rank-card top-2' },
      { badge: '🥉 3ª melhor',   className: 'route-rank-card top-3' },
    ]
    return medals[index] ?? { badge: `#${index + 1}`, className: 'route-rank-card' }
  }

  const handleMapNodeClick = (nodeId) => {
    const currentStart = startAirportRef.current
    const currentEnd = endAirportRef.current
    const currentPath = pathResultRef.current?.path || []
    if (isIntermediatePathNode(nodeId, currentPath, currentStart, currentEnd)) return
    if (nodeId === currentStart) { clearStartAndWaitForNewSelection(); return }
    if (nodeId === currentEnd) { clearEndAndWaitForNewSelection(); return }
    const pendingType = pendingSwapTypeRef.current
    if (pendingType === 'start') { if (nodeId === currentEnd) return; pendingSwapTypeRef.current = null; setStartAirport(nodeId); return }
    if (pendingType === 'end') { if (nodeId === currentStart) return; pendingSwapTypeRef.current = null; setEndAirport(nodeId); return }
    if (!currentStart && !currentEnd) { setStartAirport(nodeId); return }
    if (currentStart && !currentEnd) { if (nodeId === currentStart) return; setEndAirport(nodeId); return }
    if (!currentStart && currentEnd) { if (nodeId === currentEnd) return; setStartAirport(nodeId) }
  }
    pathResult?.cost !== undefined && pathResult?.cost !== null
      ? Math.trunc(Number(pathResult.cost))
      : ''

  const maxTopRoutes = Math.min(20, topRoutesToShow.length)

  return (
    <div className="app-modern-bg" style={{ position: 'relative' }}>
      <header className="app-modern-header">
        <div className="header-top-actions">
          <button
            onClick={handleGoBack}
            className="declaracaoia-back-button"
            type="button"
            title="Voltar"
          >
            <span className="declaracaoia-back-icon" aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
              >
                <path
                  d="M15 6L9 12L15 18"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="declaracaoia-back-text">Voltar</span>
          </button>
        </div>

        <div className="clean-header">
          <div className="clean-header-brand">
            <img src={logo} alt="Logo ETA Airlines" className="clean-header-logo" />
          </div>
          <div className="clean-header-content">
            <h1 className="clean-header-title">Painel de Voos & Rotas</h1>
          </div>
        </div>
      </header>

      <main className="app-modern-main">
        <section className="glass-card app-top-bar clean-top-bar">
          <div className="field-group">
            <label>Origem</label>
            <select
              value={startAirport}
              onChange={(e) => handleStartChange(e.target.value)}
            >
              <option value="">Selecione a origem</option>
              {airportOptions.map((airport) => (
                <option
                  key={airport.value}
                  value={airport.value}
                  disabled={airport.value === endAirport}
                >
                  {airport.label}
                </option>
              ))}
            </select>
          </div>

          <div className="field-group">
            <label>Destino</label>
            <select
              value={endAirport}
              onChange={(e) => handleEndChange(e.target.value)}
            >
              <option value="">Selecione o destino</option>
              {airportOptions.map((airport) => (
                <option
                  key={airport.value}
                  value={airport.value}
                  disabled={airport.value === startAirport}
                >
                  {airport.label}
                </option>
              ))}
            </select>
          </div>

          <div className="top-action">
            <button
              onClick={() => calculatePath()}
              disabled={loading || !startAirport || !endAirport}
              className="modern-btn main"
              type="button"
            >
              {loading ? 'Analisando...' : 'Analisar'}
            </button>
          </div>

          <div className="top-action">
            <button onClick={resetSelection} className="modern-btn" type="button">
              Limpar
            </button>
          </div>
        </section>

        {pathResult ? (
          <section className="glass-card app-route-summary">
            <div className="summary-stats">
              <div className="summary-stat">
                <div className="summary-label">Peso total</div>
                <div className="summary-value">{formattedCost}</div>
              </div>
              <div className="summary-stat">
                <div className="summary-label">Conexões</div>
                <div className="summary-value">{pathResult.connections}</div>
              </div>
            </div>

            <div className="summary-route">
              <div className="summary-route-title">Rota encontrada</div>
              <div className="summary-route-subtitle">
                Sequência de aeroportos do trajeto analisado
              </div>

              <div className="summary-route-flow">
                {pathResult.path.map((airport, index) => (
                  <div key={index} className="route-flow-item">
                    <span className="route-flow-code">{airport}</span>
                    {index < pathResult.path.length - 1 && (
                      <span className="route-flow-arrow">→</span>
                    )}
                  </div>
                ))}
              </div>

              <div className="path-details">
                {pathResult.path_info.map((airport, index) => (
                  <div key={index} className="path-airport">
                    <span className="path-airport-code">{airport.code}</span>
                    <span className="path-airport-separator">—</span>
                    <span className="path-airport-city">{airport.city}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : (
          <section className="glass-card empty-summary">
            Selecione os aeroportos para ver peso, conexões e rota detalhada automaticamente.
          </section>
        )}

        <section className="glass-card app-modern-graph" style={{ position: 'relative' }}>
          <BrazilMap
            graphData={graphData}
            pathResult={pathResult}
            startAirport={startAirport}
            endAirport={endAirport}
            aeroportosData={aeroportosData}
            egoAeroportos={egoAeroportos}
          onNodeClick={handleMapNodeClick}
          />
        </section>

        <div className="airport-connections-panel">
            <div className="airport-connections-header">
              <div className="airport-connections-title">Conexões do Aeroporto</div>
              <div className="airport-connections-subtitle">
                Pesquise um aeroporto para visualizar suas conexões diretas.
              </div>
            </div>

            <div className="airport-connections-search" ref={searchRef}>
              <input
                type="text"
                className="search-bar-input"
                value={searchQuery}
                onChange={handleSearch}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setSearchResults([])
                  if (e.key === 'Enter' && searchResults.length > 0) {
                    handleSearchSelect(searchResults[0].id)
                  }
                }}
                placeholder="Digite o código ou a cidade do aeroporto"
                autoComplete="off"
              />

              {searchResults.length > 0 && (
                <ul className="search-bar-dropdown">
                  {searchResults.map((n) => (
                    <li
                      key={n.id}
                      className="search-bar-item"
                      onMouseDown={() => handleSearchSelect(n.id)}
                    >
                      <strong className="search-bar-code">{n.id}</strong>
                      <span className="search-bar-city">{n.city}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {selectedConnectionAirport ? (
              <>
                <div className="airport-ego-panel-horizontal">
                  <div className="ego-block-title">
                    {selectedConnectionAirport.id}
                    {aeroportosData[selectedConnectionAirport.id]?.cidade ? (
                      <span className="ego-block-city"> — {aeroportosData[selectedConnectionAirport.id]?.cidade}</span>
                    ) : null}
                  </div>
                  <div className="ego-block-row">
                    <div className="ego-block-item"><span>Região:</span> <strong>{aeroportosData[selectedConnectionAirport.id]?.regiao || '-'}</strong></div>
                    <div className="ego-block-item"><span>Grau:</span> <strong>{egoAeroportos[selectedConnectionAirport.id]?.grau || '-'}</strong></div>
                    <div className="ego-block-item"><span>Ordem Ego:</span> <strong>{egoAeroportos[selectedConnectionAirport.id]?.ordem_ego || '-'}</strong></div>
                    <div className="ego-block-item"><span>Tamanho Ego:</span> <strong>{egoAeroportos[selectedConnectionAirport.id]?.tamanho_ego || '-'}</strong></div>
                    <div className="ego-block-item"><span>Densidade Ego:</span> <strong>{egoAeroportos[selectedConnectionAirport.id]?.densidade_ego || '-'}</strong></div>
                  </div>
                </div>
                <div className="airport-connections-content">
                  {selectedConnectionAirport.connections.length > 0 ? (
                    <div className="airport-connections-list">
                      {selectedConnectionAirport.connections.map((connection, index) => (
                        <div
                          key={`${selectedConnectionAirport.id}-${connection.code}-${connection.weight}-${index}`}
                          className="airport-connection-card"
                        >
                          <div className="airport-connection-info">
                            <div className="airport-connection-code">{connection.code}</div>
                            {connection.city ? (
                              <div className="airport-connection-city">{connection.city}</div>
                            ) : null}
                          </div>

                          <div className="airport-connection-weight">
                            {connection.weight ? `Peso ${connection.weight}` : 'Peso -'}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="airport-connections-no-data">
                      Este aeroporto não possui conexões cadastradas.
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="airport-connections-empty">
                Pesquise um aeroporto acima para exibir suas conexões aqui.
              </div>
            )}
          </div>

          <div className="algorithm-steps-panel">
            <div className="algorithm-steps-header">
              <div className="algorithm-steps-title">Passo a passo do algoritmo</div>
              <div className="algorithm-steps-subtitle">
                Visualização gradual da execução do Dijkstra até encontrar a melhor rota.
              </div>
            </div>

            {startAirport && endAirport ? (
              dijkstraSteps.length > 0 ? (
                <>
                  <div className="algorithm-steps-table-wrap">
                    <table className="algorithm-steps-table">
                      <thead>
                        <tr>
                          <th>Aeroporto</th>
                          {dijkstraSteps.map((_, index) => (
                            <th key={`step-head-${index}`}>Passo {index + 1}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {dijkstraTableNodes.map((nodeId) => (
                          <tr key={nodeId}>
                            <td className="algorithm-node-label">{nodeId}</td>
                            {dijkstraSteps.map((step, stepIndex) => {
                              const isSelected = step.selectedNode === nodeId
                              const isFinalSelected =
                                stepIndex === dijkstraSteps.length - 1 &&
                                pathResult?.path?.includes(nodeId)

                              return (
                                <td
                                  key={`${nodeId}-${stepIndex}`}
                                  className={[
                                    isSelected ? 'is-active-step' : '',
                                    isFinalSelected ? 'is-final-path-step' : ''
                                  ]
                                    .filter(Boolean)
                                    .join(' ')}
                                >
                                  {isSelected ? (
                                    <span className="algorithm-step-value emphasis">
                                      {step.rows[nodeId]}
                                    </span>
                                  ) : (
                                    <span className="algorithm-step-value">
                                      {step.rows[nodeId]}
                                    </span>
                                  )}
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="algorithm-steps-status">
                    {isSimulatingSteps ? (
                      <span className="algorithm-status-badge running">
                        Executando passo a passo...
                      </span>
                    ) : (
                      <span className="algorithm-status-badge done">
                        Melhor rota encontrada
                      </span>
                    )}
                  </div>

                  <div className="top-routes-visual">
                    <div className="top-routes-header">
                      <div className="top-routes-title">Top 20 rotas possíveis</div>
                      <div className="top-routes-subtitle">
                        Ranking visual da melhor rota até a menos eficiente para o trajeto
                        selecionado.
                      </div>
                    </div>

                    {topRoutesToShow.length > 0 ? (
                      <>
                        <div className="top-routes-list">
                          {topRoutesToShow.slice(0, visibleTopRoutes).map((route, index) => {
                            const rankMeta = getRouteRankMeta(index)
                            const totalCost = Math.trunc(Number(route.cost || 0))
                            const totalConnections =
                              route.connections ?? Math.max((route.path?.length || 0) - 2, 0)
                            const totalSegments = Math.max((route.path?.length || 0) - 1, 0)

                            return (
                              <div
                                key={`top-route-${index}-${route.path?.join('-') || index}`}
                                className={rankMeta.className}
                              >
                                <div className="route-rank-header">
                                  <div className="route-rank-badge">{rankMeta.badge}</div>
                                  <div className="route-rank-metrics">
                                    <span className="route-metric">
                                      ⚖ Peso total: <strong>{totalCost}</strong>
                                    </span>
                                    <span className="route-metric">
                                      🔁 Conexões: <strong>{totalConnections}</strong>
                                    </span>
                                    <span className="route-metric">
                                      ✈ Trechos: <strong>{totalSegments}</strong>
                                    </span>
                                  </div>
                                </div>

                                <div className="route-rank-flow">
                                  {route.path?.map((airport, pathIndex) => (
                                    <div
                                      key={`${airport}-${pathIndex}`}
                                      className="route-rank-flow-item"
                                    >
                                      <span className="route-rank-airport">{airport}</span>
                                      {pathIndex < route.path.length - 1 && (
                                        <span className="route-rank-arrow">→</span>
                                      )}
                                    </div>
                                  ))}
                                </div>

                                <div className="route-rank-footer">
                                  <div className="route-rank-quality-bar">
                                    <div
                                      className="route-rank-quality-fill"
                                      style={{
                                        width: `${Math.max(18, 100 - index * 4)}%`
                                      }}
                                    />
                                  </div>
                                  <div className="route-rank-footer-label">
                                    {index === 0
                                      ? 'Mais eficiente'
                                      : index < 5
                                      ? 'Ótima alternativa'
                                      : index < 10
                                      ? 'Boa alternativa'
                                      : 'Alternativa menos eficiente'}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>

                        {maxTopRoutes > 5 && (
                          <div className="top-routes-actions">
                            {visibleTopRoutes < maxTopRoutes && (
                              <button
                                type="button"
                                className="top-routes-btn"
                                onClick={() =>
                                  setVisibleTopRoutes((prev) => Math.min(prev + 5, maxTopRoutes))
                                }
                              >
                                Mostrar mais 5
                              </button>
                            )}

                            {visibleTopRoutes > 5 && (
                              <button
                                type="button"
                                className="top-routes-btn secondary"
                                onClick={() => setVisibleTopRoutes(5)}
                              >
                                Mostrar menos
                              </button>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="algorithm-steps-empty">
                        Nenhuma rota alternativa foi retornada para este trajeto.
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="algorithm-steps-empty">
                  Clique em <strong>Analisar</strong> ou selecione origem e destino para iniciar a
                  simulação do algoritmo.
                </div>
              )
            ) : (
              <div className="algorithm-steps-empty">
                Escolha uma origem e um destino para visualizar a execução passo a passo do
                algoritmo.
              </div>
            )}
          </div>
      </main>
    </div>
  )
}

export default App
