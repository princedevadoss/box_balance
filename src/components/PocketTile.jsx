import * as THREE from 'three'
import { CuboidCollider } from '@react-three/rapier'
import { TILE, POCKET, COLORS } from '../config'

// Goal tile: a solid tile with a circular pocket cut into its middle so the ball
// drops in like a billiard pocket. The frame is 4 collider strips around a
// central opening; the pit + green rim are visual only.
export function PocketTile({ x, z, cell, thickness, visualOnly = false, frameColor = COLORS.pocketFrame }) {
  const tileW = cell * TILE.visible
  const opening = cell * POCKET.opening
  const oh = opening / 2
  const frame = (tileW - opening) / 2
  const fh = frame / 2
  const halfY = thickness / 2
  const off = oh + fh

  const strip = (key, args, pos, box) => (
    <group key={key}>
      {!visualOnly && (
        <CuboidCollider args={args} position={pos} friction={TILE.friction} restitution={TILE.restitution} />
      )}
      <mesh position={pos} castShadow receiveShadow>
        <boxGeometry args={box} />
        <meshStandardMaterial color={frameColor} metalness={0.25} roughness={0.55} />
      </mesh>
    </group>
  )

  return (
    <group position={[x, 0, z]}>
      {strip('n', [tileW / 2, halfY, fh], [0, 0, off], [tileW, thickness, frame])}
      {strip('s', [tileW / 2, halfY, fh], [0, 0, -off], [tileW, thickness, frame])}
      {strip('e', [fh, halfY, oh], [off, 0, 0], [frame, thickness, opening])}
      {strip('w', [fh, halfY, oh], [-off, 0, 0], [frame, thickness, opening])}
      {/* pocket walls + floor (dark, purely visual) */}
      <mesh position={[0, halfY - 0.6, 0]}>
        <cylinderGeometry args={[oh * 0.98, oh * 0.7, POCKET.pitDepth, 32, 1, true]} />
        <meshStandardMaterial color={COLORS.pocketPit} side={THREE.DoubleSide} metalness={0.1} roughness={0.9} />
      </mesh>
      <mesh position={[0, halfY - 1.25, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[oh * 0.7, 24]} />
        <meshBasicMaterial color={COLORS.pocketFloor} />
      </mesh>
      {/* green goal rim */}
      <mesh position={[0, halfY + 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[oh, oh + POCKET.rim, 40]} />
        <meshBasicMaterial color={COLORS.goalRim} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}
