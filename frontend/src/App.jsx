import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import axios from 'axios'
import { Network } from 'vis-network/standalone'
import GlobeGL from 'react-globe.gl'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import logo from './assets/logo/logo_branca_isolada.png'
import AirportTooltip from './AirportTooltip'

// ---------------------------------------------------------------------------
// Coordenadas geográficas reais de cada aeroporto para o mapa Plotly
// ---------------------------------------------------------------------------
const AIRPORT_COORDS = {
  REC: { lat: -8.126, lon: -34.923 },
  SSA: { lat: -12.908, lon: -38.322 },
  FOR: { lat: -3.776, lon: -38.532 },
  NAT: { lat: -5.768, lon: -35.376 },
  JPA: { lat: -7.148, lon: -34.95 },
  GRU: { lat: -23.431, lon: -46.469 },
  CGH: { lat: -23.626, lon: -46.656 },
  GIG: { lat: -22.81, lon: -43.25 },
  CNF: { lat: -19.624, lon: -43.972 },
  VIX: { lat: -20.258, lon: -40.286 },
  BSB: { lat: -15.869, lon: -47.921 },
  GYN: { lat: -16.632, lon: -49.221 },
  CWB: { lat: -25.528, lon: -49.176 },
  FLN: { lat: -27.67, lon: -48.547 },
  POA: { lat: -29.994, lon: -51.171 },
  MAO: { lat: -3.038, lon: -60.05 },
  BEL: { lat: -1.379, lon: -48.477 },
  PVH: { lat: -8.709, lon: -63.902 },
  RBR: { lat: -9.869, lon: -67.898 },
  THE: { lat: -5.06, lon: -42.823 },
}

const REGION_COLORS = {
  Nordeste: '#f97316',
  Sudeste: '#3b82f6',
  Sul: '#10b981',
  'Centro-Oeste': '#a855f7',
  Norte: '#ec4899',
}

function BrazilMap({
  graphData,
  pathResult,
  startAirport,
  endAirport,
  aeroportosData,
  egoAeroportos,
  onNodeClick
}) {
  const plotRef = useRef(null)
  const wrapRef = useRef(null)
  const [plotlyLoaded, setPlotlyLoaded] = useState(!!window.Plotly)
  const [edgeTooltip, setEdgeTooltip] = useState(null)

  useEffect(() => {
    if (window.Plotly) {
      setPlotlyLoaded(true)
      return
    }
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

    const edgeTraces = graphData.edges
      .map((edge) => {
        const A = AIRPORT_COORDS[edge.from]
        const B = AIRPORT_COORDS[edge.to]
        if (!A || !B) return null

        const inPath =
          activePath.length > 1 &&
          activePath.some(
            (n, i) =>
              i < activePath.length - 1 &&
              ((activePath[i] === edge.from && activePath[i + 1] === edge.to) ||
                (activePath[i] === edge.to && activePath[i + 1] === edge.from))
          )

        return {
          type: 'scattergeo',
          lon: [A.lon, B.lon],
          lat: [A.lat, B.lat],
          mode: 'lines',
          line: {
            width: inPath ? 3.5 : 1,
            color: inPath ? '#f6c56f' : 'rgba(148,163,184,0.25)'
          },
          hoverinfo: 'none',
          showlegend: false
        }
      })
      .filter(Boolean)

    const edgeMidpointData = graphData.edges
      .map((edge) => {
        const A = AIRPORT_COORDS[edge.from]
        const B = AIRPORT_COORDS[edge.to]
        if (!A || !B) return null

        const inPath =
          activePath.length > 1 &&
          activePath.some(
            (n, i) =>
              i < activePath.length - 1 &&
              ((activePath[i] === edge.from && activePath[i + 1] === edge.to) ||
                (activePath[i] === edge.to && activePath[i + 1] === edge.from))
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
          inPath
        }
      })
      .filter(Boolean)

    const weightHoverTrace = {
      type: 'scattergeo',
      lon: edgeMidpointData.map((e) => e.midLon),
      lat: edgeMidpointData.map((e) => e.midLat),
      mode: 'markers',
      marker: { size: 12, color: 'rgba(0,0,0,0)', opacity: 0 },
      customdata: edgeMidpointData.map((e) => [e.from, e.to, e.weight, e.inPath ? 1 : 0, '__edge__']),
      hovertemplate: '<extra></extra>',
      showlegend: false
    }

    const regionMap = {}
    graphData.nodes.forEach((node) => {
      const regiao = aeroportosData[node.id]?.regiao || 'Outro'
      if (!regionMap[regiao]) regionMap[regiao] = []
      regionMap[regiao].push(node)
    })

    const nodeTraces = Object.entries(regionMap).map(([region, nodes]) => ({
      type: 'scattergeo',
      lon: nodes.map((n) => AIRPORT_COORDS[n.id]?.lon).filter((v) => v !== undefined),
      lat: nodes.map((n) => AIRPORT_COORDS[n.id]?.lat).filter((v) => v !== undefined),
      mode: 'markers+text',
      name: region,
      text: nodes.filter((n) => AIRPORT_COORDS[n.id]).map((n) => n.id),
      textposition: 'top center',
      textfont: { family: 'Inter, sans-serif', size: 11, color: '#f1f5f9' },
      marker: {
        size: nodes
          .filter((n) => AIRPORT_COORDS[n.id])
          .map((n) =>
            n.id === startAirport || n.id === endAirport ? 20 : activePath.includes(n.id) ? 16 : 12
          ),
        color: nodes
          .filter((n) => AIRPORT_COORDS[n.id])
          .map((n) =>
            n.id === startAirport
              ? '#26c281'
              : n.id === endAirport
              ? '#ff6b6b'
              : activePath.includes(n.id)
              ? '#f6c56f'
              : REGION_COLORS[region] || '#4da3ff'
          ),
        line: {
          color: nodes
            .filter((n) => AIRPORT_COORDS[n.id])
            .map((n) =>
              n.id === startAirport || n.id === endAirport || activePath.includes(n.id)
                ? '#ffffff'
                : 'rgba(255,255,255,0.3)'
            ),
          width: nodes
            .filter((n) => AIRPORT_COORDS[n.id])
            .map((n) =>
              n.id === startAirport || n.id === endAirport || activePath.includes(n.id) ? 2.5 : 1
            )
        }
      },
      customdata: nodes.filter((n) => AIRPORT_COORDS[n.id]).map((n) => [
        n.id,
        n.city || aeroportosData[n.id]?.cidade || '',
        region,
        egoAeroportos[n.id]?.grau || '-'
      ]),
      hovertemplate:
        '<b>%{customdata[0]}</b> — %{customdata[1]}<br>' +
        '<i>%{customdata[2]}</i> · Grau: %{customdata[3]}<extra></extra>',
      hoverlabel: {
        bgcolor: '#0f172a',
        bordercolor: REGION_COLORS[region] || '#4da3ff',
        font: { family: 'Inter', color: '#f1f5f9', size: 13 }
      }
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
        framewidth: 0
      },
      margin: { t: 0, b: 0, l: 0, r: 0 },
      showlegend: true,
      legend: {
        x: 0.01,
        y: 0.01,
        bgcolor: 'rgba(15,23,42,0.85)',
        bordercolor: '#334155',
        borderwidth: 1,
        font: { family: 'Inter', color: '#94a3b8', size: 11 }
      },
      autosize: true,
      height: 600
    }

    const config = { responsive: true, displayModeBar: false, scrollZoom: false }
    const weightHoverTraceIndex = edgeTraces.length

    Plotly.react(plotRef.current, [...edgeTraces, weightHoverTrace, ...nodeTraces], layout, config).then(() => {
      plotRef.current.removeAllListeners('plotly_hover')
      plotRef.current.removeAllListeners('plotly_unhover')
      plotRef.current.removeAllListeners('plotly_click')

      plotRef.current.on('plotly_hover', (data) => {
        const pt = data.points?.[0]
        if (!pt || !pt.customdata || !Array.isArray(pt.customdata)) return
        if (pt.curveNumber !== weightHoverTraceIndex) return

        const [from, to, weight, inPathFlag] = pt.customdata
        const event = data.event
        if (!event) return

        const rect = wrapRef.current?.getBoundingClientRect() || { left: 0, top: 0 }
        const hoverLayer = plotRef.current.querySelector('.hoverlayer')
        if (hoverLayer) hoverLayer.style.visibility = 'hidden'

        setEdgeTooltip({
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
          from,
          to,
          weight,
          inPath: inPathFlag === 1
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
        if (typeof nodeId === 'string' && nodeId.length <= 4 && onNodeClick) onNodeClick(nodeId)
      })
    })
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%' }}>
      <div ref={plotRef} style={{ width: '100%', minHeight: 600, background: 'transparent' }}>
        {!plotlyLoaded && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: 600,
              color: '#64748b',
              fontSize: 14
            }}
          >
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
            minWidth: 100
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: '#64748b',
              fontFamily: 'Inter, sans-serif',
              letterSpacing: '0.05em',
              textTransform: 'uppercase'
            }}
          >
            Aresta
          </div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#f1f5f9',
              fontFamily: 'Inter, sans-serif'
            }}
          >
            {edgeTooltip.from} → {edgeTooltip.to}
          </div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: edgeTooltip.inPath ? '#f6c56f' : '#94a3b8',
              fontFamily: 'Inter, sans-serif',
              marginTop: 2
            }}
          >
            ⚖ Peso: {edgeTooltip.weight ?? '-'}
          </div>
          {edgeTooltip.inPath && (
            <div
              style={{
                fontSize: 10,
                color: '#f6c56f',
                fontFamily: 'Inter, sans-serif',
                opacity: 0.8
              }}
            >
              ✦ Rota ativa
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Bearing helper for flight animation ────────────────────────────────────
function computeBearing(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180
  const dLon = toRad(lon2 - lon1)
  const φ1 = toRad(lat1)
  const φ2 = toRad(lat2)
  const y = Math.sin(dLon) * Math.cos(φ2)
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(dLon)
  return (((Math.atan2(y, x) * 180) / Math.PI) + 360) % 360
}

// ─── Airport curiosities + Wikipedia article titles ──────────────────────────
const AIRPORT_CURIOSITIES = {
  REC: {
    name: 'Aeroporto Internacional Recife/Guararapes',
    capacity: '12 milhões pax/ano',
    curiosities: [
      'Inaugurado em 1958, é o principal hub aéreo do Nordeste, operando cerca de 200 voos por dia.',
      'A pista principal tem 3.006 m de comprimento, suficiente para aeronaves de médio e grande porte.',
      'Movimentou mais de 10 milhões de passageiros em 2023, recorde histórico do aeroporto.',
      'Opera voos internacionais regulares para Portugal, EUA e Argentina, além de toda a malha doméstica.',
      'Passou por concessão à Aena Brasil em 2019, que investiu em expansão do terminal e modernização.'
    ],
    wikiAirport: 'Recife/Guararapes–Gilberto_Freyre_International_Airport',
    wikiCity: 'Recife'
  },
  SSA: {
    name: 'Aeroporto Internacional de Salvador',
    capacity: '15 milhões pax/ano',
    curiosities: [
      'Inaugurado em 1940, foi completamente reformado para a Copa do Mundo de 2014 com R$ 690 milhões investidos.',
      'Movimentou cerca de 9 milhões de passageiros em 2023, sendo o 5º mais movimentado do Brasil.',
      'Opera voos diretos para Lisboa, Milão, Paris e Miami, além de toda a rede doméstica brasileira.',
      'Possui pista de 3.006 m e capacidade para até 35 aeronaves estacionadas simultaneamente.',
      'Administrado pela VINCI Airports desde 2017, que também opera aeroportos em 12 outros países.'
    ],
    wikiAirport: 'Salvador_International_Airport',
    wikiCity: 'Salvador,_Bahia'
  },
  FOR: {
    name: 'Aeroporto Internacional Pinto Martins',
    capacity: '9 milhões pax/ano',
    curiosities: [
      'O nome homenageia João Ribeiro Pinto Martins, pioneiro da aviação cearense que morreu em serviço.',
      'Concedido à Fraport Brasil em 2017, que investiu mais de R$ 1 bilhão em ampliações.',
      'Movimentou cerca de 7 milhões de passageiros em 2023, com pico de 150 voos diários.',
      'Opera conexões diretas para Frankfurt (Alemanha), Lisboa e cidades dos EUA.',
      'Sua pista de 3.000 m permite operação de wide-bodies como Boeing 777 e Airbus A330.'
    ],
    wikiAirport: 'Pinto_Martins_–_Fortaleza_International_Airport',
    wikiCity: 'Fortaleza'
  },
  NAT: {
    name: 'Aeroporto Internacional Gov. Aluízio Alves',
    capacity: '4 milhões pax/ano',
    curiosities: [
      'Inaugurado em 2014 para a Copa do Mundo, substituiu o antigo Aeroporto Augusto Severo.',
      'O terminal principal tem 51.000 m² e custou aproximadamente R$ 2,5 bilhões para ser construído.',
      'É o aeroporto brasileiro mais próximo da África: apenas 3.170 km da costa senegalesa.',
      'Por sua posição geográfica privilegiada, já sediou voos transatlânticos de conexão para a Europa.',
      'Localizado em São Gonçalo do Amarante, a 35 km de Natal, com acesso por rodovia expressa.'
    ],
    wikiAirport: 'Governador_Aluízio_Alves_International_Airport',
    wikiCity: 'Natal,_Rio_Grande_do_Norte'
  },
  JPA: {
    name: 'Aeroporto Int. Presidente Castro Pinto',
    capacity: '3 milhões pax/ano',
    curiosities: [
      'Inaugurado em 1975 e administrado pela VINCI Airports, operando 14 balcões de check-in.',
      'Pista de 2.800 m capaz de operar aeronaves de médio porte como Boeing 737 e Airbus A320.',
      'Movimentou cerca de 2 milhões de passageiros em 2023, com crescimento contínuo desde 2018.',
      'Por estar no ponto mais oriental das Américas, teoricamente recebe os primeiros voos do dia no continente.',
      'O aeroporto passou por reforma em 2019 que ampliou o saguão de embarque e modernizou a infraestrutura.'
    ],
    wikiAirport: 'Presidente_Castro_Pinto_International_Airport',
    wikiCity: 'João_Pessoa'
  },
  GRU: {
    name: 'Aeroporto Internacional São Paulo/Guarulhos',
    capacity: '44 milhões pax/ano',
    curiosities: [
      'O maior aeroporto da América Latina, inaugurado em 1985, com 2 terminais e 2 pistas paralelas.',
      'As pistas têm 3.700 m e 3.000 m — a maior suporta decolagens de aeronaves como o Boeing 747-8F.',
      'Em 2023 movimentou mais de 38 milhões de passageiros e aproximadamente 600 pousos e decolagens diários.',
      'É hub principal da LATAM Airlines, com voos diretos para mais de 70 destinos internacionais.',
      'Operado pela VINCI Airports desde 2022, que investiu bilhões na modernização da infraestrutura.'
    ],
    wikiAirport: 'São_Paulo–Guarulhos_International_Airport',
    wikiCity: 'São_Paulo'
  },
  CGH: {
    name: 'Aeroporto de São Paulo/Congonhas',
    capacity: '21 milhões pax/ano',
    curiosities: [
      'Inaugurado em 1936, é o mais antigo grande aeroporto do Brasil ainda em plena operação comercial.',
      'Em julho de 2007, o acidente do voo TAM 3054 matou 199 pessoas — maior desastre aéreo da história brasileira.',
      'Após o acidente, a pista foi reconstruída com asfalto antiderrapante e nova zona de escape de segurança.',
      'Opera a ponte aérea São Paulo–Rio, a rota doméstica mais movimentada do Brasil, com ~30 voos/dia.',
      'Com pistas de apenas 1.940 m e 1.435 m, é um dos aeroportos de grande porte com pistas mais curtas do mundo.'
    ],
    wikiAirport: 'Congonhas_Airport',
    wikiCity: 'São_Paulo'
  },
  GIG: {
    name: 'Aeroporto Internacional Antonio Carlos Jobim',
    capacity: '15 milhões pax/ano',
    curiosities: [
      'Inaugurado em 1977 na Ilha do Governador, tem 2 terminais e pistas de 4.000 m e 3.200 m.',
      'A pista de 4.000 m é uma das mais longas do Brasil, permitindo operação do Airbus A380.',
      'O nome homenageia Antonio Carlos Jobim, o genial compositor que criou a Bossa Nova.',
      'Movimentou cerca de 8 milhões de passageiros em 2023, num território projetado para 60 milhões.',
      'A concessão à RIOgaleão em 2014 trouxe R$ 5,6 bilhões em investimentos previstos de modernização.'
    ],
    wikiAirport: 'Rio_de_Janeiro–Galeão_International_Airport',
    wikiCity: 'Rio_de_Janeiro'
  },
  CNF: {
    name: 'Aeroporto Internacional Tancredo Neves',
    capacity: '8 milhões pax/ano',
    curiosities: [
      'Inaugurado em 1984, substituiu o antigo Aeroporto Carlos Drummond de Andrade, que ficava na cidade.',
      'O nome homenageia Tancredo Neves, o presidente eleito em 1985 que faleceu antes de tomar posse.',
      'Reformado para a Copa do Mundo 2014 com investimentos de R$ 1,3 bilhão e ampliação do terminal.',
      'Operado pela CCR BH Airport desde 2014, movimentando cerca de 8 milhões de passageiros por ano.',
      'Possui pista de 3.000 m e plataforma para 46 aeronaves, com voos regulares para Miami e Lisboa.'
    ],
    wikiAirport: 'Tancredo_Neves_International_Airport',
    wikiCity: 'Belo_Horizonte'
  },
  VIX: {
    name: 'Aeroporto de Vitória/Eurico de Aguiar Salles',
    capacity: '3 milhões pax/ano',
    curiosities: [
      'A pista de 1.839 m foi construída sobre aterro na Baía de Vitória, uma engenharia singular no Brasil.',
      'Por ter a pista mais curta entre os aeroportos de capitais, opera exclusivamente aeronaves de médio porte.',
      'Inaugurado em 1943, recebeu melhorias em 2015 com a concessão à VINCI Airports.',
      'Movimentou cerca de 3 milhões de passageiros em 2023, com crescimento impulsionado pelo agronegócio local.',
      'O aeroporto está a apenas 4 km do centro de Vitória, tornando-o um dos mais centrais do Brasil.'
    ],
    wikiAirport: 'Vitória_Airport',
    wikiCity: 'Vitória,_Espírito_Santo'
  },
  BSB: {
    name: 'Aeroporto Internacional Pres. Juscelino Kubitschek',
    capacity: '15 milhões pax/ano',
    curiosities: [
      'Inaugurado em 1957, três anos antes de Brasília, para servir as obras de construção da nova capital.',
      'É o 2° aeroporto mais movimentado do Brasil, com ~400 voos por dia e 16 milhões de passageiros em 2023.',
      'Suas 2 pistas paralelas de 3.300 m cada foram modernizadas para a Copa do Mundo 2014 com R$ 2,8 bilhões.',
      'Por estar no centro geográfico do Brasil, é o melhor hub de conexões do país — destino de todas as regiões.',
      'Opera voos internacionais para América do Norte, Europa e América do Sul com rotas diretas regulares.'
    ],
    wikiAirport: 'Presidente_Juscelino_Kubitschek_International_Airport',
    wikiCity: 'Brasília'
  },
  GYN: {
    name: 'Aeroporto Santa Genoveva',
    capacity: '3 milhões pax/ano',
    curiosities: [
      'Inaugurado em 1956, possui uma das pistas mais longas entre aeroportos secundários: 3.240 m.',
      'Movimentou cerca de 2 milhões de passageiros em 2023, com crescimento puxado pelo agronegócio.',
      'É um dos principais aeroportos do Centro-Oeste, servindo como alternativa a BSB para cargas e fretamentos.',
      'O nome Santa Genoveva é uma homenagem à padroeira do local onde o aeroporto foi construído.',
      'Administrado pela Inframérica, opera voos regulares para São Paulo, Rio, Brasília e outras capitais.'
    ],
    wikiAirport: 'Santa_Genoveva_Airport',
    wikiCity: 'Goiânia'
  },
  CWB: {
    name: 'Aeroporto Internacional Afonso Pena',
    capacity: '12 milhões pax/ano',
    curiosities: [
      'Inaugurado como base militar em 1947, tornou-se aeroporto civil na década de 1950.',
      'Possui 2 pistas (2.498 m e 2.218 m) e movimentou cerca de 9 milhões de passageiros em 2023.',
      'É hub importante da Azul e LATAM para o Sul do Brasil, com conexões para Buenos Aires e outras capitais.',
      'A concessão à Inframérica em 2012 trouxe modernizações que dobraram a capacidade do terminal.',
      'Localizado em São José dos Pinhais, a 18 km do centro de Curitiba, com acesso pela BR-376.'
    ],
    wikiAirport: 'Afonso_Pena_International_Airport',
    wikiCity: 'Curitiba'
  },
  FLN: {
    name: 'Aeroporto Internacional Hercílio Luz',
    capacity: '6 milhões pax/ano',
    curiosities: [
      'Um dos aeroportos mais antigos do Brasil, inaugurado em 1927 — quase 100 anos de operação.',
      'O nome homenageia Hercílio Luz, governador catarinense que inaugurou a famosa ponte homônima.',
      'Completamente demolido e reconstruído, foi reinaugurado em 2019 com projeto arquitetônico premiado.',
      'A nova edificação tem 46.000 m² e capacidade para 6 milhões de passageiros anuais com 20 pontes de embarque.',
      'Movimentou cerca de 5 milhões de passageiros em 2023, com forte sazonalidade no verão austral.'
    ],
    wikiAirport: 'Hercílio_Luz_International_Airport',
    wikiCity: 'Florianópolis'
  },
  POA: {
    name: 'Aeroporto Internacional Salgado Filho',
    capacity: '7 milhões pax/ano',
    curiosities: [
      'O nome homenageia Getúlio Salgado Filho, aviador gaúcho e primeiro ministro da Aeronáutica do Brasil.',
      'Em maio de 2024, ficou completamente submerso pelas enchentes históricas do RS, fechando por ~6 meses.',
      'A operação de recuperação pós-enchentes envolveu remoção de toneladas de lama e substituição de toda a eletrônica.',
      'Possui pista de 3.200 m e movimentou cerca de 6 milhões de passageiros em 2023, antes das enchentes.',
      'Opera voos internacionais diretos para Buenos Aires, Montevidéu e Santiago, além de toda a malha doméstica.'
    ],
    wikiAirport: 'Salgado_Filho_International_Airport',
    wikiCity: 'Porto_Alegre'
  },
  MAO: {
    name: 'Aeroporto Internacional Eduardo Gomes',
    capacity: '4 milhões pax/ano',
    curiosities: [
      'O nome homenageia o Brigadeiro Eduardo Gomes, fundador da Força Aérea Brasileira.',
      'É o aeroporto mais isolado do Brasil: sem acesso por rodovias ao Sul — só de avião ou barco.',
      'Serve como hub essencial para dezenas de municípios amazônicos sem acesso terrestre.',
      'Movimentou cerca de 3 milhões de passageiros em 2023, com alta demanda de carga perecível da floresta.',
      'A pista de 2.902 m é estratégica para operações da FAB e missões de monitoramento ambiental na Amazônia.'
    ],
    wikiAirport: 'Eduardo_Gomes_International_Airport',
    wikiCity: 'Manaus'
  },
  BEL: {
    name: 'Aeroporto Internacional Val de Cans',
    capacity: '5 milhões pax/ano',
    curiosities: [
      'Inaugurado em 1944 como campo da Força Aérea Brasileira, passou a uso civil na década de 1950.',
      'O nome "Val de Cans" vem da nomenclatura usada pelos engenheiros franceses que projetaram o campo.',
      'Administrado pela VINCI Airports, possui pista de 2.999 m e terminal com 45.000 m².',
      'Movimentou cerca de 4 milhões de passageiros em 2023, sendo portal de entrada para a Amazônia Oriental.',
      'Opera voos regulares para Lisboa e Miami, além de conexões com todos os estados brasileiros.'
    ],
    wikiAirport: 'Val_de_Cans_International_Airport',
    wikiCity: 'Belém,_Pará'
  },
  PVH: {
    name: 'Aeroporto Internacional Gov. Jorge Teixeira',
    capacity: '2 milhões pax/ano',
    curiosities: [
      'Inaugurado em 1994, é o aeroporto mais importante de Rondônia e principal acesso à capital do estado.',
      'Possui pista de 2.602 m adequada para aeronaves de médio porte como Boeing 737 e ATR 72.',
      'Movimentou cerca de 1,3 milhão de passageiros em 2023, com concentração de voos para São Paulo e Brasília.',
      'Administrado pela Infraero, o aeroporto opera como ponto de conexão entre municípios isolados do interior.',
      'O nome homenageia Jorge Teixeira de Oliveira, governador que liderou a transição de Rondônia a estado.'
    ],
    wikiAirport: 'Governador_Jorge_Teixeira_de_Oliveira_International_Airport',
    wikiCity: 'Porto_Velho'
  },
  RBR: {
    name: 'Aeroporto Internacional Plácido de Castro',
    capacity: '1,5 milhão pax/ano',
    curiosities: [
      'É o aeroporto regular mais ocidental do Brasil, operando como porta de entrada para o Acre.',
      'O nome homenageia Plácido de Castro, herói militar da Revolução Acreana de 1902-1903.',
      'Possui pista de 2.307 m e operou cerca de 800 mil passageiros em 2023.',
      'Administrado pela Infraero, conecta o Acre ao restante do Brasil através de voos para São Paulo e Brasília.',
      'A altitude de 189 m e as condições amazônicas de calor e umidade tornam as operações mais exigentes.'
    ],
    wikiAirport: 'Plácido_de_Castro_International_Airport',
    wikiCity: 'Rio_Branco,_Acre'
  },
  THE: {
    name: 'Aeroporto Senador Petrônio Portella',
    capacity: '2 milhões pax/ano',
    curiosities: [
      'O nome homenageia Petrônio Portella, senador piauiense que foi figura central na redemocratização brasileira.',
      'Inaugurado em 1980, passou por reformas significativas em 2010 para ampliar a capacidade do terminal.',
      'Possui pista de 2.400 m e operou cerca de 1,5 milhão de passageiros em 2023.',
      'Administrado pela Infraero, funciona como hub de distribuição de passageiros para o interior do Piauí.',
      'O aeroporto opera em condições climáticas extremas: temperaturas que podem ultrapassar 40 °C no verão.'
    ],
    wikiAirport: 'Senador_Petrônio_Portella_Airport',
    wikiCity: 'Teresina'
  }
}

// ─── Airport stop panel (shown when plane lands at waypoint) ─────────────────
function AirportStopPanel({ airportCode, aeroportosData, isOrigin, isDestination, onNext, onStop }) {
  const info = AIRPORT_CURIOSITIES[airportCode] || {}
  const aeroInfo = aeroportosData?.[airportCode] || {}
  const [airportImg, setAirportImg] = useState(null)
  const [cityImg, setCityImg] = useState(null)
  const [imgLoading, setImgLoading] = useState(true)
  const [lightboxImg, setLightboxImg] = useState(null)

  useEffect(() => {
    setAirportImg(null)
    setCityImg(null)
    setImgLoading(true)
    let cancelled = false

    async function fetchImg(wikiTitle, setter) {
      try {
        const r = await fetch(
          `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
            wikiTitle.replace(/_/g, ' ')
          )}`
        )
        const d = await r.json()
        if (!cancelled && d.thumbnail?.source) setter(d.thumbnail.source)
      } catch {}
    }

    const tasks = []
    if (info.wikiAirport) tasks.push(fetchImg(info.wikiAirport, setAirportImg))
    if (info.wikiCity) tasks.push(fetchImg(info.wikiCity, setCityImg))
    Promise.allSettled(tasks).then(() => {
      if (!cancelled) setImgLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [airportCode])

  const regionColor = REGION_COLORS[aeroInfo.regiao] || '#3b82f6'

  return (
    <div className="airport-stop-panel">
      {lightboxImg &&
        createPortal(
          <div className="airport-lightbox-overlay" onClick={() => setLightboxImg(null)}>
            <button className="airport-lightbox-close" type="button" onClick={() => setLightboxImg(null)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <img src={lightboxImg} className="airport-lightbox-img" alt="" onClick={(e) => e.stopPropagation()} />
          </div>,
          document.body
        )}

      <div className="airport-stop-header">
        <div className="airport-stop-code-row">
          <span className="airport-stop-code" style={{ color: regionColor }}>
            {airportCode}
          </span>
        </div>

        <button className="airport-stop-close" type="button" onClick={onStop} title="Encerrar viagem">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="12" height="12">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
          Encerrar
        </button>
      </div>

      <div className="airport-stop-body">
        <div className="airport-stop-meta">
          <div className="airport-stop-fullname">{info.name || airportCode}</div>
          <div className="airport-stop-city-region">
            {aeroInfo.cidade || ''}
            {aeroInfo.regiao ? ` · ${aeroInfo.regiao}` : ''}
          </div>
          {info.capacity && (
            <div className="airport-stop-capacity">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="11" height="11">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              {info.capacity}
            </div>
          )}
        </div>

        <div className="airport-stop-photos">
          {airportImg ? (
            <div
              className="airport-stop-photo-wrap airport-stop-photo-clickable"
              onClick={() => setLightboxImg(airportImg)}
              title="Ver foto maior"
            >
              <img
                src={airportImg}
                alt={`Aeroporto ${airportCode}`}
                className="airport-stop-photo"
                onError={(e) => {
                  e.target.closest('.airport-stop-photo-wrap').style.display = 'none'
                }}
              />
              <div className="airport-stop-photo-caption">Aeroporto</div>
            </div>
          ) : imgLoading ? (
            <div className="airport-stop-photo-skeleton" />
          ) : null}

          {cityImg ? (
            <div
              className="airport-stop-photo-wrap airport-stop-photo-clickable"
              onClick={() => setLightboxImg(cityImg)}
              title="Ver foto maior"
            >
              <img
                src={cityImg}
                alt={aeroInfo.cidade || airportCode}
                className="airport-stop-photo"
                onError={(e) => {
                  e.target.closest('.airport-stop-photo-wrap').style.display = 'none'
                }}
              />
              <div className="airport-stop-photo-caption">{aeroInfo.cidade || 'Cidade'}</div>
            </div>
          ) : imgLoading ? (
            <div className="airport-stop-photo-skeleton" />
          ) : null}
        </div>

        <div className="airport-stop-curiosities">
          <div className="airport-stop-curiosities-title">Curiosidades</div>
          {(info.curiosities || ['Aeroporto regional brasileiro.']).map((c, i) => (
            <div key={i} className="airport-stop-curiosity">
              <span className="airport-stop-curiosity-bullet">✦</span>
              {c}
            </div>
          ))}
        </div>
      </div>

      <div className="airport-stop-actions">
        {isDestination ? (
          <button type="button" className="airport-stop-btn finish" onClick={onStop}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="13" height="13">
              <polyline points="20,6 9,17 4,12" />
            </svg>
            Viagem concluída!
          </button>
        ) : (
          <button type="button" className="airport-stop-btn next" onClick={onNext}>
            {isOrigin ? 'Decolar' : 'Próximo voo'}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="13" height="13">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Globe 3D modal — ETA Airports ──────────────────────────────────────────
function Globe3DModalETA({ onClose, graphData, pathResult, startAirport, endAirport, aeroportosData }) {
  const globeRef = useRef(null)
  const containerRef = useRef(null)
  const flyAnimRef = useRef(null)
  const planeModelRef = useRef(null)
  const flightAzimuthRef = useRef(0)
  const isDraggingFlightRef = useRef(false)
  const lastDragXFlightRef = useRef(0)

  const [dimensions, setDimensions] = useState({ w: 900, h: 600 })
  const [autoRotate, setAutoRotate] = useState(true)
  const [globeReady, setGlobeReady] = useState(false)
  const [countriesGeoJSON, setCountriesGeoJSON] = useState({ features: [] })
  const [planeData, setPlaneData] = useState([])
  const [flyState, setFlyState] = useState('idle')
  const [currentWpIdx, setCurrentWpIdx] = useState(0)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  // Carrega o modelo 3D do avião (GLB)
  useEffect(() => {
    const loader = new GLTFLoader()

    loader.load(
      '/aircraft.glb',
      (gltf) => {
        const model = gltf.scene

        model.scale.setScalar(0.003)

        model.traverse((child) => {
          if (child.isMesh && child.material) {
            const mats = Array.isArray(child.material) ? child.material : [child.material]
            mats.forEach((m) => {
              if ('emissive' in m) m.emissive = new THREE.Color(0xffffff)
              if ('emissiveIntensity' in m) m.emissiveIntensity = 0.35
            })
          }
        })

        planeModelRef.current = model
      },
      undefined,
      (err) => console.warn('aircraft.glb load error:', err)
    )
  }, [])

  const activePath = useMemo(() => (pathResult?.path?.length > 1 ? pathResult.path : []), [pathResult])

  const arcsData = useMemo(() => {
    const pathEdgeSet = new Set()
    for (let i = 0; i < activePath.length - 1; i++) {
      pathEdgeSet.add(`${activePath[i]}|${activePath[i + 1]}`)
      pathEdgeSet.add(`${activePath[i + 1]}|${activePath[i]}`)
    }

    return graphData.edges
      .map((e) => {
        const A = AIRPORT_COORDS[e.from]
        const B = AIRPORT_COORDS[e.to]
        if (!A || !B) return null

        const rawLabel = e.weight ?? e.label ?? e.peso ?? ''
        const match = String(rawLabel).match(/-?\d+(\.\d+)?/)
        const weight = match ? Math.trunc(Number(match[0])) : 0

        return {
          startLat: A.lat,
          startLng: A.lon,
          endLat: B.lat,
          endLng: B.lon,
          from: e.from,
          to: e.to,
          weight,
          inPath: pathEdgeSet.has(`${e.from}|${e.to}`) || pathEdgeSet.has(`${e.to}|${e.from}`)
        }
      })
      .filter(Boolean)
  }, [graphData.edges, activePath])

  const pointsData = useMemo(() => {
    const pathSet = new Set(activePath)
    return graphData.nodes
      .filter((n) => AIRPORT_COORDS[n.id])
      .map((n) => ({
        lat: AIRPORT_COORDS[n.id].lat,
        lng: AIRPORT_COORDS[n.id].lon,
        id: n.id,
        region: aeroportosData[n.id]?.regiao || 'Outro',
        city: aeroportosData[n.id]?.cidade || n.id,
        isStart: n.id === startAirport,
        isEnd: n.id === endAirport,
        inPath: pathSet.has(n.id)
      }))
  }, [graphData.nodes, aeroportosData, startAirport, endAirport, activePath])

  useEffect(() => {
    fetch('https://raw.githubusercontent.com/vasturiano/globe.gl/master/example/datasets/countries.geojson')
      .then((r) => r.json())
      .then((data) => setCountriesGeoJSON(data))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const ro = new ResizeObserver(() => setDimensions({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    setDimensions({ w: el.clientWidth, h: el.clientHeight })

    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (!globeReady || !globeRef.current) return
    const ctrl = globeRef.current.controls()
    ctrl.autoRotate = true
    ctrl.autoRotateSpeed = 0.4
    ctrl.enableDamping = true
    ctrl.dampingFactor = 0.08
    globeRef.current.pointOfView({ lat: -15, lng: -52, altitude: 0.6 }, 800)
  }, [globeReady])

  useEffect(() => {
    if (!globeRef.current) return
    globeRef.current.controls().autoRotate = autoRotate
  }, [autoRotate])

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        handleStop()
        onClose()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  useEffect(() => {
    return () => clearInterval(flyAnimRef.current)
  }, [])

  function handleStop() {
    clearInterval(flyAnimRef.current)
    flightAzimuthRef.current = 0
    isDraggingFlightRef.current = false
    setFlyState('idle')
    setPlaneData([])
    setCurrentWpIdx(0)
    if (globeRef.current) {
      const ctrl = globeRef.current.controls()
      ctrl.enabled = true
      ctrl.enableDamping = false
      ctrl.target.set(0, 0, 0)
      ctrl.update()
      ctrl.enableDamping = true
      ctrl.autoRotate = autoRotate
    }
  }

  function handleViajar() {
    if (activePath.length < 2) return
    const coord = AIRPORT_COORDS[activePath[0]]
    if (!coord) return

    clearInterval(flyAnimRef.current)
    setAutoRotate(false)

    const nextCoord = AIRPORT_COORDS[activePath[1]]
    const bearing = nextCoord ? computeBearing(coord.lat, coord.lon, nextCoord.lat, nextCoord.lon) : 0

    setPlaneData([{ lat: coord.lat, lng: coord.lon, bearing }])
    setCurrentWpIdx(0)
    setFlyState('at_airport')

    globeRef.current?.pointOfView({ lat: coord.lat - 0.5, lng: coord.lon, altitude: 0.5 }, 900)
  }

  function handleNextFlight() {
    const nextIdx = currentWpIdx + 1
    if (nextIdx >= activePath.length) return

    const fromCode = activePath[currentWpIdx]
    const toCode = activePath[nextIdx]
    const fromCoord = AIRPORT_COORDS[fromCode]
    const toCoord = AIRPORT_COORDS[toCode]
    if (!fromCoord || !toCoord) return

    clearInterval(flyAnimRef.current)
    setFlyState('flying')

    const bearing = computeBearing(fromCoord.lat, fromCoord.lon, toCoord.lat, toCoord.lon)
    setPlaneData([{ lat: fromCoord.lat, lng: fromCoord.lon, bearing }])

    const STEPS = 150
    const INTERVAL = 16
    let step = 0

    setTimeout(() => {
      flyAnimRef.current = setInterval(() => {
        const t = step / STEPS
        const lat = fromCoord.lat + (toCoord.lat - fromCoord.lat) * t
        const lng = fromCoord.lon + (toCoord.lon - fromCoord.lon) * t

        if (globeRef.current) {
          const GLOBE_R = 100
          const phi = ((90 - lat) * Math.PI) / 180
          const theta = ((90 - lng) * Math.PI) / 180
          const r = GLOBE_R * (1 + 0.12)
          const sinPhi = Math.sin(phi), cosPhi = Math.cos(phi)
          const cosTheta = Math.cos(theta), sinTheta = Math.sin(theta)
          const planePos = new THREE.Vector3(r * sinPhi * cosTheta, r * cosPhi, r * sinPhi * sinTheta)
          const up = new THREE.Vector3(sinPhi * cosTheta, cosPhi, sinPhi * sinTheta).normalize()
          const north = new THREE.Vector3(0, 1, 0).addScaledVector(up, -up.y).normalize()
          const east = new THREE.Vector3().crossVectors(north, up).normalize()
          const az = flightAzimuthRef.current
          const rotDir = new THREE.Vector3().addScaledVector(east, Math.cos(az)).addScaledVector(north, Math.sin(az))
          const camPos = new THREE.Vector3().copy(planePos).addScaledVector(rotDir, 18).addScaledVector(up, 10)
          const camera = globeRef.current.camera()
          const controls = globeRef.current.controls()
          controls.enabled = false
          camera.position.copy(camPos)
          camera.up.copy(up)
          camera.lookAt(planePos)
        }

        setPlaneData([{ lat, lng, bearing }])

        step++

        if (step > STEPS) {
          clearInterval(flyAnimRef.current)

          const isLastWp = nextIdx === activePath.length - 1
          let restBearing = bearing

          if (!isLastWp) {
            const afterCoord = AIRPORT_COORDS[activePath[nextIdx + 1]]
            if (afterCoord) {
              restBearing = computeBearing(toCoord.lat, toCoord.lon, afterCoord.lat, afterCoord.lon)
            }
          }

          flightAzimuthRef.current = 0
          isDraggingFlightRef.current = false
          const endCtrl = globeRef.current?.controls()
          if (endCtrl) {
            endCtrl.enabled = true
            endCtrl.enableDamping = false
            endCtrl.target.set(0, 0, 0)
            endCtrl.update()
            endCtrl.enableDamping = true
          }
          globeRef.current?.pointOfView({ lat: toCoord.lat - 0.5, lng: toCoord.lon, altitude: 0.8 }, 1000)

          setPlaneData([{ lat: toCoord.lat, lng: toCoord.lon, bearing: restBearing }])
          setCurrentWpIdx(nextIdx)
          setFlyState('at_airport')
        }
      }, INTERVAL)
    }, 800)
  }

  const regionColor = (region) => REGION_COLORS[region] || '#4da3ff'
  const isFlying = flyState === 'flying'
  const isAtAirport = flyState === 'at_airport'
  const currentCode = isAtAirport ? activePath[currentWpIdx] : null

  return (
    <div
      className="globe-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleStop()
          onClose()
        }
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="globe-modal-container eta-globe">
        <div className="globe-modal-header">
          <div className="globe-modal-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.8" width="19" height="19" style={{ flexShrink: 0 }}>
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27,6.96 12,12.01 20.73,6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
            Mapa de Voos — Visão 3D
          </div>

          <div className="globe-modal-controls">
            {activePath.length >= 2 && flyState === 'idle' && (
              <button type="button" className="globe-ctrl-btn travel-btn" onClick={handleViajar}>
                ✈ Viajar
              </button>
            )}

            <button
              type="button"
              className="globe-close-btn"
              onClick={() => {
                handleStop()
                onClose()
              }}
              aria-label="Fechar"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="15" height="15">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {activePath.length > 0 && (
          <div className="globe-path-bar">
            <span className="globe-path-label">Rota:</span>
            <div className="globe-path-ports">
              {activePath.map((code, i) => (
                <span key={`gp-${code}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <span
                    style={{
                      color: code === startAirport ? '#26c281' : code === endAirport ? '#ff6b6b' : '#FFD700',
                      fontWeight: 800,
                      fontSize: '0.82rem',
                      opacity: isAtAirport && currentCode === code ? 1 : 0.65,
                      textDecoration: isAtAirport && currentCode === code ? 'underline' : 'none',
                      textUnderlineOffset: 2
                    }}
                  >
                    {code}
                  </span>
                  {i < activePath.length - 1 && <span style={{ color: '#334155', fontSize: '0.75rem' }}>›</span>}
                </span>
              ))}
            </div>
            {pathResult?.cost != null && <span className="globe-path-cost">Peso: {Math.trunc(Number(pathResult.cost))}</span>}
          </div>
        )}

        {isFlying && (
          <div className="globe-flying-banner">
            <span>✈</span>
            Voando de <strong>{activePath[currentWpIdx]}</strong> para <strong>{activePath[currentWpIdx + 1]}</strong>
            <span style={{ color: '#475569', marginLeft: 8, fontSize: '0.74rem' }}>— arraste para girar a câmera</span>
          </div>
        )}

        <div
          className="globe-modal-body"
          ref={containerRef}
          onPointerDown={(e) => {
            if (flyState !== 'flying') return
            isDraggingFlightRef.current = true
            lastDragXFlightRef.current = e.clientX
            e.currentTarget.setPointerCapture(e.pointerId)
          }}
          onPointerMove={(e) => {
            if (!isDraggingFlightRef.current || flyState !== 'flying') return
            const dx = e.clientX - lastDragXFlightRef.current
            flightAzimuthRef.current -= dx * 0.005
            lastDragXFlightRef.current = e.clientX
          }}
          onPointerUp={() => { isDraggingFlightRef.current = false }}
          onPointerLeave={() => { isDraggingFlightRef.current = false }}
        >
          {!globeReady && (
            <div className="globe-loading">
              <div className="globe-loading-spinner eta-spinner" />
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
            atmosphereColor="rgba(59,130,246,0.65)"
            atmosphereAltitude={0.2}
            polygonsData={countriesGeoJSON.features}
            polygonCapColor={() => 'rgba(0,0,0,0)'}
            polygonSideColor={() => 'rgba(0,0,0,0)'}
            polygonStrokeColor={() => 'rgba(59,130,246,0.32)'}
            polygonAltitude={0.001}
            polygonLabel={() => ''}
            arcsData={arcsData}
            arcStartLat={(d) => d.startLat}
            arcStartLng={(d) => d.startLng}
            arcEndLat={(d) => d.endLat}
            arcEndLng={(d) => d.endLng}
            arcColor={(d) => {
              if (d.inPath) return '#FFD700'
              return activePath.length > 0 ? 'rgba(255,255,255,0.06)' : 'rgba(59,130,246,0.14)'
            }}
            arcStroke={(d) => {
              if (d.inPath) return 1.2
              return activePath.length > 0 ? 0.18 : 0.28
            }}
            arcDashLength={(d) => (d.inPath ? 0.45 : 1)}
            arcDashGap={(d) => (d.inPath ? 0.2 : 0)}
            arcDashAnimateTime={(d) => (d.inPath ? 1000 : 0)}
            arcAltitudeAutoScale={0.3}
            arcLabel={(d) =>
              `<div style="background:rgba(${d.inPath ? '20,18,0' : '10,18,30'},0.97);border:1.5px solid rgba(${d.inPath ? '255,215,0' : '59,130,246'},0.55);border-radius:9px;padding:7px 12px;font-family:Inter,sans-serif">` +
              `<span style="color:#f1f5f9;font-weight:700">${d.from}</span>` +
              `<span style="color:#334155;margin:0 6px">→</span>` +
              `<span style="color:#f1f5f9;font-weight:700">${d.to}</span>` +
              `<div style="color:${d.inPath ? '#FFD700' : '#94a3b8'};font-size:11px;margin-top:3px">` +
              `Peso: ${d.weight}${d.inPath ? ' · ★ Melhor rota' : ''}</div></div>`
            }
            pointsData={pointsData}
            pointLat={(d) => d.lat}
            pointLng={(d) => d.lng}
            pointColor={(d) => {
              if (d.isStart) return '#26c281'
              if (d.isEnd) return '#ff6b6b'
              if (d.inPath) return '#FFD700'
              return activePath.length > 0 ? 'rgba(200,215,235,0.45)' : regionColor(d.region)
            }}
            pointRadius={(d) => (d.isStart || d.isEnd ? 0.35 : d.inPath ? 0.25 : 0.15)}
            pointAltitude={(d) => (d.isStart || d.isEnd ? 0.04 : d.inPath ? 0.025 : 0.006)}
            pointLabel={(d) =>
              `<div style="background:rgba(10,18,30,0.97);border:1.5px solid ${regionColor(
                d.region
              )};border-radius:10px;padding:10px 14px;font-family:Inter,sans-serif;min-width:135px;box-shadow:0 6px 28px rgba(0,0,0,0.6)">` +
              `<div style="font-weight:800;color:#f1f5f9;font-size:15px">${d.id}</div>` +
              `<div style="color:#94a3b8;font-size:12px;margin-top:3px">${d.city}</div>` +
              `<div style="color:#475569;font-size:10px;margin-top:2px">${d.region}</div>` +
              (d.isStart ? `<div style="color:#26c281;font-size:11px;font-weight:700;margin-top:5px">✦ Origem</div>` : '') +
              (d.isEnd ? `<div style="color:#ff6b6b;font-size:11px;font-weight:700;margin-top:5px">✦ Destino</div>` : '') +
              (d.inPath && !d.isStart && !d.isEnd
                ? `<div style="color:#FFD700;font-size:11px;font-weight:700;margin-top:5px">★ Na rota</div>`
                : '') +
              `</div>`
            }
            customLayerData={planeData}
            customThreeObject={() => {
              if (!planeModelRef.current) return new THREE.Object3D()
              return planeModelRef.current.clone(true)
            }}
            customThreeObjectUpdate={(obj, d) => {
              const GLOBE_R = 100
              const alt = flyState === 'flying' ? 0.12 : 0.08
              const phi = ((90 - d.lat) * Math.PI) / 180
              const theta = ((90 - d.lng) * Math.PI) / 180
              const r = GLOBE_R * (1 + alt)

              const sinPhi = Math.sin(phi)
              const cosPhi = Math.cos(phi)
              const cosTheta = Math.cos(theta)
              const sinTheta = Math.sin(theta)

              obj.position.set(
                r * sinPhi * cosTheta,
                r * cosPhi,
                r * sinPhi * sinTheta
              )

              const up = new THREE.Vector3(sinPhi * cosTheta, cosPhi, sinPhi * sinTheta).normalize()
              const worldY = new THREE.Vector3(0, 1, 0)
              const north = new THREE.Vector3()
                .copy(worldY)
                .addScaledVector(up, -worldY.dot(up))
                .normalize()

              const east = new THREE.Vector3().crossVectors(north, up).normalize()
              const bearingRad = ((d.bearing ?? 0) * Math.PI) / 180

              const forward = new THREE.Vector3()
                .addScaledVector(north, Math.cos(bearingRad))
                .addScaledVector(east, Math.sin(bearingRad))
                .normalize()

              const right = new THREE.Vector3().crossVectors(up, forward).normalize()

              obj.setRotationFromMatrix(new THREE.Matrix4().makeBasis(right, up, forward))
            }}
          />

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
              <span className="globe-legend-dot" style={{ background: '#3b82f6' }} />
              Outros
            </div>
            <div className="globe-legend-sep" />
            {activePath.length >= 2 && flyState === 'idle' && (
              <div style={{ fontSize: '0.69rem', color: '#3b82f6', fontWeight: 700, lineHeight: 1.5 }}>
                ✈ Clique em "Viajar"
                <br />
                para iniciar o voo!
              </div>
            )}
            {activePath.length === 0 && (
              <div className="globe-legend-hint">
                Selecione origem
                <br />
                e destino para
                <br />
                ver a rota
              </div>
            )}
          </div>

          {isAtAirport && currentCode && (
            <AirportStopPanel
              airportCode={currentCode}
              aeroportosData={aeroportosData}
              isOrigin={currentWpIdx === 0}
              isDestination={currentWpIdx === activePath.length - 1}
              onNext={handleNextFlight}
              onStop={handleStop}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function AirportCuriosityModal({ airportCode, aeroportosData, onClose }) {
  const info = AIRPORT_CURIOSITIES[airportCode] || {}
  const aeroInfo = aeroportosData?.[airportCode] || {}
  const [airportImg, setAirportImg] = useState(null)
  const [cityImg, setCityImg] = useState(null)
  const [imgLoading, setImgLoading] = useState(true)

  const regionColor = REGION_COLORS[aeroInfo.regiao] || '#4da3ff'

  useEffect(() => {
    setAirportImg(null)
    setCityImg(null)
    setImgLoading(true)
    let cancelled = false

    async function fetchImg(wikiTitle, setter) {
      try {
        const r = await fetch(
          `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiTitle.replace(/_/g, ' '))}`
        )
        const d = await r.json()
        if (!cancelled && d.thumbnail?.source) setter(d.thumbnail.source)
      } catch {}
    }

    const tasks = []
    if (info.wikiAirport) tasks.push(fetchImg(info.wikiAirport, setAirportImg))
    if (info.wikiCity) tasks.push(fetchImg(info.wikiCity, setCityImg))
    Promise.allSettled(tasks).then(() => {
      if (!cancelled) setImgLoading(false)
    })

    return () => { cancelled = true }
  }, [airportCode])

  return createPortal(
    <div className="acm-overlay" onClick={onClose}>
      <div className="airport-curiosity-modal" onClick={(e) => e.stopPropagation()}>
        <div
          className="acm-hero"
          style={{ background: `linear-gradient(135deg, ${regionColor}18 0%, rgba(6,16,32,0) 60%)` }}
        >
          <div className="acm-header">
            <div className="acm-header-left">
              <span className="acm-code" style={{ color: regionColor }}>{airportCode}</span>
              {aeroInfo.regiao && (
                <span className="acm-region" style={{ background: `${regionColor}28`, color: regionColor }}>
                  {aeroInfo.regiao}
                </span>
              )}
            </div>
            <button className="acm-close" type="button" onClick={onClose} title="Fechar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="15" height="15">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className="acm-name">{info.name || airportCode}</div>
          {aeroInfo.cidade && <div className="acm-city">{aeroInfo.cidade}</div>}

          {info.capacity && (
            <div className="acm-capacity">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              {info.capacity}
            </div>
          )}
        </div>

        {(airportImg || cityImg || imgLoading) && (
          <div className="acm-photos">
            {airportImg ? (
              <img src={airportImg} className="acm-photo" alt={`Aeroporto ${airportCode}`} />
            ) : imgLoading ? (
              <div className="acm-photo-skeleton" />
            ) : null}
            {cityImg ? (
              <img src={cityImg} className="acm-photo" alt={aeroInfo.cidade || airportCode} />
            ) : imgLoading ? (
              <div className="acm-photo-skeleton" />
            ) : null}
          </div>
        )}

        <div className="acm-body">
          <div className="acm-curiosities-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            Curiosidades
          </div>
          <div className="acm-curiosities">
            {(info.curiosities || ['Aeroporto regional brasileiro.']).map((c, i) => (
              <div key={i} className="acm-curiosity">
                <span className="acm-bullet">✦</span>
                <span>{c}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

function App({ onNavigate }) {
  const [startAirport, setStartAirport] = useState('')
  const [endAirport, setEndAirport] = useState('')
  const [pathResult, setPathResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] })
  const [selectedConnectionAirport, setSelectedConnectionAirport] = useState(null)
  const [aeroportosData, setAeroportosData] = useState({})
  const [egoAeroportos, setEgoAeroportos] = useState({})
  const [dijkstraSteps, setDijkstraSteps] = useState([])
  const [isSimulatingSteps, setIsSimulatingSteps] = useState(false)
  const [visibleTopRoutes, setVisibleTopRoutes] = useState(5)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [show3DGlobe, setShow3DGlobe] = useState(false)
  const [hoveredNode, setHoveredNode] = useState(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const [hoveredConnectionModal, setHoveredConnectionModal] = useState(null)

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
    async function fetchCSVs() {
      try {
        const [aeroData, egoData] = await Promise.all([
          axios.get('http://localhost:5000/api/aeroportos-data'),
          axios.get('http://localhost:5000/api/ego-aeroportos')
        ])

        const aeroObj = {}
        for (const row of aeroData.data) {
          aeroObj[row.iata] = { cidade: row.cidade, regiao: row.regiao }
        }
        setAeroportosData(aeroObj)

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

  useEffect(() => {
    loadGraphData()
  }, [])

  useEffect(() => {
    startAirportRef.current = startAirport
  }, [startAirport])

  useEffect(() => {
    endAirportRef.current = endAirport
  }, [endAirport])

  useEffect(() => {
    pathResultRef.current = pathResult
  }, [pathResult])

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
      if (networkRef.current) networkRef.current.destroy()
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

  const nodeById = useMemo(() => new Map(graphData.nodes.map((node) => [node.id, node])), [graphData.nodes])

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
          index === arr.findIndex((candidate) => candidate.code === item.code && candidate.weight === item.weight)
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
    if (pathResult?.topRoutes?.length > 0) return pathResult.topRoutes
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

    if (isStart && pendingSwapType === 'start') return { background: '#7c5cff', border: '#ffffff' }
    if (isEnd && pendingSwapType === 'end') return { background: '#f6c56f', border: '#ffffff' }
    if (isStart) return { background: '#26c281', border: '#ffffff' }
    if (isEnd) return { background: '#ff6b6b', border: '#ffffff' }
    if (isIntermediate) return { background: '#f6c56f', border: '#ffe29e' }

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
          ((edge.from === path[i] && edge.to === path[i + 1]) || (edge.from === path[i + 1] && edge.to === path[i]))
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
        networkRef.current?.fit({
          animation: { duration: 350, easingFunction: 'easeInOutQuad' }
        })
      }, 120)
    }
  }

  const updateGraphVisual = (path, start, end, pending) => applyGraphVisual(path, start, end, pending, false)
  const highlightPath = (path, start, end, pending) => applyGraphVisual(path, start, end, pending, true)

  const calculatePath = async (customStart = startAirportRef.current, customEnd = endAirportRef.current) => {
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

    networkRef.current.on('hoverNode', function (params) {
      const nodeId = params.node
      setHoveredNode(nodeId)
      if (params.event && params.event.pointer && params.event.pointer.DOM) {
        setTooltipPos({
          x: params.event.pointer.DOM.x,
          y: params.event.pointer.DOM.y
        })
      }
    })

    networkRef.current.on('blurNode', function () {
      setHoveredNode(null)
    })

    networkRef.current.once('stabilizationIterationsDone', () => {
      if (!networkRef.current) return
      networkRef.current.setOptions({ physics: false })

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
      const clickedIsIntermediate = isIntermediatePathNode(nodeId, currentPath, currentStart, currentEnd)

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
      .filter((n) => n.id.toLowerCase().includes(lower) || (n.city && n.city.toLowerCase().includes(lower)))
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
      { badge: '🥈 2ª melhor', className: 'route-rank-card top-2' },
      { badge: '🥉 3ª melhor', className: 'route-rank-card top-3' }
    ]
    return medals[index] ?? { badge: `#${index + 1}`, className: 'route-rank-card' }
  }

  const handleMapNodeClick = (nodeId) => {
    const currentStart = startAirportRef.current
    const currentEnd = endAirportRef.current
    const currentPath = pathResultRef.current?.path || []

    if (isIntermediatePathNode(nodeId, currentPath, currentStart, currentEnd)) return
    if (nodeId === currentStart) {
      clearStartAndWaitForNewSelection()
      return
    }
    if (nodeId === currentEnd) {
      clearEndAndWaitForNewSelection()
      return
    }

    const pendingType = pendingSwapTypeRef.current

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
  }

  const formattedCost =
    pathResult?.cost !== undefined && pathResult?.cost !== null ? Math.trunc(Number(pathResult.cost)) : ''

  const maxTopRoutes = Math.min(20, topRoutesToShow.length)

  return (
    <div className="app-modern-bg" style={{ position: 'relative' }}>
      <header className="app-modern-header">
        <div className="header-top-actions">
          <button onClick={handleGoBack} className="global-metrics-back-button" type="button" title="Voltar">
            <span className="global-metrics-back-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="18" height="18">
                <path
                  d="M15 6L9 12L15 18"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="global-metrics-back-text">Voltar</span>
          </button>
        </div>

        <div className="clean-header">
          <div className="clean-header-brand">
            <img src={logo} alt="Logo ETA Airlines" className="clean-header-logo" />
          </div>
          <div className="clean-header-content">
            <h1 className="clean-header-title">Painel de Voos & Rotas</h1>
            <p className="dashboard-header-subtitle">
              Navegue interativamente pelas rotas e aeroportos e calcule os melhores caminhos.
            </p>
          </div>
        </div>
      </header>

      <main className="app-modern-main">
        <section className="glass-card app-top-bar clean-top-bar">
          <div className="field-group">
            <label>Origem</label>
            <select value={startAirport} onChange={(e) => handleStartChange(e.target.value)}>
              <option value="">Selecione a origem</option>
              {airportOptions.map((airport) => (
                <option key={airport.value} value={airport.value} disabled={airport.value === endAirport}>
                  {airport.label}
                </option>
              ))}
            </select>
          </div>

          <div className="field-group">
            <label>Destino</label>
            <select value={endAirport} onChange={(e) => handleEndChange(e.target.value)}>
              <option value="">Selecione o destino</option>
              {airportOptions.map((airport) => (
                <option key={airport.value} value={airport.value} disabled={airport.value === startAirport}>
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
              <div className="summary-route-subtitle">Sequência de aeroportos do trajeto analisado</div>

              <div className="summary-route-flow">
                {pathResult.path.map((airport, index) => (
                  <div key={index} className="route-flow-item">
                    <span className="route-flow-code">{airport}</span>
                    {index < pathResult.path.length - 1 && <span className="route-flow-arrow">→</span>}
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
          <div className="map-section-header">
            <div className="map-section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              Mapa de Conexões de Voos
            </div>

            <button type="button" className="globe-3d-open-btn eta-3d-btn" onClick={() => setShow3DGlobe(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              Ver em 3D
            </button>
          </div>

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
                  <li key={n.id} className="search-bar-item" onMouseDown={() => handleSearchSelect(n.id)}>
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
                  <div className="ego-block-item">
                    <span>Região:</span> <strong>{aeroportosData[selectedConnectionAirport.id]?.regiao || '-'}</strong>
                  </div>
                  <div className="ego-block-item">
                    <span>Grau:</span> <strong>{egoAeroportos[selectedConnectionAirport.id]?.grau || '-'}</strong>
                  </div>
                  <div className="ego-block-item">
                    <span>Ordem Ego:</span>{' '}
                    <strong>{egoAeroportos[selectedConnectionAirport.id]?.ordem_ego || '-'}</strong>
                  </div>
                  <div className="ego-block-item">
                    <span>Tamanho Ego:</span>{' '}
                    <strong>{egoAeroportos[selectedConnectionAirport.id]?.tamanho_ego || '-'}</strong>
                  </div>
                  <div className="ego-block-item">
                    <span>Densidade Ego:</span>{' '}
                    <strong>{egoAeroportos[selectedConnectionAirport.id]?.densidade_ego || '-'}</strong>
                  </div>
                </div>
              </div>

              <div className="airport-connections-content">
                {selectedConnectionAirport.connections.length > 0 ? (
                  <div className="airport-connections-list">
                    {selectedConnectionAirport.connections.map((connection, index) => (
                      <div
                        key={`${selectedConnectionAirport.id}-${connection.code}-${connection.weight}-${index}`}
                        className={`airport-connection-card${hoveredConnectionModal?.code === connection.code ? ' acm-card-active' : ''}`}
                        onClick={() => {
                          if (hoveredConnectionModal?.code === connection.code) {
                            setHoveredConnectionModal(null)
                          } else {
                            setHoveredConnectionModal({ code: connection.code })
                          }
                        }}
                      >
                        <div className="airport-connection-info">
                          <div className="airport-connection-code">{connection.code}</div>
                          {connection.city ? <div className="airport-connection-city">{connection.city}</div> : null}
                        </div>
                        <div className="airport-connection-weight">
                          {connection.weight ? `Peso ${connection.weight}` : 'Peso -'}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="airport-connections-no-data">Este aeroporto não possui conexões cadastradas.</div>
                )}
              </div>
            </>
          ) : (
            <div className="airport-connections-empty">Pesquise um aeroporto acima para exibir suas conexões aqui.</div>
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
                              stepIndex === dijkstraSteps.length - 1 && pathResult?.path?.includes(nodeId)

                            return (
                              <td
                                key={`${nodeId}-${stepIndex}`}
                                className={[isSelected ? 'is-active-step' : '', isFinalSelected ? 'is-final-path-step' : '']
                                  .filter(Boolean)
                                  .join(' ')}
                              >
                                {isSelected ? (
                                  <span className="algorithm-step-value emphasis">{step.rows[nodeId]}</span>
                                ) : (
                                  <span className="algorithm-step-value">{step.rows[nodeId]}</span>
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
                    <span className="algorithm-status-badge running">Executando passo a passo...</span>
                  ) : (
                    <span className="algorithm-status-badge done">Melhor rota encontrada</span>
                  )}
                </div>

                <div className="top-routes-visual">
                  <div className="top-routes-header">
                    <div className="top-routes-title">Top 20 rotas possíveis</div>
                    <div className="top-routes-subtitle">
                      Ranking visual da melhor rota até a menos eficiente para o trajeto selecionado.
                    </div>
                  </div>

                  {topRoutesToShow.length > 0 ? (
                    <>
                      <div className="top-routes-list">
                        {topRoutesToShow.slice(0, visibleTopRoutes).map((route, index) => {
                          const rankMeta = getRouteRankMeta(index)
                          const totalCost = Math.trunc(Number(route.cost || 0))
                          const totalConnections = route.connections ?? Math.max((route.path?.length || 0) - 2, 0)
                          const totalSegments = Math.max((route.path?.length || 0) - 1, 0)

                          return (
                            <div key={`top-route-${index}-${route.path?.join('-') || index}`} className={rankMeta.className}>
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
                                  <div key={`${airport}-${pathIndex}`} className="route-rank-flow-item">
                                    <span className="route-rank-airport">{airport}</span>
                                    {pathIndex < route.path.length - 1 && <span className="route-rank-arrow">→</span>}
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
                              onClick={() => setVisibleTopRoutes((prev) => Math.min(prev + 5, maxTopRoutes))}
                            >
                              Mostrar mais 5
                            </button>
                          )}
                          {visibleTopRoutes > 5 && (
                            <button type="button" className="top-routes-btn secondary" onClick={() => setVisibleTopRoutes(5)}>
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
                Clique em <strong>Analisar</strong> ou selecione origem e destino para iniciar a simulação do algoritmo.
              </div>
            )
          ) : (
            <div className="algorithm-steps-empty">
              Escolha uma origem e um destino para visualizar a execução passo a passo do algoritmo.
            </div>
          )}
        </div>

        {/* container oculto/placeholder pro vis-network continuar funcionando se você ainda usar */}
        <div ref={containerRef} className="network-canvas" style={{ display: 'none' }} />

        {hoveredNode && (
          <AirportTooltip
            airportCode={hoveredNode}
            aeroportosData={aeroportosData}
            egoAeroportos={egoAeroportos}
            x={tooltipPos.x}
            y={tooltipPos.y}
          />
        )}

        {hoveredConnectionModal && (
          <AirportCuriosityModal
            airportCode={hoveredConnectionModal.code}
            aeroportosData={aeroportosData}
            onClose={() => setHoveredConnectionModal(null)}
          />
        )}
      </main>

      {show3DGlobe && (
        <Globe3DModalETA
          onClose={() => setShow3DGlobe(false)}
          graphData={graphData}
          pathResult={pathResult}
          startAirport={startAirport}
          endAirport={endAirport}
          aeroportosData={aeroportosData}
        />
      )}
    </div>
  )
}

export default App