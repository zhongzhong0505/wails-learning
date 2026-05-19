# 附录B：测试专题 — 单元测试与集成测试

> 本章介绍如何为 Wails v3 应用编写测试，覆盖 Go 后端 Service 测试、前端组件测试和集成测试思路。

## B.1 Go Service 单元测试

### 基本测试结构

Wails Service 本质上就是普通的 Go struct，可以直接用标准 `testing` 包测试：

```go
// greet_service_test.go
package main

import "testing"

func TestGreetService_Greet(t *testing.T) {
    service := &GreetService{}

    tests := []struct {
        name     string
        input    string
        expected string
    }{
        {"normal name", "World", "Hello, World!"},
        {"empty name", "", "Hello, !"},
        {"chinese name", "小明", "Hello, 小明!"},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            result := service.Greet(tt.input)
            if result != tt.expected {
                t.Errorf("Greet(%q) = %q, want %q", tt.input, result, tt.expected)
            }
        })
    }
}
```

### 测试带状态的 Service

```go
// todo_service_test.go
package main

import (
    "testing"
)

func newTestTodoService() *TodoService {
    return &TodoService{
        todos:  make([]Todo, 0),
        nextID: 1,
    }
}

func TestTodoService_Add(t *testing.T) {
    service := newTestTodoService()

    todo, err := service.Add("Buy groceries")
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
    if todo.Title != "Buy groceries" {
        t.Errorf("title = %q, want %q", todo.Title, "Buy groceries")
    }
    if todo.Completed {
        t.Error("new todo should not be completed")
    }
    if todo.ID != 1 {
        t.Errorf("id = %d, want 1", todo.ID)
    }
}

func TestTodoService_Toggle(t *testing.T) {
    service := newTestTodoService()
    service.Add("Test task")

    toggled, err := service.Toggle(1)
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
    if !toggled.Completed {
        t.Error("toggled todo should be completed")
    }

    // Toggle back
    toggled, err = service.Toggle(1)
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
    if toggled.Completed {
        t.Error("double-toggled todo should not be completed")
    }
}

func TestTodoService_Delete(t *testing.T) {
    service := newTestTodoService()
    service.Add("Task 1")
    service.Add("Task 2")

    err := service.Delete(1)
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }

    todos := service.GetAll()
    if len(todos) != 1 {
        t.Errorf("expected 1 todo, got %d", len(todos))
    }
}

func TestTodoService_Delete_NotFound(t *testing.T) {
    service := newTestTodoService()

    err := service.Delete(999)
    if err == nil {
        t.Error("expected error for non-existent todo")
    }
}
```

### 测试数据库相关 Service

使用内存数据库或临时文件进行测试：

```go
// note_service_test.go
package main

import (
    "context"
    "os"
    "testing"
)

func setupTestNoteService(t *testing.T) (*NoteService, func()) {
    t.Helper()

    // Use temp file for test database
    tmpFile, err := os.CreateTemp("", "test-notes-*.db")
    if err != nil {
        t.Fatalf("failed to create temp file: %v", err)
    }
    tmpFile.Close()

    service := &NoteService{dbPath: tmpFile.Name()}
    err = service.ServiceStartup(context.Background(), application.ServiceOptions{})
    if err != nil {
        t.Fatalf("failed to start service: %v", err)
    }

    cleanup := func() {
        service.ServiceShutdown()
        os.Remove(tmpFile.Name())
    }

    return service, cleanup
}

func TestNoteService_CRUD(t *testing.T) {
    service, cleanup := setupTestNoteService(t)
    defer cleanup()

    // Create
    note, err := service.Create("Test Note", "Hello content")
    if err != nil {
        t.Fatalf("Create failed: %v", err)
    }
    if note.Title != "Test Note" {
        t.Errorf("title = %q, want %q", note.Title, "Test Note")
    }

    // Read
    notes, err := service.GetAll()
    if err != nil {
        t.Fatalf("GetAll failed: %v", err)
    }
    if len(notes) != 1 {
        t.Fatalf("expected 1 note, got %d", len(notes))
    }

    // Update
    updated, err := service.Update(note.ID, "Updated Title", "Updated content")
    if err != nil {
        t.Fatalf("Update failed: %v", err)
    }
    if updated.Title != "Updated Title" {
        t.Errorf("updated title = %q, want %q", updated.Title, "Updated Title")
    }

    // Delete
    err = service.Delete(note.ID)
    if err != nil {
        t.Fatalf("Delete failed: %v", err)
    }

    notes, err = service.GetAll()
    if err != nil {
        t.Fatalf("GetAll after delete failed: %v", err)
    }
    if len(notes) != 0 {
        t.Errorf("expected 0 notes after delete, got %d", len(notes))
    }
}
```

### 并发安全测试

```go
func TestCounterService_Concurrent(t *testing.T) {
    service := &CounterService{}
    const goroutines = 100

    var wg sync.WaitGroup
    wg.Add(goroutines)

    for i := 0; i < goroutines; i++ {
        go func() {
            defer wg.Done()
            service.Increment()
        }()
    }

    wg.Wait()

    count := service.GetCount()
    if count != goroutines {
        t.Errorf("count = %d, want %d (race condition detected)", count, goroutines)
    }
}
```

## B.2 Mock application.App

当 Service 依赖 `application.App`（如发送事件），可以通过接口抽象来 mock：

```go
// Define interface for testability
type EventEmitter interface {
    Emit(name string, data ...any) bool
}

// Production service uses real app
type MonitorService struct {
    emitter EventEmitter
}

// In production
func (s *MonitorService) ServiceStartup(_ context.Context, _ application.ServiceOptions) error {
    s.emitter = application.Get().Event
    return nil
}

// In tests - mock emitter
type mockEmitter struct {
    events []struct {
        name string
        data []any
    }
}

func (m *mockEmitter) Emit(name string, data ...any) bool {
    m.events = append(m.events, struct {
        name string
        data []any
    }{name, data})
    return true
}

func TestMonitorService_EmitsEvents(t *testing.T) {
    mock := &mockEmitter{}
    service := &MonitorService{emitter: mock}

    service.CheckCPU()

    if len(mock.events) == 0 {
        t.Error("expected at least one event to be emitted")
    }
    if mock.events[0].name != "cpu-update" {
        t.Errorf("event name = %q, want %q", mock.events[0].name, "cpu-update")
    }
}
```

## B.3 前端组件测试

### 安装测试依赖

```bash
npm install -D @testing-library/react @testing-library/jest-dom vitest jsdom
```

### Vitest 配置

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
})
```

### Mock Wails Bindings

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom'

// Mock window.go for testing outside Wails
window.go = {
  main: {
    GreetService: {
      Greet: vi.fn().mockResolvedValue('Hello, Test!'),
    },
    TodoService: {
      GetAll: vi.fn().mockResolvedValue([]),
      Add: vi.fn().mockResolvedValue({ id: 1, title: 'New', completed: false }),
      Toggle: vi.fn().mockResolvedValue({ id: 1, title: 'New', completed: true }),
      Delete: vi.fn().mockResolvedValue(undefined),
    },
  },
} as any

// Mock @wailsio/runtime
vi.mock('@wailsio/runtime', () => ({
  Events: {
    On: vi.fn(() => vi.fn()),
    Emit: vi.fn(),
  },
  Window: {
    Minimise: vi.fn(),
    Maximise: vi.fn(),
    Close: vi.fn(),
  },
}))
```

### 组件测试示例

```typescript
// src/App.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import App from './App'

describe('App', () => {
  it('renders greeting input and button', () => {
    render(<App />)
    expect(screen.getByPlaceholderText(/name/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /greet/i })).toBeInTheDocument()
  })

  it('calls GreetService and displays result', async () => {
    render(<App />)

    const input = screen.getByPlaceholderText(/name/i)
    const button = screen.getByRole('button', { name: /greet/i })

    fireEvent.change(input, { target: { value: 'World' } })
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText('Hello, Test!')).toBeInTheDocument()
    })
  })
})
```

### 测试自定义 Hook

```typescript
// src/hooks/useTodoService.test.ts
import { renderHook, act } from '@testing-library/react'
import { useTodoService } from './useTodoService'

describe('useTodoService', () => {
  it('fetches todos on mount', async () => {
    const { result } = renderHook(() => useTodoService())

    await act(async () => {
      await result.current.fetchTodos()
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('adds a todo', async () => {
    const { result } = renderHook(() => useTodoService())

    await act(async () => {
      await result.current.addTodo('New Task')
    })

    expect(window.go.main.TodoService.Add).toHaveBeenCalledWith('New Task')
  })
})
```

## B.4 运行测试

### Go 测试

```bash
# Run all tests
go test ./...

# Run with verbose output
go test -v ./...

# Run specific test
go test -run TestTodoService_Add ./...

# Run with race detector
go test -race ./...

# Generate coverage report
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out
```

### 前端测试

```bash
# Run tests
npx vitest

# Run with coverage
npx vitest --coverage

# Watch mode
npx vitest --watch
```

## B.5 集成测试思路

对于 Wails 应用的端到端测试，推荐以下策略：

```
┌─────────────────────────────────────────────┐
│              测试金字塔                       │
├─────────────────────────────────────────────┤
│                                             │
│         ▲  E2E Tests (少量)                 │
│        ╱ ╲  - 手动验证关键流程              │
│       ╱   ╲ - 截图对比                      │
│      ╱─────╲                                │
│     ╱Integration╲ (适量)                    │
│    ╱  Tests      ╲ - Service + DB           │
│   ╱               ╲- API 调用链             │
│  ╱─────────────────╲                        │
│ ╱   Unit Tests      ╲ (大量)               │
│╱  - Go Service 方法   ╲                    │
│  - React 组件          ╲                   │
│  - 工具函数              ╲                  │
│                                             │
└─────────────────────────────────────────────┘
```

### 推荐测试比例

- **单元测试 70%**：Service 方法、工具函数、React 组件
- **集成测试 20%**：Service + 数据库、多 Service 协作
- **E2E 测试 10%**：关键用户流程手动验证

---

**返回主目录**：[README](../README.md)
