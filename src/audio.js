// Procedural sound effects via the Web Audio API — no audio files needed.
// Browsers block audio until a user gesture, so call initAudio() from a click.

let ctx = null
let masterGain = null
let noiseBuffer = null
let roll = null // continuous rolling-screech voice

function ensure() {
  if (ctx) return ctx
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return null
  ctx = new AC()
  masterGain = ctx.createGain()
  masterGain.gain.value = 0.8
  masterGain.connect(ctx.destination)
  return ctx
}

function getNoise() {
  if (noiseBuffer) return noiseBuffer
  const len = ctx.sampleRate * 2
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
  noiseBuffer = buf
  return buf
}

// Kick things off (resume context, build the looping roll voice). Safe to call
// repeatedly; only the first call does the work.
export function initAudio() {
  const c = ensure()
  if (!c) return
  if (c.state === 'suspended') c.resume()
  if (roll) return

  const source = c.createBufferSource()
  source.buffer = getNoise()
  source.loop = true
  // Two bandpass stages give the sharp, metallic screech character.
  const bp1 = c.createBiquadFilter()
  bp1.type = 'bandpass'
  bp1.frequency.value = 2400
  bp1.Q.value = 9
  const bp2 = c.createBiquadFilter()
  bp2.type = 'bandpass'
  bp2.frequency.value = 3200
  bp2.Q.value = 6
  const gain = c.createGain()
  gain.gain.value = 0
  source.connect(bp1)
  bp1.connect(bp2)
  bp2.connect(gain)
  gain.connect(masterGain)
  source.start()
  roll = { bp1, bp2, gain, cur: 0 }
}

// Feed the ball's current speed to modulate the rolling screech.
export function setRollSpeed(speed) {
  if (!roll || !ctx) return
  const target = Math.min(speed * 0.018, 0.16)
  roll.cur += (target - roll.cur) * 0.25
  roll.gain.gain.setTargetAtTime(roll.cur, ctx.currentTime, 0.02)
  const f = 1600 + Math.min(speed, 16) * 240
  roll.bp1.frequency.setTargetAtTime(f, ctx.currentTime, 0.05)
  roll.bp2.frequency.setTargetAtTime(f * 1.35, ctx.currentTime, 0.05)
}

export function stopRoll() {
  if (roll && ctx) {
    roll.cur = 0
    roll.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.06)
  }
}

// Short tonal blip (menu clicks, chimes).
function blip({ freq = 800, type = 'triangle', dur = 0.05, vol = 0.2, slideTo = null }) {
  const c = ensure()
  if (!c) return
  if (c.state === 'suspended') c.resume()
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, c.currentTime)
  if (slideTo) osc.frequency.linearRampToValueAtTime(slideTo, c.currentTime + dur)
  g.gain.setValueAtTime(vol, c.currentTime)
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur)
  osc.connect(g)
  g.connect(masterGain || c.destination)
  osc.start()
  osc.stop(c.currentTime + dur + 0.02)
}

// Filtered noise burst (whooshes, sizzles).
function noiseBurst({ dur = 0.3, vol = 0.2, type = 'bandpass', freqStart, freqEnd, Q = 1 }) {
  const c = ensure()
  if (!c) return
  if (c.state === 'suspended') c.resume()
  const src = c.createBufferSource()
  src.buffer = getNoise()
  const filt = c.createBiquadFilter()
  filt.type = type
  filt.Q.value = Q
  if (freqStart != null) filt.frequency.setValueAtTime(freqStart, c.currentTime)
  if (freqEnd != null) filt.frequency.linearRampToValueAtTime(freqEnd, c.currentTime + dur)
  const g = c.createGain()
  g.gain.setValueAtTime(vol, c.currentTime)
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur)
  src.connect(filt)
  filt.connect(g)
  g.connect(masterGain || c.destination)
  src.start()
  src.stop(c.currentTime + dur + 0.02)
}

export const playClick = () => blip({ freq: 660, type: 'triangle', dur: 0.05, vol: 0.16 })

export const playWin = () => {
  blip({ freq: 620, type: 'sine', dur: 0.12, vol: 0.2 })
  setTimeout(() => blip({ freq: 940, type: 'sine', dur: 0.18, vol: 0.2 }), 90)
}

export const playFail = () =>
  blip({ freq: 320, type: 'sawtooth', dur: 0.35, vol: 0.22, slideTo: 70 })

export const playHeart = () => {
  blip({ freq: 800, type: 'sine', dur: 0.1, vol: 0.2 })
  setTimeout(() => blip({ freq: 1250, type: 'sine', dur: 0.14, vol: 0.2 }), 80)
}

export const playLaunch = () =>
  noiseBurst({ dur: 0.35, vol: 0.22, type: 'bandpass', freqStart: 400, freqEnd: 2200, Q: 1.2 })

export const playLava = () =>
  noiseBurst({ dur: 0.5, vol: 0.22, type: 'lowpass', freqStart: 1400, freqEnd: 200, Q: 1 })
