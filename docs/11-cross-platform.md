# 附录C：跨平台适配指南

> 本章介绍如何让 Wails v3 应用在 macOS、Windows、Linux 三个平台上都有良好的体验。

## C.1 平台检测

### Go 端平台检测

```go
import "runtime"

func getPlatform() string {
    return runtime.GOOS // "darwin", "windows", "linux"
}

func getArch() string {
    return runtime.GOARCH // "amd64", "arm64"
}
```

### 前端平台检测

```typescript
// Using @wailsio/runtime
import { Environment } from '@wailsio/runtime'

// Or detect via user agent
function getPlatform(): 'mac' | 'windows' | 'linux' {
  const ua = navigator.userAgent.toLowerCase()
  if (ua.includes('mac')) return 'mac'
  if (ua.includes('win')) return 'windows'
  return 'linux'
}
```

## C.2 条件编译（Build Tags）

Go 支持通过 build tags 编写平台特定代码：

### 文件命名约定

```
my_service.go          // All platforms
my_service_darwin.go   // macOS only
my_service_windows.go  // Windows only
my_service_linux.go    // Linux only
```

### Build Tag 方式

```go
//go:build darwin

package main

import "os/exec"

// macOS-specific: open file with default app
func openWithDefault(path string) error {
    return exec.Command("open", path).Run()
}
```

```go
//go:build windows

package main

import "os/exec"

// Windows-specific: open file with default app
func openWithDefault(path string) error {
    return exec.Command("cmd", "/c", "start", "", path).Run()
}
```

```go
//go:build linux

package main

import "os/exec"

// Linux-specific: open file with default app
func openWithDefault(path string) error {
    return exec.Command("xdg-open", path).Run()
}
```

## C.3 文件路径处理

### 跨平台路径规范

```go
import (
    "os"
    "path/filepath"
)

// ✅ Always use filepath.Join - handles separators automatically
configPath := filepath.Join(homeDir, ".myapp", "config.json")

// ❌ Never hardcode path separators
// configPath := homeDir + "/.myapp/config.json"  // Breaks on Windows

// Get platform-appropriate directories
func getAppDataDir() (string, error) {
    switch runtime.GOOS {
    case "darwin":
        home, _ := os.UserHomeDir()
        return filepath.Join(home, "Library", "Application Support", "MyApp"), nil
    case "windows":
        return filepath.Join(os.Getenv("APPDATA"), "MyApp"), nil
    case "linux":
        home, _ := os.UserHomeDir()
        return filepath.Join(home, ".config", "myapp"), nil
    default:
        return "", fmt.Errorf("unsupported platform: %s", runtime.GOOS)
    }
}

// Get platform-appropriate log directory
func getLogDir() (string, error) {
    switch runtime.GOOS {
    case "darwin":
        home, _ := os.UserHomeDir()
        return filepath.Join(home, "Library", "Logs", "MyApp"), nil
    case "windows":
        return filepath.Join(os.Getenv("LOCALAPPDATA"), "MyApp", "Logs"), nil
    case "linux":
        home, _ := os.UserHomeDir()
        return filepath.Join(home, ".local", "share", "myapp", "logs"), nil
    default:
        return "", fmt.Errorf("unsupported platform: %s", runtime.GOOS)
    }
}
```

## C.4 窗口样式适配

### macOS 特有样式

```go
app.Window.NewWithOptions(application.WebviewWindowOptions{
    Title:  "My App",
    Width:  1024,
    Height: 768,
    Mac: application.MacWindow{
        // Transparent titlebar with content extending behind it
        InvisibleTitleBarHeight: 50,
        Backdrop:                application.MacBackdropTranslucent,
        TitleBar:                application.MacTitleBarHiddenInset,
    },
})
```

### 前端 CSS 适配

```css
/* Platform-specific styles */
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* macOS: account for invisible titlebar */
body[data-platform="mac"] .app-header {
  padding-top: 30px;  /* Space for traffic lights */
  -webkit-app-region: drag;
}

/* Windows: custom titlebar area */
body[data-platform="windows"] .app-header {
  padding-top: 0;
}

/* Linux: standard titlebar */
body[data-platform="linux"] .app-header {
  padding-top: 0;
}

/* Draggable region for frameless windows */
.titlebar {
  -webkit-app-region: drag;
}

.titlebar button,
.titlebar input {
  -webkit-app-region: no-drag;
}
```

### 动态设置平台 class

```typescript
// Set platform attribute on body for CSS targeting
useEffect(() => {
  const platform = getPlatform()
  document.body.setAttribute('data-platform', platform)
}, [])
```

## C.5 系统通知

```go
//go:build darwin

package main

import "os/exec"

func sendNotification(title, message string) error {
    script := fmt.Sprintf(
        `display notification "%s" with title "%s"`,
        message, title,
    )
    return exec.Command("osascript", "-e", script).Run()
}
```

```go
//go:build windows

package main

import (
    "github.com/go-toast/toast"
)

func sendNotification(title, message string) error {
    notification := toast.Notification{
        AppID:   "My Wails App",
        Title:   title,
        Message: message,
    }
    return notification.Push()
}
```

```go
//go:build linux

package main

import "os/exec"

func sendNotification(title, message string) error {
    return exec.Command("notify-send", title, message).Run()
}
```

## C.6 快捷键适配

macOS 使用 `Cmd`，Windows/Linux 使用 `Ctrl`：

```go
// Wails handles this with "CmdOrCtrl" modifier
menuItem.SetAccelerator("CmdOrCtrl+S")  // Cmd+S on Mac, Ctrl+S on Win/Linux
menuItem.SetAccelerator("CmdOrCtrl+Shift+P")  // Command palette
```

前端快捷键处理：

```typescript
function handleKeyDown(e: KeyboardEvent) {
  const modifier = navigator.platform.includes('Mac') ? e.metaKey : e.ctrlKey

  if (modifier && e.key === 's') {
    e.preventDefault()
    handleSave()
  }
  if (modifier && e.key === 'o') {
    e.preventDefault()
    handleOpen()
  }
}
```

## C.7 字体和排版

```css
/* System font stack - looks native on each platform */
:root {
  --font-system: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans',
    Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji';
  --font-mono: 'SF Mono', 'Cascadia Code', 'JetBrains Mono',
    'Fira Code', Menlo, Consolas, monospace;
}

/* Platform-specific font sizes (Mac renders slightly larger) */
body[data-platform="mac"] {
  font-size: 13px;
}

body[data-platform="windows"],
body[data-platform="linux"] {
  font-size: 14px;
}
```

## C.8 构建配置

### Taskfile 跨平台构建

```yaml
# Taskfile.yml
version: '3'

tasks:
  build:darwin:
    platforms: [darwin]
    cmds:
      - GOOS=darwin GOARCH=arm64 go build -buildvcs=false -o bin/{{.APP_NAME}}-darwin-arm64
      - GOOS=darwin GOARCH=amd64 go build -buildvcs=false -o bin/{{.APP_NAME}}-darwin-amd64

  build:windows:
    platforms: [windows]
    cmds:
      - GOOS=windows GOARCH=amd64 go build -buildvcs=false -o bin/{{.APP_NAME}}-windows-amd64.exe

  build:linux:
    cmds:
      - GOOS=linux GOARCH=amd64 go build -buildvcs=false -o bin/{{.APP_NAME}}-linux-amd64

  build:all:
    cmds:
      - task: build:darwin
      - task: build:windows
      - task: build:linux
```

## C.9 常见平台差异总结

| 特性 | macOS | Windows | Linux |
|------|-------|---------|-------|
| WebView | WKWebView | WebView2 (Edge) | WebKitGTK |
| 窗口控制按钮 | 左上角 | 右上角 | 右上角 |
| 菜单栏 | 屏幕顶部 | 窗口内 | 窗口内 |
| 文件分隔符 | `/` | `\` | `/` |
| 配置目录 | `~/Library/Application Support/` | `%APPDATA%` | `~/.config/` |
| 快捷键修饰 | Cmd (⌘) | Ctrl | Ctrl |
| 应用格式 | .app Bundle | .exe | ELF binary |
| 安装包 | .dmg | .msi / .exe | .deb / .AppImage |

---

**返回主目录**：[README](../README.md)
