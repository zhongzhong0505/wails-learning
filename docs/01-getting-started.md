
# 第一章：认识 Wails v3 — 入门与环境搭建

## 1.1 什么是 Wails？

Wails 是一个用 Go 语言构建桌面应用的框架。它允许你使用 Go 编写后端逻辑，使用任何前端技术（React、Vue、Svelte 等）构建 UI，最终编译成一个原生的桌面应用程序。

### 核心理念

- **Go 后端**：利用 Go 的高性能、并发能力和丰富的标准库
- **Web 前端**：使用现代 Web 技术构建美观的 UI
- **原生渲染**：使用系统 WebView（非 Chromium），应用体积极小
- **无缝通信**：前后端通过绑定机制直接调用，无需 REST API

### 与 Electron 的对比

| 特性 | Wails v3 | Electron |
|------|----------|----------|
| 应用体积 | ~8MB | ~150MB+ |
| 内存占用 | ~30MB | ~100MB+ |
| 启动速度 | 极快 | 较慢 |
| 后端语言 | Go | Node.js |
| 渲染引擎 | 系统 WebView | Chromium |
| 跨平台 | ✅ macOS/Windows/Linux | ✅ macOS/Windows/Linux |

### Wails v3 vs v2 的主要变化

| 特性 | v2 | v3 |
|------|----|----|
| 应用创建 | `wails.Run(&options{})` | `application.New(options)` |
| 绑定方式 | `Bind: []interface{}` | Service 注册机制 |
| 多窗口 | 不支持 | 原生支持 |
| 系统托盘 | 第三方库 | 内置支持 |
| 事件系统 | 简单事件 | 完整的事件总线 |
| CLI 工具 | `wails` | `wails3` |

## 1.2 环境准备

### 安装 Go

```bash
# macOS (Homebrew)
brew install go

# Verify
go version
# Expected: go1.22.4 or later
```

### 安装 Node.js

```bash
# macOS (Homebrew)
brew install node

# Or use nvm
nvm install 20
nvm use 20

# Verify
node --version
# Expected: v20.x.x
```

### 安装 Wails v3 CLI

```bash
# Install wails3 CLI tool
go install github.com/wailsapp/wails/v3/cmd/wails3@latest

# Verify installation
wails3 version
```

### macOS 额外依赖

macOS 使用 WebKit (WKWebView) 作为渲染引擎，系统自带，无需额外安装。

确保安装了 Xcode Command Line Tools：

```bash
xcode-select --install
```

## 1.3 创建第一个项目

### 使用 CLI 创建

```bash
# Create a new project with default template
wails3 init -n hello-world -t react

# Enter project directory
cd hello-world

# Install frontend dependencies
cd frontend && npm install && cd ..

# Run in development mode
wails3 dev
```

### 项目结构解析

```
hello-world/
├── build/                  # Build configuration and assets
│   ├── appicon.png         # Application icon
│   ├── darwin/             # macOS specific build files
│   ├── windows/            # Windows specific build files
│   └── linux/              # Linux specific build files
├── frontend/               # Frontend project (React + TypeScript)
│   ├── src/
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── main.go                 # Application entry point
├── app.go                  # Application service (bound to frontend)
├── go.mod                  # Go module file
├── go.sum
└── wails.json              # Wails project configuration
```

### 关键文件说明

**main.go** — 应用入口：

```go
package main

import (
    "embed"
    "log"

    "github.com/wailsapp/wails/v3/pkg/application"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
    app := application.New(application.Options{
        Name:        "hello-world",
        Description: "A demo Wails v3 application",
        Services: []application.Service{
            application.NewService(&GreetService{}),
        },
        Assets: application.AssetOptions{
            Handler: application.AssetFileServerFS(assets),
        },
    })

    app.NewWebviewWindowWithOptions(application.WebviewWindowOptions{
        Title:  "Hello World",
        Width:  1024,
        Height: 768,
    })

    err := app.Run()
    if err != nil {
        log.Fatal(err)
    }
}
```

**app.go** — 服务定义：

```go
package main

import "fmt"

// GreetService is a service that provides greeting functionality
type GreetService struct{}

// Greet returns a greeting message for the given name
func (s *GreetService) Greet(name string) string {
    return fmt.Sprintf("Hello %s, welcome to Wails v3!", name)
}
```

**前端调用（React + TypeScript 示例）**：

```tsx
import { useState } from 'react'

// Type declaration for Wails v3 bindings
declare global {
  interface Window {
    go: {
      main: {
        GreetService: {
          Greet(name: string): Promise<string>
        }
      }
    }
  }
}

function App() {
    const [name, setName] = useState<string>('')
    const [greeting, setGreeting] = useState<string>('')

    async function greet(): Promise<void> {
        const result = await window.go.main.GreetService.Greet(name)
        setGreeting(result)
    }

    return (
        <div>
            <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
            />
            <button onClick={greet}>Greet</button>
            <p>{greeting}</p>
        </div>
    )
}

export default App
```

## 1.4 开发模式

### wails3 dev

开发模式提供：
- 前端热重载（HMR）
- Go 代码变更自动重新编译
- 自动生成前端绑定代码
- 开发者工具（DevTools）支持

```bash
# Start dev mode
wails3 dev

# With custom flags
wails3 dev -browser  # Open in browser for debugging
```

### 调试技巧

1. **前端调试**：右键 → Inspect Element，或使用 `-browser` 标志在浏览器中调试
2. **Go 调试**：使用 Delve 或 IDE 的调试功能
3. **日志输出**：Go 的 `fmt.Println` / `log.Println` 会输出到终端

## 1.5 构建生产版本

```bash
# Build for current platform
wails3 build

# The binary will be in build/bin/
```

## 1.6 本章小结

本章你学到了：
- Wails 的核心理念和优势
- Wails v3 相比 v2 的主要变化
- 环境搭建和工具安装
- 创建并运行第一个 Wails v3 项目
- 项目结构和关键文件的作用
- 开发模式和构建命令

---

**下一章**：[第二章：核心原理 — 架构与通信机制](./02-architecture.md)
