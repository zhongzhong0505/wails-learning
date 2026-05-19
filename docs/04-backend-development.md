# 第四章：Go 后端开发 — 服务与数据

## 4.1 Service 设计模式

在 Wails v3 中，Go 后端的核心是 **Service**。每个 Service 是一个 Go struct，其公开方法自动暴露给前端。

### Service 设计原则

1. **单一职责**：每个 Service 负责一个领域（如 TodoService、UserService）
2. **状态封装**：Service 可以持有状态（如数据库连接、缓存）
3. **线程安全**：使用 `sync.Mutex` 保护共享状态
4. **错误处理**：返回 `error` 类型，前端会收到 rejected Promise

### Service 生命周期钩子

```go
// ServiceStartup is called when the application starts
type ServiceStartup interface {
    OnStartup(ctx context.Context) error
}

// ServiceShutdown is called when the application shuts down
type ServiceShutdown interface {
    OnShutdown() error
}

// Example: Service with lifecycle hooks
type DatabaseService struct {
    db *sql.DB
}

func (s *DatabaseService) OnStartup(ctx context.Context) error {
    var err error
    s.db, err = sql.Open("sqlite3", "./app.db")
    return err
}

func (s *DatabaseService) OnShutdown() error {
    if s.db != nil {
        return s.db.Close()
    }
    return nil
}
```

## 4.2 数据库集成（SQLite）

### 使用 modernc.org/sqlite（纯 Go 实现）

```go
import (
    "database/sql"
    _ "modernc.org/sqlite"
)

type NoteService struct {
    db *sql.DB
}

func (s *NoteService) OnStartup(ctx context.Context) error {
    var err error
    s.db, err = sql.Open("sqlite", "./notes.db")
    if err != nil {
        return err
    }
    
    // Create table if not exists
    _, err = s.db.Exec(`
        CREATE TABLE IF NOT EXISTS notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT DEFAULT '',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `)
    return err
}
```

### CRUD 操作

```go
type Note struct {
    ID        int    `json:"id"`
    Title     string `json:"title"`
    Content   string `json:"content"`
    CreatedAt string `json:"createdAt"`
    UpdatedAt string `json:"updatedAt"`
}

func (s *NoteService) GetAll() ([]Note, error) {
    rows, err := s.db.Query("SELECT id, title, content, created_at, updated_at FROM notes ORDER BY updated_at DESC")
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var notes []Note
    for rows.Next() {
        var n Note
        err := rows.Scan(&n.ID, &n.Title, &n.Content, &n.CreatedAt, &n.UpdatedAt)
        if err != nil {
            return nil, err
        }
        notes = append(notes, n)
    }
    return notes, nil
}

func (s *NoteService) Create(title, content string) (Note, error) {
    result, err := s.db.Exec(
        "INSERT INTO notes (title, content) VALUES (?, ?)",
        title, content,
    )
    if err != nil {
        return Note{}, err
    }
    id, _ := result.LastInsertId()
    return s.GetByID(int(id))
}
```

## 4.3 文件系统操作

```go
import (
    "os"
    "path/filepath"
)

type FileService struct {
    baseDir string
}

func (s *FileService) OnStartup(ctx context.Context) error {
    home, err := os.UserHomeDir()
    if err != nil {
        return err
    }
    s.baseDir = filepath.Join(home, ".myapp", "data")
    return os.MkdirAll(s.baseDir, 0755)
}

func (s *FileService) ReadFile(filename string) (string, error) {
    path := filepath.Join(s.baseDir, filepath.Clean(filename))
    data, err := os.ReadFile(path)
    if err != nil {
        return "", err
    }
    return string(data), nil
}

func (s *FileService) WriteFile(filename, content string) error {
    path := filepath.Join(s.baseDir, filepath.Clean(filename))
    return os.WriteFile(path, []byte(content), 0644)
}

func (s *FileService) ListFiles() ([]string, error) {
    entries, err := os.ReadDir(s.baseDir)
    if err != nil {
        return nil, err
    }
    var files []string
    for _, entry := range entries {
        if !entry.IsDir() {
            files = append(files, entry.Name())
        }
    }
    return files, nil
}
```

## 4.4 并发处理

### Goroutine 在桌面应用中的使用

```go
type TaskService struct {
    mu      sync.Mutex
    tasks   map[string]*Task
    app     *application.App
}

type Task struct {
    ID       string  `json:"id"`
    Name     string  `json:"name"`
    Progress float64 `json:"progress"`
    Status   string  `json:"status"`
}

// StartLongTask starts a background task and reports progress via events
func (s *TaskService) StartLongTask(name string) string {
    taskID := fmt.Sprintf("task-%d", time.Now().UnixNano())
    
    task := &Task{
        ID:     taskID,
        Name:   name,
        Status: "running",
    }
    
    s.mu.Lock()
    s.tasks[taskID] = task
    s.mu.Unlock()

    // Run in background goroutine
    go func() {
        for i := 0; i <= 100; i += 10 {
            time.Sleep(500 * time.Millisecond)
            
            s.mu.Lock()
            task.Progress = float64(i)
            s.mu.Unlock()
            
            // Emit progress event to frontend
            s.app.EmitEvent("task-progress", map[string]interface{}{
                "id":       taskID,
                "progress": float64(i),
            })
        }
        
        s.mu.Lock()
        task.Status = "completed"
        s.mu.Unlock()
        
        s.app.EmitEvent("task-completed", taskID)
    }()

    return taskID
}
```

## 4.5 错误处理策略

### Go 端错误处理

```go
import "errors"

var (
    ErrNotFound     = errors.New("resource not found")
    ErrInvalidInput = errors.New("invalid input")
    ErrUnauthorized = errors.New("unauthorized")
)

func (s *NoteService) GetByID(id int) (Note, error) {
    var n Note
    err := s.db.QueryRow(
        "SELECT id, title, content, created_at, updated_at FROM notes WHERE id = ?", id,
    ).Scan(&n.ID, &n.Title, &n.Content, &n.CreatedAt, &n.UpdatedAt)
    
    if err == sql.ErrNoRows {
        return Note{}, fmt.Errorf("%w: note with id %d", ErrNotFound, id)
    }
    return n, err
}
```

### 前端错误处理

```typescript
async function loadNote(id: number): Promise<void> {
  try {
    const note = await window.go.main.NoteService.GetByID(id)
    setCurrentNote(note)
  } catch (err) {
    // Error from Go is received as a string
    const message = String(err)
    if (message.includes('not found')) {
      setError('Note not found')
    } else {
      setError('Failed to load note')
    }
  }
}
```

## 4.6 本章 Demo：笔记本应用

本章 Demo 是一个完整的笔记本应用，演示了：

- SQLite 数据库集成
- 完整的 CRUD 操作
- 文件系统读写
- Service 生命周期钩子
- 错误处理

→ 查看 Demo 代码：[demos/04-notebook/](../demos/04-notebook/)

## 4.7 本章小结

本章你学到了：
- Service 设计模式和最佳实践
- Service 生命周期钩子（OnStartup/OnShutdown）
- SQLite 数据库集成
- 文件系统操作
- Goroutine 并发处理与事件推送
- 前后端统一错误处理策略

---

**上一章**：[第三章：前端集成 — React + TypeScript](./03-frontend-integration.md)  
**下一章**：[第五章：系统能力 — 原生功能调用](./05-native-features.md)
