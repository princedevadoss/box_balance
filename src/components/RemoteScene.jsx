import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { ContactShadows } from '@react-three/drei'
import * as THREE from 'three'
import { generateLevel } from '../level'
import { readViewport } from '../viewport'
import { Board } from './Board'
import { NetworkBall } from './NetworkBall'
import { AdaptiveCameraRig } from './AdaptiveCameraRig'
import { SceneLighting } from './SceneLighting'
import { isEffectActive } from '../powerUps'

function RemoteCameraRig({ extent }) {
  return <AdaptiveCameraRig extent={extent} />
}

export function RemoteScene({ peerState, peerStateRef, roomSeed }) {
  const level = peerState?.level ?? 1
  const data = useMemo(() => {
    const { gridCap } = readViewport()
    return generateLevel(level, roomSeed, { gridCap })
  }, [level, roomSeed])
  const extent = data.gridN * data.cell

  const rotationRef = useRef([0, 0, 0, 1])
  const ballStateRef = useRef(null)
  const smoothQuat = useRef(new THREE.Quaternion())

  useFrame(() => {
    const packet = peerStateRef?.current
    const liveState = packet?.state ?? peerState
    const receivedAt = packet?.receivedAt ?? performance.now()
    if (!liveState?.board) return

    smoothQuat.current.set(
      liveState.board[0],
      liveState.board[1],
      liveState.board[2],
      liveState.board[3]
    )
    rotationRef.current = [
      smoothQuat.current.x,
      smoothQuat.current.y,
      smoothQuat.current.z,
      smoothQuat.current.w,
    ]

    if (liveState.ball) {
      ballStateRef.current = {
        pos: liveState.ball,
        vel: liveState.ballVel,
        angVel: liveState.ballAngVel,
        rot: liveState.ballRot,
        runId: liveState.runId,
        receivedAt,
      }
    }
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
      <NetworkBall
        stateRef={ballStateRef}
        level={level}
        status={status}
        spawn={[0, 0, 4]}
        runId={peerState?.runId ?? 0}
        radiusScale={shrinkScale}
      />
      <ContactShadows position={[0, -0.65, 0]} opacity={0.35} scale={extent * 1.6} blur={2.5} far={12} />
    </>
  )
}
