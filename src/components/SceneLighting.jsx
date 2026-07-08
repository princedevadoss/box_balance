import { Environment } from '@react-three/drei'

// Same city HDR as drei preset, served locally to avoid CDN CORS issues on Safari/Mac.
const HDR_PATH = '/hdri/potsdamer_platz_1k.hdr'

export function SceneLighting({ shadowMap = 2048 }) {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[8, 16, 8]}
        intensity={1.4}
        castShadow
        shadow-mapSize={[shadowMap, shadowMap]}
      />
      <Environment files={HDR_PATH} background={false} />
    </>
  )
}
