export function VoiceChatBar({ voice }) {
  if (!voice) return null

  const { joined, muted, status, error, connectedCount, join, leave, toggleMute } = voice

  return (
    <div className="voice-chat" role="group" aria-label="Voice chat">
      {!joined ? (
        <button
          type="button"
          className="voice-chat__btn voice-chat__btn--join"
          onClick={join}
          disabled={status === 'requesting'}
        >
          {status === 'requesting' ? 'Connecting…' : 'Join voice'}
        </button>
      ) : (
        <>
          <button
            type="button"
            className={`voice-chat__btn voice-chat__btn--mic${muted ? ' is-muted' : ' is-live'}`}
            onClick={toggleMute}
            title={muted ? 'Unmute microphone' : 'Mute microphone'}
            aria-pressed={!muted}
          >
            {muted ? 'Unmute' : 'Mute'}
          </button>
          <button type="button" className="voice-chat__btn voice-chat__btn--leave" onClick={leave}>
            Leave
          </button>
          <span className="voice-chat__status" aria-live="polite">
            {connectedCount > 0
              ? `${connectedCount} linked`
              : 'Waiting for others…'}
          </span>
        </>
      )}
      {error ? <span className="voice-chat__error">{error}</span> : null}
    </div>
  )
}
