import { COLORS } from '../config'

export function CoopHud({
  status,
  level,
  lives,
  timeLeft,
  score,
  countdown,
  flash,
  failReason,
  players,
  slot,
  playerLabels,
  themeLabels,
  roomCode,
  resume,
  exitToMenu,
}) {
  const heartsDisplay = '♥'.repeat(Math.min(lives, 5)) + (lives > 5 ? ` ×${lives}` : '')
  const boards = players.length ? players : playerLabels.map((name, i) => ({ slot: i, name }))

  return (
    <>
      <div className="coop-hud">
        <div className="coop-topbar">
          <span className="room-code">Room {roomCode}</span>
          <span className="coop-mode-tag">Co-op · {boards.length} players</span>
        </div>
        <div className="coop-stats">
          <div className="coop-stat">
            <div className="coop-stat__label">Level</div>
            <div className="coop-stat__value">{level}</div>
          </div>
          <div className="coop-stat">
            <div className="coop-stat__label">Lives</div>
            <div className="coop-stat__value" style={{ color: COLORS.hudDanger }}>
              {lives > 0 ? heartsDisplay : '—'}
            </div>
          </div>
          <div className="coop-stat">
            <div className="coop-stat__label">Time</div>
            <div className="coop-stat__value" style={{ color: timeLeft <= 10 ? COLORS.hudDanger : undefined }}>
              {timeLeft}
            </div>
          </div>
          <div className="coop-stat">
            <div className="coop-stat__label">Score</div>
            <div className="coop-stat__value">{score}</div>
          </div>
        </div>
        <div className="coop-player-strip">
          {boards.map((p, i) => {
            const name = p.name ?? playerLabels[i] ?? `Player ${i + 1}`
            const themeKey = ['a', 'b', 'c', 'd'][p.slot ?? i]
            const color = themeLabels[themeKey] ?? 'board'
            const you = (p.slot ?? i) === slot
            return (
              <span
                key={p.slot ?? i}
                className={`coop-player ${you ? 'coop-player--you' : ''}`}
              >
                <strong>{name}</strong>
                {you ? ' · you' : ''} · {color} board
              </span>
            )
          })}
        </div>
        <p className="coop-jump-hint">Click to jump · move mouse to tilt your board</p>
      </div>

      {flash && (status === 'playing' || status === 'countdown') && (
        <div className="flash">{flash}</div>
      )}

      {status === 'countdown' && (
        <div className="countdown">
          <div className="count-num">{countdown > 0 ? countdown : 'GO!'}</div>
          <div className="count-sub">Work together — the ball drops in…</div>
        </div>
      )}

      {status === 'playing' && <div className="pause-hint">Press ESC to pause</div>}

      {(status === 'paused' || status === 'over') && (
        <div className="overlay">
          <h1>{status === 'paused' ? 'Paused' : 'Game Over'}</h1>
          {status === 'over' ? (
            <>
              <div className="final-score">
                {failReason === 'time'
                  ? "Time's up!"
                  : failReason === 'lava'
                  ? 'Melted in the lava!'
                  : 'Out of lives!'}
                <br />
                Reached level {level} · Score {score}
              </div>
              <button onClick={exitToMenu}>Back to Menu</button>
            </>
          ) : (
            <>
              <div className="final-score">
                Level {level} · Score {score}
              </div>
              <button onClick={resume}>Resume</button>
              <button className="secondary" onClick={exitToMenu}>
                Exit to Menu
              </button>
            </>
          )}
        </div>
      )}
    </>
  )
}
