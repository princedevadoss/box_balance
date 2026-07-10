import { Suspense, useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useFBX } from '@react-three/drei'
import * as THREE from 'three'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { WAVER } from '../config'
import { waverFacingYaw, waverLocalPosition, waverProgress } from '../waver'

function hardenMaterials(root) {
  root.traverse((child) => {
    if (!child.isMesh) return
    child.castShadow = true
    child.receiveShadow = true
    const materials = Array.isArray(child.material) ? child.material : [child.material]
    for (const mat of materials) {
      if (!mat) continue
      if (mat.map && !mat.map.image) mat.map = null
      if (mat.normalMap && !mat.normalMap.image) mat.normalMap = null
      if (mat.emissiveMap && !mat.emissiveMap.image) mat.emissiveMap = null
      if (mat.specularMap && !mat.specularMap.image) mat.specularMap = null
      if (mat.map) mat.map.colorSpace = THREE.SRGBColorSpace
      if (mat.emissiveMap) mat.emissiveMap.colorSpace = THREE.SRGBColorSpace
      mat.needsUpdate = true
    }
  })
}

function WaverModel({ targetHeight }) {
  const fbx = useFBX(WAVER.model)
  const mixerRef = useRef(null)

  const { model, scale, yOffset } = useMemo(() => {
    const clone = cloneSkinned(fbx)
    hardenMaterials(clone)

    const box = new THREE.Box3().setFromObject(clone)
    const size = new THREE.Vector3()
    box.getSize(size)
    const fit = targetHeight / Math.max(size.y, 0.001)
    const yOffset = -box.min.y * fit
    return { model: clone, scale: fit, yOffset }
  }, [fbx, targetHeight])

  useEffect(() => {
    const clips = fbx.animations
    if (!clips?.length) return
    const mixer = new THREE.AnimationMixer(model)
    mixerRef.current = mixer
    const action = mixer.clipAction(clips[0])
    action.reset().play()
    return () => {
      mixer.stopAllAction()
      mixerRef.current = null
    }
  }, [fbx, model])

  useFrame((_, dt) => {
    mixerRef.current?.update(dt)
  })

  return (
    <group scale={scale} position={[0, yOffset, 0]}>
      <primitive object={model} />
    </group>
  )
}

useFBX.preload(WAVER.model)

/** Character walking across board tiles (parent = board rigid body). */
export function WaverCharacter({ board, waver }) {
  const groupRef = useRef(null)
  const waverRef = useRef(waver)
  const timingRef = useRef(null)
  waverRef.current = waver

  useFrame(() => {
    const g = groupRef.current
    const w = waverRef.current
    if (!g || !w || !board) return
    const progress = waverProgress(w, performance.now(), timingRef)
    const [x, y, z] = waverLocalPosition(board, w, progress)
    g.position.set(x, y, z)
    g.rotation.y = waverFacingYaw(w)
  })

  if (!waver || !board) return null

  return (
    <group ref={groupRef} rotation={[0, waverFacingYaw(waver), 0]}>
      <Suspense fallback={null}>
        <WaverModel targetHeight={WAVER.modelHeight} />
      </Suspense>
    </group>
  )
}
