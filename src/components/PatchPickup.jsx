import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { COLORS, PATCH } from '../config'

/** Floating 3D band-aid / patch pickup icon. */
export function PatchPickup({ position }) {
  const groupRef = useRef(null)
  const [x, y, z] = position

  useFrame((state) => {
    const g = groupRef.current
    if (!g) return
    const t = state.clock.getElapsedTime()
    g.rotation.y = t * 1.4
    g.position.y = y + Math.sin(t * 2.8) * 0.1
  })

  return (
    <group ref={groupRef} position={[x, y, z]} scale={PATCH.iconScale}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} castShadow>
        <boxGeometry args={[0.72, 0.48, 0.08]} />
        <meshStandardMaterial
          color={COLORS.patchBody}
          emissive={COLORS.patchEmissive}
          emissiveIntensity={0.35}
          roughness={0.45}
          metalness={0.1}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
        <boxGeometry args={[0.22, 0.22, 0.04]} />
        <meshStandardMaterial color={COLORS.patchCross} emissive={COLORS.patchCross} emissiveIntensity={0.2} />
      </mesh>
      <mesh position={[-0.18, 0.12, 0.14]}>
        <sphereGeometry args={[0.05, 10, 10]} />
        <meshStandardMaterial color={COLORS.patchVent} roughness={0.8} />
      </mesh>
      <mesh position={[0.18, 0.12, -0.14]}>
        <sphereGeometry args={[0.05, 10, 10]} />
        <meshStandardMaterial color={COLORS.patchVent} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.14, 0]}>
        <torusGeometry args={[0.38, 0.03, 8, 24]} />
        <meshBasicMaterial color={COLORS.patchGlow} transparent opacity={0.55} depthWrite={false} />
      </mesh>
    </group>
  )
}
