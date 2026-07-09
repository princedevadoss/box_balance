import { useBeforePhysicsStep } from '@react-three/rapier'

/** Drains queued power-up physics actions before the Rapier step. */
export function PowerUpPhysicsBridge({ processPowerUpPhysics }) {
  useBeforePhysicsStep(() => {
    processPowerUpPhysics?.()
  })
  return null
}
