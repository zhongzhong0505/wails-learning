# 第六章：高级特性 — 进阶开发

## 6.1 复杂事件通信模式

### 请求-响应模式

```go
// Go: Listen for request, send response
app.OnEvent("fetch-user-data", func(event *application.CustomEvent) {
    userID := event.Data.(string)
    
    // Simulate async data fetch
    go func() {
        user, err := fetchUser(userID)
        if err != nil {
            app.EmitEvent("user-data-error", err.Error())
            return
        }
        app.EmitEvent("user-data-response", user)
    }()
})
```

```typescript
// Frontend: Request-Response pattern
async function fetchUserData(userId: string): Promise<User> {
  return new Promise((resolve, reject) => {
    const cancelSuccess = Events.On('user-data-response', (event) => {
      cancelSuccess()
      cancelError()
      resolve(event.data as User)
    })
    const cancelError = Events.On('user-data-error', (event) => {
      cancelSuccess()
      cancelError()
      reject(new Error(event.data as string))
    })
    Events.Emit({ name: 'fetch-user-data', data: userId })
  })
}
```

### 发布-订阅模式

```go
// Go: Broadcast to multiple listeners
type NotificationService struct {
    app *application.App
}

func (s *NotificationService) BroadcastNotification(title, message string) {
    s.app.EmitEvent("notification", map[string]string{
        "title":   title,
        "message": message,
        "time":    time.Now().Format(time.RFC3339),
    })
}
```

## 6.2 中间件与拦截器

### Service 方法拦截

```go
// Logging middleware pattern
type LoggingService struct {
    inner *ActualService
}

func (s *LoggingService) DoSomething(input string) (string, error) {
    start := time.Now()
    log.Printf("[START] DoSomething(%s)", input)
    
    result, err := s.inner.DoSomething(input)
    
    log.Printf("[END] DoSomething took %v, err=%v", time.Since(start), err)
    return result, err
}
```

## 6.3 错误处理策略

### 统一错误类型

```go
// Custom error types for frontend consumption
type AppError struct {
    Code    string `json:"code"`
    Message string `json:"message"`
    Details string `json:"details,omitempty"`
}

func (e *AppError) Error() string {
    return fmt.Sprintf("[%s] %s", e.Code, e.Message)
}

// Usage in service
func (s *UserService) Login(username, password string) (*User, error) {
    if username == "" {
        return nil, &AppError{Code: "VALIDATION", Message: "Username is required"}
    }
    user, err := s.authenticate(username, password)
    if err != nil {
        return nil, &AppError{Code: "AUTH_FAILED", Message: "Invalid credentials"}
    }
    return user, nil
}
```

### 前端错误处理

```typescript
interface AppError {
  code: string
  message: string
  details?: string
}

function parseError(err: unknown): AppError {
  const message = String(err)
  // Parse structured error from Go
  const match = message.match(/\[(\w+)\] (.+)/)
  if (match) {
    return { code: match[1], message: match[2] }
  }
  return { code: 'UNKNOWN', message }
}
```

## 6.4 日志系统

### 结构化日志

```go
import "log/slog"

type AppLogger struct {
    logger *slog.Logger
}

func NewAppLogger() *AppLogger {
    handler := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
        Level: slog.LevelDebug,
    })
    return &AppLogger{
        logger: slog.New(handler),
    }
}

func (l *AppLogger) Info(msg string, args ...any) {
    l.logger.Info(msg, args...)
}

func (l *AppLogger) Error(msg string, err error, args ...any) {
    allArgs := append([]any{"error", err}, args...)
    l.logger.Error(msg, allArgs...)
}
```

## 6.5 性能优化

### 减少 IPC 调用

```go
// Bad: Multiple small calls
// Frontend calls GetName(), GetEmail(), GetAvatar() separately

// Good: Batch into single call
func (s *UserService) GetProfile() UserProfile {
    return UserProfile{
        Name:   s.user.Name,
        Email:  s.user.Email,
        Avatar: s.user.Avatar,
    }
}
```

### 大数据传输优化

```go
// For large data, use pagination
func (s *DataService) GetItems(page, pageSize int) (PageResult, error) {
    offset := (page - 1) * pageSize
    items, err := s.db.Query(
        "SELECT * FROM items LIMIT ? OFFSET ?", pageSize, offset,
    )
    // ...
    total := s.getTotal()
    return PageResult{
        Items:      items,
        Total:      total,
        Page:       page,
        PageSize:   pageSize,
        TotalPages: (total + pageSize - 1) / pageSize,
    }, nil
}
```

## 6.6 本章 Demo：系统监控面板

本章 Demo 是一个系统监控面板，演示了：

- 实时数据推送（CPU、内存、磁盘使用率）
- 复杂事件通信
- 图表展示
- 性能优化技巧

→ 查看 Demo 代码：[demos/06-system-monitor/](../demos/06-system-monitor/)

## 6.7 本章小结

本章你学到了：
- 复杂事件通信模式（请求-响应、发布-订阅）
- 中间件和拦截器模式
- 统一错误处理策略
- 结构化日志系统
- 性能优化技巧

---

**上一章**：[第五章：系统能力 — 原生功能调用](./05-native-features.md)  
**下一章**：[第七章：构建与发布 — 打包部署](./07-build-and-deploy.md)
