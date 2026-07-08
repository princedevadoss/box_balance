import { useCallback, useRef, useState } from 'react'

const MIN_SPLIT = 18
const MAX_SPLIT = 82
const SNAP_FULL = 92

export function useSplitResize(initial = 50) {
  const [localPct, setLocalPct] = useState(initial)
  const bodyRef = useRef(null)
  const isFullLocal = localPct >= 100

  const startDrag = useCallback((e) => {
    e.preventDefault()
    const body = bodyRef.current
    if (!body) return

    const onMove = (ev) => {
      const rect = body.getBoundingClientRect()
      const raw = ((ev.clientY - rect.top) / rect.height) * 100
      if (raw >= SNAP_FULL) {
        setLocalPct(100)
        return
      }
      setLocalPct(Math.min(MAX_SPLIT, Math.max(MIN_SPLIT, Math.round(raw))))
    }

    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }, [])

  return {
    bodyRef,
    localPct,
    isFullLocal,
    setEqual: () => setLocalPct(50),
    setFullLocal: () => setLocalPct(100),
    startDrag,
    resetSplit: () => setLocalPct(50),
  }
}
