import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { ContactShadows } from '@react-three/drei'
import { Physics } from '@react-three/rapier'
import * as THREE from 'three'
import { CAMERA, PHYSICS, BALL } from '../config'
import { cellCenter } from '../level'
import { Board } from './Board'
import { Ball } from './Ball'
import { Detector } from './Detector'
import { SceneLighting } from './SceneLighting'
import { BallJump } from './BallJump'

import { StateBroadcaster } from './StateBroadcaster'
import { PatchPickup } from './PatchPickup'
import { PatchCollector } from './PatchCollector'
import { boardForPickup, patchPickupWorldPosition } from '../patchPowerUp'

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
  patchActive = false,
  patchPickup = null,
  onPatchCollect,
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
  const patchPos =
    patchPickup != null
      ? patchPickupWorldPosition(boardForPickup(data, patchPickup), patchPickup)
      : null

  return (
    <>
      <SceneLighting />
      <CameraRig extent={extent} />
      <BallJump ballRef={ballRef} status={status} />

      <Physics key={runId} gravity={PHYSICS.gravity} paused={status === 'paused'}>
        <Board
          data={data}
          bodyRef={boardRef}
          status={status}
          heartTaken={heartTaken}
          patchActive={patchActive}
        />
        <Ball bodyRef={ballRef} status={status} spawn={spawn} level={data.level} runId={runId} />
        {patchPos && <PatchPickup position={patchPos} />}
        <Detector
          data={data}
          boardRef={boardRef}
          ballRef={ballRef}
          status={status}
          heartTaken={heartTaken}
          patchActive={patchActive}
          onWin={onWin}
          onFail={onFail}
          onHeart={onHeart}
        />
        {onPatchCollect && (
          <PatchCollector
            data={data}
            ballRef={ballRef}
            patchPickup={patchPickup}
            status={status}
            runId={runId}
            onCollect={onPatchCollect}
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
