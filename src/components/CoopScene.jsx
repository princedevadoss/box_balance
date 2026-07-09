import { memo, useCallback, useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { ContactShadows } from '@react-three/drei'
import { Physics } from '@react-three/rapier'
import * as THREE from 'three'
import { CAMERA, PHYSICS } from '../config'
import { boardSpawnPosition } from '../level'
import { coopCameraLayout } from '../coopCamera'
import { Board } from './Board'
import { Ball } from './Ball'
import { CoopDetector } from './CoopDetector'
import { StateBroadcaster } from './StateBroadcaster'
import { SceneLighting } from './SceneLighting'
import { BallJump } from './BallJump'
import { BallFlyController } from './BallFlyController'
import { PowerUpCollector } from './PowerUpCollector'
import { PowerUpPhysicsBridge } from './PowerUpPhysicsBridge'

function CoopCameraRig({ slot, boards }) {
  const { camera } = useThree()
  const targetPos = useRef(new THREE.Vector3())
  const lookAt = useRef(new THREE.Vector3())
  const layout = useMemo(() => coopCameraLayout(slot, boards), [slot, boards])

  useFrame(() => {
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
  registerActivateCtx,
  processPowerUpPhysics,
  slot,
  isHost,
  peerState,
  peerStateRef,
  peerBoardsRef,
  peerEventRef,
  onWin,
  onFail,
  onHeart,
  onSend,
  onJumpRequest,
  getSnapshot,
}) {
  const ballRef = useRef(null)
  const networkBallRef = useRef(null)
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
      return getSnapshot({ ...physics, peerBoards })
    },
    [getSnapshot, isHost, slot, peerBoardsRef]
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
      {isHost && (
        <BallFlyController ballRef={ballRef} boardRef={boardRefs.current[slot]} flyActive={flyActive} status={status} />
      )}

      <Physics key={runId} gravity={PHYSICS.gravity} paused={status === 'paused'}>
        <BallJump
          ballRef={ballRef}
          status={status}
          isHost={isHost}
          onJumpRequest={onJumpRequest}
          peerEventRef={peerEventRef}
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
              boardIndex={idx}
              worldPickup={worldPickup}
            />
          )
        })}
        <Ball
          bodyRef={ballRef}
          status={status}
          spawn={ballSpawn}
          level={data.level}
          runId={runId}
          tint="primary"
          flyActive={isHost ? flyActive : false}
          radiusScale={shrinkScale}
          networkBallRef={isHost ? null : networkBallRef}
        />
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
