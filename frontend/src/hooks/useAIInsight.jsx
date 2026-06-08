import { useState, useRef, useCallback } from "react"

// ─────────────────────────────────────────────────────────────
// MEMÓRIA ESTÁTICA DO DATASET — Rotas Aéreas Brasileiras
// ─────────────────────────────────────────────────────────────
const DATASET_MEMORY = {
  top5_hubs: [
    { iata: "BSB", cidade: "Brasília",       regiao: "Centro-Oeste", grau: 12, densidade_ego: 0.32, papel: "Hub político nacional — conecta TODAS as regiões, especialmente capitais remotas do Norte e Nordeste ao centro federal." },
    { iata: "GRU", cidade: "São Paulo",      regiao: "Sudeste",      grau: 10, densidade_ego: 0.40, papel: "Principal hub econômico — ponto de entrada/saída para Norte (MAO, BEL), Sul (POA) e Nordeste (FOR). Maior peso médio de rota do grafo." },
    { iata: "REC", cidade: "Recife",         regiao: "Nordeste",     grau: 8,  densidade_ego: 0.50, papel: "Hub regional do Nordeste — articula capitais vizinhas (JPA, NAT, SSA, FOR) e serve de ponte para o Sudeste e Brasília." },
    { iata: "GIG", cidade: "Rio de Janeiro", regiao: "Sudeste",      grau: 7,  densidade_ego: 0.50, papel: "Hub turístico-econômico — forte conexão com o Nordeste turístico (NAT, SSA) e eixo Sudeste (GRU, CNF, VIX)." },
    { iata: "CNF", cidade: "Belo Horizonte", regiao: "Sudeste",      grau: 7,  densidade_ego: 0.54, papel: "Hub corporativo do Sudeste — conecta São Paulo (GRU, CGH) ao Sul, Norte e Nordeste com viés econômico/institucional." },
  ],
  aeroportos: [
    { iata: "BSB", cidade: "Brasília",        regiao: "Centro-Oeste", grau: 12, densidade_ego: 0.32 },
    { iata: "GRU", cidade: "São Paulo",       regiao: "Sudeste",      grau: 10, densidade_ego: 0.40 },
    { iata: "REC", cidade: "Recife",          regiao: "Nordeste",     grau: 8,  densidade_ego: 0.50 },
    { iata: "GIG", cidade: "Rio de Janeiro",  regiao: "Sudeste",      grau: 7,  densidade_ego: 0.50 },
    { iata: "CNF", cidade: "Belo Horizonte",  regiao: "Sudeste",      grau: 7,  densidade_ego: 0.54 },
    { iata: "FOR", cidade: "Fortaleza",       regiao: "Nordeste",     grau: 6,  densidade_ego: 0.62 },
    { iata: "SSA", cidade: "Salvador",        regiao: "Nordeste",     grau: 5,  densidade_ego: 0.73 },
    { iata: "BEL", cidade: "Belém",           regiao: "Norte",        grau: 5,  densidade_ego: 0.80 },
    { iata: "VIX", cidade: "Vitória",         regiao: "Sudeste",      grau: 5,  densidade_ego: 0.67 },
    { iata: "MAO", cidade: "Manaus",          regiao: "Norte",        grau: 4,  densidade_ego: 0.90 },
    { iata: "PVH", cidade: "Porto Velho",     regiao: "Norte",        grau: 4,  densidade_ego: 0.80 },
    { iata: "NAT", cidade: "Natal",           regiao: "Nordeste",     grau: 4,  densidade_ego: 0.70 },
    { iata: "CWB", cidade: "Curitiba",        regiao: "Sul",          grau: 4,  densidade_ego: 0.60 },
    { iata: "FLN", cidade: "Florianópolis",   regiao: "Sul",          grau: 4,  densidade_ego: 0.60 },
    { iata: "POA", cidade: "Porto Alegre",    regiao: "Sul",          grau: 4,  densidade_ego: 0.70 },
    { iata: "JPA", cidade: "João Pessoa",     regiao: "Nordeste",     grau: 3,  densidade_ego: 0.83 },
    { iata: "CGH", cidade: "São Paulo",       regiao: "Sudeste",      grau: 2,  densidade_ego: 1.00 },
    { iata: "GYN", cidade: "Goiânia",         regiao: "Centro-Oeste", grau: 2,  densidade_ego: 0.67 },
    { iata: "RBR", cidade: "Rio Branco",      regiao: "Norte",        grau: 2,  densidade_ego: 1.00 },
    { iata: "THE", cidade: "Teresina",        regiao: "Nordeste",     grau: 2,  densidade_ego: 1.00 },
  ],
  regioes: {
    "Nordeste":     { aeroportos: ["REC","SSA","FOR","NAT","JPA","THE"], conexoes_internas: 8,  observacao: "região mais conectada internamente; REC é o hub articulador" },
    "Sudeste":      { aeroportos: ["GRU","CGH","GIG","CNF","VIX"],      conexoes_internas: 7,  observacao: "eixo econômico; GRU e GIG dominam o tráfego" },
    "Norte":        { aeroportos: ["MAO","BEL","PVH","RBR"],            conexoes_internas: 4,  observacao: "depende de BSB e GRU para sair da região; alta densidade local" },
    "Sul":          { aeroportos: ["CWB","FLN","POA"],                  conexoes_internas: 3,  observacao: "região compacta; todas as capitais se conectam entre si" },
    "Centro-Oeste": { aeroportos: ["BSB","GYN"],                        conexoes_internas: 1,  observacao: "BSB domina; GYN é quase um satélite" },
  },
}

// ─────────────────────────────────────────────────────────────
// ENGINE DE INSIGHTS LOCAL — sem API
// ─────────────────────────────────────────────────────────────

function fmt(n) {
  if (n == null || isNaN(n)) return "—"
  return Number(n).toLocaleString("pt-BR", { maximumFractionDigits: 0 })
}

function generateLocalInsight(summaryObject) {
  const { filtro, grafo, bfsDfs } = summaryObject

  const grauMin    = filtro?.grauRange?.[0] ?? 0
  const grauMax    = filtro?.grauRange?.[1] ?? 999
  const pesoMin    = filtro?.pesoRange?.[0] ?? -Infinity
  const pesoMax    = filtro?.pesoRange?.[1] ?? Infinity
  const regiaoFiltro = filtro?.regiao ?? null

  const totalV     = grafo?.vertices  ?? 0
  const totalE     = grafo?.arestas   ?? 0
  const grauMedio  = grafo?.grauMedio ?? 0
  const densMedia  = grafo?.densidadeMedia ?? null

  // Usa os hubs reais vindos do dashboard, com fallback para DATASET_MEMORY
  const apiHubs = summaryObject.topVertices || []
  const hubs = apiHubs.length > 0
    ? apiHubs
    : DATASET_MEMORY.aeroportos.filter(a => a.grau >= grauMin && a.grau <= grauMax)

  const hubNames = hubs.slice(0, 5)
    .map(h => `${h.cidade ?? h.iata} (${h.iata ?? h.codigo})`)
    .join(", ")

  const sentences = []

  // ── 1. Visão geral da rede filtrada ──
  if (totalV > 0) {
    sentences.push(
      `Com os filtros aplicados, a rede exibe ${fmt(totalV)} aeroporto${totalV !== 1 ? "s" : ""} e ${fmt(totalE)} rota${totalE !== 1 ? "s" : ""}, com grau médio de ${Number(grauMedio).toFixed(1)} conexões por nó.`
    )
  } else {
    sentences.push(
      "Os filtros aplicados resultaram em uma rede sem vértices — tente ampliar os intervalos de grau ou peso."
    )
  }

  // ── 2. Hubs presentes no filtro ──
  if (hubs.length > 0) {
    sentences.push(
      `Os principais aeroportos presentes nesta faixa de grau são: ${hubNames}, que concentram as maiores conectividades do grafo.`
    )
  } else if (grauMin > 10) {
    sentences.push(
      "Nenhum hub principal se enquadra nesta faixa de grau — apenas aeroportos de conectividade intermediária estão representados."
    )
  }

  // ── 3. Análise de região isolada ou densidade de ego ──
  if (regiaoFiltro && DATASET_MEMORY.regioes[regiaoFiltro]) {
    const reg = DATASET_MEMORY.regioes[regiaoFiltro]
    sentences.push(
      `O filtro isola a região ${regiaoFiltro}: ${reg.observacao} (${reg.conexoes_internas} conexão${reg.conexoes_internas !== 1 ? "ões" : ""} interna${reg.conexoes_internas !== 1 ? "s" : ""}).`
    )
  } else if (densMedia != null) {
    const densLabel = densMedia > 0.7 ? "alta" : densMedia > 0.4 ? "moderada" : "baixa"
    sentences.push(
      `A densidade média de ego neste recorte é ${densLabel} (${Number(densMedia).toFixed(2)}), indicando que os vizinhos dos nós filtrados ${densMedia > 0.7 ? "tendem a se interligar entre si" : "raramente se conectam diretamente"}.`
    )
  }

  // ── 4. BFS/DFS — componentes e alcance ──
  if (bfsDfs?.componentes != null && bfsDfs.componentes > 1) {
    sentences.push(
      `Atenção: o grafo filtrado está fragmentado em ${fmt(bfsDfs.componentes)} componentes desconectados — alguns aeroportos não têm caminho entre si neste recorte.`
    )
  } else if (bfsDfs?.profundidade != null) {
    sentences.push(
      `A busca em profundidade atingiu ${fmt(bfsDfs.profundidade)} nível${bfsDfs.profundidade !== 1 ? "is" : ""}, indicando uma rede ${bfsDfs.profundidade >= 4 ? "relativamente densa e bem conectada" : "compacta neste filtro"}.`
    )
  }

  // ── 5. Recomendação prática ──
  const recomendacoes = []

  if (grauMedio < 2 && totalV > 0) {
    recomendacoes.push(
      "A conectividade média muito baixa sugere que este recorte isola aeroportos periféricos — considere incluir hubs regionais (REC, CNF, GIG) para obter uma visão mais representativa da rede."
    )
  } else if (grauMin >= 8) {
    recomendacoes.push(
      `Este recorte concentra os grandes hubs nacionais (${hubs.slice(0, 3).map(h => h.cidade ?? h.iata).join(", ")}), que formam o esqueleto da malha aérea brasileira e sustentam a conectividade de toda a rede.`
    )
  } else if (regiaoFiltro === "Norte") {
    recomendacoes.push(
      "A região Norte depende fortemente de Brasília (BSB) e São Paulo (GRU) para conexões de longa distância — qualquer restrição nesses hubs impacta diretamente o acesso aéreo desta região."
    )
  } else if (grauMedio > 5) {
    const top2 = hubs.slice(0, 2).map(h => `${h.cidade ?? h.iata} (${h.iata ?? h.codigo})`).join(" e ")
    recomendacoes.push(
      `A alta conectividade média sugere resiliência neste recorte; priorize ${top2 || "os hubs de maior grau"} como pontos de escala para maximizar o alcance da malha filtrada.`
    )
  } else {
    const top2 = hubs.slice(0, 2).map(h => `${h.cidade ?? h.iata} (${h.iata ?? h.codigo})`).join(" e ")
    recomendacoes.push(
      top2
        ? `Amplie o intervalo de grau para incluir mais hubs estratégicos além de ${top2}, que lideram a conectividade neste filtro.`
        : "Amplie o intervalo de grau para incluir hubs estratégicos com maior conectividade."
    )
  }

  sentences.push(recomendacoes[0])

  return sentences.join(" ")
}

// ─── Cache persistente em sessionStorage ───────────────────────
const SESSION_PREFIX = "air_insight_local_v1_"

function readSessionCache(key) {
  try { return sessionStorage.getItem(SESSION_PREFIX + key) ?? null } catch { return null }
}
function writeSessionCache(key, value) {
  try { sessionStorage.setItem(SESSION_PREFIX + key, value) } catch {}
}

function trimSummary(obj) {
  return {
    filtro:      obj.filtro,
    grafo:       obj.grafo,
    topVertices: obj.topVertices,
    bfsDfs:      obj.bfsDfs,
  }
}

// ─────────────────────────────────────────────────────────────
// HOOK — mesma interface pública do original
// ─────────────────────────────────────────────────────────────
export function useAIInsight() {
  const [insight, setInsight]               = useState(null)
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

      // 3. Gera localmente (delay mínimo para spinner aparecer)
      setLoadingInsight(true)
      setTimeout(() => {
        try {
          const text = generateLocalInsight(slim)
          cacheRef.current[key] = text
          writeSessionCache(key, text)
          setInsight(text)
        } catch (e) {
          console.error("[useAIInsight]", e.message)
        } finally {
          setLoadingInsight(false)
        }
      }, 400)
    }, 800) // debounce ao mexer nos filtros
  }, [])

  return { insight, loadingInsight, generate }
}
