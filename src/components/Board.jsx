import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { cellCenter } from '../level'
import { BOARD, TILE, LEVELGEN, COLORS, effectIntensity } from '../config'
import { useArrowTexture, boostAngle } from '../textures'
import { AirEffect, LavaEffect } from './effects'
import { PocketTile } from './PocketTile'
import { MovingBox } from './MovingBox'
import { PowerUpPickup } from './PowerUpPickup'
import { WaverCharacter } from './WaverCharacter'
import { pickupLocalPosition } from '../powerUps'

// One kinematic body holding every tile collider. colliders={false} so
// decorative meshes (rings, glows, arrows) are visual only.
export function Board({
  data,
  bodyRef,
  status,
  heartTaken: _heartTaken,
  patchActive = false,
  ghostActive = false,
  visualOnly = false,
  worldPickup = null,
  waver = null,
  goalOpen = true,
  boardIndex = 0,
  rotationRef,
  tiltRef = null,
  position = [0, 0, 0],
  control = 'local',
}) {
  const currentQuat = useRef(new THREE.Quaternion())
  const targetEuler = useRef(new THREE.Euler())
  const targetQuat = useRef(new THREE.Quaternion())
  const readEuler = useRef(new THREE.Euler())
  const visualGroupRef = useRef(null)
  const arrowTex = useArrowTexture()
  const { pointer } = useThree()

  const { gridN, cell, thickness, cells, level, movers, theme } = data
  const palette =
    theme === 'b'
      ? COLORS.coopBoardB
      : theme === 'c'
      ? COLORS.coopBoardC
      : theme === 'd'
      ? COLORS.coopBoardD
      : theme === 'a'
      ? COLORS.coopBoardA
      : { tileA: COLORS.tileA, tileB: COLORS.tileB, frame: COLORS.pocketFrame }
  const airIntensity = effectIntensity(level, LEVELGEN.air.startLevel)
  const lavaIntensity = effectIntensity(level, LEVELGEN.lava.startLevel)
  const extent = gridN * cell
  const halfRange = extent / 2 - cell * 0.4
  const showPickup =
    worldPickup != null && (worldPickup.boardIndex ?? 0) === boardIndex
  const pickupLocal = showPickup ? pickupLocalPosition(data, worldPickup) : null
  const showWaver = waver != null && (waver.boardIndex ?? 0) === boardIndex

  useFrame(() => {
    if (visualOnly) {
      const group = visualGroupRef.current
      const rot = rotationRef?.current
      if (group && rot) group.quaternion.set(rot[0], rot[1], rot[2], rot[3])
    } else {
      const body = bodyRef.current
      if (body && status !== 'paused') {
        if (control === 'network') {
          const rot = rotationRef?.current
          if (rot && (status === 'playing' || status === 'countdown')) {
            currentQuat.current.set(rot[0], rot[1], rot[2], rot[3])
            body.setNextKinematicRotation(currentQuat.current)
          }
        } else if (status === 'playing' || status === 'countdown') {
          targetEuler.current.set(-pointer.y * BOARD.maxTilt, 0, -pointer.x * BOARD.maxTilt, 'XYZ')
          targetQuat.current.setFromEuler(targetEuler.current)
          currentQuat.current.slerp(targetQuat.current, BOARD.tiltEase)
          body.setNextKinematicRotation(currentQuat.current)
        } else {
          targetEuler.current.set(0, 0, 0, 'XYZ')
          targetQuat.current.setFromEuler(targetEuler.current)
          currentQuat.current.slerp(targetQuat.current, BOARD.tiltEase)
          body.setNextKinematicRotation(currentQuat.current)
        }
      }
    }

    if (tiltRef && control === 'local' && !visualOnly) {
      readEuler.current.setFromQuaternion(currentQuat.current, 'XYZ')
      tiltRef.current.x = readEuler.current.x
      tiltRef.current.z = readEuler.current.z
    }
  })

  const tiles = []
  for (let r = 0; r < gridN; r++) {
    for (let c = 0; c < gridN; c++) {
      const t = cells[r][c]
      if (!t.exists) continue
      const [x, z] = cellCenter(r, c, gridN, cell)
      if (t.kind === 'goal') {
        tiles.push(
          <PocketTile
            key={`t${r}-${c}`}
            x={x}
            z={z}
            cell={cell}
            thickness={thickness}
            visualOnly={visualOnly}
            frameColor={palette.frame}
            sealed={!goalOpen}
          />
        )
        continue
      }
      const h = t.height
      const halfY = (thickness + h) / 2
      const posY = h / 2
      const checker = (r + c) % 2 === 0
      const patchedLava = patchActive && t.kind === 'lava'

      let color = checker ? palette.tileA : palette.tileB
      let emissive = '#000000'
      let emissiveIntensity = 0
      if (t.kind === 'bump') color = COLORS.bump
      else if (t.kind === 'air') {
        color = COLORS.airTile
        emissive = COLORS.airEmissive
        emissiveIntensity = 0.5
      } else if (patchedLava) {
        color = COLORS.patchTile
        emissive = COLORS.patchTileEmissive
        emissiveIntensity = 0.45
      } else if (t.kind === 'lava') {
        color = COLORS.lavaTile
        emissive = COLORS.lavaEmissive
        emissiveIntensity = 0.95
      } else if (t.kind === 'boost') {
        color = COLORS.boostTile
        emissive = COLORS.boostEmissive
        emissiveIntensity = 0.4
      }

      tiles.push(
        <group key={`t${r}-${c}`}>
          {!visualOnly && (
            <CuboidCollider
              args={[cell * TILE.collider, halfY, cell * TILE.collider]}
              position={[x, posY, z]}
              friction={TILE.friction}
              restitution={TILE.restitution}
            />
          )}
          <mesh position={[x, posY, z]} castShadow receiveShadow>
            <boxGeometry args={[cell * TILE.visible, thickness + h, cell * TILE.visible]} />
            <meshStandardMaterial
              color={color}
              emissive={emissive}
              emissiveIntensity={emissiveIntensity}
              metalness={0.25}
              roughness={0.55}
            />
          </mesh>
          {t.kind === 'air' && (
            <AirEffect x={x} z={z} cell={cell} thickness={thickness} intensity={airIntensity} />
          )}
          {t.kind === 'lava' && !patchedLava && (
            <LavaEffect x={x} z={z} cell={cell} thickness={thickness} intensity={lavaIntensity} />
          )}
          {patchedLava && (
            <mesh position={[x, thickness / 2 + 0.03, z]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[cell * 0.55, cell * 0.35]} />
              <meshBasicMaterial color={COLORS.patchCross} transparent opacity={0.85} depthWrite={false} />
            </mesh>
          )}
          {t.kind === 'boost' && (
            <group position={[x, thickness / 2 + 0.02, z]} rotation={[0, boostAngle(t.dx, t.dz), 0]}>
              <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[cell * 0.75, cell * 0.4]} />
                <meshBasicMaterial map={arrowTex} transparent depthWrite={false} />
              </mesh>
            </group>
          )}
        </group>
      )
    }
  }

  // Danger-gap glow (missing tiles that are NOT the goal). Patched gaps become solid tiles.
  const dangers = []
  const gapPatches = []
  for (let r = 0; r < gridN; r++) {
    for (let c = 0; c < gridN; c++) {
      if (cells[r][c].kind !== 'gap') continue
      const [x, z] = cellCenter(r, c, gridN, cell)
      if (patchActive) {
        const halfY = thickness / 2
        gapPatches.push(
          <group key={`gp${r}-${c}`}>
            {!visualOnly && (
              <CuboidCollider
                args={[cell * TILE.collider, halfY, cell * TILE.collider]}
                position={[x, 0, z]}
                friction={TILE.friction}
                restitution={TILE.restitution}
              />
            )}
            <mesh position={[x, 0, z]} castShadow receiveShadow>
              <boxGeometry args={[cell * TILE.visible, thickness, cell * TILE.visible]} />
              <meshStandardMaterial
                color={COLORS.patchTile}
                emissive={COLORS.patchTileEmissive}
                emissiveIntensity={0.35}
                metalness={0.2}
                roughness={0.55}
              />
            </mesh>
            <mesh position={[x, thickness / 2 + 0.03, z]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[cell * 0.5, cell * 0.32]} />
              <meshBasicMaterial color={COLORS.patchCross} transparent opacity={0.9} depthWrite={false} />
            </mesh>
          </group>
        )
      } else {
        dangers.push(
          <mesh key={`d${r}-${c}`} position={[x, -0.6, z]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[cell * 0.9, cell * 0.9]} />
            <meshBasicMaterial color={COLORS.danger} transparent opacity={0.35} side={THREE.DoubleSide} />
          </mesh>
        )
      }
    }
  }

  const boardContent = (
    <>
      {tiles}
      {dangers}
      {gapPatches}

      {movers &&
        movers.map((m, i) => (
          <MovingBox
            key={`m${i}`}
            axis={m.axis}
            line={m.line}
            halfRange={halfRange}
            speed={m.speed}
            phase={m.phase}
            cell={cell}
            thickness={thickness}
            visualOnly={visualOnly}
            ghostActive={ghostActive}
          />
        ))}

      {showPickup && pickupLocal && (
        <PowerUpPickup type={worldPickup.type} localPosition={pickupLocal} cell={cell} />
      )}

      {showWaver && <WaverCharacter board={data} waver={waver} />}

    </>
  )

  if (visualOnly) {
    return (
      <group ref={visualGroupRef} position={position}>
        {boardContent}
      </group>
    )
  }

  return (
    <RigidBody
      ref={bodyRef}
      type="kinematicPosition"
      colliders={false}
      position={position}
    >
      {boardContent}
    </RigidBody>
  )
}
