import { useEffect, useRef } from 'react'
import { BOARD } from '../config'

const RAD2DEG = 180 / Math.PI
const BUBBLE_TRAVEL = 42 // px at full maxTilt

function formatDeg(deg) {
  const sign = deg > 0.05 ? '+' : deg < -0.05 ? '−' : ''
  return `${sign}${Math.abs(deg).toFixed(1)}°`
}

/**
 * Top-left spirit-level HUD. Reads `tiltRef.current = { x, z }` (radians)
 * written each frame by the local Board.
 */
export function TiltLevelHud({ tiltRef, visible = true, compact = false }) {
  const rootRef = useRef(null)
  const bubbleRef = useRef(null)
  const platformRef = useRef(null)
  const xRef = useRef(null)
  const yRef = useRef(null)
  const statusRef = useRef(null)

  useEffect(() => {
    if (!visible) return
    let raf = 0

    const tick = () => {
      const tilt = tiltRef?.current
      const pitch = tilt?.x ?? 0 // board X (mouse Y)
      const roll = tilt?.z ?? 0 // board Z (mouse X)
      const xDeg = roll * RAD2DEG
      const yDeg = pitch * RAD2DEG
      const stable =
        Math.abs(xDeg) <= BOARD.stableDeg && Math.abs(yDeg) <= BOARD.stableDeg

      const nx = Math.max(-1, Math.min(1, roll / BOARD.maxTilt))
      const ny = Math.max(-1, Math.min(1, pitch / BOARD.maxTilt))

      if (bubbleRef.current) {
        // Bubble rolls opposite the high side, like a real spirit level.
        bubbleRef.current.style.transform = `translate(${-nx * BUBBLE_TRAVEL}px, ${ny * BUBBLE_TRAVEL}px)`
      }
      if (platformRef.current) {
        platformRef.current.style.transform = `rotateX(${-yDeg * 0.85}deg) rotateZ(${-xDeg * 0.85}deg)`
      }
      if (xRef.current) xRef.current.textContent = formatDeg(xDeg)
      if (yRef.current) yRef.current.textContent = formatDeg(yDeg)
      if (statusRef.current) {
        statusRef.current.textContent = stable ? 'Stable' : 'Slanted'
        statusRef.current.dataset.state = stable ? 'stable' : 'slanted'
      }
      if (rootRef.current) {
        rootRef.current.dataset.state = stable ? 'stable' : 'slanted'
      }

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [tiltRef, visible])

  if (!visible) return null

  return (
    <div ref={rootRef} className={`tilt-level${compact ? ' tilt-level--compact' : ''}`} data-state="stable">
      <div className="tilt-level__stage">
        <div ref={platformRef} className="tilt-level__platform">
          <div className="tilt-level__ring">
            <div className="tilt-level__cross tilt-level__cross--h" />
            <div className="tilt-level__cross tilt-level__cross--v" />
            <div className="tilt-level__target" />
            <div ref={bubbleRef} className="tilt-level__bubble" />
          </div>
          <div className="tilt-level__base" />
        </div>
      </div>
      {!compact && (
        <div className="tilt-level__readout">
          <div className="tilt-level__axis">
            <span className="tilt-level__axis-label">X</span>
            <span ref={xRef} className="tilt-level__axis-value">
              0.0°
            </span>
          </div>
          <div className="tilt-level__axis">
            <span className="tilt-level__axis-label">Y</span>
            <span ref={yRef} className="tilt-level__axis-value">
              0.0°
            </span>
          </div>
          <div ref={statusRef} className="tilt-level__status" data-state="stable">
            Stable
          </div>
        </div>
      )}
      {compact && (
        <div className="tilt-level__readout tilt-level__readout--compact">
          <div ref={statusRef} className="tilt-level__status" data-state="stable">
            Stable
          </div>
          <span ref={xRef} className="tilt-level__mini-deg">
            0.0°
          </span>
        </div>
      )}
    </div>
  )
}
