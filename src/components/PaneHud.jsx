import { COLORS } from '../config'

const REASON_TEXT = {
  eliminated_behind: 'Eliminated while behind on points.',
  caught_up: 'Surpassed the eliminated opponent\u2019s score!',
  score: 'Final score decides.',
  level: 'Tied on score \u2014 higher level wins.',
  tie: 'Dead heat.',
}

export function PaneHud({ label, level, lives, score, timeLeft, accent }) {
  const heartsDisplay = '♥'.repeat(Math.min(lives, 5)) + (lives > 5 ? ` ×${lives}` : '')

  return (
    <div className="pane-hud" style={{ borderColor: accent }}>
      <div className="pane-hud__label" style={{ color: accent }}>
        {label}
      </div>
      <div className="pane-hud__stats">
        <span>Lv {level}</span>
        <span style={{ color: COLORS.hudDanger }}>{lives > 0 ? heartsDisplay : '—'}</span>
        <span style={{ color: timeLeft <= 10 ? COLORS.hudDanger : undefined }}>{timeLeft}s</span>
        <span>{score} pts</span>
      </div>
    </div>
  )
}

export function PaneFlash({ text }) {
  if (!text) return null
  return <div className="pane-flash">{text}</div>
}

export function PaneCountdown({ countdown, status }) {
  if (status !== 'countdown') return null
  return (
    <div className="pane-countdown">
      <div className="pane-countdown__num">{countdown > 0 ? countdown : 'GO!'}</div>
    </div>
  )
}

export function PanePauseHint({ status }) {
  if (status !== 'playing') return null
  return <div className="pane-pause-hint">ESC pause</div>
}

export function ChaseBanner({ chase, localScore, opponentName }) {
  if (!chase) return null
  const rival = opponentName || 'Opponent'
  if (chase.role === 'chasing') {
    return (
      <div className="chase-banner chase-banner--chase">
        Beat <strong>{chase.target}</strong> pts to win! (you: {localScore})
      </div>
    )
  }
  return (
    <div className="chase-banner chase-banner--lead">
      You&apos;re out with <strong>{chase.target}</strong> pts — {rival} must beat your score
    </div>
  )
}

export function SpectateBanner() {
  return <div className="spectate-banner">You&apos;re out — waiting for match result…</div>
}

export function MatchResult({ result, local, peer, localName, peerName, onExit }) {
  const localScore = local.score
  const peerScore = peer?.score ?? 0
  const localLevel = local.level
  const peerLevel = peer?.level ?? 1
  const you = localName || 'You'
  const them = peerName || peer?.name || 'Opponent'

  let headline = 'Match over!'
  if (result?.winner === 'local') headline = `${you} wins!`
  else if (result?.winner === 'peer') headline = `${them} wins!`
  else if (result?.winner === 'draw') headline = 'Draw!'

  return (
    <div className="overlay match-overlay">
      <h1>{headline}</h1>
      <div className="match-scores">
        <div>
          <strong>{you}</strong>
          <br />
          Level {localLevel} · {localScore} pts
        </div>
        <div>
          <strong>{them}</strong>
          <br />
          Level {peerLevel} · {peerScore} pts
        </div>
      </div>
      {result?.reason && <p>{REASON_TEXT[result.reason] || ''}</p>}
      <button onClick={onExit}>Back to Menu</button>
    </div>
  )
}

export function DisconnectOverlay({ peerName, onExit }) {
  const who = peerName || 'Your opponent'
  return (
    <div className="overlay">
      <h1>{who} left</h1>
      <p>They disconnected from the room.</p>
      <button onClick={onExit}>Back to Menu</button>
    </div>
  )
}
