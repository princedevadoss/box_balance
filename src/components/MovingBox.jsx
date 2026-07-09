import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CuboidCollider, useBeforePhysicsStep } from '@react-three/rapier'
import { HAZARD, COLORS } from '../config'

// Blue box that slides back and forth across the board along one axis. Lives
// inside the board body so it tilts too; its collider tracks its visual each frame.
export function MovingBox({
  axis,
  line,
  halfRange,
  speed,
  phase,
  cell,
  thickness,
  visualOnly = false,
  ghostActive = false,
}) {
  const meshRef = useRef(null)
  const colRef = useRef(null)
  const posRef = useRef({ x: 0, y: 0, z: 0 })
  const size = cell * HAZARD.mover.size
  const boxH = HAZARD.mover.height
  const y = thickness / 2 + boxH / 2
  // Stable reference so re-renders don't reset the collider's translation.
  const startPos = useMemo(
    () => (axis === 'x' ? [-halfRange, y, line] : [line, y, -halfRange]),
    [axis, halfRange, line, y]
  )
  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    const tri = Math.abs(((t * speed + phase) % 2) - 1) // ping-pong 0..1..0
    const coord = -halfRange + tri * 2 * halfRange
    const px = axis === 'x' ? coord : line
    const pz = axis === 'x' ? line : coord
    if (meshRef.current) meshRef.current.position.set(px, y, pz)
    posRef.current = { x: px, y, z: pz }
  })

  useBeforePhysicsStep(() => {
    if (visualOnly) return
    const col = colRef.current
    if (!col?.setTranslationWrtParent) return
    const { x, y: py, z } = posRef.current
    col.setTranslationWrtParent({ x, y: py, z })
  })
  return (
    <>
      <mesh ref={meshRef} position={startPos} castShadow receiveShadow>
        <boxGeometry args={[size, boxH, size]} />
        <meshStandardMaterial color={COLORS.mover} emissive={COLORS.moverEmissive} emissiveIntensity={0.35} metalness={0.4} roughness={0.4} />
      </mesh>
      {!visualOnly && (
        <CuboidCollider
          ref={colRef}
          args={[size / 2, boxH / 2, size / 2]}
          position={startPos}
          sensor={ghostActive}
          friction={HAZARD.mover.friction}
          restitution={HAZARD.mover.restitution}
        />
      )}
    </>
  )
}
