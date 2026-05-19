import { useState } from 'react'
import { Counter } from './components/Counter'
import { Calculator } from './components/Calculator'
import { EventDemo } from './components/EventDemo'

type Tab = 'counter' | 'calculator' | 'events'

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('counter')

  return (
    <div className="container">
      <h1>🔗 Binding & Events Demo</h1>
      <p className="subtitle">Explore Wails v3 service binding and event system</p>

      <nav className="tabs">
        <button
          className={activeTab === 'counter' ? 'active' : ''}
          onClick={() => setActiveTab('counter')}
        >
          Counter (State)
        </button>
        <button
          className={activeTab === 'calculator' ? 'active' : ''}
          onClick={() => setActiveTab('calculator')}
        >
          Calculator (Params)
        </button>
        <button
          className={activeTab === 'events' ? 'active' : ''}
          onClick={() => setActiveTab('events')}
        >
          Events (Real-time)
        </button>
      </nav>

      <div className="tab-content">
        {activeTab === 'counter' && <Counter />}
        {activeTab === 'calculator' && <Calculator />}
        {activeTab === 'events' && <EventDemo />}
      </div>
    </div>
  )
}

export default App
