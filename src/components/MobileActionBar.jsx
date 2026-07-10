import { useCallback, useRef } from 'react'
import { POWERUP } from '../config'
import { firstOwnedType } from '../powerUps'

function IconCycle() {
  return (
    <svg className="mobile-action-bar__svg" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46A7.93 7.93 0 0 0 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74A7.93 7.93 0 0 0 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"
      />
    </svg>
  )
}

function IconJump() {
  return (
    <svg className="mobile-action-bar__svg" viewBox="0 0 24 24" aria-hidden>
      <path fill="currentColor" d="M4 12l1.41 1.41L11 7.83V20h2V7.83l5.59 5.58L20 12l-8-8-8 8z" />
    </svg>
  )
}

/** Compact icon bar: cycle power-up, use power-up, jump. */
export function MobileActionBar({
  onCycle,
  onUse,
  onJump,
  selectedType,
  inventory,
  disabled = false,
}) {
  const displayType = inventory?.[selectedType] > 0 ? selectedType : firstOwnedType(inventory ?? {})
  const meta = POWERUP.types[displayType]
  const canUse = (inventory?.[displayType] ?? 0) > 0

  const stop = useCallback((fn) => (e) => {
    e.preventDefault()
    e.stopPropagation()
    fn?.()
  }, [])

  return (
    <div className="mobile-action-bar" role="toolbar" aria-label="Game actions">
      <button
        type="button"
        className="mobile-action-bar__btn"
        onClick={stop(onCycle)}
        disabled={disabled}
        aria-label="Change power-up"
      >
        <IconCycle />
      </button>
      <button
        type="button"
        className={`mobile-action-bar__btn mobile-action-bar__btn--use${!canUse ? ' mobile-action-bar__btn--muted' : ''}`}
        onClick={stop(onUse)}
        disabled={disabled || !canUse}
        aria-label="Use power-up"
      >
        {meta?.preview ? (
          <img className="mobile-action-bar__preview" src={meta.preview} alt="" />
        ) : (
          <span className="mobile-action-bar__emoji">{meta?.icon ?? '?'}</span>
        )}
      </button>
      <button
        type="button"
        className="mobile-action-bar__btn mobile-action-bar__btn--jump"
        onClick={stop(onJump)}
        disabled={disabled}
        aria-label="Jump"
      >
        <IconJump />
      </button>
    </div>
  )
}

/** Increment to request a ball jump (read by BallJump). */
export function useJumpTrigger() {
  const ref = useRef(0)
  const requestJump = useCallback(() => {
    ref.current += 1
  }, [])
  return { jumpTriggerRef: ref, requestJump }
}
