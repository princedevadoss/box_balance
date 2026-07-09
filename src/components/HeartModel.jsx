import { GlbPickupModel, preloadGlb } from './GlbPickupModel'

const HEART_GLB = '/models/heart.glb'

export function HeartModel(props) {
  return <GlbPickupModel src={HEART_GLB} {...props} />
}

preloadGlb(HEART_GLB)
