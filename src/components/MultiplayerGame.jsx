import { useEffect, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { CAMERA, COLORS, GAME } from '../config'
import { useGame } from '../hooks/useGame'
import { useSplitResize } from '../hooks/useSplitResize'
import { resolveMatch, chaseTarget } from '../multiplayer/matchEnd'
import { Scene } from './Scene'
import { RemoteScene } from './RemoteScene'
import { SplitControls } from './SplitControls'
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
  const { code, seed, peerState, sendState, disconnect, phase, playerName, peerName } = room
  const game = useGame({ roomSeed: seed })
  const split = useSplitResize(50)
  const localLabel = playerName || 'You'
  const remoteLabel = peerName || peerState?.name || 'Opponent'

  useEffect(() => {
    if (phase === 'matched') game.start()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

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

  const localFlex = split.isFullLocal ? '1 1 100%' : `0 0 ${split.localPct}%`
  const remoteFlex = `1 1 ${100 - split.localPct}%`

  return (
    <div className="split-screen">
      <div className="split-header">
        <span className="room-code">Room {code}</span>
        <SplitControls
          localPct={split.localPct}
          isFullLocal={split.isFullLocal}
          localName={localLabel}
          onEqual={split.setEqual}
          onFullLocal={split.setFullLocal}
          onResetSplit={split.resetSplit}
        />
        <span className="split-header__hint">Drag the bar between panes to resize</span>
      </div>

      <div className="split-body" ref={split.bodyRef}>
        <div
          className={`split-pane split-pane--local${split.isFullLocal ? ' split-pane--expanded' : ''}`}
          style={{ flex: localFlex }}
        >
          <PaneHud
            label={localLabel}
            level={game.level}
            lives={game.lives}
            score={game.score}
            timeLeft={game.timeLeft}
            accent="#6ee7ff"
          />
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

          <Canvas shadows camera={{ position: CAMERA.position, fov: CAMERA.fov }} className="split-canvas">
            <color attach="background" args={[COLORS.background]} />
            <Scene
              data={game.data}
              status={sceneStatus}
              runId={game.runId}
              heartTaken={game.heartTaken}
              patchActive={game.patchActive}
              patchPickup={game.patchPickup}
              onPatchCollect={game.handlePatchCollect}
              onWin={game.handleWin}
              onFail={game.handleFail}
              onHeart={game.handleHeart}
              onSend={sendState}
              getSnapshot={game.getSnapshot}
            />
          </Canvas>
        </div>

        {!split.isFullLocal && (
          <>
            <div
              className="split-divider"
              onPointerDown={split.startDrag}
              onDoubleClick={split.setEqual}
              role="separator"
              aria-orientation="horizontal"
              aria-label="Resize split view"
              title="Drag to resize — double-click for 50/50"
            />
            <div className="split-pane split-pane--remote" style={{ flex: remoteFlex }}>
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

              <Canvas shadows camera={{ position: CAMERA.position, fov: CAMERA.fov }} className="split-canvas">
                <color attach="background" args={[COLORS.background]} />
                <RemoteScene peerState={peerState} roomSeed={seed} />
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
