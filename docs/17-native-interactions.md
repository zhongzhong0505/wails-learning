# 附录I：系统通知与原生交互

> 本章介绍 Wails v3 应用中的系统通知、拖放文件、打印等原生交互能力。

## I.1 系统通知（Native Notification）

### macOS 通知

```go
//go:build darwin

package main

import "os/exec"

// SendNotification sends a native macOS notification
func SendNotification(title, message, subtitle string) error {
    script := fmt.Sprintf(
        `display notification "%s" with title "%s" subtitle "%s"`,
        message, title, subtitle,
    )
    return exec.Command("osascript", "-e", script).Run()
}

// SendNotificationWithSound sends notification with a sound
func SendNotificationWithSound(title, message, sound string) error {
    script := fmt.Sprintf(
        `display notification "%s" with title "%s" sound name "%s"`,
        message, title, sound,
    )
    return exec.Command("osascript", "-e", script).Run()
}
```

### Windows 通知（使用 go-toast）

```go
//go:build windows

package main

import "github.com/go-toast/toast"

func SendNotification(title, message, subtitle string) error {
    notification := toast.Notification{
        AppID:   "io.wails.myapp",
        Title:   title,
        Message: message,
        Audio:   toast.Default,
        Actions: []toast.Action{
            {Type: "protocol", Label: "Open App", Arguments: "myapp://open"},
        },
    }
    return notification.Push()
}
```

### Linux 通知

```go
//go:build linux

package main

import "os/exec"

func SendNotification(title, message, subtitle string) error {
    // notify-send supports icons and urgency levels
    return exec.Command("notify-send",
        "--app-name=MyWailsApp",
        "--urgency=normal",
        title,
        message,
    ).Run()
}
```

### 跨平台通知 Service

```go
package main

import (
    "context"
    "runtime"

    "github.com/wailsapp/wails/v3/pkg/application"
)

type NotificationService struct {
    app *application.App
}

func (s *NotificationService) ServiceStartup(_ context.Context, _ application.ServiceOptions) error {
    s.app = application.Get()
    return nil
}

func (s *NotificationService) Send(title, message string) error {
    return SendNotification(title, message, "")
}

func (s *NotificationService) GetPlatform() string {
    return runtime.GOOS
}
```

## I.2 拖放文件（Drag & Drop）

### 前端实现

```typescript
// src/components/DropZone.tsx
import { useState, useCallback } from 'react'

interface DropZoneProps {
  onFilesDropped: (files: FileList) => void
}

export function DropZone({ onFilesDropped }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      onFilesDropped(files)
    }
  }, [onFilesDropped])

  return (
    <div
      className={`drop-zone ${isDragging ? 'dragging' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging ? '📂 Drop files here...' : '🗂️ Drag files here'}
    </div>
  )
}
```

### Wails v3 拖放事件（Go 端）

Wails v3 支持通过应用级事件接收拖放文件：

```go
// Listen for drag-and-drop events on the window
app.Event.On("wails:file-drop", func(event *application.CustomEvent) {
    // event.Data contains the dropped file paths
    paths, ok := event.Data.([]string)
    if ok {
        for _, path := range paths {
            slog.Info("file dropped", "path", path)
        }
        // Notify frontend
        app.Event.Emit("files-received", paths)
    }
})
```

### 前端获取拖放文件路径

```typescript
// In Wails environment, dropped files provide full paths
const handleDrop = async (e: React.DragEvent) => {
  e.preventDefault()
  const files = e.dataTransfer.files

  // Get file paths (available in Wails WebView)
  const paths: string[] = []
  for (let i = 0; i < files.length; i++) {
    // In Wails, File.path is available
    const file = files[i] as File & { path?: string }
    if (file.path) {
      paths.push(file.path)
    }
  }

  // Send paths to Go backend for processing
  if (paths.length > 0) {
    const contents = await window.go.main.FileService.ReadFiles(paths)
    setFileContents(contents)
  }
}
```

### Go 端处理拖入的文件

```go
type FileService struct{}

// ReadFiles reads content of multiple files
func (s *FileService) ReadFiles(paths []string) ([]map[string]string, error) {
    var results []map[string]string
    for _, path := range paths {
        info, err := os.Stat(path)
        if err != nil {
            continue
        }

        entry := map[string]string{
            "path": path,
            "name": filepath.Base(path),
            "size": fmt.Sprintf("%d", info.Size()),
        }

        // Read text files (limit to 1MB)
        if info.Size() < 1024*1024 {
            data, err := os.ReadFile(path)
            if err == nil {
                entry["content"] = string(data)
            }
        }

        results = append(results, entry)
    }
    return results, nil
}
```

### CSS 样式

```css
.drop-zone {
  border: 2px dashed #555;
  border-radius: 12px;
  padding: 40px;
  text-align: center;
  transition: all 0.2s;
  cursor: pointer;
}

.drop-zone.dragging {
  border-color: #4ecdc4;
  background: rgba(78, 205, 196, 0.1);
  transform: scale(1.02);
}
```

## I.3 右键上下文菜单

### Go 端注册上下文菜单

```go
func setupContextMenus(app *application.App) {
    // Create a context menu
    contextMenu := app.ContextMenu.New()

    // Add items
    contextMenu.Add("Copy").OnClick(func(ctx *application.Context) {
        app.Event.Emit("context:copy")
    })
    contextMenu.Add("Paste").OnClick(func(ctx *application.Context) {
        app.Event.Emit("context:paste")
    })
    contextMenu.AddSeparator()
    contextMenu.Add("Delete").OnClick(func(ctx *application.Context) {
        app.Event.Emit("context:delete")
    })

    // Register with a name
    app.ContextMenu.Add("editor-menu", contextMenu)
}
```

### 前端触发上下文菜单

```html
<!-- Use data-contextmenu attribute to bind -->
<div data-contextmenu="editor-menu">
  Right-click here for context menu
</div>
```

### 动态上下文菜单（前端控制）

```typescript
// Custom right-click handler
const handleContextMenu = (e: React.MouseEvent, item: Item) => {
  e.preventDefault()

  // Send context to Go, which will show the menu
  window.go.main.MenuService.ShowContextMenu(item.id, e.clientX, e.clientY)
}

return (
  <div onContextMenu={(e) => handleContextMenu(e, item)}>
    {item.name}
  </div>
)
```

## I.4 快捷键系统

### Go 端全局快捷键

```go
// Using Wails v3 KeyBinding manager
func setupKeyBindings(app *application.App) {
    // Global key bindings
    app.KeyBinding.Set("CmdOrCtrl+N", func(window application.Window) {
        app.Event.Emit("shortcut:new-file")
    })

    app.KeyBinding.Set("CmdOrCtrl+S", func(window application.Window) {
        app.Event.Emit("shortcut:save")
    })

    app.KeyBinding.Set("CmdOrCtrl+Shift+P", func(window application.Window) {
        app.Event.Emit("shortcut:command-palette")
    })

    app.KeyBinding.Set("CmdOrCtrl+,", func(window application.Window) {
        app.Event.Emit("shortcut:open-settings")
    })
}
```

### 前端快捷键监听

```typescript
// src/hooks/useKeyboard.ts
import { useEffect } from 'react'

interface ShortcutMap {
  [key: string]: () => void
}

export function useKeyboard(shortcuts: ShortcutMap) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMac = navigator.platform.includes('Mac')
      const modifier = isMac ? e.metaKey : e.ctrlKey
      const shift = e.shiftKey

      let key = ''
      if (modifier) key += 'Ctrl+'
      if (shift) key += 'Shift+'
      key += e.key.toUpperCase()

      const action = shortcuts[key]
      if (action) {
        e.preventDefault()
        action()
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [shortcuts])
}

// Usage
function Editor() {
  useKeyboard({
    'Ctrl+S': () => handleSave(),
    'Ctrl+Shift+P': () => openCommandPalette(),
    'Ctrl+N': () => createNewFile(),
  })

  // ...
}
```

### 快捷键提示组件

```typescript
// src/components/ShortcutHint.tsx
interface ShortcutHintProps {
  keys: string  // e.g. "CmdOrCtrl+S"
}

export function ShortcutHint({ keys }: ShortcutHintProps) {
  const isMac = navigator.platform.includes('Mac')

  const display = keys
    .replace('CmdOrCtrl', isMac ? '⌘' : 'Ctrl')
    .replace('Shift', isMac ? '⇧' : 'Shift')
    .replace('Alt', isMac ? '⌥' : 'Alt')
    .replace('+', ' ')

  return <kbd className="shortcut-hint">{display}</kbd>
}
```

## I.5 打印功能

### WebView 打印

```go
type PrintService struct {
    app *application.App
}

func (s *PrintService) ServiceStartup(_ context.Context, _ application.ServiceOptions) error {
    s.app = application.Get()
    return nil
}

// Print triggers the browser print dialog
func (s *PrintService) Print() {
    if win := s.app.Window.Current(); win != nil {
        win.ExecJS("window.print()")
    }
}
```

### 前端打印样式

```css
/* Print-specific styles */
@media print {
  /* Hide non-printable elements */
  .sidebar,
  .toolbar,
  .status-bar,
  button {
    display: none !important;
  }

  /* Reset background for printing */
  body {
    background: white !important;
    color: black !important;
  }

  /* Ensure content fills the page */
  .content {
    width: 100% !important;
    margin: 0 !important;
    padding: 20px !important;
  }

  /* Page break control */
  .page-break {
    page-break-before: always;
  }

  /* Don't break inside these elements */
  pre, table, figure {
    page-break-inside: avoid;
  }
}
```

### 导出 PDF（通过 Go 端）

```go
import (
    "os/exec"
    "runtime"
)

// ExportPDF exports the current view as PDF using system tools
func (s *PrintService) ExportPDF(htmlContent, outputPath string) error {
    // Write HTML to temp file
    tmpFile, err := os.CreateTemp("", "print-*.html")
    if err != nil {
        return err
    }
    defer os.Remove(tmpFile.Name())

    tmpFile.WriteString(htmlContent)
    tmpFile.Close()

    switch runtime.GOOS {
    case "darwin":
        // Use wkhtmltopdf or cupsfilter on macOS
        return exec.Command("cupsfilter", tmpFile.Name(), "-o", outputPath).Run()
    default:
        // Use wkhtmltopdf (cross-platform)
        return exec.Command("wkhtmltopdf", tmpFile.Name(), outputPath).Run()
    }
}
```

## I.6 Deep Link / URL Scheme

### macOS — Info.plist 配置

在应用的 `Info.plist` 中注册 URL Scheme：

```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLName</key>
        <string>io.wails.myapp</string>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>myapp</string>
        </array>
    </dict>
</array>
```

### Go 端处理 Deep Link

```go
// On macOS, Wails v3 can handle open-url events
func setupDeepLink(app *application.App) {
    app.Event.OnApplicationEvent(events.Mac.ApplicationOpenedWithURL, func(event *application.ApplicationEvent) {
        url := event.Context().OpenedURL()
        slog.Info("deep link received", "url", url)

        // Parse the URL and route accordingly
        handleDeepLink(app, url)
    })
}

func handleDeepLink(app *application.App, rawURL string) {
    parsed, err := url.Parse(rawURL)
    if err != nil {
        return
    }

    // Route based on path
    switch parsed.Host {
    case "open":
        // myapp://open?file=/path/to/file
        filePath := parsed.Query().Get("file")
        app.Event.Emit("deeplink:open-file", filePath)

    case "settings":
        // myapp://settings
        app.Event.Emit("deeplink:open-settings")

    case "join":
        // myapp://join?room=abc123
        room := parsed.Query().Get("room")
        app.Event.Emit("deeplink:join-room", room)
    }
}
```

### Windows — 注册表配置

在安装时通过注册表注册 URL Scheme：

```go
// Windows registry setup (run during installation)
import "golang.org/x/sys/windows/registry"

func registerURLScheme() error {
    key, _, err := registry.CreateKey(
        registry.CURRENT_USER,
        `Software\Classes\myapp`,
        registry.ALL_ACCESS,
    )
    if err != nil {
        return err
    }
    defer key.Close()

    key.SetStringValue("", "URL:MyApp Protocol")
    key.SetStringValue("URL Protocol", "")

    // Set command
    cmdKey, _, err := registry.CreateKey(key, `shell\open\command`, registry.ALL_ACCESS)
    if err != nil {
        return err
    }
    defer cmdKey.Close()

    exePath, _ := os.Executable()
    cmdKey.SetStringValue("", fmt.Sprintf(`"%s" "%%1"`, exePath))

    return nil
}
```

### 前端监听 Deep Link 事件

```typescript
import { Events } from '@wailsio/runtime'

useEffect(() => {
  const cancelFile = Events.On('deeplink:open-file', (event) => {
    const filePath = event.data as string
    loadFile(filePath)
  })

  const cancelSettings = Events.On('deeplink:open-settings', () => {
    setShowSettings(true)
  })

  return () => {
    cancelFile()
    cancelSettings()
  }
}, [])
```

### 从浏览器触发 Deep Link

```html
<!-- In a web page -->
<a href="myapp://open?file=/Users/me/doc.md">Open in Desktop App</a>
<a href="myapp://join?room=meeting-123">Join Meeting</a>
```

## I.7 自动更新完整实现

### 更新检查 Service

```go
package main

import (
    "context"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "os"
    "runtime"
    "time"

    "github.com/wailsapp/wails/v3/pkg/application"
)

// Version info
var (
    AppVersion = "1.0.0"
    BuildTime  = "unknown"
)

type UpdateInfo struct {
    Version     string `json:"version"`
    DownloadURL string `json:"downloadUrl"`
    ReleaseNote string `json:"releaseNote"`
    Mandatory   bool   `json:"mandatory"`
    PublishedAt string `json:"publishedAt"`
}

type UpdateService struct {
    app       *application.App
    updateURL string
}

func (s *UpdateService) ServiceStartup(_ context.Context, _ application.ServiceOptions) error {
    s.app = application.Get()
    s.updateURL = "https://api.example.com/updates"
    return nil
}

// GetCurrentVersion returns the current app version
func (s *UpdateService) GetCurrentVersion() string {
    return AppVersion
}

// CheckForUpdate checks if a new version is available
func (s *UpdateService) CheckForUpdate() (*UpdateInfo, error) {
    url := fmt.Sprintf("%s/latest?platform=%s&arch=%s&version=%s",
        s.updateURL, runtime.GOOS, runtime.GOARCH, AppVersion)

    client := &http.Client{Timeout: 10 * time.Second}
    resp, err := client.Get(url)
    if err != nil {
        return nil, fmt.Errorf("failed to check update: %w", err)
    }
    defer resp.Body.Close()

    if resp.StatusCode == http.StatusNoContent {
        return nil, nil // No update available
    }

    var info UpdateInfo
    if err := json.NewDecoder(resp.Body).Decode(&info); err != nil {
        return nil, err
    }

    return &info, nil
}

// DownloadUpdate downloads the update binary
func (s *UpdateService) DownloadUpdate(downloadURL string) error {
    client := &http.Client{Timeout: 5 * time.Minute}
    resp, err := client.Get(downloadURL)
    if err != nil {
        return err
    }
    defer resp.Body.Close()

    // Save to temp file
    tmpFile, err := os.CreateTemp("", "update-*")
    if err != nil {
        return err
    }

    total := resp.ContentLength
    var downloaded int64
    buf := make([]byte, 32*1024)

    for {
        n, err := resp.Body.Read(buf)
        if n > 0 {
            tmpFile.Write(buf[:n])
            downloaded += int64(n)

            // Report progress
            if total > 0 {
                percent := float64(downloaded) / float64(total) * 100
                s.app.Event.Emit("update:progress", percent)
            }
        }
        if err == io.EOF {
            break
        }
        if err != nil {
            tmpFile.Close()
            os.Remove(tmpFile.Name())
            return err
        }
    }
    tmpFile.Close()

    s.app.Event.Emit("update:downloaded", tmpFile.Name())
    return nil
}

// ApplyUpdate replaces the current binary and restarts
func (s *UpdateService) ApplyUpdate(updatePath string) error {
    currentExe, err := os.Executable()
    if err != nil {
        return err
    }

    // Rename current binary as backup
    backupPath := currentExe + ".bak"
    os.Remove(backupPath)
    if err := os.Rename(currentExe, backupPath); err != nil {
        return err
    }

    // Move new binary to current location
    if err := os.Rename(updatePath, currentExe); err != nil {
        // Rollback
        os.Rename(backupPath, currentExe)
        return err
    }

    // Make executable
    os.Chmod(currentExe, 0755)

    // Notify user to restart
    s.app.Event.Emit("update:ready-to-restart")
    return nil
}
```

### 前端更新 UI

```typescript
function UpdateChecker() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [progress, setProgress] = useState<number>(0)
  const [status, setStatus] = useState<'idle' | 'checking' | 'downloading' | 'ready'>('idle')

  useEffect(() => {
    // Check for updates on startup
    checkUpdate()

    Events.On('update:progress', (event) => setProgress(event.data as number))
    Events.On('update:ready-to-restart', () => setStatus('ready'))
  }, [])

  const checkUpdate = async () => {
    setStatus('checking')
    const info = await window.go.main.UpdateService.CheckForUpdate()
    if (info) {
      setUpdateInfo(info)
    }
    setStatus('idle')
  }

  const downloadUpdate = async () => {
    if (!updateInfo) return
    setStatus('downloading')
    await window.go.main.UpdateService.DownloadUpdate(updateInfo.downloadUrl)
  }

  if (!updateInfo) return null

  return (
    <div className="update-banner">
      <p>New version {updateInfo.version} available!</p>
      {status === 'downloading' && <progress value={progress} max={100} />}
      {status === 'ready' && <p>Update ready. Restart to apply.</p>}
      <button onClick={downloadUpdate} disabled={status === 'downloading'}>
        {status === 'downloading' ? `${progress.toFixed(0)}%` : 'Download Update'}
      </button>
    </div>
  )
}
```

## I.8 国际化（i18n）

### Go 后端多语言

```go
package main

import (
    "embed"
    "encoding/json"
    "fmt"
    "sync"
)

//go:embed locales/*.json
var localeFS embed.FS

type I18nService struct {
    mu          sync.RWMutex
    currentLang string
    messages    map[string]map[string]string // lang -> key -> value
}

func (s *I18nService) ServiceStartup(_ context.Context, _ application.ServiceOptions) error {
    s.messages = make(map[string]map[string]string)
    s.currentLang = "en"

    // Load all locale files
    for _, lang := range []string{"en", "zh", "ja"} {
        data, err := localeFS.ReadFile(fmt.Sprintf("locales/%s.json", lang))
        if err != nil {
            continue
        }
        var msgs map[string]string
        json.Unmarshal(data, &msgs)
        s.messages[lang] = msgs
    }
    return nil
}

// SetLanguage changes the current language
func (s *I18nService) SetLanguage(lang string) {
    s.mu.Lock()
    s.currentLang = lang
    s.mu.Unlock()
}

// GetLanguage returns the current language
func (s *I18nService) GetLanguage() string {
    s.mu.RLock()
    defer s.mu.RUnlock()
    return s.currentLang
}

// T translates a key to the current language
func (s *I18nService) T(key string) string {
    s.mu.RLock()
    defer s.mu.RUnlock()

    if msgs, ok := s.messages[s.currentLang]; ok {
        if val, ok := msgs[key]; ok {
            return val
        }
    }
    // Fallback to English
    if msgs, ok := s.messages["en"]; ok {
        if val, ok := msgs[key]; ok {
            return val
        }
    }
    return key
}

// GetAllMessages returns all messages for the current language
func (s *I18nService) GetAllMessages() map[string]string {
    s.mu.RLock()
    defer s.mu.RUnlock()
    return s.messages[s.currentLang]
}
```

### 语言文件

```json
// locales/en.json
{
  "app.title": "My Application",
  "menu.file": "File",
  "menu.edit": "Edit",
  "menu.open": "Open",
  "menu.save": "Save",
  "menu.quit": "Quit",
  "dialog.confirm": "Are you sure?",
  "dialog.yes": "Yes",
  "dialog.no": "No",
  "status.ready": "Ready",
  "status.saving": "Saving..."
}
```

```json
// locales/zh.json
{
  "app.title": "我的应用",
  "menu.file": "文件",
  "menu.edit": "编辑",
  "menu.open": "打开",
  "menu.save": "保存",
  "menu.quit": "退出",
  "dialog.confirm": "确定要执行此操作吗？",
  "dialog.yes": "是",
  "dialog.no": "否",
  "status.ready": "就绪",
  "status.saving": "保存中..."
}
```

### 前端 i18n Hook

```typescript
// src/hooks/useI18n.ts
import { useState, useEffect, useCallback } from 'react'

export function useI18n() {
  const [messages, setMessages] = useState<Record<string, string>>({})
  const [lang, setLang] = useState('en')

  useEffect(() => {
    // Load messages from Go backend
    window.go.main.I18nService.GetAllMessages().then(setMessages)
    window.go.main.I18nService.GetLanguage().then(setLang)
  }, [])

  const t = useCallback((key: string): string => {
    return messages[key] || key
  }, [messages])

  const changeLanguage = useCallback(async (newLang: string) => {
    await window.go.main.I18nService.SetLanguage(newLang)
    const msgs = await window.go.main.I18nService.GetAllMessages()
    setMessages(msgs)
    setLang(newLang)
  }, [])

  return { t, lang, changeLanguage }
}

// Usage in component
function Header() {
  const { t, lang, changeLanguage } = useI18n()

  return (
    <header>
      <h1>{t('app.title')}</h1>
      <select value={lang} onChange={(e) => changeLanguage(e.target.value)}>
        <option value="en">English</option>
        <option value="zh">中文</option>
        <option value="ja">日本語</option>
      </select>
    </header>
  )
}
```

---

**返回主目录**：[README](../README.md)
