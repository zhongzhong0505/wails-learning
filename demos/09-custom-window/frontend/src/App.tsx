import { useState, useEffect } from 'react'

declare global {
  interface Window {
    go: {
      main: {
        WindowService: {
          Minimize: () => Promise<void>
          Maximize: () => Promise<void>
          Close: () => Promise<void>
          IsMaximized: () => Promise<boolean>
          GetPlatform: () => Promise<string>
        }
      }
    }
  }
}

function App() {
  const [platform, setPlatform] = useState<string>('darwin')
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    window.go.main.WindowService.GetPlatform().then(setPlatform)
  }, [])

  const handleMinimize = async () => {
    await window.go.main.WindowService.Minimize()
  }

  const handleMaximize = async () => {
    await window.go.main.WindowService.Maximize()
    const maximized = await window.go.main.WindowService.IsMaximized()
    setIsMaximized(maximized)
  }

  const handleClose = async () => {
    await window.go.main.WindowService.Close()
  }

  return (
    <div className="app">
      {/* Custom Titlebar - this is the draggable region */}
      <div className="titlebar" data-platform={platform}>
        {/* macOS: traffic lights on the left */}
        {platform === 'darwin' && (
          <div className="traffic-lights">
            <button className="tl-btn close" onClick={handleClose} title="Close">
              <span>×</span>
            </button>
            <button className="tl-btn minimize" onClick={handleMinimize} title="Minimize">
              <span>−</span>
            </button>
            <button className="tl-btn maximize" onClick={handleMaximize} title="Maximize">
              <span>{isMaximized ? '⧉' : '+'}</span>
            </button>
          </div>
        )}

        <div className="titlebar-title">Custom Window Demo</div>

        {/* Windows/Linux: buttons on the right */}
        {platform !== 'darwin' && (
          <div className="window-controls">
            <button className="wc-btn" onClick={handleMinimize} title="Minimize">
              ─
            </button>
            <button className="wc-btn" onClick={handleMaximize} title="Maximize">
              {isMaximized ? '⧉' : '□'}
            </button>
            <button className="wc-btn close" onClick={handleClose} title="Close">
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="content">
        <div className="hero">
          <h1>🪟 Frameless Window</h1>
          <p>This window has no native titlebar. The custom titlebar above is built with HTML/CSS.</p>
        </div>

        <div className="features">
          <div className="feature-card">
            <h3>🖱️ Drag Region</h3>
            <p>The titlebar area uses <code>-webkit-app-region: drag</code> to enable window dragging.</p>
          </div>
          <div className="feature-card">
            <h3>🎛️ Window Controls</h3>
            <p>Custom minimize/maximize/close buttons call Go backend <code>WindowService</code>.</p>
          </div>
          <div className="feature-card">
            <h3>🖥️ Platform Aware</h3>
            <p>Buttons position adapts: left on macOS, right on Windows/Linux. Current: <strong>{platform}</strong></p>
          </div>
          <div className="feature-card">
            <h3>🎨 Full Customization</h3>
            <p>Complete control over appearance — rounded corners, gradients, transparency.</p>
          </div>
        </div>

        <div className="code-example">
          <h3>Key CSS Properties</h3>
          <pre>{`/* Make titlebar draggable */
.titlebar {
  -webkit-app-region: drag;
}

/* Buttons must NOT be draggable */
.titlebar button {
  -webkit-app-region: no-drag;
}

/* Go backend: Frameless option */
app.Window.NewWithOptions(WebviewWindowOptions{
  Frameless: true,
})`}</pre>
        </div>
      </div>
    </div>
  )
}

export default App
