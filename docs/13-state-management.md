# 附录E：状态管理进阶

> 当 Wails 应用变得复杂后，如何有效管理前端状态和前后端数据同步。

## E.1 状态管理方案选择

### 方案对比

| 方案 | 适用场景 | 复杂度 | 包大小 |
|------|----------|--------|--------|
| `useState` + `useContext` | 小型应用 | 低 | 0 |
| Zustand | 中型应用 | 低 | ~1KB |
| Jotai | 原子化状态 | 中 | ~2KB |
| MobX | 大型应用 | 中 | ~15KB |
| Redux Toolkit | 超大型应用 | 高 | ~11KB |

**推荐**：Wails 桌面应用推荐使用 **Zustand**，轻量且 API 简洁。

## E.2 使用 Zustand 管理状态

### 安装

```bash
npm install zustand
```

### 基础 Store

```typescript
// src/stores/todoStore.ts
import { create } from 'zustand'

interface Todo {
  id: number
  title: string
  completed: boolean
}

interface TodoState {
  todos: Todo[]
  loading: boolean
  error: string | null
  filter: 'all' | 'active' | 'completed'

  // Actions
  fetchTodos: () => Promise<void>
  addTodo: (title: string) => Promise<void>
  toggleTodo: (id: number) => Promise<void>
  deleteTodo: (id: number) => Promise<void>
  setFilter: (filter: 'all' | 'active' | 'completed') => void
}

export const useTodoStore = create<TodoState>((set, get) => ({
  todos: [],
  loading: false,
  error: null,
  filter: 'all',

  fetchTodos: async () => {
    set({ loading: true, error: null })
    try {
      const todos = await window.go.main.TodoService.GetAll()
      set({ todos: todos || [], loading: false })
    } catch (err) {
      set({ error: String(err), loading: false })
    }
  },

  addTodo: async (title: string) => {
    try {
      const newTodo = await window.go.main.TodoService.Add(title)
      set((state) => ({ todos: [...state.todos, newTodo] }))
    } catch (err) {
      set({ error: String(err) })
    }
  },

  toggleTodo: async (id: number) => {
    try {
      const updated = await window.go.main.TodoService.Toggle(id)
      set((state) => ({
        todos: state.todos.map((t) => (t.id === id ? updated : t)),
      }))
    } catch (err) {
      set({ error: String(err) })
    }
  },

  deleteTodo: async (id: number) => {
    try {
      await window.go.main.TodoService.Delete(id)
      set((state) => ({
        todos: state.todos.filter((t) => t.id !== id),
      }))
    } catch (err) {
      set({ error: String(err) })
    }
  },

  setFilter: (filter) => set({ filter }),
}))
```

### 在组件中使用

```typescript
// src/components/TodoList.tsx
import { useEffect } from 'react'
import { useTodoStore } from '../stores/todoStore'

export function TodoList() {
  const { todos, loading, filter, fetchTodos, toggleTodo, deleteTodo } = useTodoStore()

  useEffect(() => {
    fetchTodos()
  }, [fetchTodos])

  const filteredTodos = todos.filter((todo) => {
    if (filter === 'active') return !todo.completed
    if (filter === 'completed') return todo.completed
    return true
  })

  if (loading) return <div>Loading...</div>

  return (
    <ul>
      {filteredTodos.map((todo) => (
        <li key={todo.id}>
          <input
            type="checkbox"
            checked={todo.completed}
            onChange={() => toggleTodo(todo.id)}
          />
          <span>{todo.title}</span>
          <button onClick={() => deleteTodo(todo.id)}>Delete</button>
        </li>
      ))}
    </ul>
  )
}
```

### 派生状态（Selectors）

```typescript
// Computed values with selectors
function TodoStats() {
  const total = useTodoStore((state) => state.todos.length)
  const completed = useTodoStore((state) => state.todos.filter((t) => t.completed).length)
  const active = total - completed

  return (
    <div>
      <span>Total: {total}</span>
      <span>Active: {active}</span>
      <span>Completed: {completed}</span>
    </div>
  )
}
```

## E.3 前后端状态同步

### 模式一：前端主导（Pull）

前端主动从后端拉取数据，适合用户触发的操作：

```typescript
// Frontend pulls data when needed
const fetchData = async () => {
  const result = await window.go.main.DataService.GetAll()
  setData(result)
}

// Trigger on user action
<button onClick={fetchData}>Refresh</button>
```

### 模式二：后端推送（Push）

后端通过事件主动推送数据变更，适合实时数据：

```go
// Go: Push updates to frontend
func (s *MonitorService) startMonitoring() {
    ticker := time.NewTicker(2 * time.Second)
    go func() {
        for range ticker.C {
            stats := s.collectStats()
            s.app.Event.Emit("stats-update", stats)
        }
    }()
}
```

```typescript
// Frontend: Listen for push updates
import { Events } from '@wailsio/runtime'

const useRealtimeStats = create<StatsState>((set) => ({
  stats: null,

  startListening: () => {
    Events.On('stats-update', (event) => {
      set({ stats: event.data })
    })
  },
}))
```

### 模式三：乐观更新（Optimistic Update）

先更新 UI，再同步后端，失败时回滚：

```typescript
const useTodoStore = create<TodoState>((set, get) => ({
  // ...

  toggleTodo: async (id: number) => {
    const { todos } = get()
    const previousTodos = [...todos]

    // Optimistic update - immediately update UI
    set({
      todos: todos.map((t) =>
        t.id === id ? { ...t, completed: !t.completed } : t
      ),
    })

    try {
      // Sync with backend
      await window.go.main.TodoService.Toggle(id)
    } catch (err) {
      // Rollback on failure
      set({ todos: previousTodos, error: String(err) })
    }
  },
}))
```

## E.4 多窗口状态共享

Wails v3 支持多窗口，窗口间可通过事件共享状态：

### Go 端：广播状态变更

```go
// When data changes, broadcast to all windows
func (s *DataService) UpdateItem(item Item) error {
    err := s.save(item)
    if err != nil {
        return err
    }

    // Broadcast to all windows
    s.app.Event.Emit("data-changed", map[string]any{
        "action": "update",
        "item":   item,
    })
    return nil
}
```

### 前端：监听跨窗口事件

```typescript
// Each window listens for data changes
const useSharedStore = create<SharedState>((set) => ({
  items: [],

  init: () => {
    // Listen for changes from other windows (via Go backend)
    Events.On('data-changed', (event) => {
      const { action, item } = event.data
      set((state) => {
        switch (action) {
          case 'update':
            return { items: state.items.map((i) => (i.id === item.id ? item : i)) }
          case 'delete':
            return { items: state.items.filter((i) => i.id !== item.id) }
          case 'create':
            return { items: [...state.items, item] }
          default:
            return state
        }
      })
    })
  },
}))
```

## E.5 持久化状态

将部分前端状态持久化到后端：

```typescript
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// Custom storage adapter using Go backend
const wailsStorage = createJSONStorage(() => ({
  getItem: async (name: string) => {
    try {
      return await window.go.main.ConfigService.Get(name)
    } catch {
      return null
    }
  },
  setItem: async (name: string, value: string) => {
    await window.go.main.ConfigService.Set(name, value)
  },
  removeItem: async (name: string) => {
    await window.go.main.ConfigService.Delete(name)
  },
}))

// Store with persistence
export const useSettingsStore = create(
  persist<SettingsState>(
    (set) => ({
      theme: 'dark',
      fontSize: 14,
      sidebarOpen: true,

      setTheme: (theme) => set({ theme }),
      setFontSize: (size) => set({ fontSize: size }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
    }),
    {
      name: 'app-settings',
      storage: wailsStorage,
    }
  )
)
```

## E.6 状态管理最佳实践

```
┌─────────────────────────────────────────────────┐
│                 状态分层架构                      │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌─────────────────────────────────────────┐    │
│  │  UI State (组件本地)                     │    │
│  │  - 表单输入、弹窗开关、hover 状态        │    │
│  │  → useState / useReducer                │    │
│  └─────────────────────────────────────────┘    │
│                                                  │
│  ┌─────────────────────────────────────────┐    │
│  │  App State (全局共享)                    │    │
│  │  - 用户信息、主题、业务数据              │    │
│  │  → Zustand Store                        │    │
│  └─────────────────────────────────────────┘    │
│                                                  │
│  ┌─────────────────────────────────────────┐    │
│  │  Server State (后端数据)                 │    │
│  │  - 数据库数据、文件内容                  │    │
│  │  → Go Service + Events                  │    │
│  └─────────────────────────────────────────┘    │
│                                                  │
│  ┌─────────────────────────────────────────┐    │
│  │  Persistent State (持久化)               │    │
│  │  - 用户偏好、窗口位置                    │    │
│  │  → Zustand persist + Go ConfigService   │    │
│  └─────────────────────────────────────────┘    │
│                                                  │
└─────────────────────────────────────────────────┘
```

### 规则总结

1. **UI 状态**放组件内（`useState`）
2. **共享状态**放 Zustand Store
3. **后端数据**通过 Service 调用获取，存入 Store
4. **实时数据**通过 Events 推送更新 Store
5. **持久化数据**使用 Zustand persist 中间件 + Go 后端存储

---

**返回主目录**：[README](../README.md)
