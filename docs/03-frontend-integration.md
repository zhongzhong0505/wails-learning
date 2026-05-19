# 第三章：前端集成 — React + TypeScript

## 3.1 概述

Wails v3 支持任何现代前端框架（React、Vue、Svelte、Angular 等），本教程统一使用 **React + TypeScript** 作为前端技术栈。

### 为什么选择 React + TypeScript？

- **类型安全**：TypeScript 与 Wails 自动生成的绑定类型完美配合
- **生态丰富**：React 拥有最大的组件库和工具链生态
- **开发体验**：配合 Vite 实现极速 HMR

## 3.2 前端项目结构

```
frontend/
├── src/
│   ├── main.tsx           # Entry point
│   ├── App.tsx            # Root component
│   ├── components/        # Reusable components
│   │   ├── TodoItem.tsx
│   │   └── TodoFilter.tsx
│   ├── hooks/             # Custom hooks
│   │   └── useWailsService.ts
│   ├── types/             # TypeScript type definitions
│   │   └── wails.d.ts
│   └── style.css          # Global styles
├── index.html             # HTML entry
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## 3.3 Wails 绑定的 TypeScript 类型

### 手动声明类型

在 Wails v3 中，Go Service 的方法会通过 `window.go` 暴露给前端。我们需要为这些绑定声明 TypeScript 类型：

```typescript
// src/types/wails.d.ts

// Define types matching Go structs
interface Todo {
  id: number
  title: string
  completed: boolean
  createdAt: string
}

// Declare the global window.go bindings
declare global {
  interface Window {
    go: {
      main: {
        TodoService: {
          GetAll(): Promise<Todo[]>
          Add(title: string): Promise<Todo>
          Toggle(id: number): Promise<Todo>
          Delete(id: number): Promise<void>
          Update(id: number, title: string): Promise<Todo>
          ClearCompleted(): Promise<Todo[]>
          GetStats(): Promise<{ total: number; completed: number; active: number }>
        }
      }
    }
  }
}

export {}
```

### 自动生成绑定（Wails v3 特性）

Wails v3 在 `wails3 dev` 模式下会自动生成 TypeScript 绑定文件到 `frontend/bindings/` 目录：

```
frontend/bindings/
├── main/
│   ├── TodoService.ts     # Auto-generated service bindings
│   └── models.ts          # Auto-generated Go struct types
└── index.ts
```

使用自动生成的绑定：

```typescript
import { TodoService } from '../bindings/main'
import { Todo } from '../bindings/main/models'

const todos: Todo[] = await TodoService.GetAll()
```

## 3.4 自定义 Hooks 封装

封装 Wails Service 调用为 React Hooks，提升代码复用性：

```typescript
// src/hooks/useTodoService.ts
import { useState, useCallback } from 'react'

interface Todo {
  id: number
  title: string
  completed: boolean
  createdAt: string
}

export function useTodoService() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTodos = useCallback(async (filter: string = 'all') => {
    setLoading(true)
    try {
      const result = await window.go.main.TodoService.GetFiltered(filter)
      setTodos(result || [])
      setError(null)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  const addTodo = useCallback(async (title: string) => {
    try {
      await window.go.main.TodoService.Add(title)
      await fetchTodos()
    } catch (err) {
      setError(String(err))
    }
  }, [fetchTodos])

  return { todos, loading, error, fetchTodos, addTodo }
}
```

## 3.5 Wails Runtime API

Wails v3 提供了 `@wailsio/runtime` 包，包含以下 API：

### Events API

```typescript
import { Events } from '@wailsio/runtime'

// Listen for events
Events.On('event-name', (data) => { /* handle */ })

// Emit events
Events.Emit({ name: 'event-name', data: payload })
```

### Window API

```typescript
import { Window } from '@wailsio/runtime'

// Minimize/Maximize/Close
Window.Minimise()
Window.Maximise()
Window.Close()

// Set title
Window.SetTitle('New Title')

// Fullscreen
Window.Fullscreen()
```

### Dialog API

```typescript
import { Dialogs } from '@wailsio/runtime'

// Open file dialog
const file = await Dialogs.OpenFile({
  title: 'Select a file',
  filters: [{ displayName: 'Text Files', pattern: '*.txt' }]
})

// Save file dialog
const path = await Dialogs.SaveFile({
  title: 'Save as',
  defaultFilename: 'untitled.txt'
})

// Message dialog
await Dialogs.Info({ title: 'Info', message: 'Operation complete!' })
```

## 3.6 Vite 配置详解

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    // Ensure assets are embedded correctly
    assetsDir: 'assets',
    // Generate sourcemaps for debugging
    sourcemap: true,
  },
  server: {
    // Wails dev server will proxy to this
    port: 5173,
    strictPort: true,
  },
})
```

## 3.7 静态资源管理

### Go embed 机制

Wails 使用 Go 的 `embed` 包将前端构建产物嵌入到最终二进制文件中：

```go
//go:embed all:frontend/dist
var assets embed.FS
```

### 图片和字体

将静态资源放在 `frontend/public/` 或 `frontend/src/assets/` 中：

```
frontend/
├── public/
│   └── logo.png          # Copied as-is to dist/
└── src/
    └── assets/
        └── icon.svg      # Processed by Vite (can import in code)
```

在 React 中使用：

```tsx
// Import processed assets
import iconSvg from './assets/icon.svg'

// Reference public assets
<img src="/logo.png" alt="Logo" />
```

## 3.8 热重载开发流程

```bash
# Start development mode
wails3 dev
```

开发模式下的工作流：

1. Wails 启动 Vite dev server（前端 HMR）
2. Wails 监听 Go 文件变更，自动重新编译
3. 绑定文件自动重新生成
4. 前端通过 WebSocket 接收 HMR 更新

## 3.9 本章 Demo：Todo App

本章 Demo 是一个完整的 Todo 应用，演示了：

- React + TypeScript 项目结构
- Wails Service 绑定调用
- 状态管理与 UI 交互
- 类型安全的前后端通信
- 列表渲染、条件渲染、事件处理

→ 查看 Demo 代码：[demos/03-todo-app/](../demos/03-todo-app/)

## 3.10 本章小结

本章你学到了：
- React + TypeScript 在 Wails v3 中的项目结构
- 如何为 Wails 绑定声明 TypeScript 类型
- 自定义 Hooks 封装 Service 调用
- Wails Runtime API（Events、Window、Dialog）
- Vite 配置与静态资源管理
- 热重载开发流程

---

**上一章**：[第二章：核心原理 — 架构与通信机制](./02-architecture.md)  
**下一章**：[第四章：Go 后端开发 — 服务与数据](./04-backend-development.md)
