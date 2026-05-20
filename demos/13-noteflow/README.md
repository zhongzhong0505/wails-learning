# NoteFlow — 跨平台笔记应用 (Wails v3)

> 一个完整的大型 Wails v3 实战项目，展示模块化架构设计、前后端分层、Service 绑定机制。

## 🏗️ 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React + TS)                      │
├──────────┬──────────┬──────────┬──────────────────────────────┤
│Components│  Hooks   │ Services │         Styles               │
│ (UI组件) │(业务Hook)│(API封装) │       (CSS主题)              │
└──────────┴──────────┴──────────┴──────────────────────────────┘
                              │ Wails Bindings (Call.ByName)
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

## 📁 项目结构

```
demos/13-noteflow/
├── main.go                      # App entry + window config
├── go.mod                       # Go dependencies
├── Taskfile.yml                 # Build tasks
├── models/                      # Data models
│   ├── note.go                  #   Note + params
│   ├── folder.go                #   Folder + params
│   └── common.go                #   NoteStats + AppInfo
├── services/                    # Business logic (Wails Services)
│   ├── database.go              #   SQLite init + migrations
│   ├── note_service.go          #   Note CRUD + search + stats
│   ├── folder_service.go        #   Folder CRUD + counts
│   └── settings_service.go      #   Platform info
└── frontend/                    # React frontend
    ├── index.html
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    └── src/
        ├── main.tsx
        ├── App.tsx              # Main orchestrator
        ├── components/          # UI components
        │   ├── Sidebar.tsx      #   Folder navigation + theme
        │   ├── NoteList.tsx     #   Note list + search
        │   └── NoteEditor.tsx   #   Editor with auto-save
        ├── hooks/               # Custom hooks
        │   ├── useNotes.ts      #   Note state management
        │   ├── useFolders.ts    #   Folder state management
        │   └── useTheme.ts      #   Theme management
        ├── services/            # Backend API wrappers
        │   ├── noteApi.ts       #   Note service bindings
        │   ├── folderApi.ts     #   Folder service bindings
        │   └── settingsApi.ts   #   Settings service bindings
        └── styles/              # CSS
            ├── variables.css    #   Theme variables
            └── global.css       #   Layout + components
```

## 🚀 运行方式

```bash
cd demos/13-noteflow

# Install frontend dependencies
cd frontend && npm install && cd ..

# Download Go dependencies
go mod tidy

# Run in dev mode
wails3 dev
```

## 🔑 核心知识点

| 模块 | 知识点 |
|------|--------|
| 模块化 Go | models/ + services/ 分层、Service 生命周期 |
| SQLite 数据库 | 迁移、WAL 模式、CRUD、LIKE 搜索 |
| Wails Service | OnStartup/OnShutdown 生命周期、自动绑定 |
| 前端 Service 层 | `Call.ByName` 封装、类型安全 |
| 状态管理 | Custom Hooks + 防抖自动保存 |
| 主题切换 | CSS Variables + localStorage + 系统检测 |
| 窗口定制 | macOS 透明标题栏、拖拽区域 |
