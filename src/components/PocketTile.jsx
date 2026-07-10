import * as THREE from 'three'
import { CuboidCollider } from '@react-three/rapier'
import { TILE, POCKET, COLORS } from '../config'

// Goal tile: open pocket, or sealed solid with a green rim marker so the
// player still knows where the hole will open.
export function PocketTile({
  x,
  z,
  cell,
  thickness,
  visualOnly = false,
  frameColor = COLORS.pocketFrame,
  sealed = false,
}) {
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

  if (sealed) {
    return (
      <group position={[x, 0, z]}>
        {!visualOnly && (
          <CuboidCollider
            args={[tileW / 2, halfY, tileW / 2]}
            position={[0, 0, 0]}
            friction={TILE.friction}
            restitution={TILE.restitution}
          />
        )}
        <mesh position={[0, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[tileW, thickness, tileW]} />
          <meshStandardMaterial color={frameColor} metalness={0.25} roughness={0.55} />
        </mesh>
        {/* Marker: green rim so the sealed goal location stays obvious */}
        <mesh position={[0, halfY + 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[oh, oh + POCKET.rim, 40]} />
          <meshBasicMaterial color={COLORS.goalRim} side={THREE.DoubleSide} transparent opacity={0.95} />
        </mesh>
        <mesh position={[0, halfY + 0.035, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[oh * 0.55, 24]} />
          <meshBasicMaterial color={COLORS.goalRim} transparent opacity={0.28} />
        </mesh>
      </group>
    )
  }

  return (
    <group position={[x, 0, z]}>
      {strip('n', [tileW / 2, halfY, fh], [0, 0, off], [tileW, thickness, frame])}
      {strip('s', [tileW / 2, halfY, fh], [0, 0, -off], [tileW, thickness, frame])}
      {strip('e', [fh, halfY, oh], [off, 0, 0], [frame, thickness, opening])}
      {strip('w', [fh, halfY, oh], [-off, 0, 0], [frame, thickness, opening])}
      <mesh position={[0, halfY - 0.6, 0]}>
        <cylinderGeometry args={[oh * 0.98, oh * 0.7, POCKET.pitDepth, 32, 1, true]} />
        <meshStandardMaterial color={COLORS.pocketPit} side={THREE.DoubleSide} metalness={0.1} roughness={0.9} />
      </mesh>
      <mesh position={[0, halfY - 1.25, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[oh * 0.7, 24]} />
        <meshBasicMaterial color={COLORS.pocketFloor} />
      </mesh>
      <mesh position={[0, halfY + 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[oh, oh + POCKET.rim, 40]} />
        <meshBasicMaterial color={COLORS.goalRim} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}
