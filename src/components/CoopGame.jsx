import { useEffect, useCallback, useMemo, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { CAMERA, COLORS } from '../config'
import { useCoopGame } from '../hooks/useCoopGame'
import { useGameKeyGuard } from '../hooks/useGameKeyGuard'
import { useViewport } from '../hooks/useViewport'
import { useVoiceChat } from '../hooks/useVoiceChat'
import { CoopScene } from './CoopScene'
import { CoopHud } from './CoopHud'
import { PowerUpHud } from './PowerUpHud'
import { PowerUpActiveTimer } from './PowerUpActiveTimer'
import { TiltLevelHud } from './TiltLevelHud'
import { MobileBottomStats } from './MobileHud'
import { MobileActionBar, useJumpTrigger } from './MobileActionBar'
import { VoiceChatBar } from './VoiceChatBar'

const THEME_LABELS = {
  a: 'purple',
  b: 'teal',
  c: 'amber',
  d: 'pink',
}

export function CoopGame({ room, onExit }) {
  const {
    code,
    seed,
    slot,
    players,
    peerState,
    peerStateRef,
    peerBoardsRef,
    peerFlyAimRef,
    peerEventRef,
    sendState,
    sendEvent,
    sendVoiceSignal,
    voiceHandlerRef,
    disconnect,
    phase,
    isHost,
  } = room

  const peerSlots = useMemo(
    () => players.map((p) => p.slot).filter((s) => s !== slot),
    [players, slot]
  )
  const voice = useVoiceChat({
    active: phase === 'matched',
    localSlot: slot,
    peerSlots,
    sendSignal: sendVoiceSignal,
    voiceHandlerRef,
  })

  const handleJump = useCallback(() => {
    sendEvent({ type: 'jump' })
  }, [sendEvent])

  const handlePowerUpRequest = useCallback(
    (event) => {
      sendEvent(event)
    },
    [sendEvent]
  )

  const playerCount = Math.max(2, players.length || 2)
  const viewport = useViewport()
  const { jumpTriggerRef, requestJump } = useJumpTrigger()
  const tiltRef = useRef({ x: 0, z: 0 })
  const game = useCoopGame({
    roomSeed: seed,
    playerCount,
    authoritative: isHost,
    onPowerUpRequest: isHost ? undefined : handlePowerUpRequest,
    gridCap: viewport.gridCap,
    keyboardShortcuts: !viewport.isMobile,
  })
  const showTilt =
    game.status === 'playing' || game.status === 'countdown' || game.status === 'paused'
  useGameKeyGuard(
    !viewport.isMobile &&
      (game.status === 'playing' || game.status === 'countdown' || game.status === 'paused')
  )

  useEffect(() => {
    if (phase === 'matched' && isHost) game.start()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, isHost])

  useEffect(() => {
    if (isHost || !peerState) return
    game.syncFromHost(peerState)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peerState, isHost])

  const handleExit = () => {
    disconnect()
    game.exitToMenu()
    onExit()
  }

  const playerLabels = players.length
    ? players.map((p) => p.name || `Player ${p.slot + 1}`)
    : ['Player 1', 'Player 2']

  const teammateLeft = phase === 'left'
  const showMobileStats =
    viewport.isMobile &&
    (game.status === 'playing' || game.status === 'countdown' || game.status === 'paused')

  const shellClass = [
    'game-shell',
    viewport.isMobile && 'game-shell--mobile',
    viewport.portrait && 'game-shell--portrait',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={shellClass}>
      <CoopHud
        status={game.status}
        level={game.level}
        lives={game.lives}
        timeLeft={game.timeLeft}
        score={game.score}
        countdown={game.countdown}
        flash={game.flash}
        failReason={game.failReason}
        players={players}
        slot={slot}
        playerLabels={playerLabels}
        themeLabels={THEME_LABELS}
        roomCode={code}
        resume={game.resume}
        exitToMenu={handleExit}
      />
      <TiltLevelHud tiltRef={tiltRef} visible={showTilt} compact={viewport.isMobile} />
      {phase === 'matched' && <VoiceChatBar voice={voice} />}
      {!viewport.isMobile && (
        <PowerUpHud inventory={game.inventory} selectedType={game.selectedType} />
      )}
      {viewport.isMobile && game.status === 'playing' && (
        <MobileActionBar
          onCycle={
            isHost
              ? game.cycleSelected
              : () => handlePowerUpRequest({ type: 'powerup_cycle' })
          }
          onUse={
            isHost
              ? game.activateSelected
              : () => handlePowerUpRequest({ type: 'powerup_activate' })
          }
          onJump={requestJump}
          selectedType={game.selectedType}
          inventory={game.inventory}
        />
      )}
      {showMobileStats && (
        <MobileBottomStats
          level={game.level}
          lives={game.lives}
          timeLeft={game.timeLeft}
          score={game.score}
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
        <CoopScene
          data={game.data}
          status={game.status}
          runId={game.runId}
          heartTaken={game.heartTaken}
          patchActive={game.patchActive}
          ghostActive={game.ghostActive}
          flyActive={game.flyActive}
          shrinkScale={game.shrinkScale}
          worldPickup={game.worldPickup}
          onWorldCollect={isHost ? game.handleWorldCollect : undefined}
          waver={game.waver}
          onWaverCollect={isHost ? game.handleWaverCollect : undefined}
          goalOpen={game.goalOpen}
          registerActivateCtx={game.registerActivateCtx}
          processPowerUpPhysics={isHost ? game.processPowerUpPhysics : undefined}
          slot={slot}
          isHost={isHost}
          peerState={peerState}
          peerStateRef={peerStateRef}
          peerBoardsRef={peerBoardsRef}
          peerFlyAimRef={peerFlyAimRef}
          peerEventRef={peerEventRef}
          onWin={game.handleWin}
          onFail={game.handleFail}
          onHeart={game.handleHeart}
          onSend={sendState}
          onJumpRequest={handleJump}
          onPeerPowerUpCycle={isHost ? game.cycleSelected : undefined}
          onPeerPowerUpActivate={isHost ? game.activateSelected : undefined}
          getSnapshot={game.getSnapshot}
          tiltRef={tiltRef}
          canvasJump={!viewport.isMobile}
          jumpTriggerRef={jumpTriggerRef}
        />
      </Canvas>

      {teammateLeft && game.status !== 'over' && (
        <div className="overlay">
          <h1>A teammate left</h1>
          <p>Someone disconnected from the room.</p>
          <button onClick={handleExit}>Back to Menu</button>
        </div>
      )}
    </div>
  )
}
