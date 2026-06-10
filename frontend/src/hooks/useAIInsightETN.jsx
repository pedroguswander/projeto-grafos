import { useState, useRef, useCallback } from "react"

// ─── Datasets compactos embutidos ───
const DATASET_PORTOS_META = `ESALG(Algeciras,West Med,draft=13.5,fixedCost=773)|TRAMB(Ambarli,West Med,draft=9.5,fixedCost=9517)|BEANR(Antwerp,NCE,draft=11,fixedCost=13087)|NGAPP(Apapa,West Africa,draft=11,fixedCost=34988)|NZAKL(Auckland,Australia,draft=12.5,fixedCost=2353)|PABLB(Balboa,US West Coast,draft=11,fixedCost=533)|ESBCN(Barcelona,West Med,draft=13.5,fixedCost=5530)|DEBRV(Bremerhaven,NCE,draft=13.5,fixedCost=11795)|AUBNE(Brisbane,Australia,draft=12.5,fixedCost=4670)|KRPUS(Busan,Korea,draft=13.5,fixedCost=2842)|USCHS(Charleston,US East Coast,draft=12.5,fixedCost=9743)|LKCMB(Colombo,Mumbai,draft=13.5,fixedCost=2568)|ZADUR(Durban,South Africa,draft=11,fixedCost=9819)|GBFXT(Felixstowe,UK,draft=13.5,fixedCost=12936)|ITGIT(Gioia Tauro,West Med,draft=13.5,fixedCost=9242)|ECGYE(Guayaquil,SA West Coast,draft=8,fixedCost=2564)|DEHAM(Hamburg,NCE,draft=12.5,fixedCost=18560)|HKHKG(Hong Kong,Hong Kong,draft=13.5,fixedCost=6809)|INNSA(Jawaharlal Nehru,Mumbai,draft=9.5,fixedCost=6837)|AEJEA(Jebel Ali,Dubai,draft=13.5,fixedCost=4164)|SAJED(Jeddah,Saudi Arabia,draft=13.5,fixedCost=3304)|TWKHH(Kaohsiung,Singapore,draft=12.5,fixedCost=2231)|USLAX(Los Angeles,US West Coast,draft=13.5,fixedCost=6876)|AOLAD(Luanda,West Africa,draft=8,fixedCost=23272)|PAMIT(Manzanillo,US West Coast,draft=11,fixedCost=4998)|USMIA(Miami,US Gulf Coast,draft=11,fixedCost=6973)|KEMBA(Mombasa,South Africa,draft=8,fixedCost=7956)|UYMVD(Montevideo,Brazil,draft=8,fixedCost=2834)|CAMTR(Montreal,Canada East Coast,draft=12.5,fixedCost=15605)|USEWR(Newark,US East Coast,draft=12.5,fixedCost=18260)|MYPKG(Port Klang,Singapore,draft=13.5,fixedCost=2549)|PKBQM(Port Qasim,Mumbai,draft=9.5,fixedCost=7581)|EGPSD(Port Said,West Med,draft=13.5,fixedCost=4891)|MAPTM(Tangier,West Med,draft=13.5,fixedCost=1675)|CNTAO(Qingdao,North China,draft=12.5,fixedCost=6813)|NLRTM(Rotterdam,NCE,draft=13.5,fixedCost=19187)|OMSLL(Salalah,Saudi Arabia,draft=13.5,fixedCost=3850)|CLSAI(San Antonio,SA West Coast,draft=13.5,fixedCost=15564)|BRSSZ(Santos,Brazil,draft=11,fixedCost=7547)|CNSHA(Shanghai,Central China,draft=13.5,fixedCost=6497)|SGSIN(Singapore,Singapore,draft=13.5,fixedCost=3268)|GHTKD(Takoradi,West Africa,draft=8,fixedCost=1400)|MYTPP(Tanjung Pelepas,Singapore,draft=13.5,fixedCost=1992)|CAVAN(Vancouver,Canada West,draft=13.5,fixedCost=774)|CNYTN(Shenzhen,South China,draft=13.5,fixedCost=7220)|JPYOK(Yokohama,Japan,draft=13.5,fixedCost=16900)|BEZEE(Zeebrugge,NCE,draft=13.5,fixedCost=12047)`

// Top 60 rotas por abs(peso) + top 20 positivas (sample representativo)
const DATASET_ROTAS_SAMPLE = `CNSHA->DEBRV(-5055231)|KRPUS->DEBRV(-4829216)|CNYTN->NLRTM(-3294985)|CNSHA->NLRTM(-2621728)|MYTPP->DEBRV(-2342858)|JPYOK->NLRTM(-2337505)|CNSHA->NGAPP(-2230016)|CNYTN->DEBRV(-2095636)|CNTAO->DEBRV(-2036217)|CNYTN->USLAX(-1863590)|HKHKG->DEBRV(-1807410)|ECGYE->DEBRV(-1774480)|CNYTN->GBFXT(-1727541)|HKHKG->NLRTM(-1683387)|CNSHA->ITGIT(-1654440)|MYTPP->NLRTM(-1646653)|CNSHA->BRSSZ(-1438769)|BRSSZ->DEBRV(-1369952)|CNSHA->ESALG(-1152023)|CNSHA->USLAX(-1149972)|MYTPP->ITGIT(-1145559)|CNSHA->GBFXT(-1136519)|CNYTN->ITGIT(-1128868)|CNTAO->NGAPP(-1025016)|CNTAO->ITGIT(-979813)|HKHKG->NGAPP(-954701)|CNSHA->ZADUR(-950899)|HKHKG->ITGIT(-908389)|DEBRV->ZADUR(-866927)|CNYTN->ESALG(-851170)|MYTPP->GBFXT(-850145)|HKHKG->BRSSZ(-840119)|CNTAO->NLRTM(-825924)|HKHKG->USLAX(-810307)|KRPUS->EGPSD(-755087)|CNSHA->GHTKD(-686094)|MYTPP->NGAPP(-676314)|HKHKG->ZADUR(-661649)|MYTPP->USLAX(-658080)|MYTPP->JPYOK(-656162)|MYPKG->USEWR(338084)|SGSIN->USEWR(319727)|USEWR->SGSIN(316027)|AUBNE->DEHAM(312885)|BEZEE->AUBNE(301313)|USEWR->MYTPP(300440)|KEMBA->USLAX(299983)|BEANR->AUBNE(298449)|BRSSZ->CNTAO(290524)|CAVAN->ZADUR(289733)|AUBNE->BEZEE(289431)|GBFXT->JPYOK(286322)|USEWR->CNYTN(285255)|USLAX->KEMBA(285001)|DEHAM->CNTAO(283449)|OMSLL->USLAX(282366)|ZADUR->CAVAN(281606)|AEJEA->CLSAI(278491)
Total: 1764 rotas (379 deficitárias, 1385 lucrativas)`

export const SUGGESTED_QUESTIONS_ETN = [
  "Quais portos concentram mais rotas deficitárias?",
  "Qual região tem o melhor balanço entre custo fixo e conectividade?",
  "Quais hubs são mais críticos para o comércio Ásia–Europa?",
  "Santos (BRSSZ) está bem posicionado na rede global?",
  "Quais rotas têm maior potencial de otimização por reposicionamento?",
]

const SYSTEM_PROMPT = `Você é um analista de logística marítima global. Responda SEMPRE em português, de forma direta e concisa (máx 3 frases). Use apenas os dados fornecidos.

Portos (formato: CÓDIGO(nome,região,calado,custoFixo)):
${DATASET_PORTOS_META}

Amostra de rotas (formato: ORIGEM->DESTINO(peso), negativo=deficitário):
${DATASET_ROTAS_SAMPLE}`

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

async function callGroq(apiKey, messages) {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      max_tokens: 200,
      temperature: 0.4,
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
    }),
  })
  if (!res.ok) throw new Error(`Groq ${res.status}`)
  const data = await res.json()
  return data.choices?.[0]?.message?.content?.trim() ?? "Sem resposta."
}

function buildAutoPrompt(summary) {
  const { filtro, grafo, topVertices, rotas } = summary
  const hubs = (topVertices || []).slice(0, 5).map(h => `${h.codigo}(grau=${h.grau})`).join(", ")
  const rotaNeg = rotas?.rotasNegativas ?? 0
  const percNeg = rotas?.percNegativas ?? "—"
  return `Estado atual do dashboard:
- Filtro grau: ${filtro?.grauRange?.[0]}–${filtro?.grauRange?.[1]}, peso: ${filtro?.pesoRange?.[0]}–${filtro?.pesoRange?.[1]}
- Portos: ${grafo?.vertices}, rotas: ${grafo?.arestas}, grau médio: ${Number(grafo?.grauMedio ?? 0).toFixed(1)}, peso médio: ${grafo?.pesoMedio ?? 0}
- Rotas deficitárias: ${rotaNeg} (${percNeg})
- Top hubs: ${hubs || "—"}

Gere um insight analítico sobre este recorte da rede marítima global.`
}

// ─── Cache ───
const PREFIX = "etn_groq_v1_"
const memCache = {}
const getCache = k => { try { return sessionStorage.getItem(PREFIX + k) } catch { return null } }
const setCache = (k, v) => { try { sessionStorage.setItem(PREFIX + k, v) } catch {} }

export function useAIInsightETN(groqApiKey) {
  const [insight, setInsight]               = useState(null)
  const [loadingInsight, setLoadingInsight] = useState(false)
  const [error, setError]                   = useState(null)
  const debounceRef = useRef(null)

  const generate = useCallback((summaryObject) => {
    if (!groqApiKey) return
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      const key = JSON.stringify({
        gr: summaryObject.filtro?.grauRange,
        pr: summaryObject.filtro?.pesoRange,
        v:  summaryObject.grafo?.vertices,
      })
      if (memCache[key])       { setInsight(memCache[key]); return }
      const cached = getCache(key)
      if (cached)              { memCache[key] = cached; setInsight(cached); return }

      setLoadingInsight(true); setError(null)
      try {
        const text = await callGroq(groqApiKey, [{ role: "user", content: buildAutoPrompt(summaryObject) }])
        memCache[key] = text; setCache(key, text); setInsight(text)
      } catch (e) {
        setError(e.message)
      } finally {
        setLoadingInsight(false)
      }
    }, 900)
  }, [groqApiKey])

  const ask = useCallback(async (question) => {
    if (!groqApiKey || !question.trim()) return
    setLoadingInsight(true); setError(null)
    try {
      const text = await callGroq(groqApiKey, [{ role: "user", content: question }])
      setInsight(text)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoadingInsight(false)
    }
  }, [groqApiKey])

  return { insight, loadingInsight, error, generate, ask }
}
