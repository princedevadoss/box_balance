import { useEffect, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { CAMERA, COLORS } from '../config'
import { useCoopGame } from '../hooks/useCoopGame'
import { CoopScene } from './CoopScene'
import { CoopHud } from './CoopHud'

export function CoopGame({ room, onExit }) {
  const { code, seed, peerState, sendState, disconnect, phase, playerName, peerName, role } = room
  const isHost = role === 'host'
  const game = useCoopGame({ roomSeed: seed, authoritative: isHost })
  const peerStateRef = useRef(null)

  useEffect(() => {
    peerStateRef.current = peerState
  }, [peerState])

  const hostName = role === 'host' ? playerName : peerName
  const guestName = role === 'host' ? peerName : playerName
  const p1Label = hostName || 'Player 1'
  const p2Label = guestName || 'Player 2'

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

  const opponentLeft = phase === 'left'

  return (
    <>
      <CoopHud
        status={game.status}
        level={game.level}
        lives={game.lives}
        timeLeft={game.timeLeft}
        score={game.score}
        countdown={game.countdown}
        flash={game.flash}
        failReason={game.failReason}
        p1Label={p1Label}
        p2Label={p2Label}
        roomCode={code}
        resume={game.resume}
        exitToMenu={handleExit}
      />

      <Canvas shadows camera={{ position: CAMERA.position, fov: CAMERA.fov }}>
        <color attach="background" args={[COLORS.background]} />
        <CoopScene
          data={game.data}
          status={game.status}
          runId={game.runId}
          heartTaken={game.heartTaken}
          role={role}
          peerStateRef={peerStateRef}
          onWin={game.handleWin}
          onFail={game.handleFail}
          onHeart={game.handleHeart}
          onSend={sendState}
          getSnapshot={game.getSnapshot}
        />
      </Canvas>

      {opponentLeft && game.status !== 'over' && (
        <div className="overlay">
          <h1>{p2Label} left</h1>
          <p>Your teammate disconnected.</p>
          <button onClick={handleExit}>Back to Menu</button>
        </div>
      )}
    </>
  )
}
