import { useState } from 'react'
import { GreetService } from '../bindings/hello-world'

function App() {
  const [name, setName] = useState<string>('')
  const [greeting, setGreeting] = useState<string>('')
  const [info, setInfo] = useState<Record<string, string> | null>(null)

  // Call Go backend GreetService.Greet method
  async function greet(): Promise<void> {
    try {
      const result = await GreetService.Greet(name)
      setGreeting(result)
    } catch (err) {
      console.error('Failed to greet:', err)
    }
  }

  // Call Go backend GreetService.GetWailsInfo method
  async function fetchInfo(): Promise<void> {
    try {
      const result = await GreetService.GetWailsInfo()
      setInfo(result as Record<string, string>)
    } catch (err) {
      console.error('Failed to get info:', err)
    }
  }

  return (
    <div className="container">
      <h1>🎉 Hello Wails v3</h1>
      <p className="subtitle">Your first Wails v3 desktop application with React + TypeScript</p>

      <div className="card">
        <div className="input-group">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            onKeyDown={(e) => e.key === 'Enter' && greet()}
          />
          <button onClick={greet}>Greet</button>
        </div>

        {greeting && (
          <div className="result">
            <p>{greeting}</p>
          </div>
        )}
      </div>

      <div className="card">
        <button onClick={fetchInfo} className="secondary">
          Get Wails Info
        </button>

        {info && (
          <div className="info-grid">
            {Object.entries(info).map(([key, value]) => (
              <div key={key} className="info-item">
                <span className="info-key">{key}</span>
                <span className="info-value">{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default App
