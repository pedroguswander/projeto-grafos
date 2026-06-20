import { useRef, useEffect, useState, useCallback } from 'react'
import './css/WebcamCapture.css'

// Tamanho/qualidade da foto salva (avatar do ranking). Pequeno para caber no
// localStorage sem estourar a cota, mas nítido o bastante para um retrato.
const SAVE_SIZE = 160
const SAVE_QUALITY = 0.72

/**
 * Modal de captura por webcam — bonito e reutilizável (ETN e ETA).
 * props:
 *   open      → controla a abertura (liga/desliga a câmera)
 *   onCapture → recebe a foto (dataURL JPEG) quando confirmada
 *   onClose   → fecha o modal (também ao cancelar)
 *   accent    → cor de destaque (tema do jogo)
 *   title     → título do cabeçalho
 */
export default function WebcamCapture({ open, onCapture, onClose, accent = '#26c281', title = 'FOTO PARA O RANKING' }) {
  const videoRef  = useRef(null)
  const streamRef = useRef(null)
  const timerRef  = useRef(null)
  const [status, setStatus]   = useState('loading')   // loading | ready | denied | countdown | preview
  const [count,  setCount]    = useState(3)
  const [preview, setPreview] = useState(null)
  const [flash,  setFlash]    = useState(false)

  const stop = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    const s = streamRef.current
    if (s) { s.getTracks().forEach(t => t.stop()); streamRef.current = null }
  }, [])

  // Abre/fecha a câmera conforme `open`.
  useEffect(() => {
    if (!open) return
    let cancelled = false
    setStatus('loading'); setPreview(null); setFlash(false)
    const md = navigator.mediaDevices
    if (!md || !md.getUserMedia) { setStatus('denied'); return }
    md.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } }, audio: false })
      .then(stream => {
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream
        setStatus('ready')
      })
      .catch(() => { if (!cancelled) setStatus('denied') })
    return () => { cancelled = true; stop() }
  }, [open, stop])

  // (Re)vincula o stream ao <video> sempre que ele estiver montado e "ao vivo".
  useEffect(() => {
    if ((status === 'ready' || status === 'countdown') && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play().catch(() => {})
    }
  }, [status])

  const grab = useCallback(() => {
    const v = videoRef.current
    if (!v || !v.videoWidth) return null
    const side = Math.min(v.videoWidth, v.videoHeight)
    const sx = (v.videoWidth - side) / 2, sy = (v.videoHeight - side) / 2
    const c = document.createElement('canvas')
    c.width = SAVE_SIZE; c.height = SAVE_SIZE
    const cx = c.getContext('2d')
    cx.translate(SAVE_SIZE, 0); cx.scale(-1, 1)   // espelha (efeito selfie)
    cx.drawImage(v, sx, sy, side, side, 0, 0, SAVE_SIZE, SAVE_SIZE)
    try { return c.toDataURL('image/jpeg', SAVE_QUALITY) } catch { return null }
  }, [])

  const shoot = useCallback(() => {
    if (status !== 'ready') return
    setStatus('countdown')
    let n = 3
    setCount(n)
    const tick = () => {
      n -= 1
      if (n === 0) {
        setFlash(true)
        const url = grab()
        timerRef.current = setTimeout(() => setFlash(false), 220)
        if (url) { setPreview(url); setStatus('preview') } else setStatus('ready')
      } else {
        setCount(n)
        timerRef.current = setTimeout(tick, 750)
      }
    }
    timerRef.current = setTimeout(tick, 750)
  }, [status, grab])

  const retake = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    setPreview(null); setFlash(false)
    setStatus(streamRef.current ? 'ready' : 'loading')
  }, [])

  const close = useCallback(() => { stop(); onClose && onClose() }, [stop, onClose])
  const confirm = useCallback(() => {
    if (preview && onCapture) onCapture(preview)
    close()
  }, [preview, onCapture, close])

  if (!open) return null

  return (
    <div className="wcap-backdrop" style={{ '--wcap-accent': accent }} onClick={close}>
      <div className="wcap-modal" onClick={e => e.stopPropagation()}>
        <div className="wcap-head">
          <span className="wcap-dot" />
          <span className="wcap-title">{title}</span>
          <button className="wcap-x" onClick={close} type="button" aria-label="Fechar">×</button>
        </div>

        <div className={`wcap-stage${flash ? ' wcap-flashing' : ''}`}>
          <div className="wcap-ring">
            {status === 'preview' ? (
              <img src={preview} className="wcap-media" alt="prévia da foto" />
            ) : (
              <video ref={videoRef} className="wcap-media wcap-mirror" playsInline muted autoPlay />
            )}

            {status === 'loading' && (
              <div className="wcap-msg"><span className="wcap-spin" />Ativando câmera…</div>
            )}
            {status === 'denied' && (
              <div className="wcap-msg wcap-denied">
                <span className="wcap-deny-icon">⛔</span>
                Câmera indisponível
                <small>Permita o acesso à câmera no navegador e tente novamente.</small>
              </div>
            )}
            {status === 'countdown' && <div key={count} className="wcap-count">{count}</div>}

            <span className="wcap-scan" />
            <span className="wcap-corner tl" /><span className="wcap-corner tr" />
            <span className="wcap-corner bl" /><span className="wcap-corner br" />
            {flash && <span className="wcap-flash" />}
          </div>
        </div>

        <div className="wcap-hint">
          {status === 'preview' ? 'Ficou boa? Use no ranking ou refaça.'
            : status === 'denied' ? 'Sem câmera? Você pode pular e salvar sem foto.'
            : 'Sorria! A foto entra no seu card do ranking.'}
        </div>

        <div className="wcap-actions">
          {status === 'preview' ? (
            <>
              <button className="wcap-btn wcap-ghost" onClick={retake} type="button">↻ Refazer</button>
              <button className="wcap-btn wcap-primary" onClick={confirm} type="button">✓ Usar foto</button>
            </>
          ) : status === 'denied' ? (
            <button className="wcap-btn wcap-ghost" onClick={close} type="button">Fechar</button>
          ) : (
            <>
              <button className="wcap-btn wcap-ghost" onClick={close} type="button">Cancelar</button>
              <button className="wcap-btn wcap-primary" disabled={status !== 'ready'} onClick={shoot} type="button">
                <span className="wcap-shutter" /> Capturar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
