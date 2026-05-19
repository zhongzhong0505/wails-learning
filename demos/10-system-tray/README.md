# Demo 10: 系统托盘

演示 Wails v3 的系统托盘（System Tray）功能。

## 功能特性

- **托盘图标**：在系统托盘显示自定义图标
- **托盘菜单**：右键点击显示上下文菜单
- **窗口切换**：点击托盘图标显示/隐藏主窗口
- **后台运行**：关闭窗口后应用继续在托盘运行
- **事件通知**：托盘菜单操作通过事件通知前端
- **运行时间**：后台持续追踪应用运行时间

## 运行方式

```bash
cd frontend && npm install && cd ..
go mod tidy
wails3 dev
```

## 核心概念

### 创建系统托盘

```go
tray := app.SystemTray.New()
tray.SetIcon(iconBytes)
tray.SetTooltip("My App")
tray.SetMenu(menu)
```

### 托盘点击事件

```go
tray.OnClick(func() {
    // Toggle window visibility
    if mainWindow.IsVisible() {
        mainWindow.Hide()
    } else {
        mainWindow.Show()
    }
})
```

### 后台运行（macOS）

```go
Mac: application.MacOptions{
    // false = 关闭窗口不退出应用
    ApplicationShouldTerminateAfterLastWindowClosed: false,
},
```

### 托盘菜单

```go
trayMenu := app.Menu.New()
trayMenu.Add("Show").OnClick(func(_ *application.Context) {
    window.Show()
})
trayMenu.Add("Quit").OnClick(func(_ *application.Context) {
    app.Quit()
})
tray.SetMenu(trayMenu)
```

## 注意事项

- macOS 上需要设置 `ApplicationShouldTerminateAfterLastWindowClosed: false`
- 托盘图标推荐使用 16x16 或 22x22 的 PNG
- macOS 支持 Template Icon（自动适配暗色/亮色模式）
- 使用 `//go:embed` 嵌入图标文件
