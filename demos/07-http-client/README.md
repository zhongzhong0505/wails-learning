# Demo 07: HTTP 客户端

一个 HTTP 客户端工具，演示 Wails v3 中的网络请求和外部 API 集成。

## 功能特性

- **HTTP 请求构建器**：支持 GET/POST/PUT/DELETE 方法
- **响应展示**：状态码、耗时、响应头、格式化 JSON 响应体
- **快捷请求**：一键调用 JSONPlaceholder 和 GitHub API
- **文件下载**：带实时进度条的下载功能
- **进度事件**：Go 后端通过 Events 推送下载进度到前端

## 运行方式

```bash
cd frontend && npm install && cd ..
go mod tidy
wails3 dev
```

## 核心概念

### 网络请求（Go 后端发起）

```go
// Go 后端负责所有网络请求，前端不直接发起 HTTP 请求
resp, err := http.Get(url)
```

**为什么在 Go 端发起请求？**
- 无 CORS 限制（桌面应用不受浏览器同源策略限制）
- 可以访问系统证书
- 可以使用 Go 的并发能力处理大文件下载
- 安全：API Key 等敏感信息不暴露给前端

### 下载进度推送

```go
// Go 端：边下载边通过事件推送进度
s.app.Event.Emit("download-progress", progress)
```

```typescript
// 前端：监听进度事件更新 UI
Events.On('download-progress', (event) => {
  setProgress(event.data)
})
```

## 架构

```
┌─────────────────────────────────────┐
│          前端 (React)                │
│  ┌─────────────┐ ┌───────────────┐ │
│  │ Request     │ │ Download      │ │
│  │ Builder     │ │ Progress Bar  │ │
│  └──────┬──────┘ └───────┬───────┘ │
│         │                 │ Events.On│
└─────────┼─────────────────┼─────────┘
          │ Binding Call    │ Event Push
          ▼                 │
┌─────────────────────────────────────┐
│          Go 后端                     │
│  ┌─────────────┐ ┌───────────────┐ │
│  │HTTPService  │ │DownloadService│ │
│  │- Get/Post   │ │- StartDownload│ │
│  │- GitHub API │ │- Progress emit│ │
│  └─────────────┘ └───────────────┘ │
│         │                 │         │
│         ▼                 ▼         │
│    net/http          goroutine      │
│    (无 CORS)         (并发下载)      │
└─────────────────────────────────────┘
```
