# 第八章：实战项目 — Markdown 编辑器

## 8.1 项目规划

### 功能需求

- **编辑器**：Markdown 文本编辑，语法高亮
- **实时预览**：编辑时实时渲染 Markdown 为 HTML
- **文件管理**：打开、保存、新建文件
- **文件树**：侧边栏显示目录结构
- **主题切换**：亮色/暗色主题
- **快捷键**：常用编辑快捷键
- **导出**：导出为 HTML

### 技术选型

| 层级 | 技术 |
|------|------|
| 后端 | Go + Wails v3 |
| 前端 | React + TypeScript |
| 编辑器 | textarea + 自定义高亮 |
| Markdown 解析 | Go: goldmark |
| 样式 | CSS Variables (主题) |

### 架构设计

```
┌─────────────────────────────────────────┐
│              Frontend (React)            │
├──────────┬──────────────┬───────────────┤
│ FileTree │   Editor     │   Preview     │
│          │  (textarea)  │   (HTML)      │
└────┬─────┴──────┬───────┴───────┬───────┘
     │            │               │
     ▼            ▼               ▼
┌─────────────────────────────────────────┐
│           Wails v3 Services             │
├──────────┬──────────────┬───────────────┤
│FileService│MarkdownService│ConfigService │
└──────────┴──────────────┴───────────────┘
```

## 8.2 Go 后端实现

### MarkdownService

```go
package main

import (
    "bytes"
    "github.com/yuin/goldmark"
    "github.com/yuin/goldmark/extension"
    highlighting "github.com/yuin/goldmark-highlighting/v2"
)

type MarkdownService struct {
    md goldmark.Markdown
}

func NewMarkdownService() *MarkdownService {
    md := goldmark.New(
        goldmark.WithExtensions(
            extension.GFM,           // GitHub Flavored Markdown
            extension.Table,
            highlighting.NewHighlighting(
                highlighting.WithStyle("monokai"),
            ),
        ),
    )
    return &MarkdownService{md: md}
}

// Render converts markdown text to HTML
func (s *MarkdownService) Render(markdown string) (string, error) {
    var buf bytes.Buffer
    err := s.md.Convert([]byte(markdown), &buf)
    if err != nil {
        return "", err
    }
    return buf.String(), nil
}
```

### FileService

```go
type FileService struct {
    app        *application.App
    currentDir string
}

type FileEntry struct {
    Name  string      `json:"name"`
    Path  string      `json:"path"`
    IsDir bool        `json:"isDir"`
    Children []FileEntry `json:"children,omitempty"`
}

func (s *FileService) ReadDirectory(path string) ([]FileEntry, error) {
    entries, err := os.ReadDir(path)
    if err != nil {
        return nil, err
    }
    
    var result []FileEntry
    for _, entry := range entries {
        // Skip hidden files
        if strings.HasPrefix(entry.Name(), ".") {
            continue
        }
        fe := FileEntry{
            Name:  entry.Name(),
            Path:  filepath.Join(path, entry.Name()),
            IsDir: entry.IsDir(),
        }
        result = append(result, fe)
    }
    return result, nil
}

func (s *FileService) ReadFile(path string) (string, error) {
    data, err := os.ReadFile(path)
    if err != nil {
        return "", err
    }
    return string(data), nil
}

func (s *FileService) WriteFile(path, content string) error {
    return os.WriteFile(path, []byte(content), 0644)
}

func (s *FileService) OpenFolder() (string, error) {
    dialog := application.OpenDirectoryDialog()
    dialog.SetTitle("Open Folder")
    path, err := dialog.PromptForSingleSelection()
    return path, err
}
```

### ConfigService

```go
type Config struct {
    Theme      string `json:"theme"`      // "light" or "dark"
    FontSize   int    `json:"fontSize"`
    AutoSave   bool   `json:"autoSave"`
    LastFolder string `json:"lastFolder"`
}

type ConfigService struct {
    config     Config
    configPath string
}

func (s *ConfigService) OnStartup(ctx context.Context) error {
    home, _ := os.UserHomeDir()
    s.configPath = filepath.Join(home, ".wails-markdown-editor", "config.json")
    return s.load()
}

func (s *ConfigService) GetConfig() Config {
    return s.config
}

func (s *ConfigService) SetTheme(theme string) error {
    s.config.Theme = theme
    return s.save()
}

func (s *ConfigService) SetFontSize(size int) error {
    s.config.FontSize = size
    return s.save()
}
```

## 8.3 前端实现

### 项目结构

```
frontend/src/
├── main.tsx
├── App.tsx
├── components/
│   ├── FileTree.tsx
│   ├── Editor.tsx
│   ├── Preview.tsx
│   ├── Toolbar.tsx
│   └── StatusBar.tsx
├── hooks/
│   ├── useMarkdown.ts
│   └── useTheme.ts
├── styles/
│   ├── global.css
│   ├── editor.css
│   ├── preview.css
│   └── themes.css
└── types/
    └── index.ts
```

### Editor 组件

```tsx
import { useState, useCallback, useRef } from 'react'

interface EditorProps {
  content: string
  onChange: (content: string) => void
  fontSize: number
}

export function Editor({ content, onChange, fontSize }: EditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Tab key inserts spaces
    if (e.key === 'Tab') {
      e.preventDefault()
      const textarea = textareaRef.current
      if (!textarea) return
      
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const newContent = content.substring(0, start) + '  ' + content.substring(end)
      onChange(newContent)
      
      // Restore cursor position
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2
      }, 0)
    }
  }, [content, onChange])

  return (
    <div className="editor-panel">
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        style={{ fontSize: `${fontSize}px` }}
        placeholder="Start writing Markdown..."
        spellCheck={false}
      />
    </div>
  )
}
```

### Preview 组件

```tsx
interface PreviewProps {
  html: string
}

export function Preview({ html }: PreviewProps) {
  return (
    <div className="preview-panel">
      <div 
        className="markdown-body"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}
```

### useMarkdown Hook

```typescript
import { useState, useEffect, useRef } from 'react'

export function useMarkdown(content: string) {
  const [html, setHtml] = useState<string>('')
  const debounceRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    // Debounce rendering for performance
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    
    debounceRef.current = setTimeout(async () => {
      try {
        const rendered = await window.go.main.MarkdownService.Render(content)
        setHtml(rendered)
      } catch (err) {
        console.error('Render error:', err)
      }
    }, 150)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [content])

  return html
}
```

## 8.4 主题系统

```css
/* themes.css */
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f5f5f5;
  --text-primary: #1a1a1a;
  --text-secondary: #666666;
  --border-color: #e0e0e0;
  --accent-color: #646cff;
}

[data-theme="dark"] {
  --bg-primary: #1e1e1e;
  --bg-secondary: #252526;
  --text-primary: #d4d4d4;
  --text-secondary: #888888;
  --border-color: #3e3e3e;
  --accent-color: #646cff;
}
```

## 8.5 运行项目

```bash
cd demos/08-markdown-editor

# Install frontend dependencies
cd frontend && npm install && cd ..

# Run in development mode
wails3 dev

# Build for production
wails3 build
```

## 8.6 本章小结

本章你完成了一个完整的 Markdown 编辑器桌面应用，综合运用了：
- Wails v3 Service 绑定
- 文件系统操作
- 实时 Markdown 渲染
- 主题切换
- 应用配置持久化
- 对话框和菜单
- 性能优化（防抖渲染）

---

**上一章**：[第七章：构建与发布 — 打包部署](./07-build-and-deploy.md)

---

## 🎉 恭喜完成！

你已经完成了 Wails v3 的系统学习。现在你可以：

1. 独立开发 Wails v3 桌面应用
2. 设计合理的前后端架构
3. 使用原生系统能力
4. 打包发布跨平台应用

继续探索 Wails 官方文档和社区资源：
- GitHub: https://github.com/wailsapp/wails
- 官方文档: https://wails.io
- Discord 社区: https://discord.gg/wails
