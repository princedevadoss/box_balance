import * as THREE from 'three'
import { BALL } from './config'
import { pickActiveBoardIndex } from './powerUps'

const _ndc = new THREE.Vector2()
const _ray = new THREE.Raycaster()
const _plane = new THREE.Plane()
const _quat = new THREE.Quaternion()
const _invQuat = new THREE.Quaternion()
const _normal = new THREE.Vector3()
const _origin = new THREE.Vector3()
const _hit = new THREE.Vector3()
const _local = new THREE.Vector3()
const _world = new THREE.Vector3()
const _bodyPos = new THREE.Vector3()

/** Board index the ball is currently over (co-op). */
export function ballBoardIndex(data, ballX) {
  if (ballX == null) return 0
  return pickActiveBoardIndex(data, ballX)
}

/** Raycast pointer onto the tilted board surface; returns world [x,y,z] for ball center. */
export function computeFlyAimWorld(camera, pointer, boardBody, boardData) {
  if (!camera || !boardBody || !boardData) return null

  _ndc.set(pointer.x, pointer.y)
  _ray.setFromCamera(_ndc, camera)

  const t = boardBody.translation()
  const r = boardBody.rotation()
  _quat.set(r.x, r.y, r.z, r.w)
  _normal.set(0, 1, 0).applyQuaternion(_quat)

  const surfaceY = boardData.thickness / 2 + 0.1
  _bodyPos.set(t.x, t.y, t.z)
  _origin.set(0, surfaceY, 0).applyQuaternion(_quat).add(_bodyPos)

  _plane.setFromNormalAndCoplanarPoint(_normal, _origin)
  if (!_ray.ray.intersectPlane(_plane, _hit)) return null

  _invQuat.copy(_quat).invert()
  _local.copy(_hit).sub(_bodyPos).applyQuaternion(_invQuat)

  const { gridN, cell } = boardData
  const half = (gridN * cell) / 2 - cell * 0.4
  _local.x = THREE.MathUtils.clamp(_local.x, -half, half)
  _local.z = THREE.MathUtils.clamp(_local.z, -half, half)

  _world.set(_local.x, surfaceY, _local.z).applyQuaternion(_quat).add(_bodyPos)
  return [_world.x, _world.y + BALL.radius + 0.1, _world.z]
}
