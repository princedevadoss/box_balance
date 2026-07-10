import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { CAMERA } from '../config'
import { cameraFitForExtent, readViewport } from '../viewport'

/** Frames the board to fit the current viewport (portrait + mobile aware). */
export function AdaptiveCameraRig({ extent, lookAt = [0, 0, 0] }) {
  const { camera, size } = useThree()
  const target = useRef({ x: lookAt[0], y: lookAt[1], z: lookAt[2] })
  const pos = useRef({ x: 0, y: 18, z: 16 })

  useFrame(() => {
    const aspect = size.width / Math.max(size.height, 1)
    const { portrait } = readViewport()
    const fit = cameraFitForExtent(extent, aspect, portrait)

    target.current.x += (lookAt[0] - target.current.x) * CAMERA.ease
    target.current.y += (lookAt[1] - target.current.y) * CAMERA.ease
    target.current.z += (lookAt[2] - target.current.z) * CAMERA.ease

    pos.current.y += (fit.y - pos.current.y) * CAMERA.ease
    pos.current.z += (fit.z - pos.current.z) * CAMERA.ease
    pos.current.x += (lookAt[0] - pos.current.x) * CAMERA.ease

    camera.position.set(pos.current.x, pos.current.y, pos.current.z)
    camera.lookAt(target.current.x, target.current.y, target.current.z)
  })

  return null
}
