import { useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import GlobeGL from 'react-globe.gl'

import logoEtn from './assets/logo-2/logo-branca-isolada2.png'

// ---------------------------------------------------------------------------
// Coordenadas geográficas reais de cada porto (de data/ETN/vertices.csv)
// ---------------------------------------------------------------------------
const PORT_COORDS = {
  ESALG: { lat: 36.125, lon: -5.45 },
  TRAMB: { lat: 40.983, lon: 28.745 },
  BEANR: { lat: 51.216666, lon: 4.416666 },
  NGAPP: { lat: 6.4218, lon: 3.3437 },
  NZAKL: { lat: -36.86667, lon: 174.766667 },
  PABLB: { lat: 8.9375, lon: -79.5625 },
  ESBCN: { lat: 41.38334, lon: 2.18334 },
  DEBRV: { lat: 53.55, lon: 8.58 },
  AUBNE: { lat: -27.5, lon: 153.0156 },
  KRPUS: { lat: 35.1, lon: 129.04 },
  USCHS: { lat: 32.79423, lon: -79.94032 },
  LKCMB: { lat: 6.933334, lon: 79.85 },
  ZADUR: { lat: -29.8437, lon: 31.0156 },
  GBFXT: { lat: 51.9531, lon: 1.35 },
  ITGIT: { lat: 38.416666, lon: 15.9 },
  ECGYE: { lat: -2.169538, lon: -79.902519 },
  DEHAM: { lat: 53.55, lon: 10 },
  HKHKG: { lat: 22.320135, lon: 114.200376 },
  INNSA: { lat: 18.56, lon: 73.02 },
  AEJEA: { lat: 25.14, lon: 55.19 },
  SAJED: { lat: 21.48334, lon: 39.2 },
  TWKHH: { lat: 22.633334, lon: 120.28333 },
  USLAX: { lat: 34.0522, lon: -118.2428 },
  AOLAD: { lat: -9.11, lon: 13.242 },
  PAMIT: { lat: 9.35, lon: -79.9 },
  USMIA: { lat: 25.79371, lon: -80.20735 },
  KEMBA: { lat: -4.0468, lon: 39.6562 },
  UYMVD: { lat: -34.883333, lon: -56.183333 },
  CAMTR: { lat: 45.5, lon: -73.5781 },
  USEWR: { lat: 40.73812, lon: -74.18329 },
  MYPKG: { lat: 3.042, lon: 101.446 },
  PKBQM: { lat: 24.767667, lon: 67.33334 },
  EGPSD: { lat: 31.21583, lon: 32.35722 },
  MAPTM: { lat: 35.885, lon: -5.4847 },
  CNTAO: { lat: 36.08333, lon: 120.35 },
  NLRTM: { lat: 51.91667, lon: 4.5 },
  OMSLL: { lat: 17.014, lon: 54.091 },
  CLSAI: { lat: -33.58, lon: -71.63 },
  BRSSZ: { lat: -23.95, lon: -46.33 },
  CNSHA: { lat: 31.2187, lon: 121.4531 },
  SGSIN: { lat: 1.2812, lon: 103.8437 },
  GHTKD: { lat: 4.88333, lon: -1.75 },
  MYTPP: { lat: 1.405, lon: 103.593 },
  CAVAN: { lat: 49.25, lon: -123.125 },
  CNYTN: { lat: 22.58333, lon: 114.26667 },
  JPYOK: { lat: 35.45, lon: 139.55 },
  BEZEE: { lat: 51.3281, lon: 3.1875 },
}

// ---------------------------------------------------------------------------
// 23 regiões (D_Region) → 23 cores distintas geradas por HSL espaçado
// ---------------------------------------------------------------------------
const REGION_LIST = [
  'Australia', 'Brazil', 'Canada East Coast', 'Canada West', 'Central China',
  'Dubai', 'Hong Kong', 'Japan', 'Korea', 'Mumbai', 'North China',
  'North Continent Europe', 'Saudi Arabia', 'Singapore', 'South Africa',
  'South America West Coast', 'South China', 'UK', 'US East Coast',
  'US Gulf Coast', 'US West Coast', 'West Africa', 'West Med',
]

const REGION_COLOR = {}
REGION_LIST.forEach((region, i) => {
  const hue = Math.round((i * 360) / REGION_LIST.length)
  const light = i % 2 === 0 ? 58 : 46
  REGION_COLOR[region] = `hsl(${hue}, 70%, ${light}%)`
})

const getRegionColor = (region) => REGION_COLOR[region] || '#7f93a8'

// Formata o peso preservando o valor float (sem arredondar para inteiro)
const formatWeight = (w) => {
  const n = Number(w)
  if (Number.isNaN(n)) return '-'
  return Number.isInteger(n) ? String(n) : String(parseFloat(n.toFixed(2)))
}

// ===========================================================================
// Mapa-múndi (Plotly scattergeo) — portos e rotas marítimas
// ===========================================================================
function WorldMap({ graphData, pathResult, startPort, endPort, portMeta, onNodeClick }) {
  const plotRef = useRef(null)
  const wrapRef = useRef(null)
  const [plotlyLoaded, setPlotlyLoaded] = useState(!!window.Plotly)
  const [edgeTooltip, setEdgeTooltip] = useState(null)

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plotlyLoaded, graphData, pathResult, startPort, endPort])

  // Usa o path sempre que disponível (inclui fallback DFS do ciclo negativo do BF)
  const activePath = pathResult?.path?.length > 1 ? pathResult.path : []

  const isPathEdge = (from, to) =>
    activePath.length > 1 && activePath.some((n, i) =>
      i < activePath.length - 1 && activePath[i] === from && activePath[i + 1] === to
    )

  function renderMap() {
    const Plotly = window.Plotly

    // Arestas agrupadas em 2 traces (base + rota ativa) usando null como separador
    const baseLon = [], baseLat = []
    const pathLon = [], pathLat = []
    const midLon = [], midLat = [], midCustom = []

    graphData.edges.forEach((edge) => {
      const A = PORT_COORDS[edge.from]
      const B = PORT_COORDS[edge.to]
      if (!A || !B) return
      const inPath = isPathEdge(edge.from, edge.to)
      if (inPath) {
        pathLon.push(A.lon, B.lon, null); pathLat.push(A.lat, B.lat, null)
      } else {
        baseLon.push(A.lon, B.lon, null); baseLat.push(A.lat, B.lat, null)
      }
      midLon.push((A.lon + B.lon) / 2)
      midLat.push((A.lat + B.lat) / 2)
      midCustom.push([edge.from, edge.to, edge.weight, inPath ? 1 : 0])
    })

    const hasRoute = activePath.length > 0
    const baseEdgeTrace = {
      type: 'scattergeo', mode: 'lines',
      lon: baseLon, lat: baseLat,
      line: {
        width: hasRoute ? 0.4 : 0.7,
        color: hasRoute ? 'rgba(255,255,255,0.07)' : 'rgba(180,200,195,0.18)',
      },
      hoverinfo: 'none', showlegend: false,
    }

    // Halo/glow por trás da rota ativa
    const pathGlowTrace = {
      type: 'scattergeo', mode: 'lines',
      lon: pathLon, lat: pathLat,
      line: { width: 22, color: 'rgba(255,215,0,0.09)' },
      hoverinfo: 'none', showlegend: false,
    }

    const pathEdgeTrace = {
      type: 'scattergeo', mode: 'lines',
      lon: pathLon, lat: pathLat,
      line: { width: 5, color: '#FFD700' },
      hoverinfo: 'none', showlegend: false,
    }

    // Marcadores invisíveis para hover: path=30px, outros=8px
    const weightHoverTrace = {
      type: 'scattergeo', mode: 'markers',
      lon: midLon, lat: midLat,
      marker: {
        size: midCustom.map((c) => (c[3] === 1 ? 30 : 8)),
        color: 'rgba(0,0,0,0)',
        opacity: 0,
      },
      customdata: midCustom,
      hovertemplate: '<extra></extra>',
      showlegend: false,
    }

    // Nós agrupados por região (para legenda + cor por região)
    const regionMap = {}
    graphData.nodes.forEach((node) => {
      if (!PORT_COORDS[node.id]) return
      const region = portMeta[node.id]?.region || 'Outro'
      if (!regionMap[region]) regionMap[region] = []
      regionMap[region].push(node)
    })

    const nodeTraces = Object.entries(regionMap).map(([region, nodes]) => ({
      type: 'scattergeo', mode: 'markers+text', name: region,
      lon: nodes.map((n) => PORT_COORDS[n.id].lon),
      lat: nodes.map((n) => PORT_COORDS[n.id].lat),
      text: nodes.map((n) => n.id),
      textposition: 'top center',
      textfont: { family: 'Inter, sans-serif', size: 9, color: '#dbeee5' },
      marker: {
        size: nodes.map((n) =>
          n.id === startPort || n.id === endPort ? 18 :
          activePath.includes(n.id) ? 13 : 9
        ),
        color: nodes.map((n) =>
          n.id === startPort ? '#26c281' :
          n.id === endPort ? '#ff6b6b' :
          activePath.includes(n.id) ? '#FFD700' :
          getRegionColor(region)
        ),
        line: {
          color: nodes.map((n) =>
            n.id === startPort || n.id === endPort || activePath.includes(n.id)
              ? '#ffffff' : 'rgba(255,255,255,0.35)'
          ),
          width: nodes.map((n) =>
            n.id === startPort || n.id === endPort || activePath.includes(n.id) ? 2.2 : 0.8
          ),
        },
      },
      customdata: nodes.map((n) => [
        n.id,
        portMeta[n.id]?.name || '',
        portMeta[n.id]?.country || '',
        region,
      ]),
      hovertemplate:
        '<b>%{customdata[0]}</b> — %{customdata[1]} (%{customdata[2]})<br>' +
        '<i>%{customdata[3]}</i><extra></extra>',
      hoverlabel: {
        bgcolor: '#0b241c',
        bordercolor: getRegionColor(region),
        font: { family: 'Inter', color: '#ecfff7', size: 13 },
      },
    }))

    const layout = {
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent',
      geo: {
        scope: 'world',
        projection: { type: 'natural earth' },
        showland: true, landcolor: '#16271f',
        showocean: true, oceancolor: '#0a1a14',
        showlakes: true, lakecolor: '#0a1a14',
        showcountries: true, countrycolor: '#2c4338',
        showcoastlines: true, coastlinecolor: '#3a5a4b',
        bgcolor: 'transparent', framewidth: 0,
      },
      margin: { t: 0, b: 0, l: 0, r: 0 },
      showlegend: true,
      legend: {
        x: 0.005, y: 0.5, yanchor: 'middle',
        bgcolor: 'rgba(11,36,28,0.82)',
        bordercolor: '#2c4338', borderwidth: 1,
        font: { family: 'Inter', color: '#bfe0d2', size: 9 },
        itemsizing: 'constant',
      },
      autosize: true,
      height: 600,
    }

    // scrollZoom: true → o usuário navega/dá zoom no mapa-múndi com o scroll do mouse
    const config = { responsive: true, displayModeBar: false, scrollZoom: true }

    const weightHoverIndex = 3 // base, pathGlow, path, weightHover

    Plotly.react(
      plotRef.current,
      [baseEdgeTrace, pathGlowTrace, pathEdgeTrace, weightHoverTrace, ...nodeTraces],
      layout, config,
    ).then(() => {
      plotRef.current.removeAllListeners('plotly_hover')
      plotRef.current.removeAllListeners('plotly_unhover')
      plotRef.current.removeAllListeners('plotly_click')

      plotRef.current.on('plotly_hover', (data) => {
        const pt = data.points?.[0]
        if (!pt || !Array.isArray(pt.customdata)) return
        if (pt.curveNumber !== weightHoverIndex) return
        const [from, to, weight, inPathFlag] = pt.customdata
        const event = data.event
        if (!event) return
        const rect = wrapRef.current?.getBoundingClientRect() || { left: 0, top: 0 }
        const hoverLayer = plotRef.current.querySelector('.hoverlayer')
        if (hoverLayer) hoverLayer.style.visibility = 'hidden'
        setEdgeTooltip({
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
          from, to, weight, inPath: inPathFlag === 1,
        })
      })

      plotRef.current.on('plotly_unhover', () => {
        const hoverLayer = plotRef.current.querySelector('.hoverlayer')
        if (hoverLayer) hoverLayer.style.visibility = 'visible'
        setEdgeTooltip(null)
      })

      plotRef.current.on('plotly_click', (data) => {
        const pt = data.points?.[0]
        if (!pt || !pt.customdata) return
        const nodeId = pt.customdata[0]
        if (typeof nodeId === 'string' && nodeId.length <= 5 && onNodeClick) onNodeClick(nodeId)
      })
    })
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%' }}>
      <div ref={plotRef} style={{ width: '100%', minHeight: 600, background: 'transparent' }}>
        {!plotlyLoaded && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 600, color: '#6f9a89', fontSize: 14 }}>
            Carregando mapa-múndi...
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
            background: edgeTooltip.inPath ? 'rgba(20,15,0,0.97)' : 'rgba(11,36,28,0.96)',
            border: `1.5px solid ${edgeTooltip.inPath ? '#FFD700' : '#2c4338'}`,
            borderRadius: 8,
            padding: '6px 12px',
            boxShadow: edgeTooltip.inPath
              ? '0 4px 24px rgba(255,215,0,0.2), 0 0 0 1px rgba(255,215,0,0.08)'
              : '0 4px 20px rgba(0,0,0,0.5)',
            display: 'flex', flexDirection: 'column', gap: 2, minWidth: 110,
          }}
        >
          <div style={{ fontSize: 11, color: '#6f9a89', fontFamily: 'Inter, sans-serif', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Rota
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#ecfff7', fontFamily: 'Inter, sans-serif' }}>
            {edgeTooltip.from} → {edgeTooltip.to}
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: edgeTooltip.inPath ? '#FFD700' : '#9cc8b6', fontFamily: 'Inter, sans-serif', marginTop: 2 }}>
            ⚖ Peso: {formatWeight(edgeTooltip.weight)}
          </div>
          {edgeTooltip.inPath && (
            <div style={{ fontSize: 10, color: '#FFD700', fontFamily: 'Inter, sans-serif', fontWeight: 800, letterSpacing: '0.04em' }}>
              ★ Melhor rota
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ===========================================================================
// Globo 3D interativo (react-globe.gl) — modal de visão 3D
// ===========================================================================
function Globe3DModal({ onClose, graphData, pathResult, startPort, endPort, portMeta }) {
  const globeRef = useRef(null)
  const containerRef = useRef(null)
  const [dimensions, setDimensions] = useState({ w: 900, h: 600 })
  const [autoRotate, setAutoRotate] = useState(true)
  const [globeReady, setGlobeReady] = useState(false)
  const [countriesGeoJSON, setCountriesGeoJSON] = useState({ features: [] })

  // Usa o path sempre que disponível (inclui fallback DFS do ciclo negativo do BF)
  const activePath = useMemo(
    () => (pathResult?.path?.length > 1 ? pathResult.path : []),
    [pathResult],
  )

  const arcsData = useMemo(() => {
    const pathEdges = new Set(
      activePath.slice(0, -1).map((p, i) => `${p}|${activePath[i + 1]}`),
    )
    return graphData.edges
      .map((e) => {
        const A = PORT_COORDS[e.from]
        const B = PORT_COORDS[e.to]
        if (!A || !B) return null
        return {
          startLat: A.lat, startLng: A.lon,
          endLat: B.lat, endLng: B.lon,
          from: e.from, to: e.to,
          weight: e.weight,
          inPath: pathEdges.has(`${e.from}|${e.to}`),
        }
      })
      .filter(Boolean)
  }, [graphData.edges, activePath])

  const pointsData = useMemo(() => {
    const pathSet = new Set(activePath)
    return graphData.nodes
      .filter((n) => PORT_COORDS[n.id])
      .map((n) => ({
        lat: PORT_COORDS[n.id].lat,
        lng: PORT_COORDS[n.id].lon,
        id: n.id,
        region: portMeta[n.id]?.region || 'Outro',
        name: portMeta[n.id]?.name || n.id,
        country: portMeta[n.id]?.country || '',
        isStart: n.id === startPort,
        isEnd: n.id === endPort,
        inPath: pathSet.has(n.id),
      }))
  }, [graphData.nodes, portMeta, startPort, endPort, activePath])

  // Carrega bordas de países (GeoJSON) para exibir no globo
  useEffect(() => {
    fetch('https://raw.githubusercontent.com/vasturiano/globe.gl/master/example/datasets/countries.geojson')
      .then((r) => r.json())
      .then((data) => setCountriesGeoJSON(data))
      .catch(() => {})
  }, [])

  // Ajusta dimensões ao container com ResizeObserver
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      setDimensions({ w: el.clientWidth, h: el.clientHeight })
    })
    ro.observe(el)
    setDimensions({ w: el.clientWidth, h: el.clientHeight })
    return () => ro.disconnect()
  }, [])

  // Inicializa controles após o globo estar pronto
  useEffect(() => {
    if (!globeReady || !globeRef.current) return
    const ctrl = globeRef.current.controls()
    ctrl.autoRotate = autoRotate
    ctrl.autoRotateSpeed = 0.45
    ctrl.enableDamping = true
    ctrl.dampingFactor = 0.08
    globeRef.current.pointOfView({ lat: 20, lng: 10, altitude: 2.5 }, 800)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globeReady])

  // Sincroniza autoRotate
  useEffect(() => {
    if (!globeRef.current) return
    globeRef.current.controls().autoRotate = autoRotate
  }, [autoRotate])

  // Fecha com Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const flyToRoute = () => {
    if (!globeRef.current || !startPort || !endPort) return
    const A = PORT_COORDS[startPort]
    const B = PORT_COORDS[endPort]
    if (!A || !B) return
    globeRef.current.pointOfView(
      { lat: (A.lat + B.lat) / 2, lng: (A.lon + B.lon) / 2, altitude: 2.0 },
      1200,
    )
  }

  return (
    <div
      className="globe-modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
    >
      <div className="globe-modal-container">

        {/* ── Cabeçalho ── */}
        <div className="globe-modal-header">
          <div className="globe-modal-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
              width="20" height="20" style={{ color: '#26c281', flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10"/>
              <line x1="2" y1="12" x2="22" y2="12"/>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
            Mapa de Conexões — Visão 3D
          </div>
          <div className="globe-modal-controls">
            {pathResult?.success && startPort && endPort && (
              <button type="button" className="globe-ctrl-btn" onClick={flyToRoute} title="Centralizar câmera na rota">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                Focar na rota
              </button>
            )}
            <button
              type="button"
              className={`globe-ctrl-btn${autoRotate ? ' active' : ''}`}
              onClick={() => setAutoRotate((v) => !v)}
              title={autoRotate ? 'Pausar rotação automática' : 'Iniciar rotação automática'}
            >
              {autoRotate ? (
                <>
                  <svg viewBox="0 0 24 24" fill="currentColor" width="11" height="11">
                    <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
                  </svg>
                  Pausar rotação
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="currentColor" width="11" height="11">
                    <polygon points="5,3 19,12 5,21"/>
                  </svg>
                  Girar globo
                </>
              )}
            </button>
            <button type="button" className="globe-close-btn" onClick={onClose} aria-label="Fechar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="15" height="15">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        {/* ── Barra da rota ativa ── */}
        {pathResult?.success && activePath.length > 0 && (
          <div className="globe-path-bar">
            <span className="globe-path-label">Rota ativa:</span>
            <div className="globe-path-ports">
              {activePath.map((port, i) => (
                <span key={`gp-${port}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <span style={{
                    color: port === startPort ? '#26c281' : port === endPort ? '#ff6b6b' : '#f6c56f',
                    fontWeight: 800, fontSize: '0.82rem',
                  }}>{port}</span>
                  {i < activePath.length - 1 && (
                    <span style={{ color: '#3a5a4b', fontSize: '0.75rem' }}>›</span>
                  )}
                </span>
              ))}
            </div>
            {pathResult.cost != null && (
              <span className="globe-path-cost">Peso total: {formatWeight(pathResult.cost)}</span>
            )}
          </div>
        )}

        {/* ── Corpo do globo ── */}
        <div className="globe-modal-body" ref={containerRef}>
          {!globeReady && (
            <div className="globe-loading">
              <div className="globe-loading-spinner" />
              <div className="globe-loading-text">Carregando globo 3D…</div>
            </div>
          )}

          <GlobeGL
            ref={globeRef}
            width={dimensions.w}
            height={dimensions.h}
            onGlobeReady={() => setGlobeReady(true)}
            globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
            bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
            backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
            atmosphereColor="rgba(38,194,129,0.65)"
            atmosphereAltitude={0.18}
            // ── Bordas de países ──
            polygonsData={countriesGeoJSON.features}
            polygonCapColor={() => 'rgba(0,0,0,0)'}
            polygonSideColor={() => 'rgba(0,0,0,0)'}
            polygonStrokeColor={() => 'rgba(38,194,129,0.4)'}
            polygonAltitude={0.001}
            polygonLabel={() => ''}
            // ── Arcos ──
            arcsData={arcsData}
            arcStartLat={(d) => d.startLat}
            arcStartLng={(d) => d.startLng}
            arcEndLat={(d) => d.endLat}
            arcEndLng={(d) => d.endLng}
            arcColor={(d) => {
              if (d.inPath) return '#FFD700'
              return activePath.length > 0 ? 'rgba(255,255,255,0.06)' : 'rgba(38,194,129,0.13)'
            }}
            arcStroke={(d) => {
              if (d.inPath) return 3.0
              return activePath.length > 0 ? 0.18 : 0.28
            }}
            arcDashLength={(d) => d.inPath ? 0.45 : 1}
            arcDashGap={(d) => d.inPath ? 0.2 : 0}
            arcDashAnimateTime={(d) => d.inPath ? 1000 : 0}
            arcAltitudeAutoScale={0.28}
            arcLabel={(d) => `<div style="background:rgba(${d.inPath ? '20,15,0' : '6,26,20'},0.97);border:1.5px solid rgba(${d.inPath ? '255,215,0' : '38,194,129'},0.55);border-radius:9px;padding:7px 12px;font-family:Inter,sans-serif;box-shadow:${d.inPath ? '0 4px 20px rgba(255,215,0,0.2)' : '0 4px 20px rgba(0,0,0,0.5)'}"><span style="color:#ecfff7;font-weight:700">${d.from}</span><span style="color:#3a5a4b;margin:0 6px">→</span><span style="color:#ecfff7;font-weight:700">${d.to}</span><div style="color:${d.inPath ? '#FFD700' : '#9cc8b6'};font-size:11px;margin-top:3px;font-weight:${d.inPath ? '700' : '400'}">Peso: ${formatWeight(d.weight)}${d.inPath ? ' · ★ Melhor rota' : ''}</div></div>`}
            // ── Pontos ──
            pointsData={pointsData}
            pointLat={(d) => d.lat}
            pointLng={(d) => d.lng}
            pointColor={(d) => {
              if (d.isStart) return '#26c281'
              if (d.isEnd)   return '#ff6b6b'
              if (d.inPath)  return '#FFD700'
              return activePath.length > 0
                ? 'rgba(200,220,210,0.45)'
                : getRegionColor(d.region)
            }}
            pointRadius={(d) => {
              if (d.isStart || d.isEnd) return 0.62
              if (d.inPath) return 0.5
              return activePath.length > 0 ? 0.22 : 0.3
            }}
            pointAltitude={(d) => (d.isStart || d.isEnd) ? 0.08 : d.inPath ? 0.05 : 0.01}
            pointLabel={(d) => `<div style="background:rgba(6,26,20,0.97);border:1.5px solid ${getRegionColor(d.region)};border-radius:10px;padding:10px 14px;font-family:Inter,sans-serif;min-width:150px;box-shadow:0 6px 28px rgba(0,0,0,0.6)"><div style="font-weight:800;color:#ecfff7;font-size:15px;letter-spacing:0.03em">${d.id}</div><div style="color:#bfe0d2;font-size:12px;margin-top:3px">${d.name}</div><div style="color:#6f9a89;font-size:10px;margin-top:3px">${d.country} &middot; ${d.region}</div>${d.isStart ? '<div style="color:#26c281;font-size:11px;font-weight:700;margin-top:5px">✦ Porto de origem</div>' : ''}${d.isEnd ? '<div style="color:#ff6b6b;font-size:11px;font-weight:700;margin-top:5px">✦ Porto de destino</div>' : ''}${d.inPath && !d.isStart && !d.isEnd ? '<div style="color:#FFD700;font-size:11px;font-weight:700;margin-top:5px">★ Melhor rota</div>' : ''}</div>`}
          />

          {/* ── Legenda ── */}
          <div className="globe-legend">
            <div className="globe-legend-title">Legenda</div>
            <div className="globe-legend-item">
              <span className="globe-legend-dot" style={{ background: '#26c281' }} />
              Origem
            </div>
            <div className="globe-legend-item">
              <span className="globe-legend-dot" style={{ background: '#ff6b6b' }} />
              Destino
            </div>
            <div className="globe-legend-item">
              <span className="globe-legend-dot" style={{ background: '#FFD700', boxShadow: '0 0 6px #FFD700' }} />
              Melhor rota
            </div>
            <div className="globe-legend-item">
              <span className="globe-legend-dot" style={{ background: '#7f93a8' }} />
              Outros portos
            </div>
            <div className="globe-legend-sep" />
            <div className="globe-legend-hint">
              Arraste para girar<br />
              Scroll para zoom<br />
              Passe o mouse nos portos
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

// ===========================================================================
// Painel de Rotas & Portos — ETN Shipping
// ===========================================================================
function PainelRotasETN({ onBack }) {
  const [startPort, setStartPort] = useState('')
  const [endPort, setEndPort] = useState('')
  const [pathResult, setPathResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] })
  const [portMeta, setPortMeta] = useState({})
  const [selectedConnectionPort, setSelectedConnectionPort] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [show3DGlobe, setShow3DGlobe] = useState(false)

  // Algoritmo selecionado
  const [algorithm, setAlgorithm] = useState('bellman-ford') // 'bellman-ford' | 'dfs'

  // Controle do box de ciclo negativo
  const [cycleDismissed, setCycleDismissed] = useState(false)

  // Simulação passo a passo (frontend, independente do backend)
  const [bellmanSteps, setBellmanSteps] = useState([])
  const [isSimulating, setIsSimulating] = useState(false)
  const [bellmanVerdict, setBellmanVerdict] = useState(null) // 'done' | 'cycle' | null

  const searchRef = useRef(null)
  const startPortRef = useRef('')
  const endPortRef = useRef('')
  const simulationTimeoutsRef = useRef([])

  const API = 'http://localhost:5000'

  // ─── Carregamento de dados ───────────────────────────────────
  const loadGraphData = async () => {
    try {
      const { data } = await axios.get(`${API}/api/etn/graph-data`)
      const meta = {}
      data.nodes.forEach((n) => {
        meta[n.id] = { name: n.name, country: n.country, region: n.region }
      })
      setPortMeta(meta)
      setGraphData({
        nodes: data.nodes.map((n) => ({ id: n.id, label: n.id, title: n.title })),
        edges: data.edges.map((e) => ({ from: e.from, to: e.to, weight: e.weight })),
      })
    } catch (err) {
      console.error('Erro ao carregar grafo ETN:', err)
    }
  }

  useEffect(() => { loadGraphData() }, [])
  useEffect(() => { startPortRef.current = startPort }, [startPort])
  useEffect(() => { endPortRef.current = endPort }, [endPort])

  useEffect(() => () => clearSimulationTimeouts(), [])

  // Recalcula automaticamente ao mudar origem/destino ou algoritmo
  useEffect(() => {
    // Limpa resultado antigo e fecha o box de ciclo imediatamente
    setPathResult(null)
    setCycleDismissed(false)
    resetSimulation()
    if (startPort && endPort && startPort !== endPort) {
      calculatePath(startPort, endPort, algorithm)
      playSteps(startPort, endPort, algorithm)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startPort, endPort, algorithm])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchResults([])
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // ─── Estruturas derivadas ────────────────────────────────────
  const portOptions = useMemo(() => {
    return [...graphData.nodes]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((node) => ({
        value: node.id,
        label: portMeta[node.id]?.name ? `${node.id} — ${portMeta[node.id].name}` : node.id,
      }))
  }, [graphData.nodes, portMeta])

  // Conexões de saída (grafo direcionado) por porto
  const connectionMap = useMemo(() => {
    const map = new Map()
    graphData.nodes.forEach((n) => map.set(n.id, []))
    graphData.edges.forEach((edge) => {
      if (!map.has(edge.from)) map.set(edge.from, [])
      map.get(edge.from).push({
        code: edge.to,
        name: portMeta[edge.to]?.name || '',
        weight: edge.weight,
      })
    })
    for (const [key, values] of map.entries()) {
      values.sort((a, b) => a.code.localeCompare(b.code))
      map.set(key, values)
    }
    return map
  }, [graphData.edges, graphData.nodes, portMeta])

  const bellmanTableNodes = useMemo(
    () => [...graphData.nodes].map((n) => n.id).sort((a, b) => a.localeCompare(b)),
    [graphData.nodes],
  )

  // Lista de adjacência DIRECIONADA para a simulação
  const buildAdjacency = () => {
    const adjacency = new Map()
    graphData.nodes.forEach((n) => adjacency.set(n.id, []))
    graphData.edges.forEach((edge) => {
      if (!adjacency.has(edge.from)) adjacency.set(edge.from, [])
      adjacency.get(edge.from).push({ to: edge.to, weight: Number(edge.weight) })
    })
    return adjacency
  }

  // ─── Simulação Bellman-Ford ──────────────────────────────────
  const BF_ITERATION_CAP = 12


  const generateBellmanFordSteps = (start) => {
    const adjacency = buildAdjacency()
    const nodeIds = bellmanTableNodes
    const dist = {}
    const prev = {}
    nodeIds.forEach((n) => { dist[n] = Infinity; prev[n] = null })
    dist[start] = 0

    const V = nodeIds.length
    const maxIter = Math.min(V - 1, BF_ITERATION_CAP)
    const steps = []
    let stoppedEarly = false

    for (let i = 0; i < maxIter; i++) {
      let updated = false
      for (const u of nodeIds) {
        if (dist[u] === Infinity) continue
        for (const { to, weight } of adjacency.get(u) || []) {
          if (dist[u] + weight < dist[to]) {
            dist[to] = dist[u] + weight
            prev[to] = u
            updated = true
          }
        }
      }
      const rows = {}
      nodeIds.forEach((n) => {
        rows[n] = dist[n] === Infinity ? '∞' : `(${formatWeight(dist[n])}, ${prev[n] || '—'})`
      })
      steps.push({ iteration: i + 1, rows })
      if (!updated) { stoppedEarly = true; break }
    }

    // Verificação de ciclo negativo (1 passada extra de relaxamento)
    let negativeCycle = false
    if (!stoppedEarly) {
      for (const u of nodeIds) {
        if (dist[u] === Infinity) continue
        for (const { to, weight } of adjacency.get(u) || []) {
          if (dist[u] + weight < dist[to]) { negativeCycle = true; break }
        }
        if (negativeCycle) break
      }
    }
    return { steps, negativeCycle }
  }

  const clearSimulationTimeouts = () => {
    simulationTimeoutsRef.current.forEach((id) => clearTimeout(id))
    simulationTimeoutsRef.current = []
  }

  const resetSimulation = () => {
    clearSimulationTimeouts()
    setBellmanSteps([])
    setIsSimulating(false)
    setBellmanVerdict(null)
  }

  const playBellmanFordSteps = (start) => {
    resetSimulation()
    if (!start) return
    const { steps, negativeCycle } = generateBellmanFordSteps(start)
    if (!steps.length) return
    setIsSimulating(true)
    steps.forEach((step, index) => {
      const id = setTimeout(() => {
        setBellmanSteps((prev) => [...prev, step])
        if (index === steps.length - 1) {
          setIsSimulating(false)
          setBellmanVerdict(negativeCycle ? 'cycle' : 'done')
        }
      }, index * 1100)
      simulationTimeoutsRef.current.push(id)
    })
  }

  // ─── Simulação DFS ───────────────────────────────────────────
  const DFS_MAX_STEPS = 15
  const DFS_MAX_DEPTH = 8

  const generateDFSSteps = (start, end) => {
    const adjacency = buildAdjacency()
    const steps = []
    let bestPath = null
    let bestCost = Infinity

    // Monta snapshot: célula = custo acumulado se no path ativo,
    // "★" se no melhor path encontrado, "-" caso contrário
    const makeRows = (activePath, costMap) => {
      const rows = {}
      bellmanTableNodes.forEach((n) => {
        const idx = activePath.indexOf(n)
        if (idx >= 0) {
          rows[n] = `[${idx}] ${formatWeight(costMap[n])}`
        } else if (bestPath && bestPath.includes(n)) {
          rows[n] = '★'
        } else {
          rows[n] = '-'
        }
      })
      return rows
    }

    const dfs = (node, path, visited, costMap) => {
      if (steps.length >= DFS_MAX_STEPS) return

      steps.push({
        step: steps.length + 1,
        rows: makeRows(path, costMap),
        activePath: [...path],
        bestPath: bestPath ? [...bestPath] : null,
        bestCost: bestCost === Infinity ? null : bestCost,
        event: node === end ? 'found' : 'visit',
      })

      if (node === end) {
        const cost = costMap[node]
        if (cost < bestCost) {
          bestCost = cost
          bestPath = [...path]
          // Atualiza o snapshot recém-adicionado com o novo melhor
          const last = steps[steps.length - 1]
          last.bestPath = [...bestPath]
          last.bestCost = bestCost
          last.event = 'found_better'
          // Recomputa as linhas com o novo bestPath
          last.rows = makeRows(path, costMap)
        }
        return
      }

      if (path.length > DFS_MAX_DEPTH) return

      const neighbors = adjacency.get(node) || []
      for (const { to, weight } of neighbors) {
        if (!visited.has(to) && steps.length < DFS_MAX_STEPS) {
          const newCostMap = { ...costMap, [to]: (costMap[node] ?? 0) + weight }
          visited.add(to)
          path.push(to)
          dfs(to, path, visited, newCostMap)
          path.pop()
          visited.delete(to)
        }
      }
    }

    dfs(start, [start], new Set([start]), { [start]: 0 })
    return { steps, bestPath, bestCost: bestCost === Infinity ? null : bestCost }
  }

  const playDFSSteps = (start, end) => {
    resetSimulation()
    if (!start || !end) return
    const { steps } = generateDFSSteps(start, end)
    if (!steps.length) return
    setIsSimulating(true)
    steps.forEach((step, index) => {
      const id = setTimeout(() => {
        setBellmanSteps((prev) => [...prev, step])
        if (index === steps.length - 1) {
          setIsSimulating(false)
          setBellmanVerdict('done')
        }
      }, index * 1100)
      simulationTimeoutsRef.current.push(id)
    })
  }

  // Dispatcher que escolhe a simulação certa
  const playSteps = (start, end, algo) => {
    if (algo === 'dfs') {
      playDFSSteps(start, end)
    } else {
      playBellmanFordSteps(start)
    }
  }

  // ─── Seleção origem/destino ──────────────────────────────────
  const handlePortClick = (nodeId) => {
    const cStart = startPortRef.current
    const cEnd = endPortRef.current
    if (nodeId === cStart) { setStartPort(''); return }
    if (nodeId === cEnd) { setEndPort(''); return }
    if (!cStart) { setStartPort(nodeId); return }
    if (!cEnd) { setEndPort(nodeId); return }
    // ambos definidos → reinicia a partir do novo clique
    setEndPort('')
    setStartPort(nodeId)
  }

  const calculatePath = async (cStart, cEnd, algo = algorithm) => {
    if (!cStart || !cEnd || cStart === cEnd) return
    setLoading(true)
    try {
      const endpoint = algo === 'dfs'
        ? `${API}/api/etn/dfs-path`
        : `${API}/api/etn/bellman-ford`
      const { data } = await axios.post(endpoint, { start: cStart, end: cEnd })
      setPathResult(data)
    } catch (error) {
      console.error('Erro ao calcular caminho:', error)
      setPathResult({ success: false, hasNegativeCycle: false, message: 'Erro ao calcular caminho.' })
    } finally {
      setLoading(false)
    }
  }

  const resetSelection = async () => {
    setSelectedConnectionPort(null)
    setSearchQuery('')
    setSearchResults([])
    setStartPort('')
    setEndPort('')
    setPathResult(null)
    resetSimulation()
    await loadGraphData()
  }

  // ─── Busca de portos ─────────────────────────────────────────
  const handleSearch = (e) => {
    const q = e.target.value
    setSearchQuery(q)
    if (!q.trim()) { setSearchResults([]); setSelectedConnectionPort(null); return }
    const lower = q.toLowerCase()
    const matches = graphData.nodes
      .filter((n) =>
        n.id.toLowerCase().includes(lower) ||
        (portMeta[n.id]?.name || '').toLowerCase().includes(lower))
      .slice(0, 8)
    setSearchResults(matches)
  }

  const handleSearchSelect = (nodeId) => {
    setSearchQuery(portMeta[nodeId]?.name ? `${nodeId} — ${portMeta[nodeId].name}` : nodeId)
    setSearchResults([])
    setSelectedConnectionPort({
      id: nodeId,
      connections: connectionMap.get(nodeId) || [],
    })
  }

  const handleStartChange = (value) => {
    if (value && value === endPort) return
    setStartPort(value)
  }
  const handleEndChange = (value) => {
    if (value && value === startPort) return
    setEndPort(value)
  }

  const formattedCost = pathResult?.success && pathResult?.cost != null
    ? formatWeight(pathResult.cost)
    : ''

  return (
    <div className="app-modern-bg painel-etn-theme" style={{ position: 'relative' }}>
      <header className="app-modern-header">
        <div className="header-top-actions">
          <button onClick={onBack} className="global-metrics-back-button" type="button" title="Voltar">
            <span className="global-metrics-back-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="18" height="18">
                <path d="M15 6L9 12L15 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="global-metrics-back-text">Voltar</span>
          </button>
        </div>

        <div className="clean-header">
          <div className="clean-header-brand">
            <img src={logoEtn} alt="Logo ETN Shipping" className="clean-header-logo" />
          </div>
          <div className="clean-header-content">
            <h1 className="clean-header-title">Painel de Rotas &amp; Portos</h1>
            <p className="dashboard-header-subtitle">
              Navegue pela malha marítima global, explore os portos e calcule o menor caminho com Bellman-Ford ou DFS.
            </p>
          </div>
        </div>
      </header>

      <main className="app-modern-main">
        {/* Toggle de algoritmo */}
        <div className="etn-algo-toggle">
          <span className="etn-algo-toggle-label">Algoritmo:</span>
          <div className="etn-algo-toggle-group">
            <button
              type="button"
              className={`etn-algo-btn${algorithm === 'bellman-ford' ? ' active' : ''}`}
              onClick={() => setAlgorithm('bellman-ford')}
            >
              Bellman-Ford
            </button>
            <button
              type="button"
              className={`etn-algo-btn${algorithm === 'dfs' ? ' active' : ''}`}
              onClick={() => setAlgorithm('dfs')}
            >
              DFS
            </button>
          </div>
        </div>

        <section className="glass-card app-top-bar clean-top-bar">
          <div className="field-group">
            <label>Porto de origem</label>
            <select value={startPort} onChange={(e) => handleStartChange(e.target.value)}>
              <option value="">Selecione a origem</option>
              {portOptions.map((p) => (
                <option key={p.value} value={p.value} disabled={p.value === endPort}>{p.label}</option>
              ))}
            </select>
          </div>

          <div className="field-group">
            <label>Porto de destino</label>
            <select value={endPort} onChange={(e) => handleEndChange(e.target.value)}>
              <option value="">Selecione o destino</option>
              {portOptions.map((p) => (
                <option key={p.value} value={p.value} disabled={p.value === startPort}>{p.label}</option>
              ))}
            </select>
          </div>

          <div className="top-action">
            <button
              onClick={() => calculatePath(startPort, endPort)}
              disabled={loading || !startPort || !endPort}
              className="modern-btn main"
              type="button"
            >
              {loading ? 'Analisando...' : 'Analisar'}
            </button>
          </div>

          <div className="top-action">
            <button onClick={resetSelection} className="modern-btn" type="button">Limpar</button>
          </div>
        </section>

        {pathResult?.success ? (
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
              <div className="summary-route-title">
                {algorithm === 'dfs' ? 'Rota encontrada (DFS)' : 'Rota encontrada'}
              </div>
              <div className="summary-route-subtitle">
                {algorithm === 'dfs'
                  ? 'Sequência de portos do trajeto calculado pelo DFS'
                  : 'Sequência de portos do trajeto (menor caminho)'
                }
              </div>

              <div className="summary-route-flow">
                {pathResult.path.map((port, index) => (
                  <div key={index} className="route-flow-item">
                    <span className="route-flow-code">{port}</span>
                    {index < pathResult.path.length - 1 && <span className="route-flow-arrow">→</span>}
                  </div>
                ))}
              </div>

              <div className="path-details">
                {pathResult.path_info.map((port, index) => (
                  <div key={index} className="path-airport">
                    <span className="path-airport-code">{port.code}</span>
                    <span className="path-airport-separator">—</span>
                    <span className="path-airport-city">{port.name} ({port.country})</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : pathResult && pathResult.hasNegativeCycle && !cycleDismissed ? (
          <section className="glass-card etn-cycle-warning">
            <button
              type="button"
              className="etn-cycle-close"
              onClick={() => setCycleDismissed(true)}
              aria-label="Fechar aviso"
            >
              ×
            </button>
            <div className="etn-cycle-warning-icon">⚠</div>
            <div>
              <div className="etn-cycle-warning-title">Ciclo negativo detectado</div>
              <div className="etn-cycle-warning-text">
                Existe um ciclo de peso negativo alcançável neste trajeto, então o problema do menor
                caminho é <strong>indefinido</strong> — seria sempre possível reduzir o custo dando mais
                uma volta no ciclo. Veja a simulação passo a passo abaixo.
              </div>
            </div>
          </section>
        ) : pathResult && pathResult.message ? (
          <section className="glass-card empty-summary">{pathResult.message}</section>
        ) : (
          <section className="glass-card empty-summary">
            Selecione um porto de origem e um de destino para calcular o menor caminho automaticamente.
          </section>
        )}

        <section className="glass-card app-modern-graph" style={{ position: 'relative' }}>
          <div className="map-section-header">
            <div className="map-section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
                width="16" height="16" style={{ color: '#26c281', flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10"/>
                <line x1="2" y1="12" x2="22" y2="12"/>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
              Mapa de Conexões Global
            </div>
            <button
              type="button"
              className="globe-3d-open-btn"
              onClick={() => setShow3DGlobe(true)}
              title="Abrir visualização 3D interativa do mapa"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                width="14" height="14">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                <polyline points="3.27,6.96 12,12.01 20.73,6.96"/>
                <line x1="12" y1="22.08" x2="12" y2="12"/>
              </svg>
              Ver em 3D
            </button>
          </div>
          <WorldMap
            graphData={graphData}
            pathResult={pathResult}
            startPort={startPort}
            endPort={endPort}
            portMeta={portMeta}
            onNodeClick={handlePortClick}
          />
        </section>

        {show3DGlobe && (
          <Globe3DModal
            onClose={() => setShow3DGlobe(false)}
            graphData={graphData}
            pathResult={pathResult}
            startPort={startPort}
            endPort={endPort}
            portMeta={portMeta}
          />
        )}

        <div className="airport-connections-panel">
          <div className="airport-connections-header">
            <div className="airport-connections-title">Conexões do Porto</div>
            <div className="airport-connections-subtitle">
              Pesquise um porto para visualizar suas rotas diretas de saída.
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
                if (e.key === 'Enter' && searchResults.length > 0) handleSearchSelect(searchResults[0].id)
              }}
              placeholder="Digite o código ou o nome do porto"
              autoComplete="off"
            />
            {searchResults.length > 0 && (
              <ul className="search-bar-dropdown">
                {searchResults.map((n) => (
                  <li key={n.id} className="search-bar-item" onMouseDown={() => handleSearchSelect(n.id)}>
                    <strong className="search-bar-code">{n.id}</strong>
                    <span className="search-bar-city">{portMeta[n.id]?.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {selectedConnectionPort ? (
            <>
              <div className="airport-ego-panel-horizontal">
                <div className="ego-block-title">
                  {selectedConnectionPort.id}
                  {portMeta[selectedConnectionPort.id]?.name && (
                    <span className="ego-block-city"> — {portMeta[selectedConnectionPort.id].name}</span>
                  )}
                </div>
                <div className="ego-block-row">
                  <div className="ego-block-item"><span>País:</span> <strong>{portMeta[selectedConnectionPort.id]?.country || '-'}</strong></div>
                  <div className="ego-block-item"><span>Região:</span> <strong>{portMeta[selectedConnectionPort.id]?.region || '-'}</strong></div>
                  <div className="ego-block-item"><span>Rotas de saída:</span> <strong>{selectedConnectionPort.connections.length}</strong></div>
                </div>
              </div>
              <div className="airport-connections-content">
                {selectedConnectionPort.connections.length > 0 ? (
                  <div className="airport-connections-list">
                    {selectedConnectionPort.connections.map((connection, index) => (
                      <div key={`${selectedConnectionPort.id}-${connection.code}-${index}`} className="airport-connection-card">
                        <div className="airport-connection-info">
                          <div className="airport-connection-code">{connection.code}</div>
                          {connection.name && <div className="airport-connection-city">{connection.name}</div>}
                        </div>
                        <div className="airport-connection-weight">Peso {formatWeight(connection.weight)}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="airport-connections-no-data">Este porto não possui rotas de saída cadastradas.</div>
                )}
              </div>
            </>
          ) : (
            <div className="airport-connections-empty">Pesquise um porto acima para exibir suas conexões aqui.</div>
          )}
        </div>

        <div className="algorithm-steps-panel">
          <div className="algorithm-steps-header">
            <div className="algorithm-steps-title">
              {algorithm === 'dfs'
                ? 'Passo a passo do DFS'
                : 'Passo a passo do Bellman-Ford'}
            </div>
            <div className="algorithm-steps-subtitle">
              {algorithm === 'dfs'
                ? `Cada passo = DFS entra num novo porto. [profundidade] custo acumulado no caminho ativo; ★ = melhor caminho encontrado até agora.`
                : 'Cada passo é uma iteração de relaxamento de todas as arestas. Com ciclo negativo, as distâncias continuam caindo e o problema torna-se indefinido.'}
            </div>
          </div>

          {startPort && endPort ? (
            bellmanSteps.length > 0 ? (
              <>
                <div className="algorithm-steps-table-wrap">
                  <table className="algorithm-steps-table">
                    <thead>
                      <tr>
                        <th>Porto</th>
                        {bellmanSteps.map((step, i) => (
                          <th key={`col-${i}`}>
                            {algorithm === 'dfs'
                              ? `Passo ${step.step}`
                              : `Iteração ${step.iteration}`}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {bellmanTableNodes.map((nodeId) => (
                        <tr key={nodeId}>
                          <td className="algorithm-node-label">{nodeId}</td>
                          {bellmanSteps.map((step, stepIndex) => {
                            const isFinalPath = stepIndex === bellmanSteps.length - 1 &&
                              bellmanVerdict === 'done' && pathResult?.success &&
                              pathResult.path?.includes(nodeId)

                            // Para BF: destaque na coluna da célula destino
                            const isBFTarget = algorithm === 'bellman-ford' && nodeId === endPort

                            // Para DFS: destaque se no caminho ativo do passo
                            const isDFSActive = algorithm === 'dfs' &&
                              step.activePath?.includes(nodeId)

                            const highlighted = isBFTarget || isDFSActive

                            return (
                              <td
                                key={`${nodeId}-${stepIndex}`}
                                className={[
                                  highlighted ? 'is-active-step' : '',
                                  isFinalPath ? 'is-final-path-step' : '',
                                ].filter(Boolean).join(' ')}
                              >
                                <span className={`algorithm-step-value${highlighted ? ' emphasis' : ''}`}>
                                  {step.rows[nodeId]}
                                </span>
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="algorithm-steps-status">
                  {isSimulating ? (
                    <span className="algorithm-status-badge running">
                      {algorithm === 'dfs' ? 'Explorando caminhos...' : 'Executando relaxamento...'}
                    </span>
                  ) : bellmanVerdict === 'cycle' ? (
                    <span className="algorithm-status-badge cycle">⚠ Ciclo negativo detectado → problema indefinido</span>
                  ) : (
                    <span className="algorithm-status-badge done">
                      {algorithm === 'dfs' ? 'Rota encontrada pelo DFS' : 'Menor caminho encontrado'}
                    </span>
                  )}
                </div>
              </>
            ) : (
              <div className="algorithm-steps-empty">
                Selecione origem e destino para iniciar a simulação do algoritmo.
              </div>
            )
          ) : (
            <div className="algorithm-steps-empty">
              Escolha um porto de origem e um de destino para visualizar a execução passo a passo.
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default PainelRotasETN
