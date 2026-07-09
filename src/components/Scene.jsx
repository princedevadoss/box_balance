import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { ContactShadows } from '@react-three/drei'
import { Physics } from '@react-three/rapier'
import { CAMERA, PHYSICS, BALL } from '../config'
import { cellCenter } from '../level'
import { Board } from './Board'
import { Ball } from './Ball'
import { Detector } from './Detector'
import { SceneLighting } from './SceneLighting'
import { BallJump } from './BallJump'
import { BallFlyController } from './BallFlyController'
import { StateBroadcaster } from './StateBroadcaster'
import { PowerUpCollector } from './PowerUpCollector'
import { PowerUpPhysicsBridge } from './PowerUpPhysicsBridge'

function CameraRig({ extent }) {
  const { camera } = useThree()
  const target = useRef({ x: 0, y: 0, z: 0 })
  useFrame(() => {
    const ty = extent * 1.15 + 4
    const tz = extent * 0.95 + 3
    target.current.x *= 1 - CAMERA.ease
    target.current.y += (ty - target.current.y) * CAMERA.ease
    target.current.z += (tz - target.current.z) * CAMERA.ease
    camera.position.set(target.current.x, target.current.y, target.current.z)
    camera.lookAt(0, 0, 0)
  })
  return null
}

export function Scene({
  data,
  status,
  runId,
  heartTaken,
  patchActive = false,
  ghostActive = false,
  flyActive = false,
  shrinkScale = 1,
  worldPickup = null,
  onWorldCollect,
  registerActivateCtx,
  processPowerUpPhysics,
  onWin,
  onFail,
  onHeart,
  onSend,
  getSnapshot,
}) {
  const boardRef = useRef(null)
  const ballRef = useRef(null)
  const extent = data.gridN * data.cell
  const [sx, sz] = cellCenter(data.start.r, data.start.c, data.gridN, data.cell)
  const spawn = [sx, data.thickness / 2 + BALL.spawnHeight, sz]

  useEffect(() => {
    registerActivateCtx?.({ ballRef, boardRef, data })
  }, [registerActivateCtx, data, runId])

  return (
    <>
      <SceneLighting />
      <CameraRig extent={extent} />
      <BallFlyController ballRef={ballRef} boardRef={boardRef} flyActive={flyActive} status={status} />

      <Physics key={runId} gravity={PHYSICS.gravity} paused={status === 'paused'}>
        <BallJump ballRef={ballRef} status={status} />
        {processPowerUpPhysics && <PowerUpPhysicsBridge processPowerUpPhysics={processPowerUpPhysics} />}
        <Board
          data={data}
          bodyRef={boardRef}
          status={status}
          heartTaken={heartTaken}
          patchActive={patchActive}
          ghostActive={ghostActive}
          worldPickup={worldPickup}
          boardIndex={0}
        />
        <Ball
          bodyRef={ballRef}
          status={status}
          spawn={spawn}
          level={data.level}
          runId={runId}
          flyActive={flyActive}
          radiusScale={shrinkScale}
        />
        <Detector
          data={data}
          boardRef={boardRef}
          ballRef={ballRef}
          status={status}
          heartTaken={heartTaken}
          patchActive={patchActive}
          ghostActive={ghostActive}
          onWin={onWin}
          onFail={onFail}
          onHeart={onHeart}
        />
        {onWorldCollect && (
          <PowerUpCollector
            data={data}
            ballRef={ballRef}
            boardRef={boardRef}
            worldPickup={worldPickup}
            status={status}
            runId={runId}
            onCollect={onWorldCollect}
          />
        )}
        {onSend && getSnapshot && (
          <StateBroadcaster
            boardRef={boardRef}
            ballRef={ballRef}
            getSnapshot={getSnapshot}
            onSend={onSend}
            active={status !== 'ready'}
          />
        )}
      </Physics>

      <ContactShadows position={[0, -0.65, 0]} opacity={0.35} scale={extent * 1.6} blur={2.5} far={12} />
    </>
  )
}
