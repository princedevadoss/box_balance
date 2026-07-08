import { memo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Environment, ContactShadows } from '@react-three/drei'
import { Physics } from '@react-three/rapier'
import * as THREE from 'three'
import { CAMERA, PHYSICS } from '../config'
import { boardSpawnPosition } from '../level'
import { Board } from './Board'
import { Ball } from './Ball'
import { CoopDetector } from './CoopDetector'
import { StateBroadcaster } from './StateBroadcaster'

function CoopCameraRig({ extent }) {
  const { camera } = useThree()
  const target = useRef(new THREE.Vector3())
  useFrame(() => {
    target.current.set(0, extent * 1.05 + 5, extent * 0.75 + 4)
    camera.position.lerp(target.current, CAMERA.ease)
    camera.lookAt(0, 0, 0)
  })
  return null
}

function PeerNetworkBridge({ peerStateRef, isHost, peerRotRef, networkBallRef }) {
  useFrame(() => {
    const peer = peerStateRef?.current
    if (!peer) return
    if (peer.board) peerRotRef.current = peer.board
    if (!isHost && peer.ball) {
      networkBallRef.current = {
        pos: peer.ball,
        vel: peer.ballVel,
        angVel: peer.ballAngVel,
        rot: peer.ballRot,
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
  role,
  peerStateRef,
  onWin,
  onFail,
  onHeart,
  onSend,
  getSnapshot,
}) {
  const board1Ref = useRef(null)
  const board2Ref = useRef(null)
  const ballRef = useRef(null)
  const peerRot = useRef([0, 0, 0, 1])
  const networkBallRef = useRef(null)

  const isHost = role === 'host'
  const localBoardRef = isHost ? board1Ref : board2Ref
  const ballSpawn = boardSpawnPosition(data.ball.spawnBoard)

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[8, 16, 8]} intensity={1.4} castShadow shadow-mapSize={[2048, 2048]} />
      <Environment preset="city" />
      <CoopCameraRig extent={data.totalExtent} />
      <PeerNetworkBridge
        peerStateRef={peerStateRef}
        isHost={isHost}
        peerRotRef={peerRot}
        networkBallRef={networkBallRef}
      />

      <Physics key={runId} gravity={PHYSICS.gravity} paused={status === 'paused'}>
        <Board
          data={data.board1}
          bodyRef={board1Ref}
          status={status}
          heartTaken={heartTaken}
          position={data.board1.position}
          control={isHost ? 'local' : 'network'}
          rotationRef={isHost ? null : peerRot}
        />
        <Board
          data={data.board2}
          bodyRef={board2Ref}
          status={status}
          heartTaken={heartTaken}
          position={data.board2.position}
          control={isHost ? 'network' : 'local'}
          rotationRef={isHost ? peerRot : null}
        />
        <Ball
          bodyRef={ballRef}
          status={status}
          spawn={ballSpawn}
          level={data.level}
          tint="primary"
          networkBallRef={isHost ? null : networkBallRef}
        />
        {isHost && (
          <CoopDetector
            key={runId}
            data={data}
            board1Ref={board1Ref}
            board2Ref={board2Ref}
            ballRef={ballRef}
            status={status}
            heartTaken={heartTaken}
            onWin={onWin}
            onFail={onFail}
            onHeart={onHeart}
            runId={runId}
          />
        )}
        {onSend && getSnapshot && (
          <StateBroadcaster
            boardRef={localBoardRef}
            ballRef={ballRef}
            getSnapshot={getSnapshot}
            onSend={onSend}
            active={status !== 'ready'}
            includeBall={isHost}
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
