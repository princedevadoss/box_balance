/** Native (React Native WebView) gyro → pointer-like board input. */

const STALE_MS = 500

function gyroBag() {
  if (typeof window === 'undefined') return null
  if (!window.__NIZHEN_GYRO__) {
    window.__NIZHEN_GYRO__ = { x: 0, y: 0, active: false, updatedAt: 0 }
  }
  return window.__NIZHEN_GYRO__
}

export function setGyroInput(x, y, active = true) {
  const g = gyroBag()
  if (!g) return
  g.active = !!active
  g.x = Math.max(-1, Math.min(1, Number(x) || 0))
  g.y = Math.max(-1, Math.min(1, Number(y) || 0))
  g.updatedAt = performance.now()
}

export function clearGyroInput() {
  const g = gyroBag()
  if (!g) return
  g.active = false
  g.x = 0
  g.y = 0
}

/** @returns {{ x: number, y: number } | null} */
export function getGyroPointer() {
  const g = gyroBag()
  if (!g?.active) return null
  if (g.updatedAt && performance.now() - g.updatedAt > STALE_MS) return null
  return { x: g.x, y: g.y }
}

function handlePayload(raw) {
  try {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!data || data.type !== 'nizhen_gyro') return
    if (data.active === false) {
      clearGyroInput()
      return
    }
    setGyroInput(data.x, data.y, true)
  } catch {
    // ignore
  }
}

/** Call once from the web app bootstrap (safe no-op outside RN WebView). */
export function initGyroMessageBridge() {
  if (typeof window === 'undefined') return
  if (window.__NIZHEN_GYRO_BRIDGE__) return
  window.__NIZHEN_GYRO_BRIDGE__ = true

  gyroBag()
  window.__NIZHEN_SET_GYRO__ = (x, y) => setGyroInput(x, y, true)
  window.__NIZHEN_CLEAR_GYRO__ = () => clearGyroInput()

  document.addEventListener('message', (e) => handlePayload(e.data))
  window.addEventListener('message', (e) => handlePayload(e.data))
}
