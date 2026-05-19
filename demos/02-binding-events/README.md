# Demo 02: 绑定与事件

演示 Wails v3 的服务绑定（含状态管理）、多参数方法、错误处理以及事件系统。

## 功能特性

- **Counter 服务**：有状态的服务，支持递增/递减/重置
- **Calculator 服务**：多参数方法和错误返回
- **事件系统**：Go 后端实时向前端推送 time-tick 事件
- **自定义事件**：前端向后端发送事件

## 运行方式

```bash
cd frontend && npm install && cd ..
wails3 dev
```

## 核心概念

- 有状态服务（计数器状态在多次调用间保持）
- 错误处理（除以零 → 前端收到 rejected Promise）
- 复杂返回类型（map、struct）
- `EmitEvent()` 实现 Go → 前端 事件推送
- `Events.On()` 在前端监听事件
- `Events.Emit()` 从前端向 Go 发送事件

## 标签页

1. **Counter**：演示有状态的服务绑定
2. **Calculator**：演示多参数方法和错误处理
3. **Events**：演示实时事件通信
