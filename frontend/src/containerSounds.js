// Web Audio API — synthesized sound effects (no audio files needed)
let ctx = null

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function tone({ type = 'sine', freqStart, freqEnd, gain, duration, delay = 0 }) {
  try {
    const ac  = getCtx()
    const osc = ac.createOscillator()
    const gn  = ac.createGain()
    osc.connect(gn)
    gn.connect(ac.destination)

    const t = ac.currentTime + delay
    osc.type = type
    osc.frequency.setValueAtTime(freqStart, t)
    if (freqEnd !== undefined)
      osc.frequency.exponentialRampToValueAtTime(freqEnd, t + duration)
    gn.gain.setValueAtTime(gain, t)
    gn.gain.linearRampToValueAtTime(0, t + duration)
    osc.start(t)
    osc.stop(t + duration + 0.01)
  } catch (_) {}
}

export function playSound(type) {
  switch (type) {
    case 'drop':
      // Short click — descending tone
      tone({ freqStart: 440, freqEnd: 260, gain: 0.12, duration: 0.09 })
      break

    case 'land':
      // Thud — low square wave bump
      tone({ type: 'square', freqStart: 140, freqEnd: 80, gain: 0.18, duration: 0.14 })
      break

    case 'perfect':
      // Rising chime — two notes
      tone({ freqStart: 660, freqEnd: 880, gain: 0.15, duration: 0.12 })
      tone({ freqStart: 880, freqEnd: 1100, gain: 0.12, duration: 0.12, delay: 0.12 })
      break

    case 'miss':
      // Descending fail buzzer
      tone({ type: 'sawtooth', freqStart: 300, freqEnd: 60, gain: 0.25, duration: 0.45 })
      break
  }
}
