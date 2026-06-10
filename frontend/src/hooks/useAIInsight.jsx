import { useState, useRef, useCallback } from "react"

// ─── Dataset compacto embutido (economiza tokens na API) ───
const DATASET_AEROPORTOS = `REC->JPA(13,regional_curta)|REC->NAT(15,regional)|REC->SSA(18,regional_forte)|REC->FOR(19,regional_forte)|REC->THE(17,regional_interior_litoral)|NAT->JPA(12,regional_curta)|FOR->NAT(15,regional_turistica)|SSA->FOR(19,regional_forte)|GRU->CGH(18,metropolitana)|GRU->GIG(21,eixo_sudeste)|GRU->CNF(20,eixo_sudeste)|GRU->VIX(19,eixo_sudeste)|CGH->CNF(20,ponte_corporativa)|GIG->CNF(18,eixo_sudeste)|GIG->VIX(17,litoral_sudeste)|BSB->GYN(14,regional_forte)|CWB->FLN(15,regional_sul)|CWB->POA(18,regional_sul)|FLN->POA(16,regional_sul_turistica)|MAO->BEL(20,regional_estrategica)|MAO->PVH(18,regional_norte)|PVH->RBR(17,regional_remota)|REC->BSB(21,ponte_nacional)|SSA->BSB(20,ponte_nacional)|FOR->GRU(23,hub_nacional)|NAT->GIG(20,turistica_nacional)|THE->BSB(19,articulacao_nacional)|BSB->GRU(24,eixo_nacional)|BSB->CNF(20,eixo_centro_sudeste)|BSB->BEL(22,integracao_nacional)|BSB->MAO(24,integracao_nacional)|GYN->CWB(18,conexao_interregional)|CWB->GRU(21,eixo_sul_sudeste)|FLN->GIG(20,turistica_interregional)|POA->GRU(23,eixo_sul_sudeste_longo)|BEL->GRU(24,hub_nacional)|MAO->GRU(25,hub_nacional_longo)|PVH->BSB(23,integracao_remota)|RBR->BSB(24,integracao_remota)|VIX->REC(20,litoral_nacional)|GIG->SSA(20,turistica_nacional)|CNF->FOR(21,conexao_interregional)|SSA->VIX(19,litoral_interregional)|FOR->BSB(21,articulacao_nacional)|REC->GIG(21,eixo_turistico_economico)|JPA->BSB(18,conexao_nacional)|POA->CNF(22,conexao_interregional_longa)|BEL->CNF(22,eixo_norte_sudeste)|BEL->PVH(19,integracao_norte)|FLN->VIX(19,litoral_interregional)`

// Formato: IATA(grau,regiao)
const AEROPORTOS_META = `BSB(12,Centro-Oeste)|GRU(10,Sudeste)|REC(8,Nordeste)|GIG(7,Sudeste)|CNF(7,Sudeste)|FOR(6,Nordeste)|SSA(5,Nordeste)|BEL(5,Norte)|VIX(5,Sudeste)|MAO(4,Norte)|PVH(4,Norte)|NAT(4,Nordeste)|CWB(4,Sul)|FLN(4,Sul)|POA(4,Sul)|JPA(3,Nordeste)|CGH(2,Sudeste)|GYN(2,Centro-Oeste)|RBR(2,Norte)|THE(2,Nordeste)`

export const SUGGESTED_QUESTIONS = [
  "Qual aeroporto é mais crítico para a malha nacional?",
  "Quais regiões seriam mais afetadas se BSB fosse removido?",
  "Existe algum gargalo de conectividade no Norte/Nordeste?",
  "Quais rotas têm maior peso estratégico no grafo?",
  "Como a região Sul se conecta ao restante do país?",
]

const SYSTEM_PROMPT = `Você é um analista de redes de transporte aéreo brasileiro. Responda SEMPRE em português, de forma direta e concisa (máx 3 frases). Use apenas os dados fornecidos.

Dataset de rotas (formato: ORIGEM->DESTINO(peso,tipo)):
${DATASET_AEROPORTOS}

Aeroportos (formato: IATA(grau,região)):
${AEROPORTOS_META}`

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
  const { filtro, grafo, topVertices } = summary
  const hubs = (topVertices || []).slice(0, 5).map(h => `${h.iata}(grau=${h.grau})`).join(", ")
  return `Estado atual do dashboard:
- Filtro grau: ${filtro?.grauRange?.[0]}–${filtro?.grauRange?.[1]}, peso: ${filtro?.pesoRange?.[0]}–${filtro?.pesoRange?.[1]}
- Vértices visíveis: ${grafo?.vertices}, arestas: ${grafo?.arestas}, grau médio: ${Number(grafo?.grauMedio ?? 0).toFixed(1)}
- Top hubs: ${hubs || "—"}

Gere um insight analítico sobre este recorte do grafo aéreo brasileiro.`
}

// ─── Cache ───
const PREFIX = "air_groq_v1_"
const memCache = {}
const getCache = k => { try { return sessionStorage.getItem(PREFIX + k) } catch { return null } }
const setCache = (k, v) => { try { sessionStorage.setItem(PREFIX + k, v) } catch {} }

export function useAIInsight(groqApiKey) {
  const [insight, setInsight]             = useState(null)
  const [loadingInsight, setLoadingInsight] = useState(false)
  const [error, setError]                 = useState(null)
  const debounceRef = useRef(null)

  // Insight automático — dispara com mudança de filtro
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

  // Pergunta customizada do usuário
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
