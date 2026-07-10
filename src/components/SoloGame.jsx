import { useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { CAMERA, COLORS } from '../config'
import { useGame } from '../hooks/useGame'
import { useGameKeyGuard } from '../hooks/useGameKeyGuard'
import { useViewport } from '../hooks/useViewport'
import { Scene } from './Scene'
import { Hud } from './Hud'
import { MobileBottomStats } from './MobileHud'
import { MobileActionBar, useJumpTrigger } from './MobileActionBar'
import { PowerUpHud } from './PowerUpHud'
import { PowerUpActiveTimer } from './PowerUpActiveTimer'
import { TiltLevelHud } from './TiltLevelHud'

export function SoloGame({ onExit }) {
  const viewport = useViewport()
  const game = useGame({
    gridCap: viewport.gridCap,
    keyboardShortcuts: !viewport.isMobile,
  })
  const { jumpTriggerRef, requestJump } = useJumpTrigger()
  const tiltRef = useRef({ x: 0, z: 0 })
  const showTilt =
    game.status === 'playing' || game.status === 'countdown' || game.status === 'paused'
  const showMobileStats =
    viewport.isMobile &&
    (game.status === 'playing' || game.status === 'countdown' || game.status === 'paused')
  useGameKeyGuard(
    !viewport.isMobile &&
      (game.status === 'playing' || game.status === 'countdown' || game.status === 'paused')
  )

  const exitToMenu = () => {
    game.exitToMenu()
    onExit()
  }

  const shellClass = [
    'game-shell',
    viewport.isMobile && 'game-shell--mobile',
    viewport.portrait && 'game-shell--portrait',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={shellClass}>
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
        isMobile={viewport.isMobile}
      />
      {showMobileStats && (
        <MobileBottomStats
          level={game.level}
          lives={game.lives}
          timeLeft={game.timeLeft}
          score={game.score}
        />
      )}
      <TiltLevelHud tiltRef={tiltRef} visible={showTilt} compact={viewport.isMobile} />
      <PowerUpHud
        inventory={game.inventory}
        selectedType={game.selectedType}
        compact={viewport.isMobile}
      />
      {viewport.isMobile && game.status === 'playing' && (
        <MobileActionBar
          onCycle={game.cycleSelected}
          onUse={game.activateSelected}
          onJump={requestJump}
          selectedType={game.selectedType}
          inventory={game.inventory}
        />
      )}
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

      <Canvas shadows camera={{ position: CAMERA.position, fov: CAMERA.fov }} className="game-canvas">
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
          waver={game.waver}
          onWaverCollect={game.handleWaverCollect}
          goalOpen={game.goalOpen}
          registerActivateCtx={game.registerActivateCtx}
          processPowerUpPhysics={game.processPowerUpPhysics}
          onWin={game.handleWin}
          onFail={game.handleFail}
          onHeart={game.handleHeart}
          tiltRef={tiltRef}
          canvasJump={!viewport.isMobile}
          jumpTriggerRef={jumpTriggerRef}
        />
      </Canvas>
    </div>
  )
}
