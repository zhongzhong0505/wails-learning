# Demo 12: 原生交互综合

综合演示 Wails v3 的多种原生交互能力。

## 功能特性

- **拖放文件**：从系统拖拽文件到窗口，读取内容并预览
- **快捷键**：全局快捷键绑定（⌘O/⌘S/⌘⇧N/⌘⇧D），操作日志实时显示
- **右键菜单**：文件列表右键弹出上下文菜单（打开/复制路径/删除）
- **通知系统**：操作反馈通过通知面板展示
- **剪贴板**：复制文件路径到系统剪贴板

## 运行方式

```bash
cd frontend && npm install && cd ..
go mod tidy
wails3 dev
```

## 核心概念

### 快捷键绑定

```go
app.KeyBinding.Set("CmdOrCtrl+S", func(_ application.Window) {
    app.Event.Emit("shortcut:save")
})
```

### 右键上下文菜单

```go
ctxMenu := app.ContextMenu.New()
ctxMenu.Add("Copy Path").OnClick(func(_ *application.Context) {
    app.Event.Emit("context:copy-path")
})
app.ContextMenu.Add("file-menu", ctxMenu)
```

```html
<!-- 前端通过 data-contextmenu 属性绑定 -->
<div data-contextmenu="file-menu">Right click me</div>
```

### 拖放文件

```go
// 窗口配置启用文件拖放
app.Window.NewWithOptions(application.WebviewWindowOptions{
    DragAndDrop: application.DragAndDropOptions{
        EnableFileDrop: true,
    },
})
```

```typescript
// 前端处理 drop 事件
const handleDrop = async (e: React.DragEvent) => {
  e.preventDefault()
  const file = e.dataTransfer.files[0] as File & { path?: string }
  const info = await InteractionService.ReadDroppedFile(file.path)
}
```

## 快捷键列表

| 快捷键 | 功能 |
|--------|------|
| ⌘/Ctrl + O | 打开文件 |
| ⌘/Ctrl + S | 保存 |
| ⌘/Ctrl + Shift + N | 新建 |
| ⌘/Ctrl + Shift + D | 删除 |
