import { useEffect, useRef, Suspense } from 'react'
import { ContactShadows } from '@react-three/drei'
import { Physics } from '@react-three/rapier'
import { PHYSICS, BALL } from '../config'
import { cellCenter } from '../level'
import { Board } from './Board'
import { Ball } from './Ball'
import { Detector } from './Detector'
import { SceneLighting } from './SceneLighting'
import { BallJump } from './BallJump'
import { BallFlyController } from './BallFlyController'
import { LocalFlyAim } from './CoopFlyAim'
import { StateBroadcaster } from './StateBroadcaster'
import { PowerUpCollector } from './PowerUpCollector'
import { PowerUpPhysicsBridge } from './PowerUpPhysicsBridge'
import { WaverCollector } from './WaverCollector'
import { WaverPrewarm } from './WaverCharacter'

import { AdaptiveCameraRig } from './AdaptiveCameraRig'

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
  waver = null,
  onWaverCollect,
  goalOpen = true,
  registerActivateCtx,
  processPowerUpPhysics,
  onWin,
  onFail,
  onHeart,
  onSend,
  getSnapshot,
  tiltRef = null,
  canvasJump = true,
  jumpTriggerRef = null,
}) {
  const boardRef = useRef(null)
  const ballRef = useRef(null)
  const flyTargetRef = useRef(null)
  const extent = data.gridN * data.cell
  const [sx, sz] = cellCenter(data.start.r, data.start.c, data.gridN, data.cell)
  const spawn = [sx, data.thickness / 2 + BALL.spawnHeight, sz]

  useEffect(() => {
    registerActivateCtx?.({ ballRef, boardRef, data })
  }, [registerActivateCtx, data, runId])

  return (
    <>
      <SceneLighting />
      <AdaptiveCameraRig extent={extent} />
      <Suspense fallback={null}>
        <WaverPrewarm />
      </Suspense>
      <LocalFlyAim
        flyActive={flyActive}
        status={status}
        boardRef={boardRef}
        boardData={data}
        flyTargetRef={flyTargetRef}
      />
      <BallFlyController
        ballRef={ballRef}
        flyActive={flyActive}
        status={status}
        targetWorldRef={flyTargetRef}
      />

      <Physics key={runId} gravity={PHYSICS.gravity} paused={status === 'paused'}>
        <BallJump
          ballRef={ballRef}
          status={status}
          canvasJump={canvasJump}
          jumpTriggerRef={jumpTriggerRef}
        />
        {processPowerUpPhysics && <PowerUpPhysicsBridge processPowerUpPhysics={processPowerUpPhysics} />}
        <Board
          data={data}
          bodyRef={boardRef}
          status={status}
          heartTaken={heartTaken}
          patchActive={patchActive}
          ghostActive={ghostActive}
          worldPickup={worldPickup}
          waver={waver}
          goalOpen={goalOpen}
          boardIndex={0}
          tiltRef={tiltRef}
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
          goalOpen={goalOpen}
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
        {onWaverCollect && (
          <WaverCollector
            data={data}
            ballRef={ballRef}
            boardRef={boardRef}
            waver={waver}
            status={status}
            onCollect={onWaverCollect}
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
