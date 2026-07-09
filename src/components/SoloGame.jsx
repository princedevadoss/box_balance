import { useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { CAMERA, COLORS } from '../config'
import { useGame } from '../hooks/useGame'
import { Scene } from './Scene'
import { Hud } from './Hud'
import { PowerUpHud } from './PowerUpHud'
import { PowerUpActiveTimer } from './PowerUpActiveTimer'

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
      <PowerUpHud inventory={game.inventory} selectedType={game.selectedType} />
      <PowerUpActiveTimer
        patchActive={game.patchActive}
        ghostActive={game.ghostActive}
        flyActive={game.flyActive}
        shrinkActive={game.shrinkActive}
        patchSecondsLeft={game.patchSecondsLeft}
        ghostSecondsLeft={game.ghostSecondsLeft}
        flySecondsLeft={game.flySecondsLeft}
        shrinkSecondsLeft={game.shrinkSecondsLeft}
      />

      <Canvas shadows camera={{ position: CAMERA.position, fov: CAMERA.fov }}>
        <color attach="background" args={[COLORS.background]} />
        <Scene
          data={game.data}
          status={game.status}
          runId={game.runId}
          heartTaken={game.heartTaken}
          patchActive={game.patchActive}
          ghostActive={game.ghostActive}
          flyActive={game.flyActive}
          shrinkScale={game.shrinkScale}
          worldPickup={game.worldPickup}
          onWorldCollect={game.handleWorldCollect}
          registerActivateCtx={game.registerActivateCtx}
          processPowerUpPhysics={game.processPowerUpPhysics}
          onWin={game.handleWin}
          onFail={game.handleFail}
          onHeart={game.handleHeart}
        />
      </Canvas>
    </>
  )
}
