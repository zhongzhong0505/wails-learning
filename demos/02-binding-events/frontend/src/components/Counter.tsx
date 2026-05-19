import { useState } from 'react'
import { CounterService } from '../../bindings/binding-events'

export function Counter() {
  const [count, setCount] = useState<number>(0)
  const [info, setInfo] = useState<Record<string, unknown> | null>(null)
  const [incrementAmount, setIncrementAmount] = useState<string>('5')
  const [error, setError] = useState<string>('')

  async function handleIncrement(): Promise<void> {
    try {
      const result = await CounterService.Increment()
      setCount(result as number)
      setError('')
    } catch (err) {
      setError(String(err))
    }
  }

  async function handleDecrement(): Promise<void> {
    try {
      const result = await CounterService.Decrement()
      setCount(result as number)
      setError('')
    } catch (err) {
      setError(String(err))
    }
  }

  async function handleReset(): Promise<void> {
    try {
      const result = await CounterService.Reset()
      setCount(result as number)
      setInfo(null)
      setError('')
    } catch (err) {
      setError(String(err))
    }
  }

  async function handleIncrementBy(): Promise<void> {
    try {
      const amount = parseInt(incrementAmount, 10)
      if (isNaN(amount)) {
        setError('Please enter a valid number')
        return
      }
      const result = await CounterService.IncrementBy(amount)
      setCount(result as number)
      setError('')
    } catch (err) {
      setError(String(err))
    }
  }

  async function handleGetInfo(): Promise<void> {
    try {
      const result = await CounterService.GetCounterInfo()
      setInfo(result as Record<string, unknown>)
      setError('')
    } catch (err) {
      setError(String(err))
    }
  }

  return (
    <div className="demo-section">
      <h2>Counter Service</h2>
      <p className="description">
        Demonstrates stateful service binding. The counter state lives in Go backend.
      </p>

      <div className="counter-display">
        <span className="count-value">{count}</span>
      </div>

      <div className="button-group">
        <button onClick={handleDecrement}>- 1</button>
        <button onClick={handleIncrement}>+ 1</button>
        <button onClick={handleReset} className="secondary">Reset</button>
      </div>

      <div className="increment-by">
        <input
          type="number"
          value={incrementAmount}
          onChange={(e) => setIncrementAmount(e.target.value)}
          placeholder="Amount"
        />
        <button onClick={handleIncrementBy}>Increment By</button>
      </div>

      <button onClick={handleGetInfo} className="info-btn">
        Get Counter Info (Complex Return Type)
      </button>

      {info && (
        <pre className="info-display">
          {JSON.stringify(info, null, 2)}
        </pre>
      )}

      {error && <div className="error">{error}</div>}
    </div>
  )
}
