# 第九章：大型实战项目 — NoteFlow 跨平台笔记应用

## 9.1 项目概述

NoteFlow 是一个完整的跨平台笔记应用，展示了 Wails v3 在真实大型项目中的最佳实践。

### 功能特性

- 📝 笔记 CRUD（创建/读取/更新/删除）
- 📁 文件夹分类管理
- 🔍 全文搜索（LIKE 模式匹配）
- 📌 置顶 & 归档
- 🎨 暗色/亮色主题（跟随系统）
- 💾 自动保存（防抖 500ms）
- 🖥️ 桌面端三栏布局
- ⚡ Wails v3 Service 绑定机制

### 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18 + TypeScript + Vite |
| 后端 | Go + Wails v3 |
| 数据库 | SQLite (modernc.org/sqlite) |
| 样式 | CSS Variables + 响应式布局 |
| 状态管理 | Custom Hooks |

## 9.2 架构设计

### 分层架构

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React + TS)                      │
├──────────┬──────────┬──────────┬──────────────────────────────┤
│Components│  Hooks   │ Services │         Styles               │
│ (UI组件) │(业务Hook)│(API封装) │       (CSS主题)              │
└──────────┴──────────┴──────────┴──────────────────────────────┘
                              │ Wails Bindings
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Go)                               │
├──────────┬──────────┬──────────────────────────────────────────┤
│  Models  │ Services │              main.go                     │
│(数据模型)│(业务逻辑)│         (应用入口+窗口配置)              │
└──────────┴──────────┴──────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │   SQLite (本地DB)   │
                    └───────────────────┘
```

### 设计原则

1. **关注点分离**：Models 定义数据结构，Services 处理业务逻辑，main.go 只做应用配置
2. **单一职责**：每个 Service 只负责一个领域（notes / folders / settings）
3. **前后端解耦**：前端通过 Service 层调用后端，不直接使用 Wails API
4. **生命周期管理**：利用 `OnStartup` / `OnShutdown` 管理资源

### 数据流

```
用户操作 → Component → Hook → Service (Call.ByName) → Go Service → DB
                                                          ↓
用户看到 ← Component ← Hook ← Promise resolve ← Go Service return
```

## 9.3 后端模块详解

### Wails v3 Service 机制

在 Wails v3 中，后端功能通过 **Service** 暴露给前端。每个 Service 是一个 Go struct，其公开方法自动绑定为前端可调用的函数。

```go
// main.go — 注册多个 Service
app := application.New(application.Options{
    Services: []application.Service{
        application.NewService(noteService),
        application.NewService(folderService),
        application.NewService(settingsService),
    },
})
```

### Service 生命周期

```go
// OnStartup — 应用启动时调用，用于初始化资源
func (s *NoteService) OnStartup(ctx context.Context) error {
    db, err := InitDatabase()
    s.db = db
    return err
}

// OnShutdown — 应用关闭时调用，用于清理资源
func (s *NoteService) OnShutdown() error {
    return s.db.Close()
}
```

### 数据库设计（services/database.go）

```go
func InitDatabase() (*sql.DB, error) {
    // 1. 确定数据目录
    home, _ := os.UserHomeDir()
    dataDir := filepath.Join(home, ".noteflow")
    os.MkdirAll(dataDir, 0755)

    // 2. 打开数据库
    db, _ := sql.Open("sqlite", filepath.Join(dataDir, "noteflow.db"))

    // 3. 启用 WAL 模式（提升并发性能）
    db.Exec("PRAGMA journal_mode=WAL")

    // 4. 运行迁移
    runMigrations(db)
    return db, nil
}
```

### 动态 SQL 构建（services/note_service.go）

```go
func (s *NoteService) Update(id string, title, content *string, ...) (models.Note, error) {
    var setClauses []string
    var args []interface{}

    // 只更新非 nil 的字段
    if title != nil {
        setClauses = append(setClauses, "title = ?")
        args = append(args, *title)
    }
    if content != nil {
        setClauses = append(setClauses, "content = ?")
        args = append(args, *content)
    }

    query := fmt.Sprintf("UPDATE notes SET %s WHERE id = ?", strings.Join(setClauses, ", "))
    args = append(args, id)
    s.db.Exec(query, args...)
}
```

## 9.4 前端模块详解

### Service 层封装

Wails v3 通过 `wails.Call.ByName` 调用后端方法：

```typescript
// services/noteApi.ts
async function callBackend(service: string, method: string, ...args: any[]) {
  return (window as any).wails.Call.ByName(
    `noteflow/services.${service}.${method}`, ...args
  )
}

export const noteApi = {
  async create(title: string, content: string, folderId?: string) {
    return callBackend('NoteService', 'Create', title, content, folderId || null)
  },
  // ...
}
```

好处：
- 类型安全（TypeScript 接口）
- 集中管理所有后端调用
- 方便 mock 测试
- 前端组件不直接依赖 Wails API

### Custom Hooks 模式

```typescript
// hooks/useNotes.ts — 封装所有笔记相关状态和操作
export function useNotes(folderId?: string) {
  const [notes, setNotes] = useState<Note[]>([])
  const [activeNote, setActiveNote] = useState<Note | null>(null)

  const createNote = useCallback(async () => { ... }, [])
  const updateNote = useCallback(async () => { ... }, [])

  return { notes, activeNote, createNote, updateNote, ... }
}
```

### 自动保存（防抖）

```typescript
// components/NoteEditor.tsx
const debouncedSave = useCallback((title, content) => {
  if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
  saveTimerRef.current = setTimeout(() => {
    onUpdate(noteIdRef.current, title, content)
  }, 500)  // 500ms debounce
}, [onUpdate])
```

### 主题系统

```typescript
// hooks/useTheme.ts
export function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system')

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    // 根据 theme 设置和系统偏好决定实际主题
    document.documentElement.setAttribute('data-theme', resolved)
  }, [theme])
}
```

## 9.5 Wails v3 vs Tauri v2 对比

| 特性 | Wails v3 (Go) | Tauri v2 (Rust) |
|------|---------------|-----------------|
| 后端语言 | Go | Rust |
| 前端调用 | `Call.ByName` | `invoke()` |
| 服务注册 | `application.NewService()` | `invoke_handler![]` |
| 生命周期 | `OnStartup/OnShutdown` | `.setup()` |
| 状态管理 | Service struct 字段 | `State<Mutex<T>>` |
| 移动端 | ❌ 不支持 | ✅ iOS/Android |
| 包体积 | ~10MB | ~3MB |
| 编译速度 | 快（Go） | 慢（Rust） |
| 内存安全 | GC | 编译期保证 |

## 9.6 窗口定制

### macOS 透明标题栏

```go
app.NewWebviewWindowWithOptions(application.WebviewWindowOptions{
    Mac: application.MacWindow{
        InvisibleTitleBarHeight: 50,
        Backdrop:               application.MacBackdropTranslucent,
        TitleBar:               application.MacTitleBarHiddenInset,
    },
})
```

### CSS 拖拽区域

```css
.sidebar {
  --wails-draggable: drag;  /* 整个侧边栏可拖拽 */
}

.sidebar-content {
  --wails-draggable: none;  /* 内容区域不可拖拽 */
}
```

## 9.7 运行项目

```bash
cd demos/13-noteflow

# Install frontend dependencies
cd frontend && npm install && cd ..

# Download Go dependencies
go mod tidy

# Run in dev mode
wails3 dev

# Build for production
wails3 build
```

## 9.8 本章小结

通过 NoteFlow 项目，你学到了：

| 知识点 | 实践 |
|--------|------|
| 模块化架构 | Models / Services 分层 |
| 数据库设计 | SQLite WAL 模式、迁移、动态 SQL |
| Service 机制 | OnStartup/OnShutdown 生命周期 |
| 前端 Service 层 | `Call.ByName` 封装 + TypeScript 类型 |
| 状态管理 | Custom Hooks + 防抖自动保存 |
| 主题系统 | CSS Variables + 系统检测 + localStorage |
| 窗口定制 | macOS 透明标题栏 + CSS 拖拽区域 |
| 类型安全 | Go struct ↔ TypeScript interface 对应 |

---

**下一步**：[附录A：调试技巧与常见问题排查](./09-faq-and-debugging.md)
