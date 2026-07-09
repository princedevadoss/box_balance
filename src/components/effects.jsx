import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { COLORS } from '../config'
import { useAirVentTexture, useLavaSurfaceTexture } from '../textures'

export function AirEffect({ x, z, cell, thickness, intensity }) {
  const groupRef = useRef()
  const ventTex = useAirVentTexture()
  const COUNT = 8
  const height = 1.4 + intensity * 0.8
  const parts = useMemo(
    () =>
      Array.from({ length: COUNT }, (_, i) => ({
        ox: (Math.random() - 0.5) * cell * 0.35,
        oz: (Math.random() - 0.5) * cell * 0.35,
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
      child.material.opacity = 0.55 * fade
      child.scale.setScalar(0.12 + p * 0.16)
    })
  })
  return (
    <group>
      <mesh position={[x, thickness / 2 + 0.03, z]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[cell * 0.42, 32]} />
        <meshStandardMaterial
          map={ventTex}
          color={COLORS.airGlow}
          emissive={COLORS.airEmissive}
          emissiveIntensity={0.35}
          transparent
          opacity={0.92}
          roughness={0.4}
          metalness={0.1}
        />
      </mesh>
      <group ref={groupRef} position={[x, 0, z]}>
        {parts.map((p, i) => (
          <mesh key={i} position={[p.ox, 0, p.oz]}>
            <planeGeometry args={[cell * 0.22, cell * 0.22]} />
            <meshBasicMaterial
              map={ventTex}
              color={COLORS.airPuff}
              transparent
              opacity={0}
              depthWrite={false}
              side={2}
            />
          </mesh>
        ))}
      </group>
    </group>
  )
}

export function LavaEffect({ x, z, cell, thickness, intensity }) {
  const glowRef = useRef()
  const bubblesRef = useRef()
  const lavaTex = useLavaSurfaceTexture()
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
      glowRef.current.material.opacity = 0.55 + 0.25 * Math.sin(t * 3 + x * 1.7)
    }
    const g = bubblesRef.current
    if (g)
      g.children.forEach((child, i) => {
        const p = (t * (0.5 + intensity * 0.3) + parts[i].phase) % 1
        child.position.y = thickness / 2 + p * (0.35 + intensity * 0.15)
        const fade = Math.sin(p * Math.PI)
        child.material.opacity = 0.85 * fade
        child.scale.setScalar(0.08 + fade * 0.1)
      })
  })
  return (
    <group>
      <mesh ref={glowRef} position={[x, thickness / 2 + 0.04, z]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[cell * 0.92, cell * 0.92]} />
        <meshStandardMaterial
          map={lavaTex}
          color={COLORS.lavaGlow}
          emissive={COLORS.lavaEmissive}
          emissiveIntensity={0.65 + intensity * 0.15}
          transparent
          opacity={0.95}
          roughness={0.55}
          metalness={0.05}
        />
      </mesh>
      <group ref={bubblesRef} position={[x, 0, z]}>
        {parts.map((p, i) => (
          <mesh key={i} position={[p.ox, 0, p.oz]}>
            <sphereGeometry args={[1, 12, 12]} />
            <meshBasicMaterial color={COLORS.lavaBubble} transparent opacity={0} depthWrite={false} />
          </mesh>
        ))}
      </group>
    </group>
  )
}
