import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { COLORS } from '../config'

// Rising jet of puffs blasting upward out of an air tile.
export function AirEffect({ x, z, cell, thickness, intensity }) {
  const groupRef = useRef()
  const COUNT = 8
  const height = 1.4 + intensity * 0.8
  const parts = useMemo(
    () =>
      Array.from({ length: COUNT }, (_, i) => ({
        ox: (Math.random() - 0.5) * cell * 0.45,
        oz: (Math.random() - 0.5) * cell * 0.45,
        phase: i / COUNT + Math.random() * 0.06,
      })),
    [cell]
  )
  useFrame((state) => {
    const g = groupRef.current
    if (!g) return
    const t = state.clock.getElapsedTime()
    g.children.forEach((child, i) => {
      const p = (t * (0.7 + intensity * 0.35) + parts[i].phase) % 1
      child.position.y = thickness / 2 + p * height
      const fade = Math.sin(p * Math.PI)
      child.material.opacity = 0.6 * fade
      child.scale.setScalar(0.1 + p * 0.14)
    })
  })
  return (
    <group>
      {/* nozzle glow */}
      <mesh position={[x, thickness / 2 + 0.02, z]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[cell * 0.32, 24]} />
        <meshBasicMaterial color={COLORS.airGlow} transparent opacity={0.4} depthWrite={false} />
      </mesh>
      <group ref={groupRef} position={[x, 0, z]}>
        {parts.map((p, i) => (
          <mesh key={i} position={[p.ox, 0, p.oz]}>
            <sphereGeometry args={[1, 10, 10]} />
            <meshBasicMaterial color={COLORS.airPuff} transparent opacity={0} depthWrite={false} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

// Pulsing molten glow + rising bubbles for a lava tile.
export function LavaEffect({ x, z, cell, thickness, intensity }) {
  const glowRef = useRef()
  const bubblesRef = useRef()
  const COUNT = 6
  const parts = useMemo(
    () =>
      Array.from({ length: COUNT }, (_, i) => ({
        ox: (Math.random() - 0.5) * cell * 0.55,
        oz: (Math.random() - 0.5) * cell * 0.55,
        phase: i / COUNT + Math.random() * 0.1,
      })),
    [cell]
  )
  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    if (glowRef.current) {
      glowRef.current.material.opacity = 0.45 + 0.3 * Math.sin(t * 3 + x * 1.7)
    }
    const g = bubblesRef.current
    if (g)
      g.children.forEach((child, i) => {
        const p = (t * (0.5 + intensity * 0.3) + parts[i].phase) % 1
        child.position.y = thickness / 2 + p * (0.35 + intensity * 0.15)
        const fade = Math.sin(p * Math.PI)
        child.material.opacity = 0.8 * fade
        child.scale.setScalar(0.07 + fade * 0.09)
      })
  })
  return (
    <group>
      <mesh ref={glowRef} position={[x, thickness / 2 + 0.03, z]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[cell * 0.9, cell * 0.9]} />
        <meshBasicMaterial color={COLORS.lavaGlow} transparent opacity={0.5} depthWrite={false} />
      </mesh>
      <group ref={bubblesRef} position={[x, 0, z]}>
        {parts.map((p, i) => (
          <mesh key={i} position={[p.ox, 0, p.oz]}>
            <sphereGeometry args={[1, 10, 10]} />
            <meshBasicMaterial color={COLORS.lavaBubble} transparent opacity={0} depthWrite={false} />
          </mesh>
        ))}
      </group>
    </group>
  )
}
