import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { ContactShadows } from '@react-three/drei'
import * as THREE from 'three'
import { CAMERA, BALL } from '../config'
import { generateLevel } from '../level'
import { useNizhenTexture } from '../textures'
import { Board } from './Board'
import { SceneLighting } from './SceneLighting'
import { isEffectActive } from '../powerUps'

function RemoteCameraRig({ extent }) {
  const target = useRef(new THREE.Vector3())
  useFrame(({ camera }) => {
    target.current.set(0, extent * 1.15 + 4, extent * 0.95 + 3)
    camera.position.lerp(target.current, CAMERA.ease)
    camera.lookAt(0, 0, 0)
  })
  return null
}

function RemoteBall({ positionRef, level, scale = 1 }) {
  const meshRef = useRef(null)
  const texture = useNizhenTexture(level)
  const target = useRef(new THREE.Vector3())

  useFrame(() => {
    const mesh = meshRef.current
    const pos = positionRef.current
    if (!mesh || !pos) return
    target.current.set(pos[0], pos[1], pos[2])
    mesh.position.lerp(target.current, 0.35)
  })

  return (
    <mesh ref={meshRef} castShadow key={`remote-ball-${level}-${scale}`} scale={[scale, scale, scale]}>
      <sphereGeometry args={[BALL.radius, 32, 32]} />
      <meshStandardMaterial
        key={`remote-ball-mat-${level}`}
        map={texture}
        color="#ffffff"
        metalness={BALL.metalness}
        roughness={BALL.roughness}
        envMapIntensity={0.25}
      />
    </mesh>
  )
}

export function RemoteScene({ peerState, roomSeed }) {
  const level = peerState?.level ?? 1
  const data = useMemo(() => generateLevel(level, roomSeed), [level, roomSeed])
  const extent = data.gridN * data.cell

  const rotationRef = useRef([0, 0, 0, 1])
  const ballRef = useRef([0, 0, 4])
  const smoothQuat = useRef(new THREE.Quaternion())

  useFrame(() => {
    if (!peerState?.board) return
    smoothQuat.current.set(
      peerState.board[0],
      peerState.board[1],
      peerState.board[2],
      peerState.board[3]
    )
    rotationRef.current = [
      smoothQuat.current.x,
      smoothQuat.current.y,
      smoothQuat.current.z,
      smoothQuat.current.w,
    ]
    if (peerState.ball) ballRef.current = peerState.ball
  })

  const status = peerState?.status ?? 'countdown'
  const heartTaken = peerState?.heartTaken ?? false
  const patchActive = isEffectActive(peerState?.effectsUntil?.patch)
  const ghostActive = isEffectActive(peerState?.effectsUntil?.ghost)
  const shrinkScale = isEffectActive(peerState?.effectsUntil?.shrink) ? 0.5 : 1
  const worldPickup = peerState?.worldPickup ?? null

  return (
    <>
      <SceneLighting shadowMap={1024} />
      <RemoteCameraRig extent={extent} />
      <Board
        data={data}
        status={status}
        heartTaken={heartTaken}
        patchActive={patchActive}
        ghostActive={ghostActive}
        visualOnly
        rotationRef={rotationRef}
        worldPickup={worldPickup}
        boardIndex={0}
      />
      <RemoteBall positionRef={ballRef} level={level} scale={shrinkScale} />
      <ContactShadows position={[0, -0.65, 0]} opacity={0.35} scale={extent * 1.6} blur={2.5} far={12} />
    </>
  )
}
