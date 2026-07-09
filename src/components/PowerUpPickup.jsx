import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { POWERUP, TILE } from '../config'
import { GlbPickupModel, preloadGlb } from './GlbPickupModel'

const TYPE_COLORS = {
  health: { body: '#fca5a5', glow: '#ef4444' },
  patch: { body: '#fde68a', glow: '#fbbf24' },
  ghost: { body: '#e9d5ff', glow: '#c4b5fd' },
  portal: { body: '#93c5fd', glow: '#3b82f6' },
  fly: { body: '#fde68a', glow: '#f59e0b' },
  shrink: { body: '#a5f3fc', glow: '#06b6d4' },
}

function PickupModel({ type, colors, targetSize }) {
  const meta = POWERUP.types[type]
  const modelSrc = meta?.model

  if (modelSrc) {
    return <GlbPickupModel src={modelSrc} targetSize={targetSize} />
  }

  return (
    <mesh castShadow receiveShadow>
      <icosahedronGeometry args={[targetSize * 0.42, 1]} />
      <meshStandardMaterial
        color={colors.body}
        emissive={colors.glow}
        emissiveIntensity={0.5}
        roughness={0.35}
        metalness={0.1}
        transparent
        opacity={0.82}
      />
    </mesh>
  )
}

// Preload all board pickup models.
for (const type of Object.keys(POWERUP.types)) {
  preloadGlb(POWERUP.types[type].model)
}

/** Board-local position — parent must be the board rigid body (or visual group). */
export function PowerUpPickup({ type, localPosition, cell = TILE.size }) {
  const groupRef = useRef(null)
  const [x, y, z] = localPosition
  const colors = TYPE_COLORS[type] ?? TYPE_COLORS.health
  const targetSize = cell * POWERUP.modelScale

  useFrame((state) => {
    const g = groupRef.current
    if (!g) return
    g.rotation.y = state.clock.getElapsedTime() * 0.8
  })

  return (
    <group ref={groupRef} position={[x, y, z]}>
      <PickupModel type={type} colors={colors} targetSize={targetSize} />
    </group>
  )
}
