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

// One kinematic body holding every tile collider. colliders={false} so
// decorative meshes (rings, glows, heart, arrows) are visual only.
export function Board({
  data,
  bodyRef,
  status,
  heartTaken,
  visualOnly = false,
  rotationRef,
  position = [0, 0, 0],
  control = 'local',
}) {
  const currentQuat = useRef(new THREE.Quaternion())
  const targetEuler = useRef(new THREE.Euler())
  const targetQuat = useRef(new THREE.Quaternion())
  const heartRef = useRef(null)
  const visualGroupRef = useRef(null)
  const arrowTex = useArrowTexture()
  const { pointer } = useThree()

  const { gridN, cell, thickness, cells, heart, level, movers, theme } = data
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
  const heartBaseY = thickness / 2 + 0.85
  const airIntensity = effectIntensity(level, LEVELGEN.air.startLevel)
  const lavaIntensity = effectIntensity(level, LEVELGEN.lava.startLevel)
  const extent = gridN * cell
  const halfRange = extent / 2 - cell * 0.4

  useFrame((state) => {
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
    if (heartRef.current) {
      const t = state.clock.getElapsedTime()
      heartRef.current.rotation.y = t * 1.6
      heartRef.current.position.y = heartBaseY + Math.sin(t * 3) * 0.12
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
          />
        )
        continue
      }
      const h = t.height
      const halfY = (thickness + h) / 2
      const posY = h / 2
      const checker = (r + c) % 2 === 0

      let color = checker ? palette.tileA : palette.tileB
      let emissive = '#000000'
      let emissiveIntensity = 0
      if (t.kind === 'bump') color = COLORS.bump
      else if (t.kind === 'air') {
        color = COLORS.airTile
        emissive = COLORS.airEmissive
        emissiveIntensity = 0.5
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
          {t.kind === 'lava' && (
            <LavaEffect x={x} z={z} cell={cell} thickness={thickness} intensity={lavaIntensity} />
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

  // Danger-gap glow (missing tiles that are NOT the goal).
  const dangers = []
  for (let r = 0; r < gridN; r++) {
    for (let c = 0; c < gridN; c++) {
      if (cells[r][c].kind !== 'gap') continue
      const [x, z] = cellCenter(r, c, gridN, cell)
      dangers.push(
        <mesh key={`d${r}-${c}`} position={[x, -0.6, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[cell * 0.9, cell * 0.9]} />
          <meshBasicMaterial color={COLORS.danger} transparent opacity={0.35} side={THREE.DoubleSide} />
        </mesh>
      )
    }
  }

  const showHeart = heart && !heartTaken
  const heartXZ = heart ? cellCenter(heart.r, heart.c, gridN, cell) : [0, 0]

  const boardContent = (
    <>
      {tiles}
      {dangers}

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
          />
        ))}

      {showHeart && (
        <group ref={heartRef} position={[heartXZ[0], heartBaseY, heartXZ[1]]} scale={0.9}>
          <mesh position={[-0.17, 0.08, 0]}>
            <sphereGeometry args={[0.2, 20, 20]} />
            <meshStandardMaterial color={COLORS.heart} emissive={COLORS.heart} emissiveIntensity={0.5} />
          </mesh>
          <mesh position={[0.17, 0.08, 0]}>
            <sphereGeometry args={[0.2, 20, 20]} />
            <meshStandardMaterial color={COLORS.heart} emissive={COLORS.heart} emissiveIntensity={0.5} />
          </mesh>
          <mesh position={[0, -0.17, 0]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.3, 0.42, 20]} />
            <meshStandardMaterial color={COLORS.heart} emissive={COLORS.heart} emissiveIntensity={0.5} />
          </mesh>
        </group>
      )}
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
