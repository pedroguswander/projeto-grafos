import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import './GlobalMetrics.css';

const GEO_URL =
  'https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/brazil-states.geojson';

const STATE_TO_REGION = {
  AC: 'Norte',
  AL: 'Nordeste',
  AP: 'Norte',
  AM: 'Norte',
  BA: 'Nordeste',
  CE: 'Nordeste',
  DF: 'Centro-Oeste',
  ES: 'Sudeste',
  GO: 'Centro-Oeste',
  MA: 'Nordeste',
  MT: 'Centro-Oeste',
  MS: 'Centro-Oeste',
  MG: 'Sudeste',
  PA: 'Norte',
  PB: 'Nordeste',
  PR: 'Sul',
  PE: 'Nordeste',
  PI: 'Nordeste',
  RJ: 'Sudeste',
  RN: 'Nordeste',
  RS: 'Sul',
  RO: 'Norte',
  RR: 'Norte',
  SC: 'Sul',
  SP: 'Sudeste',
  SE: 'Nordeste',
  TO: 'Norte',
};

const REGION_COLORS = {
  Norte: '#3f7ea6',
  Nordeste: '#5b7fa3',
  'Centro-Oeste': '#6a6fb0',
  Sudeste: '#4d8fd6',
  Sul: '#6f88a8',
};

const REGION_ORDER = ['Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul'];

function getStateCode(geo) {
  return (
    geo?.properties?.sigla ||
    geo?.properties?.abbr ||
    geo?.properties?.code ||
    geo?.properties?.uf ||
    ''
  );
}

function getStateName(geo) {
  return (
    geo?.properties?.name ||
    geo?.properties?.nome ||
    geo?.properties?.state ||
    ''
  );
}

function getRegionFromGeo(geo) {
  const stateCode = getStateCode(geo).toUpperCase();
  return STATE_TO_REGION[stateCode] || null;
}

function getFillColor(geo, selectedRegion) {
  const region = getRegionFromGeo(geo);
  if (!region) return '#33465e';
  return region === selectedRegion ? REGION_COLORS[region] : '#3a4960';
}

export default function GlobalMetrics({ onBack }) {
  const [aeroportosData, setAeroportosData] = useState([]);
  const [egoRegiao, setEgoRegiao] = useState([]);
  const [egoAeroportos, setEgoAeroportos] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState('Nordeste');
  const [hoveredState, setHoveredState] = useState(null);
  const [selectedAirport, setSelectedAirport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [aeroRes, regiaoRes, egoAeroRes] = await Promise.all([
          axios.get('http://localhost:5000/api/aeroportos-data'),
          axios.get('http://localhost:5000/api/ego-regiao'),
          axios.get('http://localhost:5000/api/ego-aeroportos'),
        ]);

        setAeroportosData(aeroRes.data || []);
        setEgoRegiao(regiaoRes.data || []);
        setEgoAeroportos(egoAeroRes.data || []);
      } catch (error) {
        console.error('Erro ao carregar dados da GlobalMetrics:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  useEffect(() => {
    function handleEsc(event) {
      if (event.key === 'Escape') {
        setSelectedAirport(null);
      }
    }

    if (selectedAirport) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [selectedAirport]);

  const normalizedRegionMetrics = useMemo(() => {
    const map = {};

    for (const row of egoRegiao) {
      const regiao =
        row['Região'] ||
        row['Regiao'] ||
        row['regiao'] ||
        row['REGIÃO'] ||
        row['REGIAO'];

      if (!regiao) continue;

      map[regiao] = {
        regiao,
        ordem: row['Ordem'] || row['ordem'] || row['ORDEM'] || '-',
        tamanho: row['Tamanho'] || row['tamanho'] || row['TAMANHO'] || '-',
        densidade: row['Densidade'] || row['densidade'] || row['DENSIDADE'] || '-',
      };
    }

    return map;
  }, [egoRegiao]);

  const normalizedAirports = useMemo(() => {
    return aeroportosData.map((item) => ({
      regiao: item.regiao || item.Regiao || item.Região || item.REGIAO || '',
      cidade: item.cidade || item.Cidade || item.CIDADE || '',
      iata: item.iata || item.IATA || item.codigo || item.codigo_iata || '',
    }));
  }, [aeroportosData]);

  const normalizedAirportEgo = useMemo(() => {
    const map = {};

    for (const row of egoAeroportos) {
      const code =
        row['aeroporto'] ||
        row['Aeroporto'] ||
        row['AEROPORTO'] ||
        row['iata'] ||
        row['IATA'];

      if (!code) continue;

      map[String(code).trim().toUpperCase()] = {
        aeroporto: code,
        grau: row['grau'] || row['Grau'] || row['GRAU'] || '-',
        ordemEgo: row['ordem_ego'] || row['ordem ego'] || row['Ordem_Ego'] || '-',
        tamanhoEgo: row['tamanho_ego'] || row['tamanho ego'] || row['Tamanho_Ego'] || '-',
        densidadeEgo:
          row['densidade_ego'] || row['densidade ego'] || row['Densidade_Ego'] || '-',
      };
    }

    return map;
  }, [egoAeroportos]);

  const regions = useMemo(() => {
    const fromAirports = [
      ...new Set(normalizedAirports.map((item) => item.regiao).filter(Boolean)),
    ];
    const fromMetrics = Object.keys(normalizedRegionMetrics);
    const merged = [...new Set([...REGION_ORDER, ...fromAirports, ...fromMetrics])];
    return merged.filter(Boolean);
  }, [normalizedAirports, normalizedRegionMetrics]);

  const selectedRegionMetrics = normalizedRegionMetrics[selectedRegion] || {};

  const selectedRegionAirports = useMemo(() => {
    return normalizedAirports.filter((a) => a.regiao === selectedRegion);
  }, [normalizedAirports, selectedRegion]);

  function handleAirportClick(airport) {
    const egoInfo = normalizedAirportEgo[(airport.iata || '').toUpperCase()] || {};

    setSelectedAirport({
      ...airport,
      ...egoInfo,
    });
  }

  function closeModal() {
    setSelectedAirport(null);
  }

  if (loading) {
    return (
      <div className="global-metrics-page">
        <div className="global-metrics-shell">
          <div className="global-metrics-empty">Carregando métricas globais...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="global-metrics-page">
      <div className="global-metrics-shell">
        <div className="global-metrics-top-actions">
          <button className="global-metrics-back-button" onClick={onBack} type="button">
            <span className="global-metrics-back-icon" aria-hidden="true">
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
            <span className="global-metrics-back-text">Voltar</span>
          </button>
        </div>

        <div className="global-metrics-header">
          <h1 className="global-metrics-title">Métricas Globais</h1>
          <p className="global-metrics-subtitle">
            Visualização regional da malha aérea com indicadores estruturais e métricas ego por
            aeroporto
          </p>
        </div>

        <div className="global-metrics-controls">
          <div className="global-metrics-field">
            <label htmlFor="region-select">Selecionar região</label>
            <select
              id="region-select"
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
            >
              {regions.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="global-metrics-layout">
          <div className="global-metrics-map-card">
            <div className="global-metrics-section-head align-left">
              <div className="global-metrics-section-title">Mapa do Brasil por região</div>
              <div className="global-metrics-section-subtitle">
                Clique em um estado para destacar a região correspondente.
              </div>
            </div>

            <div className="brazil-map-real">
              <ComposableMap
                projection="geoMercator"
                projectionConfig={{ scale: 740, center: [-52, -15] }}
                style={{ width: '100%', height: '100%' }}
              >
                <Geographies geography={GEO_URL}>
                  {({ geographies }) =>
                    geographies.map((geo) => {
                      const region = getRegionFromGeo(geo);
                      const stateCode = getStateCode(geo).toUpperCase();
                      const stateName = getStateName(geo);
                      const isSelected = region === selectedRegion;

                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          onMouseEnter={() =>
                            setHoveredState({
                              code: stateCode,
                              name: stateName,
                              region,
                            })
                          }
                          onMouseLeave={() => setHoveredState(null)}
                          onClick={() => {
                            if (region) setSelectedRegion(region);
                          }}
                          style={{
                            default: {
                              fill: getFillColor(geo, selectedRegion),
                              outline: 'none',
                              stroke: isSelected ? '#dbeeff' : 'rgba(255,255,255,0.16)',
                              strokeWidth: isSelected ? 1.4 : 0.7,
                              cursor: region ? 'pointer' : 'default',
                              transition: 'all 180ms ease',
                            },
                            hover: {
                              fill: region ? '#5f9ddd' : '#41536b',
                              outline: 'none',
                              stroke: '#eef7ff',
                              strokeWidth: 1.2,
                              cursor: region ? 'pointer' : 'default',
                            },
                            pressed: {
                              fill: region ? '#76aef0' : '#41536b',
                              outline: 'none',
                            },
                          }}
                        />
                      );
                    })
                  }
                </Geographies>
              </ComposableMap>

              <div className="map-legend">
                {REGION_ORDER.map((region) => (
                  <button
                    key={region}
                    type="button"
                    className={`map-legend-item ${selectedRegion === region ? 'active' : ''}`}
                    onClick={() => setSelectedRegion(region)}
                  >
                    <span
                      className="map-legend-dot"
                      style={{ background: REGION_COLORS[region] }}
                    />
                    {region}
                  </button>
                ))}
              </div>

              {hoveredState && hoveredState.region && (
                <div className="map-hover-card">
                  <div className="map-hover-title">{hoveredState.name || hoveredState.code}</div>
                  <div className="map-hover-meta">
                    {hoveredState.code} • {hoveredState.region}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="global-metrics-info-card">
            <div className="global-metrics-section-head align-left">
              <div className="global-metrics-section-title">
                Região selecionada: <span>{selectedRegion}</span>
              </div>
              <div className="global-metrics-section-subtitle">
                Indicadores globais da sub-rede regional e aeroportos associados.
              </div>
            </div>

            <div className="region-metrics-grid">
              <div className="region-metric-box">
                <span className="region-metric-label">Ordem</span>
                <strong className="region-metric-value">
                  {selectedRegionMetrics.ordem ?? '-'}
                </strong>
              </div>

              <div className="region-metric-box">
                <span className="region-metric-label">Tamanho</span>
                <strong className="region-metric-value">
                  {selectedRegionMetrics.tamanho ?? '-'}
                </strong>
              </div>

              <div className="region-metric-box">
                <span className="region-metric-label">Densidade</span>
                <strong className="region-metric-value">
                  {selectedRegionMetrics.densidade ?? '-'}
                </strong>
              </div>
            </div>

            <div className="region-airports-block">
              <div className="global-metrics-section-head align-left compact">
                <div className="global-metrics-section-title">Aeroportos da região</div>
                <div className="global-metrics-section-subtitle">
                  Clique em um aeroporto para ver as métricas ego.
                </div>
              </div>

              {selectedRegionAirports.length > 0 ? (
                <div className="region-airports-list">
                  {selectedRegionAirports.map((airport, index) => (
                    <button
                      key={`${airport.iata || 'sem-iata'}-${index}`}
                      type="button"
                      className="region-airport-card"
                      onClick={() => handleAirportClick(airport)}
                    >
                      <div className="region-airport-code">{airport.iata || '-'}</div>
                      <div className="region-airport-meta">
                        <div className="region-airport-city">
                          {airport.cidade || 'Cidade não informada'}
                        </div>
                        <div className="region-airport-region">{airport.regiao || '-'}</div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="global-metrics-empty">
                  Nenhum aeroporto encontrado para esta região.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {selectedAirport && (
        <div className="airport-modal-overlay" onClick={closeModal}>
          <div className="airport-modal" onClick={(e) => e.stopPropagation()}>
            <div className="airport-modal-header">
              <div className="airport-modal-header-main">
                <div className="airport-modal-code-badge">
                  {selectedAirport.iata || '---'}
                </div>

                <div className="airport-modal-header-text">
                  <p className="airport-modal-subtitle">
                    {selectedAirport.cidade || 'Cidade não informada'} •{' '}
                    {selectedAirport.regiao || '-'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="airport-modal-close"
                onClick={closeModal}
                aria-label="Fechar modal"
              >
                ×
              </button>
            </div>

            <div className="airport-modal-divider" />

            <div className="airport-modal-grid">
              <div className="airport-modal-stat">
                <span>Grau</span>
                <strong>{selectedAirport.grau ?? '-'}</strong>
              </div>

              <div className="airport-modal-stat">
                <span>Ordem ego</span>
                <strong>{selectedAirport.ordemEgo ?? '-'}</strong>
              </div>

              <div className="airport-modal-stat">
                <span>Tamanho ego</span>
                <strong>{selectedAirport.tamanhoEgo ?? '-'}</strong>
              </div>

              <div className="airport-modal-stat">
                <span>Densidade ego</span>
                <strong>{selectedAirport.densidadeEgo ?? '-'}</strong>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}