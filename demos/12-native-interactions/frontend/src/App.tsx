import { useState, useEffect, useCallback } from 'react'
import { Events } from '@wailsio/runtime'

interface DroppedFile {
  path: string
  name: string
  size: string
  content?: string
}

interface Notification {
  title: string
  message: string
  time: string
}

declare global {
  interface Window {
    go: {
      main: {
        InteractionService: {
          ReadDroppedFile: (path: string) => Promise<Record<string, string>>
          GetFileInfo: (path: string) => Promise<Record<string, string>>
          CopyToClipboard: (text: string) => Promise<boolean>
          ShowNotification: (title: string, message: string) => Promise<void>
        }
      }
    }
  }
}

function App() {
  const [droppedFiles, setDroppedFiles] = useState<DroppedFile[]>([])
  const [selectedFile, setSelectedFile] = useState<DroppedFile | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [shortcutLog, setShortcutLog] = useState<string[]>([])

  // Listen for shortcut events
  useEffect(() => {
    const shortcuts = ['shortcut:open', 'shortcut:save', 'shortcut:new', 'shortcut:delete']
    const cancels = shortcuts.map((name) =>
      Events.On(name, () => {
        const action = name.replace('shortcut:', '').toUpperCase()
        const entry = `[${new Date().toLocaleTimeString()}] ⌨️ ${action}`
        setShortcutLog((prev) => [entry, ...prev.slice(0, 9)])
      })
    )
    return () => cancels.forEach((c) => c())
  }, [])

  // Listen for context menu events
  useEffect(() => {
    const ctxEvents = ['context:open', 'context:copy-path', 'context:delete']
    const cancels = ctxEvents.map((name) =>
      Events.On(name, () => {
        const action = name.replace('context:', '')
        if (action === 'copy-path' && selectedFile) {
          window.go.main.InteractionService.CopyToClipboard(selectedFile.path)
          addNotification('Copied', `Path copied: ${selectedFile.name}`)
        } else if (action === 'delete' && selectedFile) {
          setDroppedFiles((prev) => prev.filter((f) => f.path !== selectedFile.path))
          setSelectedFile(null)
          addNotification('Deleted', `Removed: ${selectedFile.name}`)
        }
      })
    )
    return () => cancels.forEach((c) => c())
  }, [selectedFile])

  // Listen for notification events
  useEffect(() => {
    const cancel = Events.On('notification', (event: { data: { title: string; message: string } }) => {
      addNotification(event.data.title, event.data.message)
    })
    return () => { cancel() }
  }, [])

  const addNotification = (title: string, message: string) => {
    setNotifications((prev) => [
      { title, message, time: new Date().toLocaleTimeString() },
      ...prev.slice(0, 4),
    ])
  }

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = e.dataTransfer.files
    for (let i = 0; i < files.length; i++) {
      const file = files[i] as File & { path?: string }
      const path = file.path || file.name

      try {
        const info = await window.go.main.InteractionService.ReadDroppedFile(path)
        const dropped: DroppedFile = {
          path: info.path || path,
          name: info.name || file.name,
          size: info.size || String(file.size),
          content: info.content,
        }
        setDroppedFiles((prev) => [...prev, dropped])
        addNotification('File Dropped', `${dropped.name} (${formatSize(Number(dropped.size))})`)
      } catch (err) {
        addNotification('Error', `Failed to read: ${file.name}`)
      }
    }
  }, [])

  return (
    <div className="app">
      <header className="header">
        <h1>🎯 Native Interactions</h1>
        <div className="shortcuts-hint">
          <kbd>⌘O</kbd> Open <kbd>⌘S</kbd> Save <kbd>⌘⇧N</kbd> New <kbd>⌘⇧D</kbd> Delete
        </div>
      </header>

      <div className="main-content">
        {/* Drop Zone */}
        <div
          className={`drop-zone ${isDragging ? 'dragging' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {isDragging ? (
            <div className="drop-hint">📂 Release to drop files</div>
          ) : (
            <div className="drop-hint">🗂️ Drag & drop files here</div>
          )}

          {/* File list */}
          {droppedFiles.length > 0 && (
            <div className="file-list">
              {droppedFiles.map((file, i) => (
                <div
                  key={i}
                  className={`file-item ${selectedFile?.path === file.path ? 'selected' : ''}`}
                  onClick={() => setSelectedFile(file)}
                  data-contextmenu="file-menu"
                >
                  <span className="file-icon">📄</span>
                  <span className="file-name">{file.name}</span>
                  <span className="file-size">{formatSize(Number(file.size))}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="right-panel">
          {/* File preview */}
          {selectedFile && (
            <section className="preview-section">
              <h3>📋 Preview: {selectedFile.name}</h3>
              <pre className="preview-content">
                {selectedFile.content || '(Binary file - no preview)'}
              </pre>
            </section>
          )}

          {/* Shortcut log */}
          <section className="log-section">
            <h3>⌨️ Shortcut Log</h3>
            <div className="log-list">
              {shortcutLog.length === 0 ? (
                <p className="empty">Press keyboard shortcuts to see them logged here</p>
              ) : (
                shortcutLog.map((entry, i) => (
                  <div key={i} className="log-item">{entry}</div>
                ))
              )}
            </div>
          </section>

          {/* Notifications */}
          <section className="notification-section">
            <h3>🔔 Notifications</h3>
            <div className="notification-list">
              {notifications.map((n, i) => (
                <div key={i} className="notif-item">
                  <strong>{n.title}</strong>
                  <span>{n.message}</span>
                  <small>{n.time}</small>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

export default App
