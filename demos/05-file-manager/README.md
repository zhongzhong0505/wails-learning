# Demo 05: 文件管理器

一个简易文件管理器，演示 Wails v3 的原生系统功能调用。

## 功能特性

- **原生对话框**：打开文件、打开文件夹、保存文件对话框
- **应用菜单**：File 菜单和 Edit 菜单，带快捷键
- **文件浏览**：读取目录内容，点击浏览文件
- **文件预览**：选中文件后展示内容
- **剪贴板操作**：复制文件路径到剪贴板、读取剪贴板内容
- **消息对话框**：操作成功后弹出原生提示

## 运行方式

```bash
cd frontend && npm install && cd ..
wails3 dev
```

## 核心概念

- `application.OpenFileDialog()` 打开文件选择对话框
- `application.SaveFileDialog()` 打开保存文件对话框
- `dialog.CanChooseDirectories(true)` 允许选择文件夹
- `dialog.AddFilter()` 添加文件类型过滤器
- `app.NewMenu()` 创建应用菜单
- `SetAccelerator("CmdOrCtrl+O")` 绑定快捷键
- `app.EmitEvent()` 菜单事件通知前端
- `application.Get().Clipboard()` 剪贴板操作
- `Events.On()` 前端监听菜单事件

## 架构

```
┌─────────────────────────────────────┐
│           应用菜单 (Go)              │
│  File: Open/Save  Edit: Copy Path   │
└──────────────┬──────────────────────┘
               │ EmitEvent
               ▼
┌─────────────────────────────────────┐
│          前端 (React)                │
│  Events.On() 监听菜单事件            │
├──────────────┬──────────────────────┤
│   文件列表    │     文件预览          │
└──────┬───────┴──────────┬───────────┘
       │                  │
       ▼                  ▼
┌──────────────┐  ┌───────────────────┐
│FileManager   │  │ClipboardService   │
│Service       │  │                   │
│- OpenDialog  │  │- CopyText         │
│- ReadDir     │  │- PasteText        │
│- ReadFile    │  │                   │
└──────────────┘  └───────────────────┘
```
