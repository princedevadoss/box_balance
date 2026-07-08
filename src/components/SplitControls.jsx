export function SplitControls({ localPct, isFullLocal, localName, onEqual, onFullLocal, onResetSplit }) {
  return (
    <div className="split-controls">
      <button
        type="button"
        className={!isFullLocal && localPct === 50 ? 'active' : ''}
        onClick={onEqual}
        title="Equal split"
      >
        50/50
      </button>
      <button
        type="button"
        className={isFullLocal ? 'active' : ''}
        onClick={onFullLocal}
        title={`Full view for ${localName}`}
      >
        Full view
      </button>
      {isFullLocal && (
        <button type="button" onClick={onResetSplit} title="Show opponent pane">
          Show split
        </button>
      )}
    </div>
  )
}
