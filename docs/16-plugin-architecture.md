# 附录H：插件化架构设计

> 本章介绍如何为 Wails v3 应用设计插件化架构，实现功能模块的动态扩展。

## H.1 为什么需要插件化

当应用功能越来越多时，插件化架构可以：
- 按需加载功能模块，减小核心包体积
- 允许第三方开发者扩展功能
- 独立开发和测试各模块
- 灵活组合功能集

## H.2 基于接口的插件系统

### 定义插件接口

```go
// plugin.go
package plugin

import "github.com/wailsapp/wails/v3/pkg/application"

// Plugin defines the interface all plugins must implement
type Plugin interface {
    // Name returns the plugin's unique identifier
    Name() string

    // Version returns the plugin version
    Version() string

    // Init initializes the plugin with the app instance
    Init(app *application.App) error

    // Services returns the Wails services this plugin provides
    Services() []application.Service

    // MenuItems returns menu items to add to the app menu
    MenuItems() []*MenuItem

    // Shutdown is called when the app is closing
    Shutdown() error
}

// MenuItem represents a menu item contributed by a plugin
type MenuItem struct {
    Label       string
    Accelerator string
    Handler     func()
}
```

### 插件注册中心

```go
// registry.go
package plugin

import (
    "fmt"
    "log/slog"
    "sync"
)

// Registry manages all registered plugins
type Registry struct {
    mu      sync.RWMutex
    plugins map[string]Plugin
    order   []string // Maintain registration order
}

func NewRegistry() *Registry {
    return &Registry{
        plugins: make(map[string]Plugin),
    }
}

// Register adds a plugin to the registry
func (r *Registry) Register(p Plugin) error {
    r.mu.Lock()
    defer r.mu.Unlock()

    name := p.Name()
    if _, exists := r.plugins[name]; exists {
        return fmt.Errorf("plugin %q already registered", name)
    }

    r.plugins[name] = p
    r.order = append(r.order, name)
    slog.Info("plugin registered", "name", name, "version", p.Version())
    return nil
}

// InitAll initializes all registered plugins
func (r *Registry) InitAll(app *application.App) error {
    r.mu.RLock()
    defer r.mu.RUnlock()

    for _, name := range r.order {
        p := r.plugins[name]
        if err := p.Init(app); err != nil {
            return fmt.Errorf("failed to init plugin %q: %w", name, err)
        }
        slog.Info("plugin initialized", "name", name)
    }
    return nil
}

// AllServices returns all services from all plugins
func (r *Registry) AllServices() []application.Service {
    r.mu.RLock()
    defer r.mu.RUnlock()

    var services []application.Service
    for _, name := range r.order {
        services = append(services, r.plugins[name].Services()...)
    }
    return services
}

// ShutdownAll shuts down all plugins in reverse order
func (r *Registry) ShutdownAll() {
    r.mu.RLock()
    defer r.mu.RUnlock()

    for i := len(r.order) - 1; i >= 0; i-- {
        name := r.order[i]
        if err := r.plugins[name].Shutdown(); err != nil {
            slog.Error("plugin shutdown error", "name", name, "error", err)
        }
    }
}
```

## H.3 实现一个插件

### 示例：Markdown 预览插件

```go
// plugins/markdown/plugin.go
package markdown

import (
    "github.com/wailsapp/wails/v3/pkg/application"
    "myapp/plugin"
)

type MarkdownPlugin struct {
    app     *application.App
    service *MarkdownService
}

func New() *MarkdownPlugin {
    return &MarkdownPlugin{
        service: &MarkdownService{},
    }
}

func (p *MarkdownPlugin) Name() string    { return "markdown" }
func (p *MarkdownPlugin) Version() string { return "1.0.0" }

func (p *MarkdownPlugin) Init(app *application.App) error {
    p.app = app
    return nil
}

func (p *MarkdownPlugin) Services() []application.Service {
    return []application.Service{
        application.NewService(p.service),
    }
}

func (p *MarkdownPlugin) MenuItems() []*plugin.MenuItem {
    return []*plugin.MenuItem{
        {
            Label:       "Preview Markdown",
            Accelerator: "CmdOrCtrl+Shift+M",
            Handler: func() {
                p.app.Event.Emit("markdown:preview")
            },
        },
    }
}

func (p *MarkdownPlugin) Shutdown() error {
    return nil
}
```

### Markdown Service

```go
// plugins/markdown/service.go
package markdown

import (
    "github.com/gomarkdown/markdown"
    "github.com/gomarkdown/markdown/html"
    "github.com/gomarkdown/markdown/parser"
)

type MarkdownService struct{}

func (s *MarkdownService) Render(input string) string {
    extensions := parser.CommonExtensions | parser.AutoHeadingIDs
    p := parser.NewWithExtensions(extensions)
    doc := p.Parse([]byte(input))

    htmlFlags := html.CommonFlags | html.HrefTargetBlank
    opts := html.RendererOptions{Flags: htmlFlags}
    renderer := html.NewRenderer(opts)

    return string(markdown.Render(doc, renderer))
}
```

## H.4 在主应用中使用插件

```go
// main.go
package main

import (
    "log"

    "github.com/wailsapp/wails/v3/pkg/application"
    "myapp/plugin"
    "myapp/plugins/markdown"
    "myapp/plugins/export"
    "myapp/plugins/theme"
)

func main() {
    // Create plugin registry
    registry := plugin.NewRegistry()

    // Register plugins
    registry.Register(markdown.New())
    registry.Register(export.New())
    registry.Register(theme.New())

    // Collect all services from plugins
    services := registry.AllServices()

    // Add core services
    services = append(services, application.NewService(&CoreService{}))

    app := application.New(application.Options{
        Name:     "My Plugin App",
        Services: services,
        // ...
    })

    // Initialize all plugins with app instance
    if err := registry.InitAll(app); err != nil {
        log.Fatal(err)
    }

    // Build menu with plugin contributions
    buildMenu(app, registry)

    // ... create windows, run app ...

    // Cleanup on exit
    defer registry.ShutdownAll()

    app.Run()
}

func buildMenu(app *application.App, registry *plugin.Registry) {
    menu := app.Menu.New()

    // Core menu items
    fileMenu := menu.AddSubmenu("File")
    fileMenu.Add("Quit").SetAccelerator("CmdOrCtrl+Q").OnClick(func(_ *application.Context) {
        app.Quit()
    })

    // Plugin menu items
    pluginMenu := menu.AddSubmenu("Plugins")
    for _, p := range registry.AllPlugins() {
        for _, item := range p.MenuItems() {
            mi := pluginMenu.Add(item.Label)
            if item.Accelerator != "" {
                mi.SetAccelerator(item.Accelerator)
            }
            handler := item.Handler
            mi.OnClick(func(_ *application.Context) {
                handler()
            })
        }
    }

    app.Menu.SetApplicationMenu(menu)
}
```

## H.5 配置驱动的插件加载

```go
// config.go
package main

import (
    "encoding/json"
    "os"
)

type AppConfig struct {
    Plugins []PluginConfig `json:"plugins"`
}

type PluginConfig struct {
    Name    string                 `json:"name"`
    Enabled bool                   `json:"enabled"`
    Options map[string]interface{} `json:"options"`
}

func loadConfig() (*AppConfig, error) {
    data, err := os.ReadFile("config.json")
    if err != nil {
        return &AppConfig{}, nil // Default config
    }

    var config AppConfig
    err = json.Unmarshal(data, &config)
    return &config, err
}
```

```json
// config.json
{
  "plugins": [
    { "name": "markdown", "enabled": true },
    { "name": "export", "enabled": true, "options": { "format": "pdf" } },
    { "name": "theme", "enabled": false }
  ]
}
```

```go
// Conditional plugin loading
func loadPlugins(registry *plugin.Registry, config *AppConfig) {
    available := map[string]func() plugin.Plugin{
        "markdown": func() plugin.Plugin { return markdown.New() },
        "export":   func() plugin.Plugin { return export.New() },
        "theme":    func() plugin.Plugin { return theme.New() },
    }

    for _, pc := range config.Plugins {
        if !pc.Enabled {
            continue
        }
        if factory, ok := available[pc.Name]; ok {
            registry.Register(factory())
        }
    }
}
```

## H.6 前端插件注册

```typescript
// src/plugins/index.ts

interface FrontendPlugin {
  name: string
  // React component to render in the plugin area
  component: React.ComponentType
  // Route path (if plugin has its own page)
  route?: string
  // Sidebar icon
  icon?: string
}

class PluginManager {
  private plugins: Map<string, FrontendPlugin> = new Map()

  register(plugin: FrontendPlugin) {
    this.plugins.set(plugin.name, plugin)
  }

  getAll(): FrontendPlugin[] {
    return Array.from(this.plugins.values())
  }

  get(name: string): FrontendPlugin | undefined {
    return this.plugins.get(name)
  }
}

export const pluginManager = new PluginManager()

// Register frontend plugins
import { MarkdownPreview } from './markdown/MarkdownPreview'
import { ExportPanel } from './export/ExportPanel'

pluginManager.register({
  name: 'markdown',
  component: MarkdownPreview,
  route: '/markdown',
  icon: '📝',
})

pluginManager.register({
  name: 'export',
  component: ExportPanel,
  route: '/export',
  icon: '📤',
})
```

### 动态渲染插件

```typescript
// src/App.tsx
import { pluginManager } from './plugins'

function App() {
  const plugins = pluginManager.getAll()

  return (
    <div className="app">
      <Sidebar plugins={plugins} />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          {plugins.map((p) => p.route && (
            <Route key={p.name} path={p.route} element={<p.component />} />
          ))}
        </Routes>
      </main>
    </div>
  )
}
```

## H.7 插件化架构总结

```
┌─────────────────────────────────────────────────┐
│                 Application                      │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌──────────────────────────────────────────┐   │
│  │           Plugin Registry                 │   │
│  │  ┌────────┐ ┌────────┐ ┌────────────┐   │   │
│  │  │Markdown│ │ Export │ │   Theme    │   │   │
│  │  │Plugin  │ │ Plugin │ │   Plugin   │   │   │
│  │  └───┬────┘ └───┬────┘ └─────┬──────┘   │   │
│  │      │           │            │           │   │
│  └──────┼───────────┼────────────┼───────────┘   │
│         │           │            │               │
│  ┌──────▼───────────▼────────────▼───────────┐   │
│  │              Core Services                 │   │
│  │  (Window, Menu, Events, Clipboard...)     │   │
│  └────────────────────────────────────────────┘   │
│                                                  │
└─────────────────────────────────────────────────┘
```

### 设计原则

1. **接口优先**：通过接口定义插件契约
2. **松耦合**：插件之间不直接依赖
3. **配置驱动**：通过配置文件控制加载
4. **生命周期管理**：Init → Run → Shutdown
5. **双向扩展**：Go 后端 + React 前端都可扩展

---

**返回主目录**：[README](../README.md)
