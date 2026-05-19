# Demo 04: 笔记本

一个带 SQLite 持久化存储的笔记本应用，演示 Go 后端开发模式。

## 功能特性

- SQLite 数据库持久化存储
- 笔记的完整 CRUD 操作
- 搜索功能
- 分类过滤
- Service 生命周期钩子（OnStartup/OnShutdown）
- 侧边栏 + 内容区布局

## 运行方式

```bash
cd frontend && npm install && cd ..
wails3 dev
```

## 核心概念

- `modernc.org/sqlite` 纯 Go 实现的 SQLite
- `OnStartup()` 用于数据库初始化
- `OnShutdown()` 用于资源清理
- `sync.RWMutex` 实现线程安全操作
- 参数化 SQL 查询
- 使用 `sql.ErrNoRows` 进行错误处理

## 数据存储

笔记存储在 `~/.wails-notebook/notes.db`（SQLite 数据库）。
