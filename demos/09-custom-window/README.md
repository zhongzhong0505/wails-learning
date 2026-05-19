# Demo 09: 自定义窗口

一个无边框自定义窗口 Demo，演示 Wails v3 的窗口定制能力。

## 功能特性

- **无边框窗口**：移除系统原生标题栏
- **自定义标题栏**：HTML/CSS 实现的标题栏，支持拖拽移动窗口
- **平台适配**：macOS 红绿灯在左侧，Windows/Linux 按钮在右侧
- **窗口控制**：自定义最小化、最大化、关闭按钮
- **圆角边框**：自定义窗口圆角和边框样式

## 运行方式

```bash
cd frontend && npm install && cd ..
go mod tidy
wails3 dev
```

## 核心概念

### 无边框窗口配置

```go
app.Window.NewWithOptions(application.WebviewWindowOptions{
    Frameless: true,  // 关键：移除原生标题栏
})
```

### CSS 拖拽区域

```css
/* 整个标题栏可拖拽 */
.titlebar {
    -webkit-app-region: drag;
}

/* 按钮不可拖拽（否则无法点击） */
.titlebar button {
    -webkit-app-region: no-drag;
}
```

### 窗口控制 Service

```go
func (s *WindowService) Minimize() {
    s.app.Window.Current().Minimise()
}

func (s *WindowService) Maximize() {
    win := s.app.Window.Current()
    if win.IsMaximised() {
        win.UnMaximise()
    } else {
        win.Maximise()
    }
}

func (s *WindowService) Close() {
    s.app.Window.Current().Close()
}
```

## 注意事项

- `Frameless: true` 会移除所有系统窗口装饰
- macOS 上可以使用 `InvisibleTitleBarHeight` 保留系统红绿灯
- 拖拽区域内的交互元素必须设置 `-webkit-app-region: no-drag`
- 窗口圆角需要在 CSS 中设置 `border-radius`
