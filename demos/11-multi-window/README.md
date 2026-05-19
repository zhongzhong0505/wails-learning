# Demo 11: 多窗口通信

演示 Wails v3 的多窗口创建和跨窗口数据通信。

## 功能特性

- **动态创建窗口**：主窗口可以打开设置窗口和子窗口
- **广播消息**：任意窗口发送消息，所有窗口都能收到
- **共享数据**：多窗口共享同一份数据，实时同步
- **窗口类型识别**：通过 URL 参数区分不同窗口的 UI

## 运行方式

```bash
cd frontend && npm install && cd ..
go mod tidy
wails3 dev
```

## 核心概念

### 动态创建窗口

```go
func (s *WindowManagerService) OpenSettingsWindow() {
    s.app.Window.NewWithOptions(application.WebviewWindowOptions{
        Title: "Settings",
        Width: 500, Height: 400,
        URL: "/?window=settings",  // URL 参数区分窗口
    })
}
```

### 跨窗口通信（通过事件）

```go
// Go 端广播事件 — 所有窗口都会收到
s.app.Event.Emit("broadcast-message", data)
```

```typescript
// 前端每个窗口都监听同一事件
Events.On('broadcast-message', (event) => {
  setMessages(prev => [event.data, ...prev])
})
```

### 共享数据同步

```go
// 数据变更时通知所有窗口
func (s *SharedDataService) AddItem(text, createdBy string) SharedItem {
    // ... save item ...
    s.app.Event.Emit("shared-data-changed", map[string]interface{}{
        "action": "add",
        "item":   item,
    })
    return item
}
```

### 窗口类型识别

```typescript
// 前端通过 URL 参数判断当前是哪个窗口
const params = new URLSearchParams(window.location.search)
const windowType = params.get('window') || 'main'
```

## 架构

```
┌─────────────────────────────────────────────────┐
│                  Go Backend                      │
│  ┌──────────────────┐  ┌─────────────────────┐ │
│  │WindowManagerSvc  │  │  SharedDataService   │ │
│  │- OpenWindow()    │  │  - items []Item      │ │
│  │- Broadcast()     │  │  - AddItem()         │ │
│  └────────┬─────────┘  └──────────┬──────────┘ │
│           │ Event.Emit            │ Event.Emit  │
└───────────┼───────────────────────┼─────────────┘
            │                       │
    ┌───────┼───────────────────────┼───────┐
    │       ▼                       ▼       │
    │  ┌─────────┐  ┌─────────┐  ┌───────┐ │
    │  │Main Win │  │Settings │  │Child  │ │
    │  │Events.On│  │Events.On│  │Events │ │
    │  └─────────┘  └─────────┘  └───────┘ │
    │         All windows receive events     │
    └────────────────────────────────────────┘
```
