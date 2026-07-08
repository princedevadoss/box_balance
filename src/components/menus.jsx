import { useState } from 'react'
import { GAME, COLORS } from '../config'
import { sanitizeName } from '../net/names'

export function MainMenu({ onSolo, onMultiplayer }) {
  return (
    <div className="overlay menu-overlay">
      <h1>Nizhen catch</h1>
      <p>
        Tilt the board and roll the ball into the{' '}
        <strong style={{ color: COLORS.goalRim }}>green pocket</strong>. Race solo or team up
        online.
      </p>
      <div className="menu-actions">
        <button onClick={onSolo}>Single Player</button>
        <button className="secondary" onClick={onMultiplayer}>
          Multiplayer
        </button>
      </div>
      <p className="menu-footnote">
        Single player: {GAME.startLives} lives · {GAME.levelTime}s per level
      </p>
    </div>
  )
}

export function MultiplayerMenu({ onVersus, onCoop, onBack }) {
  return (
    <div className="overlay menu-overlay">
      <h1>Multiplayer</h1>
      <p>Choose a mode, then create or join a room with a friend.</p>
      <div className="menu-actions">
        <button onClick={onVersus}>Versus</button>
        <button className="secondary" onClick={onCoop}>
          Co-op
        </button>
      </div>
      <button className="link-btn" onClick={onBack}>
        ← Back
      </button>
    </div>
  )
}

export function ModeLobbyMenu({ mode, onCreate, onJoin, onBack }) {
  const isCoop = mode === 'coop'
  return (
    <div className="overlay menu-overlay">
      <h1>{isCoop ? 'Co-op' : 'Versus'}</h1>
      <p>
        {isCoop
          ? 'Up to 4 players share one ball across joined boards. The host starts when everyone is ready.'
          : 'Parallel race on identical boards. Highest score wins when a player is eliminated.'}
      </p>
      <div className="menu-actions">
        <button onClick={onCreate}>Create Room</button>
        <button className="secondary" onClick={onJoin}>
          Join Room
        </button>
      </div>
      <button className="link-btn" onClick={onBack}>
        ← Back
      </button>
    </div>
  )
}

export function CreateRoomScreen({ mode, code, playerName, error, onCreate, onBack }) {
  const [name, setName] = useState('')
  const [started, setStarted] = useState(false)
  const isCoop = mode === 'coop'

  const submit = (e) => {
    e.preventDefault()
    setStarted(true)
    onCreate(sanitizeName(name))
  }

  if (!started) {
    return (
      <div className="overlay menu-overlay">
        <h1>Create {isCoop ? 'Co-op' : 'Versus'} Room</h1>
        <p>Enter your name, then create a room and share the code.</p>
        <form className="join-form" onSubmit={submit}>
          <input
            className="name-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={16}
            placeholder="Your name"
            autoFocus
          />
          <button type="submit">Create Room</button>
        </form>
        <button className="link-btn" onClick={onBack}>
          ← Back
        </button>
      </div>
    )
  }

  return (
    <div className="overlay menu-overlay">
      <h1>{isCoop ? 'Co-op' : 'Versus'} Room</h1>
      {error ? (
        <p className="menu-error">{error}</p>
      ) : code ? (
        <>
          <p>
            Hi <strong>{playerName}</strong> — share this code:
          </p>
          <div className="room-code-display">{code}</div>
          <p className="menu-waiting">
            {isCoop ? 'Waiting for teammates in the lobby…' : 'Waiting for another player to join…'}
          </p>
        </>
      ) : (
        <p className="menu-waiting">Connecting to server…</p>
      )}
      <button className="secondary" onClick={onBack}>
        Cancel
      </button>
    </div>
  )
}

export function CoopLobbyScreen({
  code,
  playerName,
  players,
  isHost,
  error,
  onStart,
  onBack,
}) {
  const canStart = isHost && players.length >= 2

  return (
    <div className="overlay menu-overlay">
      <h1>Co-op Lobby</h1>
      {error && <p className="menu-error">{error}</p>}
      <p>
        Room <strong>{code}</strong> · You are <strong>{playerName}</strong>
        {isHost ? ' (host)' : ''}
      </p>

      <div className="coop-lobby-board">
        <div className="coop-lobby-board__title">Players</div>
        <ol className="coop-lobby-list">
          {players.map((p) => (
            <li key={p.slot} className={p.isHost ? 'coop-lobby-list__host' : ''}>
              <span className="coop-lobby-rank">#{p.slot + 1}</span>
              <span className="coop-lobby-name">{p.name}</span>
              {p.isHost && <span className="coop-lobby-tag">Host</span>}
            </li>
          ))}
        </ol>
        <p className="coop-lobby-cap">{players.length} / 4 players</p>
      </div>

      {isHost ? (
        <>
          <button onClick={onStart} disabled={!canStart}>
            {canStart ? 'Start Game' : 'Need at least 2 players'}
          </button>
          <p className="menu-footnote">Only you can start the match.</p>
        </>
      ) : (
        <p className="menu-waiting">Waiting for the host to start…</p>
      )}

      <button className="link-btn" onClick={onBack}>
        Leave Lobby
      </button>
    </div>
  )
}

export function JoinRoomScreen({ mode, onJoin, onBack, error, joining }) {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const isCoop = mode === 'coop'

  const submit = (e) => {
    e.preventDefault()
    onJoin(code, sanitizeName(name))
  }

  return (
    <div className="overlay menu-overlay">
      <h1>Join {isCoop ? 'Co-op' : 'Versus'} Room</h1>
      <p>Enter your name and the 6-character room code.</p>
      <form className="join-form" onSubmit={submit}>
        <input
          className="name-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={16}
          placeholder="Your name"
          autoFocus
        />
        <input
          className="join-input"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          maxLength={6}
          placeholder="Room code"
        />
        <button type="submit" disabled={joining}>
          {joining ? 'Joining…' : 'Join Room'}
        </button>
      </form>
      {error && <p className="menu-error">{error}</p>}
      <button className="link-btn" onClick={onBack}>
        ← Back
      </button>
    </div>
  )
}
