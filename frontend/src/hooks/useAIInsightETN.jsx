import { useState, useRef, useCallback } from "react"

const DATASET_PORTOS_META = `ESALG(Algeciras,West Med,draft=13.5,fixedCost=773)|TRAMB(Ambarli,West Med,draft=9.5,fixedCost=9517)|BEANR(Antwerp,NCE,draft=11,fixedCost=13087)|NGAPP(Apapa,West Africa,draft=11,fixedCost=34988)|NZAKL(Auckland,Australia,draft=12.5,fixedCost=2353)|PABLB(Balboa,US West Coast,draft=11,fixedCost=533)|ESBCN(Barcelona,West Med,draft=13.5,fixedCost=5530)|DEBRV(Bremerhaven,NCE,draft=13.5,fixedCost=11795)|AUBNE(Brisbane,Australia,draft=12.5,fixedCost=4670)|KRPUS(Busan,Korea,draft=13.5,fixedCost=2842)|USCHS(Charleston,US East Coast,draft=12.5,fixedCost=9743)|LKCMB(Colombo,Mumbai,draft=13.5,fixedCost=2568)|ZADUR(Durban,South Africa,draft=11,fixedCost=9819)|GBFXT(Felixstowe,UK,draft=13.5,fixedCost=12936)|ITGIT(Gioia Tauro,West Med,draft=13.5,fixedCost=9242)|ECGYE(Guayaquil,SA West Coast,draft=8,fixedCost=2564)|DEHAM(Hamburg,NCE,draft=13.5,fixedCost=18560)|HKHKG(Hong Kong,Hong Kong,draft=13.5,fixedCost=6809)|INNSA(Jawaharlal Nehru,Mumbai,draft=9.5,fixedCost=6837)|AEJEA(Jebel Ali,Dubai,draft=13.5,fixedCost=4164)|SAJED(Jeddah,Saudi Arabia,draft=13.5,fixedCost=3304)|TWKHH(Kaohsiung,Singapore,draft=12.5,fixedCost=2231)|USLAX(Los Angeles,US West Coast,draft=13.5,fixedCost=6876)|AOLAD(Luanda,West Africa,draft=8,fixedCost=23272)|PAMIT(Manzanillo,US West Coast,draft=11,fixedCost=4998)|USMIA(Miami,US Gulf Coast,draft=11,fixedCost=6973)|KEMBA(Mombasa,South Africa,draft=8,fixedCost=7956)|UYMVD(Montevideo,Brazil,draft=8,fixedCost=2834)|CAMTR(Montreal,Canada East Coast,draft=12.5,fixedCost=15605)|USEWR(Newark,US East Coast,draft=12.5,fixedCost=18260)|MYPKG(Port Klang,Singapore,draft=13.5,fixedCost=2549)|PKBQM(Port Qasim,Mumbai,draft=9.5,fixedCost=7581)|EGPSD(Port Said,West Med,draft=13.5,fixedCost=4891)|MAPTM(Tangier,West Med,draft=13.5,fixedCost=1675)|CNTAO(Qingdao,North China,draft=12.5,fixedCost=6813)|NLRTM(Rotterdam,NCE,draft=13.5,fixedCost=19187)|OMSLL(Salalah,Saudi Arabia,draft=13.5,fixedCost=3850)|CLSAI(San Antonio,SA West Coast,draft=13.5,fixedCost=15564)|BRSSZ(Santos,Brazil,draft=11,fixedCost=7547)|CNSHA(Shanghai,Central China,draft=13.5,fixedCost=6497)|SGSIN(Singapore,Singapore,draft=13.5,fixedCost=3268)|GHTKD(Takoradi,West Africa,draft=8,fixedCost=1400)|MYTPP(Tanjung Pelepas,Singapore,draft=13.5,fixedCost=1992)|CAVAN(Vancouver,Canada West,draft=13.5,fixedCost=774)|CNYTN(Shenzhen,South China,draft=13.5,fixedCost=7220)|JPYOK(Yokohama,Japan,draft=13.5,fixedCost=16900)|BEZEE(Zeebrugge,NCE,draft=13.5,fixedCost=12047)`

const DATASET_ROTAS_SAMPLE = `CNSHA->DEBRV(-5055231)|KRPUS->DEBRV(-4829216)|CNYTN->NLRTM(-3294985)|CNSHA->NLRTM(-2621728)|MYTPP->DEBRV(-2342858)|JPYOK->NLRTM(-2337505)|CNSHA->NGAPP(-2230016)|CNYTN->DEBRV(-2095636)|CNTAO->DEBRV(-2036217)|CNYTN->USLAX(-1863590)|HKHKG->DEBRV(-1807410)|ECGYE->DEBRV(-1774480)|CNYTN->GBFXT(-1727541)|HKHKG->NLRTM(-1683387)|CNSHA->ITGIT(-1654440)|MYTPP->NLRTM(-1646653)|CNSHA->BRSSZ(-1438769)|BRSSZ->DEBRV(-1369952)|CNSHA->ESALG(-1152023)|CNSHA->USLAX(-1149972)|MYTPP->ITGIT(-1145559)|CNSHA->GBFXT(-1136519)|CNYTN->ITGIT(-1128868)|CNTAO->NGAPP(-1025016)|CNTAO->ITGIT(-979813)|HKHKG->NGAPP(-954701)|CNSHA->ZADUR(-950899)|HKHKG->ITGIT(-908389)|DEBRV->ZADUR(-866927)|CNYTN->ESALG(-851170)|MYTPP->GBFXT(-850145)|HKHKG->BRSSZ(-840119)|CNTAO->NLRTM(-825924)|HKHKG->USLAX(-810307)|KRPUS->EGPSD(-755087)|CNSHA->GHTKD(-686094)|MYTPP->NGAPP(-676314)|HKHKG->ZADUR(-661649)|MYTPP->USLAX(-658080)|MYTPP->JPYOK(-656162)|MYPKG->USEWR(338084)|SGSIN->USEWR(319727)|USEWR->SGSIN(316027)|AUBNE->DEHAM(312885)|BEZEE->AUBNE(301313)|USEWR->MYTPP(300440)|KEMBA->USLAX(299983)|BEANR->AUBNE(298449)|BRSSZ->CNTAO(290524)|CAVAN->ZADUR(289733)|AUBNE->BEZEE(289431)|GBFXT->JPYOK(286322)|USEWR->CNYTN(285255)|USLAX->KEMBA(285001)|DEHAM->CNTAO(283449)|OMSLL->USLAX(282366)|ZADUR->CAVAN(281606)|AEJEA->CLSAI(278491)
Total: 1764 rotas (379 deficitárias, 1385 lucrativas)`

export const SUGGESTED_QUESTIONS_ETN = [
  "Quais portos concentram mais rotas deficitárias?",
  "Qual região tem o melhor balanço entre custo fixo e conectividade?",
  "Quais hubs são mais críticos para o comércio Ásia–Europa?",
  "Santos (BRSSZ) está bem posicionado na rede global?",
  "Quais rotas têm maior potencial de otimização por reposicionamento?",
]

const SYSTEM_PROMPT = `Você é um analista sênior de logística marítima global. Responda SEMPRE em português do Brasil, de forma clara e direta (máx 4 frases por resposta). Use apenas os dados fornecidos. Seja específico com códigos de portos e valores.

Portos disponíveis (CÓDIGO → nome, região, calado máx, custo fixo USD):
${DATASET_PORTOS_META}

Amostra de rotas (ORIGEM->DESTINO(balanço_financeiro), negativo=deficitário, positivo=lucrativo):
${DATASET_ROTAS_SAMPLE}`

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

async function callGroq(apiKey, messages) {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      max_tokens: 500,
      temperature: 0.5,
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
    }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`Groq ${res.status}${body ? ": " + body.slice(0, 120) : ""}`)
  }
  const data = await res.json()
  return data.choices?.[0]?.message?.content?.trim() ?? "Sem resposta."
}

function buildAutoPrompt(summary) {
  const { filtro, grafo, topVertices, rotas } = summary
  const hubs = (topVertices || []).slice(0, 5).map(h => `${h.codigo}(grau=${h.grau})`).join(", ")
  return `Estado atual do dashboard ETN:
- Filtro grau: ${filtro?.grauRange?.[0]}–${filtro?.grauRange?.[1]}, peso: ${filtro?.pesoRange?.[0]}–${filtro?.pesoRange?.[1]}
- Portos: ${grafo?.vertices}, rotas: ${grafo?.arestas}, grau médio: ${Number(grafo?.grauMedio ?? 0).toFixed(1)}, peso médio: ${grafo?.pesoMedio ?? 0}
- Rotas deficitárias: ${rotas?.rotasNegativas ?? 0} (${rotas?.percNegativas ?? "—"})
- Peso mín/máx: ${rotas?.pesoMin ?? 0} / ${rotas?.pesoMax ?? 0}
- Top hubs: ${hubs || "—"}

Gere um insight analítico conciso sobre este recorte da rede marítima global, destacando o padrão mais relevante.`
}

const PREFIX = "etn_groq_v2_"
const memCache = {}
const getCache = k => { try { return sessionStorage.getItem(PREFIX + k) } catch { return null } }
const setCache = (k, v) => { try { sessionStorage.setItem(PREFIX + k, v) } catch {} }

export function useAIInsightETN(groqApiKey) {
  const [history, setHistory]               = useState([])
  const [loadingInsight, setLoadingInsight] = useState(false)
  const [error, setError]                   = useState(null)
  const debounceRef = useRef(null)
  // Keep a ref to full message history for the Groq API (roles: user/assistant)
  const apiHistoryRef = useRef([])

  const generate = useCallback((summaryObject) => {
    if (!groqApiKey) return
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      const key = JSON.stringify({
        gr: summaryObject.filtro?.grauRange,
        pr: summaryObject.filtro?.pesoRange,
        v:  summaryObject.grafo?.vertices,
      })
      if (memCache[key]) {
        const cached = memCache[key]
        apiHistoryRef.current = [
          { role: "user", content: buildAutoPrompt(summaryObject) },
          { role: "assistant", content: cached },
        ]
        setHistory([{ q: null, a: cached }])
        return
      }
      const stored = getCache(key)
      if (stored) {
        memCache[key] = stored
        apiHistoryRef.current = [
          { role: "user", content: buildAutoPrompt(summaryObject) },
          { role: "assistant", content: stored },
        ]
        setHistory([{ q: null, a: stored }])
        return
      }

      setLoadingInsight(true)
      setError(null)
      try {
        const prompt = buildAutoPrompt(summaryObject)
        const msgs = [{ role: "user", content: prompt }]
        const text = await callGroq(groqApiKey, msgs)
        memCache[key] = text
        setCache(key, text)
        apiHistoryRef.current = [
          { role: "user", content: prompt },
          { role: "assistant", content: text },
        ]
        setHistory([{ q: null, a: text }])
      } catch (e) {
        setError(e.message)
      } finally {
        setLoadingInsight(false)
      }
    }, 900)
  }, [groqApiKey])

  const ask = useCallback(async (question) => {
    if (!groqApiKey || !question.trim()) return
    setLoadingInsight(true)
    setError(null)
    // Optimistically add the question to history with null answer
    setHistory(prev => [...prev, { q: question, a: null }])
    try {
      const msgs = [...apiHistoryRef.current, { role: "user", content: question }]
      const text = await callGroq(groqApiKey, msgs)
      apiHistoryRef.current = [...msgs, { role: "assistant", content: text }]
      setHistory(prev => {
        const next = [...prev]
        next[next.length - 1] = { q: question, a: text }
        return next
      })
    } catch (e) {
      setError(e.message)
      setHistory(prev => prev.slice(0, -1))
    } finally {
      setLoadingInsight(false)
    }
  }, [groqApiKey])

  const clearHistory = useCallback(() => {
    setHistory([])
    setError(null)
    apiHistoryRef.current = []
  }, [])

  // insight = last answer (for backward compat with InsightPanel)
  const insight = history.length > 0 ? history[history.length - 1].a : null

  return { insight, history, loadingInsight, error, generate, ask, clearHistory }
}
