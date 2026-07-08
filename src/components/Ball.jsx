import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { BALL, COLORS } from '../config'
import { useNizhenTexture } from '../textures'
import { setRollSpeed, stopRoll } from '../audio'

const _targetQuat = new THREE.Quaternion()
const _spinAxis = new THREE.Vector3()
const _spinDelta = new THREE.Quaternion()
const MAX_EXTRAPOLATE_S = 0.12

function extrapolateSeconds(receivedAt) {
  if (receivedAt == null) return 0
  return Math.min(Math.max(0, (performance.now() - receivedAt) / 1000), MAX_EXTRAPOLATE_S)
}

export function Ball({ bodyRef, status, spawn, level = 1, runId = 0, tint = 'primary', networkBallRef = null }) {
  const texture = useNizhenTexture(level)
  const frozen = status === 'countdown'
  const driven = networkBallRef != null
  const [x, y, z] = spawn
  const lastRunId = useRef(runId)
  const lastNetworkRunId = useRef(null)

  useEffect(() => {
    const b = bodyRef.current
    if (b) b.setGravityScale(frozen || driven ? 0 : 1, true)
  }, [frozen, driven, bodyRef])

  useEffect(() => {
    lastNetworkRunId.current = null
  }, [spawn, level, status, runId])

  useEffect(() => {
    if (lastRunId.current === runId) return
    lastRunId.current = runId
    const b = bodyRef.current
    if (!b) return
    b.setTranslation({ x, y, z }, true)
    b.setLinvel({ x: 0, y: 0, z: 0 }, true)
    b.setAngvel({ x: 0, y: 0, z: 0 }, true)
    if (networkBallRef) networkBallRef.current = null
  }, [runId, x, y, z, bodyRef, networkBallRef])

  useFrame(() => {
    const b = bodyRef.current
    if (!b) return

    const networkBall = networkBallRef?.current
    if (driven && !networkBall?.pos) {
      b.setTranslation({ x, y, z }, true)
      b.setLinvel({ x: 0, y: 0, z: 0 }, true)
      b.setAngvel({ x: 0, y: 0, z: 0 }, true)
      stopRoll()
      return
    }

    if (networkBall?.pos) {
      const networkRunId = networkBall.runId ?? runId
      if (lastNetworkRunId.current != null && networkRunId !== lastNetworkRunId.current) {
        lastNetworkRunId.current = networkRunId
      } else if (lastNetworkRunId.current == null) {
        lastNetworkRunId.current = networkRunId
      }

      const [px, py, pz] = networkBall.pos
      const vel = networkBall.vel
      const extrapolate = status === 'playing' && !frozen
      const elapsed = extrapolate ? extrapolateSeconds(networkBall.receivedAt) : 0

      const tx = vel && extrapolate ? px + vel[0] * elapsed : px
      const ty = vel && extrapolate ? py + vel[1] * elapsed : py
      const tz = vel && extrapolate ? pz + vel[2] * elapsed : pz

      b.setTranslation({ x: tx, y: ty, z: tz }, true)

      if (networkBall.rot) {
        _targetQuat.set(
          networkBall.rot[0],
          networkBall.rot[1],
          networkBall.rot[2],
          networkBall.rot[3]
        )
        const ang = networkBall.angVel
        if (ang && extrapolate) {
          const speed = Math.hypot(ang[0], ang[1], ang[2])
          if (speed > 0.001) {
            _spinAxis.set(ang[0], ang[1], ang[2]).normalize()
            _spinDelta.setFromAxisAngle(_spinAxis, speed * elapsed)
            _targetQuat.multiply(_spinDelta)
          }
        }
        b.setRotation(
          { x: _targetQuat.x, y: _targetQuat.y, z: _targetQuat.z, w: _targetQuat.w },
          true
        )
      }

      if (frozen || status !== 'playing') {
        b.setLinvel({ x: 0, y: 0, z: 0 }, true)
        b.setAngvel({ x: 0, y: 0, z: 0 }, true)
        stopRoll()
        return
      }

      if (vel) b.setLinvel({ x: vel[0], y: vel[1], z: vel[2] }, true)
      if (networkBall.angVel) {
        const ang = networkBall.angVel
        b.setAngvel({ x: ang[0], y: ang[1], z: ang[2] }, true)
      }
      setRollSpeed(vel ? Math.hypot(vel[0], vel[1], vel[2]) : 0)
      return
    }

    if (frozen) {
      b.setLinvel({ x: 0, y: 0, z: 0 }, true)
      b.setAngvel({ x: 0, y: 0, z: 0 }, true)
      stopRoll()
      return
    }
    if (status === 'playing') {
      const v = b.linvel()
      setRollSpeed(Math.hypot(v.x, v.y, v.z))
    } else {
      stopRoll()
    }
  })

  const color = tint === 'secondary' ? COLORS.ball2 : undefined
  const emissive = tint === 'secondary' ? COLORS.ball2Emissive : undefined

  return (
    <RigidBody
      ref={bodyRef}
      type={driven ? 'kinematicPosition' : 'dynamic'}
      colliders="ball"
      position={[x, y, z]}
      gravityScale={frozen || driven ? 0 : 1}
      friction={BALL.friction}
      restitution={BALL.restitution}
      linearDamping={BALL.linearDamping}
      angularDamping={BALL.angularDamping}
      canSleep={false}
    >
      <mesh castShadow key={`ball-mesh-${level}`}>
        <sphereGeometry args={[BALL.radius, 48, 48]} />
        <meshStandardMaterial
          key={`ball-mat-${level}`}
          map={tint === 'primary' ? texture : undefined}
          color={tint === 'secondary' ? color : '#ffffff'}
          emissive={emissive}
          emissiveIntensity={tint === 'secondary' ? 0.15 : 0}
          metalness={BALL.metalness}
          roughness={BALL.roughness}
          envMapIntensity={0.25}
        />
      </mesh>
    </RigidBody>
  )
}
