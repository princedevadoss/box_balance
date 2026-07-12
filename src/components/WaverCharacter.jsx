import { Suspense, useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useFBX } from '@react-three/drei'
import * as THREE from 'three'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { WAVER } from '../config'
import { waverFacingYaw, waverLocalPosition, waverProgress } from '../waver'

let preparedCache = null

function isNativeShell() {
  return typeof window !== 'undefined' && !!window.__NIZHEN_NATIVE__
}

function waverModelUrl() {
  const path = WAVER.model
  if (typeof window === 'undefined') return path
  try {
    return new URL(path, window.location.origin).href
  } catch {
    return path
  }
}

function hardenMaterials(root) {
  root.traverse((child) => {
    if (!child.isMesh) return
    child.castShadow = true
    child.receiveShadow = true
    const materials = Array.isArray(child.material) ? child.material : [child.material]
    for (const mat of materials) {
      if (!mat) continue
      if (mat.map) {
        try {
          mat.map.colorSpace = THREE.SRGBColorSpace
          mat.map.flipY = false
          mat.map.needsUpdate = true
        } catch {
          // keep map
        }
      }
      if (mat.emissiveMap) {
        try {
          mat.emissiveMap.colorSpace = THREE.SRGBColorSpace
          mat.emissiveMap.needsUpdate = true
        } catch {
          // ignore
        }
      }
      if (!mat.map && mat.color) mat.color.set('#d4a574')
      if ('metalness' in mat) mat.metalness = Math.min(mat.metalness ?? 0, 0.15)
      if ('roughness' in mat) mat.roughness = Math.max(mat.roughness ?? 0.8, 0.55)
      mat.side = THREE.FrontSide
      mat.needsUpdate = true
    }
  })
}

function prepareWaverModel(fbx, targetHeight) {
  if (
    preparedCache &&
    preparedCache.fbx === fbx &&
    preparedCache.targetHeight === targetHeight
  ) {
    return preparedCache
  }

  const clone = cloneSkinned(fbx)
  hardenMaterials(clone)

  const box = new THREE.Box3().setFromObject(clone)
  const size = new THREE.Vector3()
  box.getSize(size)
  const fit = targetHeight / Math.max(size.y, 0.001)
  const yOffset = -box.min.y * fit

  preparedCache = { fbx, model: clone, scale: fit, yOffset, targetHeight }
  return preparedCache
}

/** Lightweight character for React Native WebView (skips ~30MB FBX hitch). */
function WaverFallback({ targetHeight }) {
  const groupRef = useRef(null)
  const bodyH = targetHeight * 0.55
  const headR = targetHeight * 0.12
  const legH = targetHeight * 0.28

  useFrame(({ clock }) => {
    const g = groupRef.current
    if (!g) return
    const t = clock.elapsedTime
    // Subtle walk bob so it still feels alive without FBX animation.
    g.position.y = Math.abs(Math.sin(t * 6)) * 0.04
    g.rotation.y = Math.sin(t * 3) * 0.08
  })

  return (
    <group ref={groupRef}>
      <mesh position={[0, legH + bodyH * 0.5, 0]} castShadow>
        <capsuleGeometry args={[targetHeight * 0.13, bodyH * 0.5, 4, 8]} />
        <meshStandardMaterial color="#5b8def" roughness={0.7} metalness={0.05} />
      </mesh>
      <mesh position={[0, legH + bodyH + headR, 0]} castShadow>
        <sphereGeometry args={[headR, 10, 10]} />
        <meshStandardMaterial color="#e8c4a8" roughness={0.65} metalness={0.05} />
      </mesh>
      <mesh position={[-targetHeight * 0.07, legH * 0.5, 0]} castShadow>
        <capsuleGeometry args={[targetHeight * 0.05, legH * 0.55, 3, 6]} />
        <meshStandardMaterial color="#334155" roughness={0.8} />
      </mesh>
      <mesh position={[targetHeight * 0.07, legH * 0.5, 0]} castShadow>
        <capsuleGeometry args={[targetHeight * 0.05, legH * 0.55, 3, 6]} />
        <meshStandardMaterial color="#334155" roughness={0.8} />
      </mesh>
    </group>
  )
}

function WaverModel({ targetHeight, visible = true }) {
  const url = useMemo(() => waverModelUrl(), [])
  const fbx = useFBX(url)
  const mixerRef = useRef(null)
  const groupRef = useRef(null)

  const prepared = useMemo(
    () => prepareWaverModel(fbx, targetHeight),
    [fbx, targetHeight]
  )

  useEffect(() => {
    const clips = fbx.animations
    if (!clips?.length) return
    const mixer = new THREE.AnimationMixer(prepared.model)
    mixerRef.current = mixer
    const action = mixer.clipAction(clips[0])
    action.reset().play()
    return () => {
      mixer.stopAllAction()
      mixerRef.current = null
    }
  }, [fbx, prepared.model])

  useFrame((_, dt) => {
    if (!visible) return
    mixerRef.current?.update(dt)
  })

  useEffect(() => {
    const g = groupRef.current
    if (g) g.visible = visible
  }, [visible])

  return (
    <group ref={groupRef} scale={prepared.scale} position={[0, prepared.yOffset, 0]} visible={visible}>
      <primitive object={prepared.model} />
    </group>
  )
}

/** Desktop only — never preload the 30MB FBX inside the RN WebView. */
export function WaverPrewarm() {
  if (isNativeShell()) return null
  return (
    <Suspense fallback={null}>
      <WaverPrewarmInner />
    </Suspense>
  )
}

function WaverPrewarmInner() {
  const url = useMemo(() => waverModelUrl(), [])
  const fbx = useFBX(url)
  useMemo(() => prepareWaverModel(fbx, WAVER.modelHeight), [fbx])
  return null
}

function WaverModelSafe({ targetHeight, visible }) {
  // RN app: never touch FBX (main cause of freezes on level start / spawn).
  if (isNativeShell()) {
    return <WaverFallback targetHeight={targetHeight} />
  }

  return (
    <Suspense fallback={<WaverFallback targetHeight={targetHeight} />}>
      <WaverModel targetHeight={targetHeight} visible={visible} />
    </Suspense>
  )
}

/** Character walking across board tiles (parent = board rigid body). */
export function WaverCharacter({ board, waver }) {
  const groupRef = useRef(null)
  const waverRef = useRef(waver)
  const timingRef = useRef(null)
  waverRef.current = waver
  const active = !!waver && !!board

  useFrame(() => {
    const g = groupRef.current
    const w = waverRef.current
    if (!g || !w || !board) return
    const progress = waverProgress(w, performance.now(), timingRef)
    const [x, y, z] = waverLocalPosition(board, w, progress)
    g.position.set(x, y, z)
    g.rotation.y = waverFacingYaw(w)
  })

  return (
    <group ref={groupRef} visible={active}>
      {active && <WaverModelSafe targetHeight={WAVER.modelHeight} visible />}
    </group>
  )
}
