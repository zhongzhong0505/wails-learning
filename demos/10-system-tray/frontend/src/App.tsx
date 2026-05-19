import { useState, useEffect } from 'react'
import { Events } from '@wailsio/runtime'

declare global {
  interface Window {
    go: {
      main: {
        TrayService: {
          GetUptime: () => Promise<string>
          GetStatus: () => Promise<Record<string, unknown>>
          MinimizeToTray: () => Promise<void>
          SendTrayNotification: (message: string) => Promise<void>
        }
      }
    }
  }
}

function App() {
  const [uptime, setUptime] = useState('00:00:00')
  const [notifications, setNotifications] = useState<string[]>([])
  const [status, setStatus] = useState<Record<string, unknown> | null>(null)

  // Update uptime every second
  useEffect(() => {
    const interval = setInterval(async () => {
      const time = await window.go.main.TrayService.GetUptime()
      setUptime(time)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Listen for tray notifications
  useEffect(() => {
    const cancel = Events.On('tray:notification', (event: { data: string }) => {
      setNotifications((prev) => [
        `[${new Date().toLocaleTimeString()}] ${event.data}`,
        ...prev.slice(0, 9),
      ])
    })
    return () => { cancel() }
  }, [])

  const fetchStatus = async () => {
    const s = await window.go.main.TrayService.GetStatus()
    setStatus(s)
  }

  const minimizeToTray = async () => {
    await window.go.main.TrayService.MinimizeToTray()
  }

  const sendNotification = async () => {
    await window.go.main.TrayService.SendTrayNotification(
      `Test notification at ${new Date().toLocaleTimeString()}`
    )
  }

  return (
    <div className="app">
      <header className="header">
        <h1>🔔 System Tray Demo</h1>
        <div className="uptime">Uptime: {uptime}</div>
      </header>

      <div className="content">
        <section className="info-section">
          <h2>How It Works</h2>
          <div className="info-cards">
            <div className="info-card">
              <h3>🖱️ Click Tray Icon</h3>
              <p>Click the tray icon to show/hide this window</p>
            </div>
            <div className="info-card">
              <h3>📋 Tray Menu</h3>
              <p>Right-click the tray icon to see the context menu</p>
            </div>
            <div className="info-card">
              <h3>🔽 Minimize to Tray</h3>
              <p>Close the window — app keeps running in the system tray</p>
            </div>
            <div className="info-card">
              <h3>🔔 Notifications</h3>
              <p>Tray can send events to the frontend window</p>
            </div>
          </div>
        </section>

        <section className="actions-section">
          <h2>Actions</h2>
          <div className="actions">
            <button onClick={minimizeToTray}>🔽 Minimize to Tray</button>
            <button onClick={sendNotification}>🔔 Send Notification</button>
            <button onClick={fetchStatus}>📊 Get Status</button>
          </div>

          {status && (
            <pre className="status-display">
              {JSON.stringify(status, null, 2)}
            </pre>
          )}
        </section>

        <section className="notifications-section">
          <h2>Notifications ({notifications.length})</h2>
          <div className="notification-list">
            {notifications.length === 0 ? (
              <p className="empty">No notifications yet. Click "Send Notification" or use the tray menu.</p>
            ) : (
              notifications.map((n, i) => (
                <div key={i} className="notification-item">{n}</div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

export default App
