# Demo 06: 系统监控面板

一个实时系统监控仪表盘，演示高级事件通信和实时数据更新。

## 功能特性

- 实时 CPU 和内存使用率展示
- 进度条可视化
- 使用历史图表（文本形式）
- 详细内存信息分解
- Go 运行时信息
- 强制垃圾回收
- 暗色主题仪表盘

## 运行方式

```bash
cd frontend && npm install && cd ..
wails3 dev
```

## 核心概念

- 使用 Goroutine + `time.Ticker` 定时推送数据
- `EmitEvent()` 实现实时数据推送
- `runtime.ReadMemStats()` 获取 Go 内存统计
- `runtime.NumGoroutine()` 获取 goroutine 数量
- 事件取消函数实现清理
- CSS Grid 仪表盘布局
- 历史状态管理（滑动窗口）

## 架构

```
Go 后端 (goroutine)
    │ 每 2 秒
    ▼
EmitEvent("system-stats-update", stats)
    │
    ▼
前端 (Events.On 监听器)
    │
    ▼
更新 React 状态 → 重新渲染 UI
```
