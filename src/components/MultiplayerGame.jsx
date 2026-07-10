import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { CAMERA, COLORS, GAME } from '../config'
import { useGame } from '../hooks/useGame'
import { useGameKeyGuard } from '../hooks/useGameKeyGuard'
import { useViewport } from '../hooks/useViewport'
import { useSplitResize } from '../hooks/useSplitResize'
import { resolveMatch, chaseTarget } from '../multiplayer/matchEnd'
import { Scene } from './Scene'
import { RemoteScene } from './RemoteScene'
import { SplitControls } from './SplitControls'
import { PowerUpHud } from './PowerUpHud'
import { PowerUpActiveTimer } from './PowerUpActiveTimer'
import { MobileBottomStats, MobileSplitToggle, OpponentScoreBadge } from './MobileHud'
import { MobileActionBar, useJumpTrigger } from './MobileActionBar'
import { TiltLevelHud } from './TiltLevelHud'
import {
  PaneHud,
  PaneFlash,
  PaneCountdown,
  PanePauseHint,
  ChaseBanner,
  SpectateBanner,
  MatchResult,
  DisconnectOverlay,
} from './PaneHud'

export function MultiplayerGame({ room, onExit }) {
  const { code, seed, peerState, peerStateRef, sendState, disconnect, phase, playerName, peerName } = room
  const viewport = useViewport()
  const { jumpTriggerRef, requestJump } = useJumpTrigger()
  const game = useGame({
    roomSeed: seed,
    gridCap: viewport.gridCap,
    keyboardShortcuts: !viewport.isMobile,
  })
  const split = useSplitResize(viewport.isMobile ? 100 : 50)
  const [mobileSplit, setMobileSplit] = useState(false)
  const tiltRef = useRef({ x: 0, z: 0 })
  const localLabel = playerName || 'You'
  const remoteLabel = peerName || peerState?.name || 'Opponent'
  useGameKeyGuard(
    !viewport.isMobile &&
      (game.status === 'playing' || game.status === 'countdown' || game.status === 'paused')
  )

  useEffect(() => {
    if (phase === 'matched') game.start()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  useEffect(() => {
    if (!viewport.isMobile) return
    split.setFullLocal()
    setMobileSplit(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewport.isMobile])

  const handleExit = () => {
    disconnect()
    game.exitToMenu()
    onExit()
  }

  const localSnap = useMemo(
    () => ({ status: game.status, score: game.score, level: game.level }),
    [game.status, game.score, game.level]
  )
  const peerSnap = useMemo(
    () =>
      peerState
        ? { status: peerState.status, score: peerState.score, level: peerState.level }
        : null,
    [peerState]
  )

  const matchResult = useMemo(() => resolveMatch(localSnap, peerSnap), [localSnap, peerSnap])
  const chase = useMemo(() => chaseTarget(localSnap, peerSnap), [localSnap, peerSnap])
  const matchDone = matchResult != null
  const opponentLeft = phase === 'left'

  const sceneStatus = matchDone ? 'paused' : game.status
  const localOut = game.status === 'over'
  const spectating = localOut && !matchDone

  const showRemotePane = viewport.isMobile ? mobileSplit : !split.isFullLocal
  const localFlex =
    showRemotePane && viewport.isMobile
      ? '1 1 50%'
      : showRemotePane && !viewport.isMobile
        ? `0 0 ${split.localPct}%`
        : '1 1 100%'
  const remoteFlex = `1 1 ${100 - split.localPct}%`
  const showTilt =
    game.status === 'playing' || game.status === 'countdown' || game.status === 'paused'
  const showMobileStats =
    viewport.isMobile &&
    (game.status === 'playing' || game.status === 'countdown' || game.status === 'paused')

  const shellClass = [
    'split-screen',
    viewport.isMobile && 'split-screen--mobile',
    viewport.portrait && 'split-screen--portrait',
    viewport.isMobile && !mobileSplit && 'split-screen--compact',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={shellClass}>
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
      <div className="split-header">
        <span className="room-code">Room {code}</span>
        {viewport.isMobile && !mobileSplit && (
          <OpponentScoreBadge
            name={remoteLabel}
            score={peerState?.score ?? 0}
            level={peerState?.level ?? 1}
            waiting={!peerState}
          />
        )}
        <PowerUpHud
          inventory={game.inventory}
          selectedType={game.selectedType}
          compact={viewport.isMobile}
        />
        {viewport.isMobile ? (
          <MobileSplitToggle active={mobileSplit} onToggle={() => setMobileSplit((v) => !v)} />
        ) : (
          <SplitControls
            localPct={split.localPct}
            isFullLocal={split.isFullLocal}
            localName={localLabel}
            onEqual={split.setEqual}
            onFullLocal={split.setFullLocal}
            onResetSplit={split.resetSplit}
          />
        )}
        {!viewport.isMobile && (
          <span className="split-header__hint">Drag the bar between panes to resize</span>
        )}
      </div>

      {!viewport.isMobile && (
        <TiltLevelHud tiltRef={tiltRef} visible={showTilt} compact={false} />
      )}

      <div className="split-body" ref={split.bodyRef}>
        <div
          className={`split-pane split-pane--local${!showRemotePane ? ' split-pane--expanded' : ''}`}
          style={{ flex: localFlex }}
        >
          {viewport.isMobile ? (
            <>
              {showMobileStats && (
                <MobileBottomStats
                  level={game.level}
                  lives={game.lives}
                  timeLeft={game.timeLeft}
                  score={game.score}
                />
              )}
              <TiltLevelHud tiltRef={tiltRef} visible={showTilt} compact />
              {game.status === 'playing' && (
                <MobileActionBar
                  onCycle={game.cycleSelected}
                  onUse={game.activateSelected}
                  onJump={requestJump}
                  selectedType={game.selectedType}
                  inventory={game.inventory}
                />
              )}
            </>
          ) : (
            <PaneHud
              label={localLabel}
              level={game.level}
              lives={game.lives}
              score={game.score}
              timeLeft={game.timeLeft}
              accent="#6ee7ff"
            />
          )}
          <ChaseBanner chase={chase} localScore={game.score} opponentName={remoteLabel} />
          {spectating && <SpectateBanner />}
          <PaneFlash text={matchDone ? '' : game.flash} />
          <PaneCountdown countdown={game.countdown} status={sceneStatus} />
          <PanePauseHint status={sceneStatus} />

          {game.status === 'paused' && !matchDone && (
            <div className="pane-overlay">
              <h2>Paused</h2>
              <button onClick={game.resume}>Resume</button>
              <button className="secondary" onClick={handleExit}>
                Exit
              </button>
            </div>
          )}

          <Canvas shadows camera={{ position: CAMERA.position, fov: CAMERA.fov }} className="split-canvas game-canvas">
            <color attach="background" args={[COLORS.background]} />
            <Scene
              data={game.data}
              status={sceneStatus}
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
              onSend={sendState}
              getSnapshot={game.getSnapshot}
              tiltRef={tiltRef}
              canvasJump={!viewport.isMobile}
              jumpTriggerRef={jumpTriggerRef}
            />
          </Canvas>
        </div>

        {showRemotePane && (
          <>
            {!viewport.isMobile && (
              <div
                className="split-divider"
                onPointerDown={split.startDrag}
                onDoubleClick={split.setEqual}
                role="separator"
                aria-orientation="horizontal"
                aria-label="Resize split view"
                title="Drag to resize — double-click for 50/50"
              />
            )}
            <div className="split-pane split-pane--remote" style={{ flex: viewport.isMobile ? '1 1 50%' : remoteFlex }}>
              <PaneHud
                label={remoteLabel}
                level={peerState?.level ?? 1}
                lives={peerState?.lives ?? GAME.startLives}
                score={peerState?.score ?? 0}
                timeLeft={peerState?.timeLeft ?? 60}
                accent="#a78bfa"
              />
              <PaneFlash text={peerState?.flash} />
              <PaneCountdown countdown={peerState?.countdown ?? 3} status={peerState?.status} />
              {!peerState && <div className="pane-waiting">Waiting for opponent data…</div>}

              <Canvas shadows camera={{ position: CAMERA.position, fov: CAMERA.fov }} className="split-canvas game-canvas">
                <color attach="background" args={[COLORS.background]} />
                <RemoteScene peerState={peerState} peerStateRef={peerStateRef} roomSeed={seed} />
              </Canvas>
            </div>
          </>
        )}
      </div>

      {matchDone && (
        <MatchResult
          result={matchResult}
          local={game}
          peer={peerState}
          localName={localLabel}
          peerName={remoteLabel}
          onExit={handleExit}
        />
      )}
      {opponentLeft && !matchDone && (
        <DisconnectOverlay peerName={remoteLabel} onExit={handleExit} />
      )}
    </div>
  )
}
