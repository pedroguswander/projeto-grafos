/**
 * apiFetch — tenta a URL relativa primeiro (Docker / produção).
 * Cai para localhost:8000 se:
 *   - der erro de rede (Docker desligado), OU
 *   - a resposta vier com Content-Type HTML (Vite SPA fallback),  OU
 *   - der HTTP 5xx
 */

const FALLBACK_BASE = "http://localhost:5000"

function isHtmlResponse(res) {
  const ct = res.headers.get("content-type") || ""
  return ct.includes("text/html")
}

export async function apiFetch(path, options) {
  let primaryRes

  // 1ª tentativa — URL relativa
  try {
    primaryRes = await fetch(path, options)

    // Se o Vite respondeu com HTML (SPA fallback), a rota não existe aqui
    if (isHtmlResponse(primaryRes)) throw new Error("html_fallback")

    // 4xx são erros da API (rota existe, dados errados) — não faz fallback
    if (primaryRes.ok || (primaryRes.status >= 400 && primaryRes.status < 500)) {
      return primaryRes
    }

    // 5xx — tenta fallback
    throw new Error(`HTTP ${primaryRes.status}`)
  } catch (primaryErr) {
    const shouldFallback =
      primaryErr instanceof TypeError ||           // erro de rede
      primaryErr.message === "html_fallback" ||    // Vite devolveu HTML
      primaryErr.message?.startsWith("HTTP 5")    // 5xx

    if (!shouldFallback) throw primaryErr

    // 2ª tentativa — localhost:8000
    try {
      const res = await fetch(`${FALLBACK_BASE}${path}`, options)
      return res
    } catch {
      throw primaryErr   // nenhuma funcionou — re-lança o original
    }
  }
}

export async function apiFetchJson(path, options) {
  const res = await apiFetch(path, options)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}
