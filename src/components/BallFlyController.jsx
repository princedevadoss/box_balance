import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { BALL } from '../config'

const _plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
const _ray = new THREE.Raycaster()
const _ndc = new THREE.Vector2()
const _hit = new THREE.Vector3()

/** While fly is active, ball follows the mouse over the board plane. */
export function BallFlyController({ ballRef, boardRef, flyActive, status }) {
  const { camera, pointer } = useThree()
  const released = useRef(false)

  useEffect(() => {
    released.current = false
  }, [flyActive])

  const wasFlying = useRef(false)

  useFrame(() => {
    const ball = ballRef.current
    if (!ball) return

    if (!flyActive || status !== 'playing' || released.current) {
      if (wasFlying.current) {
        wasFlying.current = false
        ball.setGravityScale(1, true)
      }
      return
    }

    wasFlying.current = true
    const board = boardRef?.current

    _ndc.set(pointer.x, pointer.y)
    _ray.setFromCamera(_ndc, camera)
    const y = board ? board.translation().y + 0.5 : 0.5
    _plane.constant = -y
    if (!_ray.ray.intersectPlane(_plane, _hit)) return

    ball.setTranslation({ x: _hit.x, y: y + BALL.radius + 0.1, z: _hit.z }, true)
    ball.setLinvel({ x: 0, y: 0, z: 0 }, true)
    ball.setAngvel({ x: 0, y: 0, z: 0 }, true)
    ball.setGravityScale(0, true)
  })

  return null
}
