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
  p1Label,
  p2Label,
  roomCode,
  resume,
  exitToMenu,
}) {
  const heartsDisplay = '♥'.repeat(Math.min(lives, 5)) + (lives > 5 ? ` ×${lives}` : '')

  return (
    <>
      <div className="coop-hud">
        <div className="coop-topbar">
          <span className="room-code">Room {roomCode}</span>
          <span className="coop-mode-tag">Co-op</span>
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
          <span className="coop-player coop-player--p1">
            <strong>{p1Label}</strong> controls left purple board
          </span>
          <span className="coop-player coop-player--p2">
            <strong>{p2Label}</strong> controls right teal board and pocket
          </span>
        </div>
      </div>

      {flash && (status === 'playing' || status === 'countdown') && (
        <div className="flash">{flash}</div>
      )}

      {status === 'countdown' && (
        <div className="countdown">
          <div className="count-num">{countdown > 0 ? countdown : 'GO!'}</div>
          <div className="count-sub">Balance both boards — the ball drops in…</div>
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
