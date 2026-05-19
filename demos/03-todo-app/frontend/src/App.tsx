import { useState, useEffect, useCallback } from 'react'
import { TodoService } from '../bindings/todo-app'

// Types matching Go backend structs
interface Todo {
  id: number
  title: string
  completed: boolean
  createdAt: string
}

type Filter = 'all' | 'active' | 'completed'

interface Stats {
  total: number
  completed: number
  active: number
}

function App() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [newTitle, setNewTitle] = useState<string>('')
  const [filter, setFilter] = useState<Filter>('all')
  const [stats, setStats] = useState<Stats>({ total: 0, completed: 0, active: 0 })
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingTitle, setEditingTitle] = useState<string>('')
  const [error, setError] = useState<string>('')

  const loadTodos = useCallback(async () => {
    try {
      const result = await TodoService.GetFiltered(filter)
      setTodos((result as Todo[]) || [])
      const s = await TodoService.GetStats()
      setStats(s as Stats)
      setError('')
    } catch (err) {
      setError(String(err))
    }
  }, [filter])

  useEffect(() => {
    loadTodos()
  }, [loadTodos])

  async function handleAdd(): Promise<void> {
    if (!newTitle.trim()) return
    try {
      await TodoService.Add(newTitle.trim())
      setNewTitle('')
      await loadTodos()
    } catch (err) {
      setError(String(err))
    }
  }

  async function handleToggle(id: number): Promise<void> {
    try {
      await TodoService.Toggle(id)
      await loadTodos()
    } catch (err) {
      setError(String(err))
    }
  }

  async function handleDelete(id: number): Promise<void> {
    try {
      await TodoService.Delete(id)
      await loadTodos()
    } catch (err) {
      setError(String(err))
    }
  }

  async function handleUpdate(id: number): Promise<void> {
    if (!editingTitle.trim()) return
    try {
      await TodoService.Update(id, editingTitle.trim())
      setEditingId(null)
      setEditingTitle('')
      await loadTodos()
    } catch (err) {
      setError(String(err))
    }
  }

  async function handleClearCompleted(): Promise<void> {
    try {
      await TodoService.ClearCompleted()
      await loadTodos()
    } catch (err) {
      setError(String(err))
    }
  }

  function startEditing(todo: Todo): void {
    setEditingId(todo.id)
    setEditingTitle(todo.title)
  }

  return (
    <div className="todo-app">
      <header className="header">
        <h1>📝 Todo App</h1>
        <p className="subtitle">Built with Wails v3 + React + TypeScript</p>
      </header>

      {/* Add Todo */}
      <div className="add-todo">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="What needs to be done?"
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <button onClick={handleAdd}>Add</button>
      </div>

      {/* Filter */}
      <div className="filters">
        <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>
          All ({stats.total})
        </button>
        <button className={filter === 'active' ? 'active' : ''} onClick={() => setFilter('active')}>
          Active ({stats.active})
        </button>
        <button className={filter === 'completed' ? 'active' : ''} onClick={() => setFilter('completed')}>
          Completed ({stats.completed})
        </button>
      </div>

      {/* Todo List */}
      <ul className="todo-list">
        {todos.length === 0 ? (
          <li className="empty">No todos to show</li>
        ) : (
          todos.map((todo) => (
            <li key={todo.id} className={`todo-item ${todo.completed ? 'completed' : ''}`}>
              {editingId === todo.id ? (
                <div className="editing">
                  <input
                    type="text"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleUpdate(todo.id)
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    autoFocus
                  />
                  <button onClick={() => handleUpdate(todo.id)} className="save">Save</button>
                  <button onClick={() => setEditingId(null)} className="cancel">Cancel</button>
                </div>
              ) : (
                <>
                  <label className="todo-label">
                    <input
                      type="checkbox"
                      checked={todo.completed}
                      onChange={() => handleToggle(todo.id)}
                    />
                    <span className="todo-title">{todo.title}</span>
                  </label>
                  <div className="todo-actions">
                    <button onClick={() => startEditing(todo)} className="edit">✏️</button>
                    <button onClick={() => handleDelete(todo.id)} className="delete">🗑️</button>
                  </div>
                </>
              )}
            </li>
          ))
        )}
      </ul>

      {/* Footer */}
      {stats.completed > 0 && (
        <div className="footer">
          <button onClick={handleClearCompleted} className="clear-completed">
            Clear completed ({stats.completed})
          </button>
        </div>
      )}

      {error && <div className="error">{error}</div>}
    </div>
  )
}

export default App
