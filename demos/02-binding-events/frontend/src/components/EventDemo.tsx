import { useState, useEffect } from 'react'
import { Events } from '@wailsio/runtime'

export function EventDemo() {
  const [currentTime, setCurrentTime] = useState<string>('Waiting for events...')
  const [eventLog, setEventLog] = useState<string[]>([])
  const [customMessage, setCustomMessage] = useState<string>('')
  const [isListening, setIsListening] = useState<boolean>(true)

  useEffect(() => {
    if (!isListening) return

    // Listen for time-tick events from Go backend
    const cancel = Events.On('time-tick', (event: { data: unknown }) => {
      const time = event.data as string
      setCurrentTime(time)
      setEventLog((prev) => {
        const newLog = [`[${time}] Received time-tick event`, ...prev]
        return newLog.slice(0, 20) // Keep last 20 entries
      })
    })

    // Cleanup: unsubscribe when component unmounts or listening stops
    return () => {
      cancel()
    }
  }, [isListening])

  function sendCustomEvent(): void {
    if (!customMessage.trim()) return

    // Emit event from frontend to Go backend
    Events.Emit({ name: 'frontend-message', data: {
      message: customMessage,
      timestamp: new Date().toISOString(),
    }})

    setEventLog((prev) => {
      const newLog = [`[SENT] frontend-message: "${customMessage}"`, ...prev]
      return newLog.slice(0, 20)
    })
    setCustomMessage('')
  }

  function clearLog(): void {
    setEventLog([])
  }

  return (
    <div className="demo-section">
      <h2>Event System</h2>
      <p className="description">
        Demonstrates real-time event communication between Go backend and React frontend.
        The backend emits a time-tick event every second.
      </p>

      <div className="time-display">
        <span className="time-label">Server Time:</span>
        <span className="time-value">{currentTime}</span>
      </div>

      <div className="event-controls">
        <button
          onClick={() => setIsListening(!isListening)}
          className={isListening ? 'danger' : 'success'}
        >
          {isListening ? '⏸ Pause Listening' : '▶ Resume Listening'}
        </button>
        <button onClick={clearLog} className="secondary">
          Clear Log
        </button>
      </div>

      <div className="custom-event">
        <h3>Send Custom Event to Backend</h3>
        <div className="input-group">
          <input
            type="text"
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            placeholder="Enter a message to send"
            onKeyDown={(e) => e.key === 'Enter' && sendCustomEvent()}
          />
          <button onClick={sendCustomEvent}>Send Event</button>
        </div>
      </div>

      <div className="event-log">
        <h3>Event Log ({eventLog.length} entries)</h3>
        <div className="log-container">
          {eventLog.length === 0 ? (
            <p className="empty-log">No events yet...</p>
          ) : (
            eventLog.map((entry, index) => (
              <div key={index} className="log-entry">
                {entry}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
