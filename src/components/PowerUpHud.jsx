import { POWERUP } from '../config'
import { firstOwnedType, POWERUP_ORDER } from '../powerUps'

export function PowerUpHud({ inventory, selectedType }) {
  const ownedCount = POWERUP_ORDER.reduce((n, t) => n + (inventory[t] > 0 ? 1 : 0), 0)
  const displayType =
    inventory[selectedType] > 0 ? selectedType : firstOwnedType(inventory)
  const meta = POWERUP.types[displayType]
  const count = inventory[displayType] ?? 0
  const empty = ownedCount === 0

  return (
    <div className="powerup-hud">
      <div className="powerup-hud__title">Power-up</div>
      <div className={`powerup-hud__card${empty ? ' powerup-hud__card--empty' : ''}`}>
        {meta.preview ? (
          <img className="powerup-hud__preview" src={meta.preview} alt={meta.label} />
        ) : (
          <div className="powerup-hud__preview powerup-hud__preview--fallback">{meta.icon}</div>
        )}
        {!empty && <span className="powerup-hud__count">×{count}</span>}
      </div>
      <div className="powerup-hud__label">{meta.label}</div>
      <div className="powerup-hud__desc">{empty ? 'Collect pickups on the board.' : meta.description}</div>
      <div className="powerup-hud__hint">
        {ownedCount > 1 ? 'Tab next · Space use' : 'Space use'}
      </div>
    </div>
  )
}
