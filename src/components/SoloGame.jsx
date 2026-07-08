import { useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { CAMERA, COLORS } from '../config'
import { useGame } from '../hooks/useGame'
import { Scene } from './Scene'
import { Hud } from './Hud'

export function SoloGame({ onExit }) {
  const game = useGame()

  const exitToMenu = () => {
    game.exitToMenu()
    onExit()
  }

  return (
    <>
      <Hud
        status={game.status}
        level={game.level}
        lives={game.lives}
        timeLeft={game.timeLeft}
        score={game.score}
        countdown={game.countdown}
        flash={game.flash}
        failReason={game.failReason}
        start={game.start}
        resume={game.resume}
        exitToMenu={exitToMenu}
        showBackOnReady
        onBack={onExit}
      />

      <Canvas shadows camera={{ position: CAMERA.position, fov: CAMERA.fov }}>
        <color attach="background" args={[COLORS.background]} />
        <Scene
          data={game.data}
          status={game.status}
          runId={game.runId}
          heartTaken={game.heartTaken}
          onWin={game.handleWin}
          onFail={game.handleFail}
          onHeart={game.handleHeart}
        />
      </Canvas>
    </>
  )
}
