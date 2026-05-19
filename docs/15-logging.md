# 附录G：日志系统完整方案

> 本章介绍如何为 Wails v3 应用构建完整的日志系统，覆盖 Go 后端结构化日志、日志文件管理和前端错误收集。

## G.1 Go 结构化日志（slog）

Go 1.21+ 内置了 `log/slog` 结构化日志包，推荐在 Wails 应用中使用：

### 基础使用

```go
import "log/slog"

func (s *MyService) DoWork(id int) error {
    slog.Info("starting work", "id", id)

    result, err := s.process(id)
    if err != nil {
        slog.Error("work failed", "id", id, "error", err)
        return err
    }

    slog.Info("work completed", "id", id, "result", result)
    return nil
}
```

### 配置日志级别和输出

```go
package main

import (
    "log/slog"
    "os"
)

func setupLogger(level string, logFile string) {
    var logLevel slog.Level
    switch level {
    case "debug":
        logLevel = slog.LevelDebug
    case "info":
        logLevel = slog.LevelInfo
    case "warn":
        logLevel = slog.LevelWarn
    case "error":
        logLevel = slog.LevelError
    default:
        logLevel = slog.LevelInfo
    }

    opts := &slog.HandlerOptions{
        Level: logLevel,
        // Add source file info in debug mode
        AddSource: logLevel == slog.LevelDebug,
    }

    var handler slog.Handler
    if logFile != "" {
        // Write to file
        f, err := os.OpenFile(logFile, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
        if err == nil {
            handler = slog.NewJSONHandler(f, opts)
        }
    }

    if handler == nil {
        // Default: write to stderr with text format
        handler = slog.NewTextHandler(os.Stderr, opts)
    }

    slog.SetDefault(slog.New(handler))
}
```

### 带上下文的 Logger

```go
// Create a logger with service context
type NoteService struct {
    logger *slog.Logger
    db     *sql.DB
}

func (s *NoteService) ServiceStartup(_ context.Context, _ application.ServiceOptions) error {
    s.logger = slog.Default().With("service", "NoteService")
    return nil
}

func (s *NoteService) Create(title, content string) (*Note, error) {
    s.logger.Info("creating note", "title", title)

    note, err := s.insertNote(title, content)
    if err != nil {
        s.logger.Error("failed to create note",
            "title", title,
            "error", err,
        )
        return nil, err
    }

    s.logger.Info("note created", "id", note.ID, "title", title)
    return note, nil
}
```

## G.2 日志文件轮转

### 使用 lumberjack 实现日志轮转

```go
import (
    "log/slog"
    "gopkg.in/natefinch/lumberjack.v2"
)

func setupFileLogger() {
    writer := &lumberjack.Logger{
        Filename:   getLogPath(),  // Platform-specific path
        MaxSize:    10,            // MB
        MaxBackups: 5,             // Keep 5 old files
        MaxAge:     30,            // Days
        Compress:   true,          // Gzip old files
    }

    handler := slog.NewJSONHandler(writer, &slog.HandlerOptions{
        Level: slog.LevelInfo,
    })

    slog.SetDefault(slog.New(handler))
}

func getLogPath() string {
    switch runtime.GOOS {
    case "darwin":
        home, _ := os.UserHomeDir()
        return filepath.Join(home, "Library", "Logs", "MyApp", "app.log")
    case "windows":
        return filepath.Join(os.Getenv("LOCALAPPDATA"), "MyApp", "Logs", "app.log")
    default:
        home, _ := os.UserHomeDir()
        return filepath.Join(home, ".local", "share", "myapp", "logs", "app.log")
    }
}
```

### 多输出（同时写文件和控制台）

```go
import "io"

func setupMultiLogger(isDev bool) {
    var writers []io.Writer

    // Always write to file
    fileWriter := &lumberjack.Logger{
        Filename: getLogPath(),
        MaxSize:  10,
        MaxAge:   30,
    }
    writers = append(writers, fileWriter)

    // In dev mode, also write to stderr
    if isDev {
        writers = append(writers, os.Stderr)
    }

    multiWriter := io.MultiWriter(writers...)

    var handler slog.Handler
    if isDev {
        handler = slog.NewTextHandler(multiWriter, &slog.HandlerOptions{
            Level:     slog.LevelDebug,
            AddSource: true,
        })
    } else {
        handler = slog.NewJSONHandler(multiWriter, &slog.HandlerOptions{
            Level: slog.LevelInfo,
        })
    }

    slog.SetDefault(slog.New(handler))
}
```

## G.3 前端错误收集

### 全局错误捕获

```typescript
// src/errorHandler.ts

interface ErrorReport {
  message: string
  stack?: string
  component?: string
  timestamp: string
  userAgent: string
}

// Global error handler
window.onerror = (message, source, lineno, colno, error) => {
  reportError({
    message: String(message),
    stack: error?.stack,
    component: `${source}:${lineno}:${colno}`,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
  })
}

// Promise rejection handler
window.onunhandledrejection = (event) => {
  reportError({
    message: `Unhandled Promise: ${event.reason}`,
    stack: event.reason?.stack,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
  })
}

async function reportError(report: ErrorReport) {
  console.error('[Error Report]', report)
  try {
    // Send to Go backend for logging
    await window.go.main.LogService.ReportFrontendError(JSON.stringify(report))
  } catch {
    // If backend is unavailable, store locally
    const errors = JSON.parse(localStorage.getItem('error_reports') || '[]')
    errors.push(report)
    localStorage.setItem('error_reports', JSON.stringify(errors.slice(-50)))
  }
}
```

### React Error Boundary

```typescript
// src/components/ErrorBoundary.tsx
import { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Report to backend
    window.go.main.LogService.ReportFrontendError(
      JSON.stringify({
        message: error.message,
        stack: error.stack,
        component: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
      })
    )
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div style={{ padding: 20, color: 'red' }}>
          <h2>Something went wrong</h2>
          <pre>{this.state.error?.message}</pre>
        </div>
      )
    }
    return this.props.children
  }
}
```

## G.4 Go 端日志 Service

```go
// log_service.go
package main

import (
    "context"
    "log/slog"

    "github.com/wailsapp/wails/v3/pkg/application"
)

type LogService struct {
    logger *slog.Logger
}

func (s *LogService) ServiceStartup(_ context.Context, _ application.ServiceOptions) error {
    s.logger = slog.Default().With("source", "frontend")
    return nil
}

// ReportFrontendError logs frontend errors
func (s *LogService) ReportFrontendError(errorJSON string) {
    s.logger.Error("frontend error", "details", errorJSON)
}

// GetLogPath returns the log file path for the user
func (s *LogService) GetLogPath() string {
    return getLogPath()
}
```

## G.5 崩溃日志收集

```go
// crash_handler.go
package main

import (
    "fmt"
    "os"
    "runtime/debug"
    "time"
)

func setupCrashHandler() {
    defer func() {
        if r := recover(); r != nil {
            crashLog := fmt.Sprintf(
                "=== CRASH REPORT ===\nTime: %s\nError: %v\nStack:\n%s\n",
                time.Now().Format(time.RFC3339),
                r,
                string(debug.Stack()),
            )

            // Write crash log
            crashFile := filepath.Join(getLogDir(), "crash.log")
            os.MkdirAll(filepath.Dir(crashFile), 0755)
            f, err := os.OpenFile(crashFile, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
            if err == nil {
                f.WriteString(crashLog)
                f.Close()
            }

            // Also print to stderr
            fmt.Fprintln(os.Stderr, crashLog)
            os.Exit(1)
        }
    }()
}
```

## G.6 日志最佳实践

| 实践 | 说明 |
|------|------|
| 使用结构化日志 | `slog.Info("msg", "key", value)` 而非 `log.Printf` |
| 区分日志级别 | Debug（开发）、Info（正常）、Warn（异常）、Error（错误） |
| 包含上下文 | 每条日志带 service 名、操作 ID 等上下文 |
| 生产环境用 JSON | 方便日志分析工具解析 |
| 控制日志大小 | 使用 lumberjack 轮转，避免磁盘占满 |
| 不记录敏感信息 | 密码、token 等不要出现在日志中 |
| 前端错误上报 | 通过 Service 将前端错误写入后端日志 |

---

**返回主目录**：[README](../README.md)
