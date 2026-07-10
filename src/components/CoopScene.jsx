import { memo, useCallback, useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { ContactShadows } from '@react-three/drei'
import { Physics } from '@react-three/rapier'
import * as THREE from 'three'
import { CAMERA, PHYSICS } from '../config'
import { boardSpawnPosition } from '../level'
import { coopCameraLayout, readViewport, cameraFitForExtent } from '../viewport'
import { Board } from './Board'
import { Ball } from './Ball'
import { NetworkBall } from './NetworkBall'
import { CoopDetector } from './CoopDetector'
import { StateBroadcaster } from './StateBroadcaster'
import { SceneLighting } from './SceneLighting'
import { BallJump } from './BallJump'
import { BallFlyController } from './BallFlyController'
import { CoopFlyAim } from './CoopFlyAim'
import { PowerUpCollector } from './PowerUpCollector'
import { PowerUpPhysicsBridge } from './PowerUpPhysicsBridge'
import { WaverCollector } from './WaverCollector'

function CoopCameraRig({ slot, boards }) {
  const { camera, size } = useThree()
  const targetPos = useRef(new THREE.Vector3())
  const lookAt = useRef(new THREE.Vector3())
  const defaultFov = useRef(CAMERA.fov)

  useFrame(() => {
    const viewport = readViewport()
    const myBoard = boards[slot]
    const myX = myBoard?.position?.[0] ?? 0
    const myExtent = (myBoard?.gridN ?? 6) * (myBoard?.cell ?? 1.6)
    const aspect = size.width / Math.max(size.height, 1)

    if (viewport.isMobile) {
      // Frame the local board fully; slight extra margin shows a peek of neighbor boards.
      const peek = viewport.portrait ? 1.12 : 1.08
      const fit = cameraFitForExtent(myExtent * peek, aspect, viewport.portrait, 0.92)
      targetPos.current.set(myX, fit.y, fit.z)
      lookAt.current.set(myX, 0, 0)
      camera.position.lerp(targetPos.current, CAMERA.ease)
      camera.lookAt(lookAt.current)
      const targetFov = viewport.portrait ? 54 : 50
      if (Math.abs(camera.fov - targetFov) > 0.05) {
        camera.fov += (targetFov - camera.fov) * 0.12
        camera.updateProjectionMatrix()
      }
      return
    }

    if (Math.abs(camera.fov - defaultFov.current) > 0.05) {
      camera.fov += (defaultFov.current - camera.fov) * 0.12
      camera.updateProjectionMatrix()
    }

    const layout = coopCameraLayout(slot, boards, viewport)
    targetPos.current.set(...layout.position)
    lookAt.current.set(...layout.lookAt)
    camera.position.lerp(targetPos.current, CAMERA.ease)
    camera.lookAt(lookAt.current)
  })
  return null
}

function PeerNetworkBridge({ peerState, peerStateRef, isHost, peerBoardsRef, networkBallRef, boardRotRefs, runId }) {
  const lastRunId = useRef(runId)
  const lastBallRunId = useRef(null)

  useFrame(() => {
    if (runId !== lastRunId.current) {
      lastRunId.current = runId
      networkBallRef.current = null
      lastBallRunId.current = null
    }

    const packet = peerStateRef?.current
    const liveState = packet?.state ?? peerState
    const receivedAt = packet?.receivedAt ?? performance.now()

    if (liveState?.peerBoards) {
      for (const [idx, rot] of Object.entries(liveState.peerBoards)) {
        const i = Number(idx)
        if (boardRotRefs.current[i]) boardRotRefs.current[i].current = rot
      }
    }
    if (!isHost && liveState?.board && boardRotRefs.current[0]) {
      boardRotRefs.current[0].current = liveState.board
    }
    if (isHost && peerBoardsRef?.current) {
      for (const [idx, rot] of Object.entries(peerBoardsRef.current)) {
        const i = Number(idx)
        if (boardRotRefs.current[i]) boardRotRefs.current[i].current = rot
      }
    }
    if (!isHost && liveState?.ball) {
      const ballRunId = liveState.runId ?? runId
      if (lastBallRunId.current != null && ballRunId !== lastBallRunId.current) {
        networkBallRef.current = null
      }
      lastBallRunId.current = ballRunId
      networkBallRef.current = {
        pos: liveState.ball,
        vel: liveState.ballVel,
        angVel: liveState.ballAngVel,
        rot: liveState.ballRot,
        runId: ballRunId,
        receivedAt,
      }
    }
  })
  return null
}

function CoopPeerInputBridge({ isHost, peerEventRef, onCycle, onActivate }) {
  const lastEventKey = useRef('')

  useFrame(() => {
    if (!isHost || !peerEventRef?.current) return
    const evt = peerEventRef.current
    const type = evt.event?.type
    if (type !== 'powerup_cycle' && type !== 'powerup_activate') return
    const key = `${evt.slot ?? 0}:${evt.ts ?? 0}:${type}`
    if (key === lastEventKey.current) return
    lastEventKey.current = key
    if (type === 'powerup_cycle') onCycle?.()
    if (type === 'powerup_activate') onActivate?.()
  })

  return null
}

export const CoopScene = memo(function CoopScene({
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
  slot,
  isHost,
  peerState,
  peerStateRef,
  peerBoardsRef,
  peerFlyAimRef,
  peerEventRef,
  onWin,
  onFail,
  onHeart,
  onSend,
  onJumpRequest,
  onPeerPowerUpCycle,
  onPeerPowerUpActivate,
  getSnapshot,
  tiltRef = null,
  canvasJump = true,
  jumpTriggerRef = null,
}) {
  const ballRef = useRef(null)
  const networkBallRef = useRef(null)
  const flyTargetRef = useRef(null)
  const flyAimOutRef = useRef(null)
  const boardRefs = useRef([])
  const boardRotRefs = useRef([])

  const boards = data.boards ?? []
  if (boardRefs.current.length !== boards.length) {
    boardRefs.current = boards.map(() => ({ current: null }))
    boardRotRefs.current = boards.map(() => ({ current: [0, 0, 0, 1] }))
  }

  const localBoardRef = boardRefs.current[slot]
  const ballSpawn = boardSpawnPosition(data.ball.spawnBoard)

  useEffect(() => {
    registerActivateCtx?.({ ballRef, boardRefs, data })
  }, [registerActivateCtx, data, runId])

  const wrapGetSnapshot = useCallback(
    (physics) => {
      const peerBoards = { ...peerBoardsRef?.current }
      if (isHost && physics.board) peerBoards[slot] = physics.board
      const flyAim = flyAimOutRef.current
      return getSnapshot({
        ...physics,
        peerBoards,
        ...(flyActive ? { flyAim: flyAim ?? null } : {}),
      })
    },
    [getSnapshot, isHost, slot, peerBoardsRef, flyActive]
  )

  return (
    <>
      <SceneLighting />
      <CoopCameraRig slot={slot} boards={boards} />
      <PeerNetworkBridge
        peerState={peerState}
        peerStateRef={peerStateRef}
        isHost={isHost}
        peerBoardsRef={peerBoardsRef}
        networkBallRef={networkBallRef}
        boardRotRefs={boardRotRefs}
        runId={runId}
      />
      <CoopFlyAim
        flyActive={flyActive}
        status={status}
        data={data}
        slot={slot}
        isHost={isHost}
        boardRefs={boardRefs}
        ballRef={ballRef}
        networkBallRef={networkBallRef}
        peerFlyAimRef={peerFlyAimRef}
        flyTargetRef={flyTargetRef}
        flyAimOutRef={flyAimOutRef}
      />
      {isHost && (
        <BallFlyController
          ballRef={ballRef}
          flyActive={flyActive}
          status={status}
          targetWorldRef={flyTargetRef}
        />
      )}
      <CoopPeerInputBridge
        isHost={isHost}
        peerEventRef={peerEventRef}
        onCycle={onPeerPowerUpCycle}
        onActivate={onPeerPowerUpActivate}
      />

      <Physics key={runId} gravity={PHYSICS.gravity} paused={status === 'paused'}>
        <BallJump
          ballRef={ballRef}
          status={status}
          isHost={isHost}
          onJumpRequest={onJumpRequest}
          peerEventRef={isHost ? peerEventRef : undefined}
          canvasJump={canvasJump}
          jumpTriggerRef={jumpTriggerRef}
        />
        {processPowerUpPhysics && <PowerUpPhysicsBridge processPowerUpPhysics={processPowerUpPhysics} />}
        {boards.map((board, i) => {
          const isLocal = i === slot
          const idx = board.boardIndex ?? i
          return (
            <Board
              key={`board-${i}-${runId}`}
              data={board}
              bodyRef={boardRefs.current[i]}
              status={status}
              heartTaken={heartTaken}
              patchActive={patchActive}
              ghostActive={ghostActive}
              position={board.position}
              control={isLocal ? 'local' : 'network'}
              rotationRef={isLocal ? null : boardRotRefs.current[i]}
              tiltRef={isLocal ? tiltRef : null}
              boardIndex={idx}
              worldPickup={worldPickup}
              waver={waver}
              goalOpen={goalOpen}
            />
          )
        })}
        {isHost ? (
          <Ball
            bodyRef={ballRef}
            status={status}
            spawn={ballSpawn}
            level={data.level}
            runId={runId}
            tint="primary"
            flyActive={flyActive}
            radiusScale={shrinkScale}
          />
        ) : (
          <NetworkBall
            stateRef={networkBallRef}
            status={status}
            spawn={ballSpawn}
            level={data.level}
            runId={runId}
            tint="primary"
            radiusScale={shrinkScale}
            flyActive={flyActive}
            flyOverrideRef={flyAimOutRef}
          />
        )}
        {isHost && (
          <CoopDetector
            key={runId}
            data={data}
            boardRefs={boardRefs}
            ballRef={ballRef}
            status={status}
            heartTaken={heartTaken}
            patchActive={patchActive}
            ghostActive={ghostActive}
            goalOpen={goalOpen}
            onWin={onWin}
            onFail={onFail}
            onHeart={onHeart}
            runId={runId}
          />
        )}
        {isHost && onWorldCollect && (
          <PowerUpCollector
            data={data}
            ballRef={ballRef}
            boardRefs={boardRefs}
            worldPickup={worldPickup}
            status={status}
            runId={runId}
            onCollect={onWorldCollect}
          />
        )}
        {isHost && onWaverCollect && (
          <WaverCollector
            data={data}
            ballRef={ballRef}
            boardRefs={boardRefs}
            waver={waver}
            status={status}
            onCollect={onWaverCollect}
          />
        )}
        {onSend && getSnapshot && (
          <StateBroadcaster
            boardRef={localBoardRef}
            ballRef={ballRef}
            getSnapshot={wrapGetSnapshot}
            onSend={onSend}
            active={status !== 'ready'}
            includeBall={isHost}
            forceSendOnMeta
          />
        )}
      </Physics>

      <ContactShadows
        position={[0, -0.65, 0]}
        opacity={0.35}
        scale={data.totalExtent * 1.6}
        blur={2.5}
        far={12}
      />
    </>
  )
})
