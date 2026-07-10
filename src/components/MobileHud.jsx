import { COLORS } from '../config'

export function MobileBottomStats({ level, lives, timeLeft, score }) {
  const heartsDisplay = '♥'.repeat(Math.min(lives, 5)) + (lives > 5 ? `×${lives}` : '')

  return (
    <div className="mobile-bottom-stats" aria-label="Game stats">
      <div className="mobile-bottom-stats__item">
        <span className="mobile-bottom-stats__label">Lv</span>
        <span className="mobile-bottom-stats__value">{level}</span>
      </div>
      <div className="mobile-bottom-stats__item">
        <span className="mobile-bottom-stats__label">♥</span>
        <span className="mobile-bottom-stats__value" style={{ color: COLORS.hudDanger }}>
          {lives > 0 ? heartsDisplay : '—'}
        </span>
      </div>
      <div className="mobile-bottom-stats__item">
        <span className="mobile-bottom-stats__label">Time</span>
        <span
          className="mobile-bottom-stats__value"
          style={{ color: timeLeft <= 10 ? COLORS.hudDanger : undefined }}
        >
          {timeLeft}
        </span>
      </div>
      <div className="mobile-bottom-stats__item">
        <span className="mobile-bottom-stats__label">Score</span>
        <span className="mobile-bottom-stats__value">{score}</span>
      </div>
    </div>
  )
}

export function OpponentScoreBadge({ name, score, level, waiting }) {
  return (
    <div className="opponent-score-badge" aria-label="Opponent score">
      <span className="opponent-score-badge__name">{name}</span>
      {waiting ? (
        <span className="opponent-score-badge__waiting">…</span>
      ) : (
        <>
          <span className="opponent-score-badge__score">{score} pts</span>
          <span className="opponent-score-badge__level">Lv {level}</span>
        </>
      )}
    </div>
  )
}

export function MobileSplitToggle({ active, onToggle }) {
  return (
    <button
      type="button"
      className={`mobile-split-toggle${active ? ' mobile-split-toggle--active' : ''}`}
      onClick={onToggle}
      aria-pressed={active}
    >
      {active ? 'Single view' : 'Split view'}
    </button>
  )
}
