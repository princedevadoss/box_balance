import { POWERUP } from '../config'

const EFFECT_TYPES = ['patch', 'ghost', 'fly', 'shrink']

export function PowerUpActiveTimer({
  patchActive = false,
  ghostActive = false,
  flyActive = false,
  shrinkActive = false,
  patchSecondsLeft = 0,
  ghostSecondsLeft = 0,
  flySecondsLeft = 0,
  shrinkSecondsLeft = 0,
}) {
  const flags = { patch: patchActive, ghost: ghostActive, fly: flyActive, shrink: shrinkActive }
  const timers = {
    patch: patchSecondsLeft,
    ghost: ghostSecondsLeft,
    fly: flySecondsLeft,
    shrink: shrinkSecondsLeft,
  }

  const active = EFFECT_TYPES.filter((type) => flags[type] && timers[type] > 0)
  if (!active.length) return null

  return (
    <div className="powerup-active-timer">
      {active.map((type) => {
        const meta = POWERUP.types[type]
        return (
          <div key={type} className="powerup-active-timer__item">
            {meta.preview ? (
              <img className="powerup-active-timer__icon" src={meta.preview} alt="" />
            ) : (
              <span className="powerup-active-timer__emoji">{meta.icon}</span>
            )}
            <div className="powerup-active-timer__text">
              <span className="powerup-active-timer__label">{meta.label}</span>
              <span className="powerup-active-timer__time">{timers[type]}s</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
