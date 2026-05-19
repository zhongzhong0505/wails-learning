import { useState, useEffect, useMemo } from 'react'
import { Events } from '@wailsio/runtime'

interface SharedItem {
  id: number
  text: string
  createdBy: string
  createdAt: string
}

interface BroadcastMessage {
  sender: string
  message: string
}

declare global {
  interface Window {
    go: {
      main: {
        WindowManagerService: {
          OpenSettingsWindow: () => Promise<void>
          OpenChildWindow: (title: string) => Promise<void>
          GetWindowCount: () => Promise<number>
          BroadcastMessage: (sender: string, message: string) => Promise<void>
        }
        SharedDataService: {
          GetItems: () => Promise<SharedItem[]>
          AddItem: (text: string, createdBy: string) => Promise<SharedItem>
          RemoveItem: (id: number) => Promise<void>
        }
      }
    }
  }
}

function App() {
  // Determine window type from URL params
  const windowType = useMemo(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('window') || 'main'
  }, [])

  const windowTitle = useMemo(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('title') || windowType
  }, [windowType])

  const [items, setItems] = useState<SharedItem[]>([])
  const [messages, setMessages] = useState<BroadcastMessage[]>([])
  const [newItemText, setNewItemText] = useState('')
  const [broadcastText, setBroadcastText] = useState('')

  // Load shared items on mount
  useEffect(() => {
    window.go.main.SharedDataService.GetItems().then(setItems)
  }, [])

  // Listen for shared data changes
  useEffect(() => {
    const cancel = Events.On('shared-data-changed', (event: { data: { action: string; item?: SharedItem; id?: number } }) => {
      const { action, item, id } = event.data
      if (action === 'add' && item) {
        setItems((prev) => [...prev, item])
      } else if (action === 'remove' && id) {
        setItems((prev) => prev.filter((i) => i.id !== id))
      }
    })
    return () => { cancel() }
  }, [])

  // Listen for broadcast messages
  useEffect(() => {
    const cancel = Events.On('broadcast-message', (event: { data: BroadcastMessage }) => {
      setMessages((prev) => [event.data, ...prev.slice(0, 19)])
    })
    return () => { cancel() }
  }, [])

  const addItem = async () => {
    if (!newItemText.trim()) return
    await window.go.main.SharedDataService.AddItem(newItemText, windowTitle)
    setNewItemText('')
  }

  const removeItem = async (id: number) => {
    await window.go.main.SharedDataService.RemoveItem(id)
  }

  const broadcast = async () => {
    if (!broadcastText.trim()) return
    await window.go.main.WindowManagerService.BroadcastMessage(windowTitle, broadcastText)
    setBroadcastText('')
  }

  const openSettings = () => window.go.main.WindowManagerService.OpenSettingsWindow()
  const openChild = () => window.go.main.WindowManagerService.OpenChildWindow('Notes')

  return (
    <div className={`app window-${windowType}`}>
      <header className="header">
        <h1>
          {windowType === 'main' && '🏠 Main Window'}
          {windowType === 'settings' && '⚙️ Settings Window'}
          {windowType === 'child' && `📝 ${windowTitle}`}
        </h1>
        <span className="window-badge">{windowType}</span>
      </header>

      <div className="content">
        {/* Window management (main window only) */}
        {windowType === 'main' && (
          <section className="section">
            <h2>Window Management</h2>
            <div className="button-group">
              <button onClick={openSettings}>⚙️ Open Settings</button>
              <button onClick={openChild}>📝 Open Child Window</button>
            </div>
          </section>
        )}

        {/* Broadcast messaging */}
        <section className="section">
          <h2>📡 Broadcast Message (All Windows)</h2>
          <div className="input-row">
            <input
              value={broadcastText}
              onChange={(e) => setBroadcastText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && broadcast()}
              placeholder="Type a message to broadcast..."
            />
            <button onClick={broadcast}>Send</button>
          </div>
          <div className="message-list">
            {messages.map((msg, i) => (
              <div key={i} className="message-item">
                <strong>[{msg.sender}]</strong> {msg.message}
              </div>
            ))}
            {messages.length === 0 && <p className="empty">No messages yet</p>}
          </div>
        </section>

        {/* Shared data */}
        <section className="section">
          <h2>📦 Shared Data (Synced Across Windows)</h2>
          <div className="input-row">
            <input
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addItem()}
              placeholder="Add shared item..."
            />
            <button onClick={addItem}>Add</button>
          </div>
          <div className="item-list">
            {items.map((item) => (
              <div key={item.id} className="shared-item">
                <span className="item-text">{item.text}</span>
                <span className="item-meta">by {item.createdBy}</span>
                <button className="remove-btn" onClick={() => removeItem(item.id)}>×</button>
              </div>
            ))}
            {items.length === 0 && <p className="empty">No shared items</p>}
          </div>
        </section>
      </div>
    </div>
  )
}

export default App
