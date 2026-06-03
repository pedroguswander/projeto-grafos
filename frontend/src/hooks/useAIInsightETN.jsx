import { useState, useRef, useCallback } from "react"

// ─────────────────────────────────────────────────────────────
// MEMÓRIA ESTÁTICA DO DATASET — Portos Marítimos Globais (ETN)
// ─────────────────────────────────────────────────────────────
const DATASET_MEMORY = {
  top5_hubs: [
    { codigo: "ITGIT", nome: "Gioia Tauro",      regiao: "West Med",              grau: 89 },
    { codigo: "AEJEA", nome: "Jebel Ali",          regiao: "Dubai",                 grau: 89 },
    { codigo: "MYTPP", nome: "Tanjung Pelepas",    regiao: "Singapore",             grau: 89 },
    { codigo: "ESALG", nome: "Algeciras",           regiao: "West Med",              grau: 87 },
    { codigo: "DEBRV", nome: "Bremerhaven",         regiao: "North Continent Europe",grau: 87 },
  ],
  portos: [
    { codigo: "ESALG", nome: "Algeciras",        regiao: "West Med",               draft: 13.5, custo_fixed: 773,   custo_ffe: 11, cost_full: 229  },
    { codigo: "TRAMB", nome: "Ambarli",          regiao: "West Med",               draft: 9.5,  custo_fixed: 9517,  custo_ffe: 19, cost_full: 146  },
    { codigo: "BEANR", nome: "Antwerp",          regiao: "NCE",                    draft: 11.0, custo_fixed: 13087, custo_ffe: 16, cost_full: 355  },
    { codigo: "NGAPP", nome: "Apapa (Lagos)",    regiao: "West Africa",            draft: 11.0, custo_fixed: 34988, custo_ffe: 11, cost_full: 196  },
    { codigo: "NZAKL", nome: "Auckland",         regiao: "Australia",              draft: 12.5, custo_fixed: 2353,  custo_ffe: 13, cost_full: 111  },
    { codigo: "PABLB", nome: "Balboa",           regiao: "US West Coast",          draft: 11.0, custo_fixed: 533,   custo_ffe: 9,  cost_full: 238  },
    { codigo: "ESBCN", nome: "Barcelona",        regiao: "West Med",               draft: 13.5, custo_fixed: 5530,  custo_ffe: 16, cost_full: 597  },
    { codigo: "DEBRV", nome: "Bremerhaven",      regiao: "NCE",                    draft: 13.5, custo_fixed: 11795, custo_ffe: 14, cost_full: 199  },
    { codigo: "AUBNE", nome: "Brisbane",         regiao: "Australia",              draft: 12.5, custo_fixed: 4670,  custo_ffe: 12, cost_full: 541  },
    { codigo: "KRPUS", nome: "Busan",            regiao: "Korea",                  draft: 13.5, custo_fixed: 2842,  custo_ffe: 5,  cost_full: 77   },
    { codigo: "USCHS", nome: "Charleston",       regiao: "US East Coast",          draft: 12.5, custo_fixed: 9743,  custo_ffe: 5,  cost_full: 292  },
    { codigo: "LKCMB", nome: "Colombo",          regiao: "Mumbai",                 draft: 13.5, custo_fixed: 2568,  custo_ffe: 4,  cost_full: 272  },
    { codigo: "ZADUR", nome: "Durban",           regiao: "South Africa",           draft: 11.0, custo_fixed: 9819,  custo_ffe: 13, cost_full: 322  },
    { codigo: "GBFXT", nome: "Felixstowe",       regiao: "UK",                     draft: 13.5, custo_fixed: 12936, custo_ffe: 9,  cost_full: 250  },
    { codigo: "ITGIT", nome: "Gioia Tauro",      regiao: "West Med",               draft: 13.5, custo_fixed: 9242,  custo_ffe: 6,  cost_full: 202  },
    { codigo: "ECGYE", nome: "Guayaquil",        regiao: "SA West Coast",          draft: 8.0,  custo_fixed: 2564,  custo_ffe: 22, cost_full: 165  },
    { codigo: "DEHAM", nome: "Hamburg",          regiao: "NCE",                    draft: 12.5, custo_fixed: 18560, custo_ffe: 15, cost_full: 466  },
    { codigo: "HKHKG", nome: "Hong Kong",        regiao: "Hong Kong",              draft: 13.5, custo_fixed: 6809,  custo_ffe: 2,  cost_full: 257  },
    { codigo: "INNSA", nome: "Jawaharlal Nehru", regiao: "Mumbai",                 draft: 9.5,  custo_fixed: 6837,  custo_ffe: 17, cost_full: 200  },
    { codigo: "AEJEA", nome: "Jebel Ali",        regiao: "Dubai",                  draft: 13.5, custo_fixed: 4164,  custo_ffe: 2,  cost_full: 133  },
    { codigo: "SAJED", nome: "Jeddah",           regiao: "Saudi Arabia",           draft: 13.5, custo_fixed: 3304,  custo_ffe: 1,  cost_full: 102  },
    { codigo: "TWKHH", nome: "Kaohsiung",        regiao: "Singapore",              draft: 12.5, custo_fixed: 2231,  custo_ffe: 3,  cost_full: 18   },
    { codigo: "USLAX", nome: "Los Angeles",      regiao: "US West Coast",          draft: 13.5, custo_fixed: 6876,  custo_ffe: 2,  cost_full: 530  },
    { codigo: "AOLAD", nome: "Luanda",           regiao: "West Africa",            draft: 8.0,  custo_fixed: 23272, custo_ffe: 61, cost_full: 209  },
    { codigo: "PAMIT", nome: "Manzanillo",       regiao: "US West Coast",          draft: 11.0, custo_fixed: 4998,  custo_ffe: 3,  cost_full: 341  },
    { codigo: "USMIA", nome: "Miami",            regiao: "US Gulf Coast",          draft: 11.0, custo_fixed: 6973,  custo_ffe: 3,  cost_full: 400  },
    { codigo: "KEMBA", nome: "Mombasa",          regiao: "South Africa",           draft: 8.0,  custo_fixed: 7956,  custo_ffe: 18, cost_full: 223  },
    { codigo: "UYMVD", nome: "Montevideo",       regiao: "Brazil",                 draft: 8.0,  custo_fixed: 2834,  custo_ffe: 18, cost_full: 239  },
    { codigo: "CAMTR", nome: "Montreal",         regiao: "Canada East Coast",      draft: 12.5, custo_fixed: 15605, custo_ffe: 38, cost_full: 414  },
    { codigo: "USEWR", nome: "Newark",           regiao: "US East Coast",          draft: 12.5, custo_fixed: 18260, custo_ffe: 3,  cost_full: 698  },
    { codigo: "MYPKG", nome: "Port Klang",       regiao: "Singapore",              draft: 13.5, custo_fixed: 2549,  custo_ffe: 3,  cost_full: 50   },
    { codigo: "PKBQM", nome: "Port Qasim",       regiao: "Mumbai",                 draft: 9.5,  custo_fixed: 7581,  custo_ffe: 23, cost_full: 102  },
    { codigo: "EGPSD", nome: "Port Said",        regiao: "West Med",               draft: 13.5, custo_fixed: 4891,  custo_ffe: 7,  cost_full: 37   },
    { codigo: "MAPTM", nome: "Tangier",          regiao: "West Med",               draft: 13.5, custo_fixed: 1675,  custo_ffe: 8,  cost_full: 138  },
    { codigo: "CNTAO", nome: "Qingdao",          regiao: "North China",            draft: 12.5, custo_fixed: 6813,  custo_ffe: 5,  cost_full: 124  },
    { codigo: "NLRTM", nome: "Rotterdam",        regiao: "NCE",                    draft: 13.5, custo_fixed: 19187, custo_ffe: 16, cost_full: 195  },
    { codigo: "OMSLL", nome: "Salalah",          regiao: "Saudi Arabia",           draft: 13.5, custo_fixed: 3850,  custo_ffe: 2,  cost_full: 161  },
    { codigo: "CLSAI", nome: "San Antonio",      regiao: "SA West Coast",          draft: 13.5, custo_fixed: 15564, custo_ffe: 26, cost_full: 202  },
    { codigo: "BRSSZ", nome: "Santos",           regiao: "Brazil",                 draft: 11.0, custo_fixed: 7547,  custo_ffe: 7,  cost_full: 349  },
    { codigo: "CNSHA", nome: "Shanghai",         regiao: "Central China",          draft: 13.5, custo_fixed: 6497,  custo_ffe: 6,  cost_full: 150  },
    { codigo: "SGSIN", nome: "Singapore",        regiao: "Singapore",              draft: 13.5, custo_fixed: 3268,  custo_ffe: 1,  cost_full: 130  },
    { codigo: "GHTKD", nome: "Takoradi",         regiao: "West Africa",            draft: 8.0,  custo_fixed: 1400,  custo_ffe: 5,  cost_full: 266  },
    { codigo: "MYTPP", nome: "Tanjung Pelepas",  regiao: "Singapore",              draft: 13.5, custo_fixed: 1992,  custo_ffe: 3,  cost_full: 115  },
    { codigo: "CAVAN", nome: "Vancouver",        regiao: "Canada West",            draft: 13.5, custo_fixed: 774,   custo_ffe: 12, cost_full: 421  },
    { codigo: "CNYTN", nome: "Shenzhen",         regiao: "South China",            draft: 13.5, custo_fixed: 7220,  custo_ffe: 4,  cost_full: 177  },
    { codigo: "JPYOK", nome: "Yokohama",         regiao: "Japan",                  draft: 13.5, custo_fixed: 16900, custo_ffe: 1,  cost_full: 105  },
    { codigo: "BEZEE", nome: "Zeebrugge",        regiao: "NCE",                    draft: 13.5, custo_fixed: 12047, custo_ffe: 9,  cost_full: 235  },
  ],
}

// ─────────────────────────────────────────────────────────────
// ENGINE DE INSIGHTS LOCAL — sem API
// ─────────────────────────────────────────────────────────────

function fmt(n) {
  if (n == null || isNaN(n)) return "—"
  return Number(n).toLocaleString("pt-BR", { maximumFractionDigits: 0 })
}

function generateLocalInsight(summaryObject) {
  const { filtro, grafo, rotas, bfsDfs } = summaryObject

  const grauMin   = filtro?.grauRange?.[0] ?? 0
  const grauMax   = filtro?.grauRange?.[1] ?? 999
  const pesoMin   = filtro?.pesoRange?.[0] ?? -Infinity
  const pesoMax   = filtro?.pesoRange?.[1] ?? Infinity

  const totalV    = grafo?.vertices  ?? 0
  const totalE    = grafo?.arestas   ?? 0
  const grauMedio = grafo?.grauMedio ?? 0
  const pesoMedio = grafo?.pesoMedio ?? 0

  const rotasNeg  = rotas?.rotasNegativas ?? 0
  const percNeg   = rotas?.percNegativas  ?? "0%"
  const rMin      = rotas?.pesoMin        ?? 0
  const rMax      = rotas?.pesoMax        ?? 0

  // Portos dentro do filtro de grau
  const portosNoFiltro = DATASET_MEMORY.portos.filter(p => {
    const hub = DATASET_MEMORY.top5_hubs.find(h => h.codigo === p.codigo)
    const grau = hub?.grau ?? 50
    return grau >= grauMin && grau <= grauMax
  })

  const hubs = DATASET_MEMORY.top5_hubs.filter(h => h.grau >= grauMin && h.grau <= grauMax)
  const hubNames = hubs.map(h => `${h.nome} (${h.codigo})`).join(", ")

  const sentences = []

  // ── 1. Visão geral da rede filtrada ──
  if (totalV > 0) {
    sentences.push(
      `Com os filtros aplicados, a rede exibe ${fmt(totalV)} porto${totalV !== 1 ? "s" : ""} e ${fmt(totalE)} rota${totalE !== 1 ? "s" : ""}, com grau médio de ${Number(grauMedio).toFixed(1)} conexões por nó.`
    )
  } else {
    sentences.push("Os filtros aplicados resultaram em uma rede sem vértices — tente ampliar os intervalos de grau ou peso.")
  }

  // ── 2. Hubs presentes no filtro ──
  if (hubs.length > 0) {
    sentences.push(
      `Os principais hubs presentes nesta faixa de grau são: ${hubNames}, que concentram as maiores conectividades do grafo global.`
    )
  } else if (grauMin > 87) {
    sentences.push(
      "Nenhum hub principal se enquadra nesta faixa de grau — apenas nós de conectividade intermediária estão representados."
    )
  }

  // ── 3. Análise de rotas deficitárias ──
  if (rotasNeg > 0) {
    sentences.push(
      `Atenção: ${fmt(rotasNeg)} rota${rotasNeg !== 1 ? "s" : ""} (${percNeg} do total filtrado) apresentam pesos negativos, indicando rotas deficitárias — o pior caso chega a ${fmt(rMin)}, provável desequilíbrio de carga nessa direção.`
    )
  } else if (totalE > 0) {
    sentences.push(
      `Nenhuma rota deficitária foi identificada neste intervalo de peso (${fmt(pesoMin)} a ${fmt(pesoMax)}), sugerindo que o filtro isola rotas com receita positiva.`
    )
  }

  // ── 4. Recomendação prática ──
  const recomendacoes = []

  if (rotasNeg / (totalE || 1) > 0.3) {
    recomendacoes.push(
      "Recomenda-se revisar as rotas com pesos mais negativos para identificar desequilíbrios de carga e potencial de otimização via reposicionamento de contêineres vazios."
    )
  } else if (grauMedio > 70) {
    recomendacoes.push(
      "A alta conectividade média indica resiliência na rede — priorize hubs de alto grau como pontos de transbordo para maximizar eficiência logística."
    )
  } else if (pesoMedio > 0) {
    recomendacoes.push(
      `O peso médio positivo de ${fmt(pesoMedio)} indica rotas lucrativas nesta faixa; concentrar escalas nos hubs de menor custo FFE (Singapura, Jeddah, Jebel Ali) pode ampliar a margem operacional.`
    )
  } else {
    recomendacoes.push(
      "Amplie o intervalo de grau para incluir hubs estratégicos como Gioia Tauro (ITGIT) e Jebel Ali (AEJEA), que oferecem a maior conectividade global da rede ETN."
    )
  }

  sentences.push(recomendacoes[0])

  return sentences.join(" ")
}

// ─── Cache persistente em sessionStorage ───────────────────────
const SESSION_PREFIX = "etn_insight_local_v1_"

function readSessionCache(key) {
  try { return sessionStorage.getItem(SESSION_PREFIX + key) ?? null } catch { return null }
}
function writeSessionCache(key, value) {
  try { sessionStorage.setItem(SESSION_PREFIX + key, value) } catch {}
}

function trimSummary(obj) {
  return {
    filtro: obj.filtro,
    grafo:  obj.grafo,
    rotas:  obj.rotas
      ? {
          total:             obj.rotas.total,
          rotasNegativas:    obj.rotas.rotasNegativas,
          percNegativas:     obj.rotas.percNegativas,
          pesoMin:           obj.rotas.pesoMin,
          pesoMax:           obj.rotas.pesoMax,
          pesoMedioPositivo: obj.rotas.pesoMedioPositivo,
        }
      : undefined,
    bfsDfs: obj.bfsDfs,
  }
}

// ─────────────────────────────────────────────────────────────
// HOOK — mesma interface pública do original
// ─────────────────────────────────────────────────────────────
export function useAIInsightETN() {
  const [insight, setInsight]           = useState(null)
  const [loadingInsight, setLoadingInsight] = useState(false)

  const cacheRef    = useRef({})
  const debounceRef = useRef(null)

  const generate = useCallback((summaryObject) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(() => {
      const slim = trimSummary(summaryObject)
      const key  = JSON.stringify(slim)

      // 1. Cache em memória
      if (cacheRef.current[key]) {
        setInsight(cacheRef.current[key])
        return
      }

      // 2. Cache em sessionStorage
      const cached = readSessionCache(key)
      if (cached) {
        cacheRef.current[key] = cached
        setInsight(cached)
        return
      }

      // 3. Gera localmente (simula loading breve para UX)
      setLoadingInsight(true)
      setTimeout(() => {
        try {
          const text = generateLocalInsight(slim)
          cacheRef.current[key] = text
          writeSessionCache(key, text)
          setInsight(text)
        } catch (e) {
          console.error("[useAIInsightETN]", e.message)
        } finally {
          setLoadingInsight(false)
        }
      }, 400) // delay mínimo para o spinner aparecer
    }, 800) // debounce ao mexer nos filtros
  }, [])

  return { insight, loadingInsight, generate }
}
