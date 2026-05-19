# 第五章：系统能力 — 原生功能调用

## 5.1 对话框（Dialogs）

Wails v3 提供了原生对话框支持：

### 文件选择对话框

```go
// Go backend - using application dialog API
func (s *FileManagerService) OpenFile() (string, error) {
    dialog := application.OpenFileDialog()
    dialog.SetTitle("Select a file")
    dialog.AddFilter("Text Files", "*.txt;*.md")
    dialog.AddFilter("All Files", "*.*")
    
    path, err := dialog.PromptForSingleSelection()
    if err != nil {
        return "", err
    }
    return path, nil
}

// Open multiple files
func (s *FileManagerService) OpenMultipleFiles() ([]string, error) {
    dialog := application.OpenFileDialog()
    dialog.SetTitle("Select files")
    dialog.AddFilter("Images", "*.png;*.jpg;*.gif")
    
    paths, err := dialog.PromptForMultipleSelection()
    return paths, err
}
```

### 保存文件对话框

```go
func (s *FileManagerService) SaveFile(content string) (string, error) {
    dialog := application.SaveFileDialog()
    dialog.SetTitle("Save file")
    dialog.SetDefaultFilename("untitled.txt")
    dialog.AddFilter("Text Files", "*.txt")
    
    path, err := dialog.PromptForSingleSelection()
    if err != nil {
        return "", err
    }
    
    err = os.WriteFile(path, []byte(content), 0644)
    return path, err
}
```

### 消息对话框

```go
func (s *FileManagerService) ConfirmDelete(filename string) (bool, error) {
    result, err := application.MessageDialog().
        SetTitle("Confirm Delete").
        SetMessage(fmt.Sprintf("Are you sure you want to delete '%s'?", filename)).
        AddButton("Delete").
        AddButton("Cancel").
        SetDefaultButton("Cancel").
        Show()
    
    return result == "Delete", err
}
```

## 5.2 菜单系统

### 应用菜单

```go
func createMenu(app *application.App) *application.Menu {
    menu := application.NewMenu()
    
    // File menu
    fileMenu := menu.AddSubmenu("File")
    fileMenu.Add("New").SetAccelerator("CmdOrCtrl+N").OnClick(func(ctx *application.Context) {
        app.EmitEvent("menu-new-file", nil)
    })
    fileMenu.Add("Open...").SetAccelerator("CmdOrCtrl+O").OnClick(func(ctx *application.Context) {
        app.EmitEvent("menu-open-file", nil)
    })
    fileMenu.Add("Save").SetAccelerator("CmdOrCtrl+S").OnClick(func(ctx *application.Context) {
        app.EmitEvent("menu-save-file", nil)
    })
    fileMenu.AddSeparator()
    fileMenu.Add("Quit").SetAccelerator("CmdOrCtrl+Q").OnClick(func(ctx *application.Context) {
        app.Quit()
    })
    
    // Edit menu
    editMenu := menu.AddSubmenu("Edit")
    editMenu.Add("Undo").SetAccelerator("CmdOrCtrl+Z")
    editMenu.Add("Redo").SetAccelerator("CmdOrCtrl+Shift+Z")
    editMenu.AddSeparator()
    editMenu.Add("Cut").SetAccelerator("CmdOrCtrl+X")
    editMenu.Add("Copy").SetAccelerator("CmdOrCtrl+C")
    editMenu.Add("Paste").SetAccelerator("CmdOrCtrl+V")
    
    return menu
}
```

### 系统托盘

```go
func setupSystemTray(app *application.App) {
    tray := app.NewSystemTray()
    
    // Set tray icon
    tray.SetIcon(iconData) // []byte of icon
    tray.SetTooltip("My Wails App")
    
    // Tray menu
    trayMenu := application.NewMenu()
    trayMenu.Add("Show Window").OnClick(func(ctx *application.Context) {
        app.Show()
    })
    trayMenu.Add("Hide Window").OnClick(func(ctx *application.Context) {
        app.Hide()
    })
    trayMenu.AddSeparator()
    trayMenu.Add("Quit").OnClick(func(ctx *application.Context) {
        app.Quit()
    })
    
    tray.SetMenu(trayMenu)
    
    // Click handler
    tray.OnClick(func() {
        app.Show()
    })
}
```

## 5.3 窗口控制

### 多窗口管理

```go
// Create main window
mainWindow := app.NewWebviewWindowWithOptions(application.WebviewWindowOptions{
    Title:  "Main Window",
    Width:  1024,
    Height: 768,
    URL:    "/",
})

// Create settings window (hidden by default)
settingsWindow := app.NewWebviewWindowWithOptions(application.WebviewWindowOptions{
    Title:  "Settings",
    Width:  500,
    Height: 400,
    URL:    "/settings",
    Hidden: true,
})

// Show/hide from service
type WindowService struct {
    settingsWindow *application.WebviewWindow
}

func (s *WindowService) ShowSettings() {
    s.settingsWindow.Show()
    s.settingsWindow.Focus()
}

func (s *WindowService) HideSettings() {
    s.settingsWindow.Hide()
}
```

### 无边框窗口与拖拽

```go
app.NewWebviewWindowWithOptions(application.WebviewWindowOptions{
    Title:     "Frameless Window",
    Width:     800,
    Height:    600,
    Frameless: true,
    Mac: application.MacWindow{
        InvisibleTitleBarHeight: 50,
        Backdrop:                application.MacBackdropTranslucent,
        TitleBar:                application.MacTitleBarHiddenInset,
    },
})
```

前端实现拖拽区域：

```css
/* Make the top area draggable */
.titlebar {
    -webkit-app-region: drag;
    height: 50px;
}

/* Buttons inside titlebar should not be draggable */
.titlebar button {
    -webkit-app-region: no-drag;
}
```

## 5.4 快捷键

```go
// Global keyboard shortcuts
app.OnEvent("keydown", func(event *application.KeyEvent) {
    if event.Modifiers.CmdOrCtrl && event.Key == "s" {
        app.EmitEvent("save-triggered", nil)
    }
})
```

## 5.5 剪贴板

```go
import "github.com/wailsapp/wails/v3/pkg/application"

type ClipboardService struct{}

func (s *ClipboardService) CopyToClipboard(text string) error {
    return application.ClipboardSetText(text)
}

func (s *ClipboardService) ReadFromClipboard() (string, error) {
    return application.ClipboardGetText()
}
```

## 5.6 本章 Demo：文件管理器

本章 Demo 是一个简易文件管理器，演示了：

- 文件选择/保存对话框
- 应用菜单和快捷键
- 文件读写操作
- 系统托盘

→ 查看 Demo 代码：[demos/05-file-manager/](../demos/05-file-manager/)

## 5.7 本章小结

本章你学到了：
- 原生对话框（打开、保存、消息）
- 应用菜单和系统托盘
- 多窗口管理
- 无边框窗口和拖拽
- 快捷键绑定
- 剪贴板操作

---

**上一章**：[第四章：Go 后端开发 — 服务与数据](./04-backend-development.md)  
**下一章**：[第六章：高级特性 — 进阶开发](./06-advanced.md)
