
# 第二章：核心原理 — 架构与通信机制

## 2.1 整体架构

Wails v3 采用双层架构设计：

```
┌─────────────────────────────────────────────────┐
│                  Wails Application               │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌──────────────────┐    ┌───────────────────┐  │
│  │   Go Backend     │    │   Web Frontend    │  │
│  │                  │    │                   │  │
│  │  • Services      │◄──►│  • UI (HTML/CSS)  │  │
│  │  • Business Logic│    │  • JS/TS Logic    │  │
│  │  • System Access │    │  • Framework      │  │
│  │  • File I/O      │    │    (Vue/React)    │  │
│  │                  │    │                   │  │
│  └──────────────────┘    └───────────────────┘  │
│           │                        │             │
│           ▼                        ▼             │
│  ┌──────────────────────────────────────────┐   │
│  │         Wails Runtime Bridge              │   │
│  │  (IPC / Binding / Events / Dialogs)       │   │
│  └──────────────────────────────────────────┘   │
│                       │                          │
│                       ▼                          │
│  ┌──────────────────────────────────────────┐   │
│  │         Native WebView                    │   │
│  │  macOS: WKWebView                         │   │
│  │  Windows: WebView2 (Edge/Chromium)        │   │
│  │  Linux: WebKitGTK                         │   │
│  └──────────────────────────────────────────┘   │
│                                                  │
└─────────────────────────────────────────────────┘
```

### 核心组件

1. **Application** — 应用容器，管理生命周期
2. **Services** — Go 服务，暴露方法给前端
3. **WebviewWindow** — 窗口管理，支持多窗口
4. **Events** — 事件总线，前后端双向通信
5. **Runtime Bridge** — 底层通信桥梁

## 2.2 应用生命周期

```
application.New()
       │
       ▼
   app.Run()
       │
       ├── OnStartup()      // Application starting
       │
       ├── Create Windows   // Windows created and shown
       │
       ├── Running...       // Application running (event loop)
       │
       ├── OnShutdown()     // Application shutting down
       │
       ▼
   app exits
```

### 生命周期钩子

```go
app := application.New(application.Options{
    Name: "my-app",
    // Called when the application starts
    OnStartup: func(ctx context.Context) {
        fmt.Println("Application started")
    },
    // Called when the application is shutting down
    OnShutdown: func(ctx context.Context) {
        fmt.Println("Application shutting down")
    },
})
```

## 2.3 Service 绑定机制（核心）

Wails v3 使用 **Service** 模式替代了 v2 的 Bind 机制。任何 Go struct 都可以注册为 Service，其公开方法会自动暴露给前端。

### 工作原理

```
┌─────────────┐         ┌──────────────────┐         ┌─────────────┐
│  Frontend   │  ──►    │  Wails Runtime   │  ──►    │  Go Service │
│  JS Call    │         │  (Deserialize +  │         │  Method     │
│             │  ◄──    │   Serialize)     │  ◄──    │  Execution  │
│  Promise    │         │                  │         │  Return     │
└─────────────┘         └──────────────────┘         └─────────────┘
```

1. 前端调用生成的绑定函数
2. Wails Runtime 将参数序列化，通过 IPC 发送到 Go 端
3. Go 端反序列化参数，调用对应 Service 方法
4. 返回值序列化后通过 IPC 返回前端
5. 前端收到 Promise resolve 的结果

### Service 定义规则

```go
// Service struct - any exported struct can be a service
type MyService struct {
    // Can have fields for state management
    counter int
}

// Exported methods become available to frontend
// Method signature: func (s *MyService) MethodName(args...) (returnType, error)
func (s *MyService) GetCounter() int {
    return s.counter
}

func (s *MyService) Increment() int {
    s.counter++
    return s.counter
}

// Methods can return errors - they become rejected promises in frontend
func (s *MyService) Divide(a, b float64) (float64, error) {
    if b == 0 {
        return 0, fmt.Errorf("cannot divide by zero")
    }
    return a / b, nil
}

// Unexported methods are NOT exposed to frontend
func (s *MyService) internalHelper() {
    // This is private
}
```

### 注册 Service

```go
app := application.New(application.Options{
    Services: []application.Service{
        application.NewService(&MyService{}),
    },
})
```

### 前端调用

Wails v3 会自动生成 TypeScript 绑定文件：

```typescript
// Auto-generated bindings
import { MyService } from '../bindings/mypackage'

// Call Go methods - returns Promise
const count = await MyService.GetCounter()
const newCount = await MyService.Increment()

// Error handling
try {
    const result = await MyService.Divide(10, 0)
} catch (error) {
    console.error(error) // "cannot divide by zero"
}
```

## 2.4 事件系统

Wails v3 提供了完整的事件总线，支持前后端双向通信。

### 事件类型

| 类型 | 说明 | 方向 |
|------|------|------|
| Application Events | 应用级事件 | Go ↔ Frontend |
| Window Events | 窗口事件 | 系统 → Go/Frontend |
| Custom Events | 自定义事件 | Go ↔ Frontend |

### Go 端发送事件

```go
// Emit event to all listeners (frontend + backend)
app.EmitEvent("user-logged-in", map[string]string{
    "username": "john",
    "role":     "admin",
})

// Emit event to specific window
window.EmitEvent("data-updated", data)
```

### Go 端监听事件

```go
// Listen for events from frontend
app.OnEvent("request-data", func(event *application.CustomEvent) {
    // Handle event
    fmt.Println("Received:", event.Data)
    
    // Can emit response event
    app.EmitEvent("data-response", responseData)
})
```

### 前端发送事件

```typescript
import { Events } from '@wailsio/runtime'

// Emit event to Go backend
Events.Emit({ name: 'request-data', data: { id: 123 } })
```

### 前端监听事件

```typescript
import { Events } from '@wailsio/runtime'

// Listen for events from Go
Events.On('user-logged-in', (event) => {
    console.log('User logged in:', event.data)
})

// Listen once
Events.Once('init-complete', (event) => {
    console.log('Initialization complete')
})

// Remove listener
const cancel = Events.On('data-updated', handler)
cancel() // Unsubscribe
```

## 2.5 窗口系统

Wails v3 原生支持多窗口：

```go
// Create main window
mainWindow := app.NewWebviewWindowWithOptions(application.WebviewWindowOptions{
    Title:  "Main Window",
    Width:  1024,
    Height: 768,
    URL:    "/",
})

// Create secondary window
settingsWindow := app.NewWebviewWindowWithOptions(application.WebviewWindowOptions{
    Title:  "Settings",
    Width:  600,
    Height: 400,
    URL:    "/settings",
    Hidden: true, // Start hidden
})

// Show/hide windows programmatically
settingsWindow.Show()
settingsWindow.Hide()

// Window events
mainWindow.OnWindowEvent(events.Common.WindowClosing, func(event *application.WindowEvent) {
    fmt.Println("Window is closing")
})
```

## 2.6 数据类型映射

Go 和 JavaScript 之间的类型自动转换：

| Go Type | TypeScript Type | 说明 |
|---------|----------------|------|
| `string` | `string` | 直接映射 |
| `int`, `int64`, `float64` | `number` | 数值类型 |
| `bool` | `boolean` | 布尔值 |
| `[]T` | `T[]` | 数组/切片 |
| `map[K]V` | `Record<K, V>` | 映射 |
| `struct` | `interface` | 自动生成 TS 接口 |
| `error` | `Error` (rejected) | 错误变为 rejected Promise |
| `(T, error)` | `Promise<T>` | 多返回值 |

## 2.7 本章 Demo：绑定与事件通信

本章 Demo 演示了 Service 绑定和事件系统的完整用法。

→ 查看 Demo 代码：[demos/02-binding-events/](../demos/02-binding-events/)

### Demo 功能

1. Service 方法调用（计数器）
2. 带参数和返回值的方法调用
3. 错误处理
4. 事件发送与监听
5. 实时数据推送（Go → Frontend）

## 2.8 本章小结

本章你学到了：
- Wails v3 的整体架构设计
- 应用生命周期和钩子函数
- Service 绑定机制的工作原理
- 事件系统的双向通信
- 多窗口管理
- Go 与 JavaScript 的类型映射

---

**上一章**：[第一章：认识 Wails v3](./01-getting-started.md)  
**下一章**：[第三章：前端集成 — 多框架支持](./03-frontend-integration.md)
