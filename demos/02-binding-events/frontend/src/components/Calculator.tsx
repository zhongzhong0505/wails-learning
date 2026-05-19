import { useState } from 'react'
import { CalculatorService } from '../../bindings/binding-events'

type Operation = 'add' | 'subtract' | 'multiply' | 'divide' | 'power' | 'sqrt' | 'batch'

export function Calculator() {
  const [numA, setNumA] = useState<string>('10')
  const [numB, setNumB] = useState<string>('3')
  const [operation, setOperation] = useState<Operation>('add')
  const [result, setResult] = useState<string>('')
  const [error, setError] = useState<string>('')

  async function calculate(): Promise<void> {
    try {
      const a = parseFloat(numA)
      const b = parseFloat(numB)

      if (isNaN(a) || (operation !== 'sqrt' && isNaN(b))) {
        setError('Please enter valid numbers')
        return
      }

      let res: number | Record<string, number> | unknown

      switch (operation) {
        case 'add':
          res = await CalculatorService.Add(a, b)
          setResult(`${a} + ${b} = ${res}`)
          break
        case 'subtract':
          res = await CalculatorService.Subtract(a, b)
          setResult(`${a} - ${b} = ${res}`)
          break
        case 'multiply':
          res = await CalculatorService.Multiply(a, b)
          setResult(`${a} × ${b} = ${res}`)
          break
        case 'divide':
          res = await CalculatorService.Divide(a, b)
          setResult(`${a} ÷ ${b} = ${res}`)
          break
        case 'power':
          res = await CalculatorService.Power(a, b)
          setResult(`${a} ^ ${b} = ${res}`)
          break
        case 'sqrt':
          res = await CalculatorService.Sqrt(a)
          setResult(`√${a} = ${res}`)
          break
        case 'batch':
          res = await CalculatorService.BatchCalculate(a, b)
          setResult(JSON.stringify(res, null, 2))
          break
      }
      setError('')
    } catch (err) {
      setError(String(err))
      setResult('')
    }
  }

  return (
    <div className="demo-section">
      <h2>Calculator Service</h2>
      <p className="description">
        Demonstrates methods with multiple parameters, return values, and error handling.
        Try dividing by zero or taking sqrt of a negative number!
      </p>

      <div className="calc-inputs">
        <input
          type="number"
          value={numA}
          onChange={(e) => setNumA(e.target.value)}
          placeholder="Number A"
        />
        {operation !== 'sqrt' && (
          <input
            type="number"
            value={numB}
            onChange={(e) => setNumB(e.target.value)}
            placeholder="Number B"
          />
        )}
      </div>

      <div className="operation-select">
        <select value={operation} onChange={(e) => setOperation(e.target.value as Operation)}>
          <option value="add">Add (+)</option>
          <option value="subtract">Subtract (-)</option>
          <option value="multiply">Multiply (×)</option>
          <option value="divide">Divide (÷)</option>
          <option value="power">Power (^)</option>
          <option value="sqrt">Square Root (√)</option>
          <option value="batch">Batch Calculate (All)</option>
        </select>
        <button onClick={calculate}>Calculate</button>
      </div>

      {result && (
        <pre className="result-display">{result}</pre>
      )}

      {error && <div className="error">{error}</div>}
    </div>
  )
}
