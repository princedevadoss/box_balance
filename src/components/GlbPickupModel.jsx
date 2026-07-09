import { useMemo } from 'react'
import { Center, useGLTF } from '@react-three/drei'
import * as THREE from 'three'

export function GlbPickupModel({ src, targetSize = 1.4 }) {
  const { scene } = useGLTF(src)

  const { model, scale } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene)
    const size = new THREE.Vector3()
    box.getSize(size)
    const maxDim = Math.max(size.x, size.y, size.z, 0.001)
    const fitScale = targetSize / maxDim

    const clone = scene.clone(true)
    clone.traverse((child) => {
      if (!child.isMesh) return
      child.castShadow = true
      child.receiveShadow = true
      const materials = Array.isArray(child.material) ? child.material : [child.material]
      for (const mat of materials) {
        if (!mat) continue
        if (mat.map) mat.map.colorSpace = THREE.SRGBColorSpace
        if (mat.emissiveMap) mat.emissiveMap.colorSpace = THREE.SRGBColorSpace
      }
    })

    return { model: clone, scale: fitScale }
  }, [scene, targetSize])

  return (
    <Center>
      <primitive object={model} scale={scale} />
    </Center>
  )
}

export function preloadGlb(src) {
  if (src) useGLTF.preload(src)
}
