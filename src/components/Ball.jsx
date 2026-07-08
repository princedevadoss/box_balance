import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { BALL, COLORS } from '../config'
import { useNizhenTexture } from '../textures'
import { setRollSpeed, stopRoll } from '../audio'

const _targetPos = new THREE.Vector3()
const _targetQuat = new THREE.Quaternion()
const _smoothPos = new THREE.Vector3()
const _smoothQuat = new THREE.Quaternion()
const _spinAxis = new THREE.Vector3()
const _spinDelta = new THREE.Quaternion()

export function Ball({ bodyRef, status, spawn, level = 1, tint = 'primary', networkBallRef = null }) {
  const texture = useNizhenTexture(level)
  const frozen = status === 'countdown'
  const driven = networkBallRef != null
  const [x, y, z] = spawn
  const smoothReady = useRef(false)

  useEffect(() => {
    const b = bodyRef.current
    if (b) b.setGravityScale(frozen || driven ? 0 : 1, true)
  }, [frozen, driven, bodyRef])

  useEffect(() => {
    smoothReady.current = false
  }, [spawn, level])

  useFrame((_, delta) => {
    const b = bodyRef.current
    if (!b) return

    const networkBall = networkBallRef?.current
    if (networkBall?.pos) {
      const [px, py, pz] = networkBall.pos
      _targetPos.set(px, py, pz)

      const vel = networkBall.vel
      if (vel && status === 'playing' && !frozen) {
        _targetPos.x += vel[0] * delta
        _targetPos.y += vel[1] * delta
        _targetPos.z += vel[2] * delta
      }

      if (!smoothReady.current) {
        _smoothPos.copy(_targetPos)
        if (networkBall.rot) {
          _smoothQuat.set(
            networkBall.rot[0],
            networkBall.rot[1],
            networkBall.rot[2],
            networkBall.rot[3]
          )
        }
        smoothReady.current = true
      } else {
        const blend = 1 - Math.pow(0.0008, delta)
        _smoothPos.lerp(_targetPos, blend)
      }

      b.setTranslation({ x: _smoothPos.x, y: _smoothPos.y, z: _smoothPos.z }, true)

      if (networkBall.rot) {
        _targetQuat.set(
          networkBall.rot[0],
          networkBall.rot[1],
          networkBall.rot[2],
          networkBall.rot[3]
        )
        const ang = networkBall.angVel
        if (ang && status === 'playing' && !frozen) {
          const speed = Math.hypot(ang[0], ang[1], ang[2])
          if (speed > 0.001) {
            _spinAxis.set(ang[0], ang[1], ang[2]).normalize()
            _spinDelta.setFromAxisAngle(_spinAxis, speed * delta)
            _targetQuat.multiply(_spinDelta)
          }
        }
        const rotBlend = 1 - Math.pow(0.0008, delta)
        _smoothQuat.slerp(_targetQuat, rotBlend)
        b.setRotation({ x: _smoothQuat.x, y: _smoothQuat.y, z: _smoothQuat.z, w: _smoothQuat.w }, true)
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
