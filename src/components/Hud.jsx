import { GAME, COLORS } from '../config'

// All 2D UI: HUD stats, flash banner, get-ready countdown, and overlays.
export function Hud({
  status,
  level,
  lives,
  timeLeft,
  score,
  countdown,
  flash,
  failReason,
  start,
  resume,
  exitToMenu,
  showBackOnReady = false,
  onBack,
}) {
  const heartsDisplay = '♥'.repeat(Math.min(lives, 5)) + (lives > 5 ? ` ×${lives}` : '')

  return (
    <>
      <div className="hud">
        <div className="stat">
          <div className="label">Level</div>
          <div className="value">{level}</div>
        </div>
        <div className="stat">
          <div className="label">Lives</div>
          <div className="value" style={{ color: COLORS.hudDanger }}>
            {lives > 0 ? heartsDisplay : '—'}
          </div>
        </div>
        <div className="stat">
          <div className="label">Time</div>
          <div className="value" style={{ color: timeLeft <= 10 ? COLORS.hudDanger : undefined }}>
            {timeLeft}
          </div>
        </div>
        <div className="stat">
          <div className="label">Score</div>
          <div className="value">{score}</div>
        </div>
      </div>

      {flash && (status === 'playing' || status === 'countdown') && (
        <div className="flash">{flash}</div>
      )}

      {status === 'countdown' && (
        <div className="countdown">
          <div className="count-num">{countdown > 0 ? countdown : 'GO!'}</div>
          <div className="count-sub">Level the board — the ball drops in…</div>
        </div>
      )}

      {status === 'playing' && <div className="pause-hint">Press ESC to pause</div>}

      {(status === 'ready' || status === 'over' || status === 'paused') && (
        <div className="overlay">
          <h1>{status === 'paused' ? 'Paused' : 'Nizhen catch'}</h1>
          {status === 'paused' ? (
            <>
              <div className="final-score">
                Level {level} · Score {score}
              </div>
              <p>Game paused. Take a breath.</p>
              <button onClick={resume}>Resume</button>
              <button className="secondary" onClick={exitToMenu}>
                Exit to Menu
              </button>
            </>
          ) : status === 'over' ? (
            <>
              <div className="final-score">
                {failReason === 'time'
                  ? "Time's up — out of lives!"
                  : failReason === 'lava'
                  ? 'Melted in the lava — out of lives!'
                  : 'Out of lives!'}
                <br />
                Reached level {level} · Score {score}
              </div>
              <p>
                Tilt the board with your mouse and roll the ball into the{' '}
                <strong style={{ color: COLORS.goalRim }}>green pocket</strong> before time runs
                out. You start with <strong>{GAME.startLives} lives</strong>.
              </p>
              <button onClick={start}>Play Again</button>
            </>
          ) : (
            <>
              <p>
                Move your mouse to tilt the board. Roll the ball into the{' '}
                <strong style={{ color: COLORS.goalRim }}>green pocket</strong> within{' '}
                <strong>{GAME.levelTime}s</strong> to clear each level. There are no walls —
                falling off, missing the pocket, or running out of time costs a life. You have{' '}
                <strong>{GAME.startLives} lives</strong>.
              </p>
              <p style={{ fontSize: 14 }}>
                Clear every <strong>{GAME.bonusLifeEveryLevels} levels</strong> to earn a bonus life
                ·{' '}
                <strong style={{ color: COLORS.heart }}>❤ Hearts</strong> (every 8 levels) give a
                life · <strong style={{ color: COLORS.arrow }}>{'>>'} boost pads</strong> fling
                you along · <strong style={{ color: COLORS.airGlow }}>air tiles</strong> bounce
                you up · <strong style={{ color: COLORS.lavaEmissive }}>lava tiles</strong> and{' '}
                <strong style={{ color: COLORS.mover }}>moving boxes</strong> get in your way.
                Boards get bigger and trickier every level.
              </p>
              <button onClick={start}>Start Game</button>
              {showBackOnReady && (
                <button className="secondary" onClick={onBack}>
                  Back to Menu
                </button>
              )}
            </>
          )}
        </div>
      )}
    </>
  )
}
