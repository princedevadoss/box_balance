import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Environment, ContactShadows } from '@react-three/drei'
import { Physics } from '@react-three/rapier'
import * as THREE from 'three'
import { CAMERA, PHYSICS, BALL } from '../config'
import { cellCenter } from '../level'
import { Board } from './Board'
import { Ball } from './Ball'
import { Detector } from './Detector'

import { StateBroadcaster } from './StateBroadcaster'

// Eases the camera to frame the current board size.
function CameraRig({ extent }) {
  const { camera } = useThree()
  const target = useRef(new THREE.Vector3())
  useFrame(() => {
    target.current.set(0, extent * 1.15 + 4, extent * 0.95 + 3)
    camera.position.lerp(target.current, CAMERA.ease)
    camera.lookAt(0, 0, 0)
  })
  return null
}

export function Scene({
  data,
  status,
  runId,
  heartTaken,
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
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[8, 16, 8]} intensity={1.4} castShadow shadow-mapSize={[2048, 2048]} />
      <Environment preset="city" />
      <CameraRig extent={extent} />

      <Physics key={runId} gravity={PHYSICS.gravity} paused={status === 'paused'}>
        <Board data={data} bodyRef={boardRef} status={status} heartTaken={heartTaken} />
        <Ball bodyRef={ballRef} status={status} spawn={spawn} level={data.level} />
        <Detector
          data={data}
          boardRef={boardRef}
          ballRef={ballRef}
          status={status}
          heartTaken={heartTaken}
          onWin={onWin}
          onFail={onFail}
          onHeart={onHeart}
        />
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
