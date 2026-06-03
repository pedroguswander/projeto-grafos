import { useState, useRef, useCallback } from "react"

// ⚠️  Adicione no .env da raiz do projeto: VITE_GROQ_KEY=gsk_...
const GROQ_KEY = import.meta.env.VITE_GROQ_KEY ?? "SUA_CHAVE_AQUI"
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

// ─────────────────────────────────────────────────────────────
// MEMÓRIA ESTÁTICA DO DATASET
// Injetada no system prompt — a IA conhece cada aeroporto,
// seu grau, conexões e justificativas antes de receber os filtros.
// ─────────────────────────────────────────────────────────────
const DATASET_MEMORY = {
  descricao: "Grafo de rotas aéreas brasileiras com 20 aeroportos e 49 arestas ponderadas por peso/distância.",
  top5_hubs: [
    { iata: "BSB", cidade: "Brasília",       grau: 12, papel: "Hub político nacional — conecta TODAS as regiões do Brasil, especialmente capitais remotas do Norte e Nordeste ao centro federal." },
    { iata: "GRU", cidade: "São Paulo",      grau: 10, papel: "Principal hub econômico — ponto de entrada/saída para Norte (MAO, BEL), Sul (POA) e Nordeste (FOR). Maior peso médio de rota do grafo." },
    { iata: "REC", cidade: "Recife",         grau: 8,  papel: "Hub regional do Nordeste — articula capitais vizinhas (JPA, NAT, SSA, FOR) e serve de ponte para o Sudeste e Brasília." },
    { iata: "GIG", cidade: "Rio de Janeiro", grau: 7,  papel: "Hub turístico-econômico — forte conexão com o Nordeste turístico (NAT, SSA) e eixo Sudeste (GRU, CNF, VIX)." },
    { iata: "CNF", cidade: "Belo Horizonte", grau: 7,  papel: "Hub corporativo do Sudeste — conecta São Paulo (GRU, CGH) ao Sul, Norte e Nordeste com viés econômico/institucional." },
  ],
  aeroportos: [
    { iata: "BSB", cidade: "Brasília",        regiao: "Centro-Oeste", grau: 12, densidade_ego: 0.32, destaque: "maior grau do grafo; ponte entre Norte remoto e resto do país" },
    { iata: "GRU", cidade: "São Paulo",       regiao: "Sudeste",      grau: 10, densidade_ego: 0.40, destaque: "hub econômico; rotas mais pesadas do grafo (MAO=25, BSB=24, BEL=24)" },
    { iata: "REC", cidade: "Recife",          regiao: "Nordeste",     grau: 8,  densidade_ego: 0.50, destaque: "hub nordestino; 5 conexões regionais + 3 nacionais" },
    { iata: "GIG", cidade: "Rio de Janeiro",  regiao: "Sudeste",      grau: 7,  densidade_ego: 0.50, destaque: "perfil turístico; conecta NAT, SSA, FLN ao eixo Sudeste" },
    { iata: "CNF", cidade: "Belo Horizonte",  regiao: "Sudeste",      grau: 7,  densidade_ego: 0.54, destaque: "corporativo; liga SP(GRU+CGH) a FOR, POA, BEL, BSB" },
    { iata: "FOR", cidade: "Fortaleza",       regiao: "Nordeste",     grau: 6,  densidade_ego: 0.62, destaque: "2ª capital nordestina; conexão direta com GRU e BSB" },
    { iata: "SSA", cidade: "Salvador",        regiao: "Nordeste",     grau: 5,  densidade_ego: 0.73, destaque: "forte apelo turístico/cultural; conecta Nordeste a GIG e VIX" },
    { iata: "BEL", cidade: "Belém",           regiao: "Norte",        grau: 5,  densidade_ego: 0.80, destaque: "polo oriental do Norte; alta densidade de ego (0.80)" },
    { iata: "VIX", cidade: "Vitória",         regiao: "Sudeste",      grau: 5,  densidade_ego: 0.67, destaque: "eixo litorâneo; conecta Sul e Nordeste via costeira" },
    { iata: "MAO", cidade: "Manaus",          regiao: "Norte",        grau: 4,  densidade_ego: 0.90, destaque: "maior densidade de ego (0.90); rota mais pesada do grafo (GRU=25)" },
    { iata: "PVH", cidade: "Porto Velho",     regiao: "Norte",        grau: 4,  densidade_ego: 0.80, destaque: "articulação amazônica; depende de BSB para integração nacional" },
    { iata: "NAT", cidade: "Natal",           regiao: "Nordeste",     grau: 4,  densidade_ego: 0.70, destaque: "destino turístico; conecta Nordeste a GIG" },
    { iata: "CWB", cidade: "Curitiba",        regiao: "Sul",          grau: 4,  densidade_ego: 0.60, destaque: "integra Sul ao Sudeste (GRU) e Centro-Oeste (GYN)" },
    { iata: "FLN", cidade: "Florianópolis",   regiao: "Sul",          grau: 4,  densidade_ego: 0.60, destaque: "turístico; conecta Sul a GIG e VIX" },
    { iata: "POA", cidade: "Porto Alegre",    regiao: "Sul",          grau: 4,  densidade_ego: 0.70, destaque: "extremo sul; depende de GRU e CNF para conexões longas" },
    { iata: "JPA", cidade: "João Pessoa",     regiao: "Nordeste",     grau: 3,  densidade_ego: 0.83, destaque: "regional compacto; triangula REC-NAT-BSB" },
    { iata: "CGH", cidade: "São Paulo",       regiao: "Sudeste",      grau: 2,  densidade_ego: 1.00, destaque: "aeroporto doméstico de SP; serve CGH↔GRU e CGH↔CNF" },
    { iata: "GYN", cidade: "Goiânia",         regiao: "Centro-Oeste", grau: 2,  densidade_ego: 0.67, destaque: "satélite de BSB; baixa conectividade fora da região" },
    { iata: "RBR", cidade: "Rio Branco",      regiao: "Norte",        grau: 2,  densidade_ego: 1.00, destaque: "mais isolado do grafo; conectado apenas a PVH e BSB" },
    { iata: "THE", cidade: "Teresina",        regiao: "Nordeste",     grau: 2,  densidade_ego: 1.00, destaque: "interior nordestino; conectado apenas a REC e BSB" },
  ],
  regioes: {
    "Nordeste":     { aeroportos: ["REC","SSA","FOR","NAT","JPA","THE"], conexoes_internas: 8,  observacao: "região mais conectada internamente; REC é o hub articulador" },
    "Sudeste":      { aeroportos: ["GRU","CGH","GIG","CNF","VIX"],      conexoes_internas: 7,  observacao: "eixo econômico; GRU e GIG dominam o tráfego" },
    "Norte":        { aeroportos: ["MAO","BEL","PVH","RBR"],            conexoes_internas: 4,  observacao: "depende de BSB e GRU para sair da região; alta densidade local" },
    "Sul":          { aeroportos: ["CWB","FLN","POA"],                  conexoes_internas: 3,  observacao: "região compacta; todas as capitais se conectam entre si" },
    "Centro-Oeste": { aeroportos: ["BSB","GYN"],                        conexoes_internas: 1,  observacao: "BSB domina; GYN é quase um satélite" },
  },
  fatos_notaveis: [
    "BSB tem grau 12 mas densidade de ego 0.32 — conecta muitos, mas seus vizinhos raramente se conectam entre si.",
    "MAO tem apenas grau 4 mas densidade de ego 0.90 — seus poucos vizinhos estão todos interligados.",
    "A rota mais pesada do grafo é MAO→GRU (peso 25), refletindo a distância física entre Amazônia e São Paulo.",
    "RBR e THE são os aeroportos mais periféricos: grau 2, sem alternativa de rota além de BSB.",
    "CGH (Congonhas) e GRU (Guarulhos) representam os dois aeroportos de São Paulo na mesma metrópole.",
    "O Nordeste tem 8 conexões internas — mais que qualquer outra região do grafo.",
  ],
}

const SYSTEM_PROMPT = `Você é um analista especialista neste grafo de rotas aéreas brasileiras.
Você conhece profundamente cada aeroporto, suas conexões e os motivos de cada rota.

CONHECIMENTO DO DATASET:
${JSON.stringify(DATASET_MEMORY)}

INSTRUÇÕES DE RESPOSTA:
- Responda SEMPRE em português, em 3-4 frases objetivas.
- Use os dados do dataset acima para contextualizar os filtros aplicados.
- Mencione aeroportos pelo nome da cidade + sigla IATA quando relevante.
- Destaque o aeroporto mais relevante no contexto filtrado e explique o porquê com base nas conexões reais.
- Se o filtro isolar uma região, comente sobre ela especificamente.
- Sem markdown, sem listas, só texto corrido.
- IMPORTANTE: sempre termine a última frase com ponto final. Nunca corte no meio.`

export function useAIInsight() {
  const [insight, setInsight] = useState(null)
  const [loadingInsight, setLoadingInsight] = useState(false)
  const cacheRef = useRef({})
  const controllerRef = useRef(null)

  const generate = useCallback(async (summaryObject) => {
    const key = JSON.stringify(summaryObject)
    if (cacheRef.current[key]) {
      setInsight(cacheRef.current[key])
      return
    }

    if (controllerRef.current) controllerRef.current.abort()
    const controller = new AbortController()
    controllerRef.current = controller

    setLoadingInsight(true)
    try {
      let res, attempt = 0
      while (attempt < 3) {
        res = await fetch(GROQ_URL, {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${GROQ_KEY}`,
          },
          body: JSON.stringify({
            model: "llama-3.1-8b-instant",
            max_tokens: 300,
            temperature: 0.4,
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              {
                role: "user",
                content: `Analise estes dados do dashboard com os filtros atuais:\n${JSON.stringify(summaryObject)}`,
              },
            ],
          }),
        })
        if (res.status !== 429) break
        const retryAfter = parseFloat(res.headers.get("retry-after") ?? String(2 ** attempt))
        await new Promise(r => setTimeout(r, retryAfter * 1000))
        attempt++
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message ?? `HTTP ${res.status}`)
      }

      const data = await res.json()
      const text = data.choices?.[0]?.message?.content ?? ""
      cacheRef.current[key] = text
      setInsight(text)
    } catch (e) {
      if (e.name !== "AbortError") {
        console.error("[useAIInsight]", e.message)
        setInsight(null)
      }
    } finally {
      setLoadingInsight(false)
    }
  }, [])

  return { insight, loadingInsight, generate }
}
