# 附录：调试技巧与常见问题排查（FAQ）

> 本文档整理了 Wails v3 开发中常见的问题和解决方案，帮助你快速排查和解决开发中遇到的坑。

## A.1 开发环境问题

### 问题：`open ./build/config.yml: no such file or directory`

**原因**：项目缺少 `build/config.yml` 配置文件。

**解决方案**：在项目根目录创建 `build/config.yml`：

```yaml
version: '3'

info:
  companyName: "Your Company"
  productName: "Your App"
  productIdentifier: "io.yourcompany.yourapp"
  description: "Your app description"
  version: "0.0.1"

dev_mode:
  root_path: .
  log_level: warn
  debounce: 1000
  ignore:
    dir:
      - .git
      - node_modules
      - frontend
      - bin
    file:
      - .DS_Store
      - .gitignore
    watched_extension:
      - "*.go"
    git_ignore: true
  executes:
    - cmd: wails3 task common:build DEV=true
      type: blocking
    - cmd: wails3 task common:dev:frontend
      type: background
    - cmd: wails3 task run
      type: primary
```

---

### 问题：`Required Root Path is not set`

**原因**：`build/config.yml` 中的 `dev_mode.root_path` 未设置。

**解决方案**：确保 `build/config.yml` 中包含：

```yaml
dev_mode:
  root_path: .
```

---

### 问题：`error obtaining VCS status: exit status 128`

**原因**：Go 构建时尝试获取 Git 版本信息，但当前目录不是 Git 仓库根目录，或 Git 状态异常。

**解决方案**：在 `build/Taskfile.yml` 的 build 命令中添加 `-buildvcs=false`：

```yaml
  build:
    cmds:
      - go build -buildvcs=false {{.BUILD_FLAGS}} -o {{.BIN_DIR}}/{{.APP_NAME}}
```

或者在项目根目录初始化 Git：

```bash
git init
git add .
git commit -m "init"
```

---

## A.2 Bindings 相关问题

### 问题：`function NewService has wrong signature`

**原因**：Wails v3 版本不匹配，或 `go.mod` 中的 wails 依赖版本与安装的 CLI 版本不一致。

**解决方案**：

```bash
# 确认 CLI 版本
wails3 version

# 更新 go.mod 中的依赖版本
go get github.com/wailsapp/wails/v3@latest
go mod tidy
```

---

### 问题：`window.go.main` 为 undefined

**原因**：前端代码尝试直接访问 `window.go.main`，但 Wails v3 使用自动生成的 bindings 文件。

**解决方案**：

1. 先生成 bindings：
```bash
wails3 generate bindings
```

2. 在前端代码中导入生成的 bindings：
```typescript
// 正确方式：导入自动生成的 bindings
import { GreetService } from '../bindings/your-module-name/greetservice'

// 调用方法
const result = await GreetService.Greet("World")
```

3. 如果使用 `window.go` 方式（旧模式），确保在 Wails 环境中运行（而非浏览器直接访问）。

---

### 问题：Bindings 生成后前端找不到对应文件

**原因**：bindings 目录名基于 Go module 名称。

**解决方案**：检查 `go.mod` 中的 module 名称：

```
module hello-world  →  bindings/hello-world/
module my-app      →  bindings/my-app/
```

生成的文件结构：
```
frontend/bindings/
├── your-module-name/
│   ├── greetservice.js    # 服务方法
│   ├── models.js          # 数据模型
│   └── index.js           # 导出入口
└── github.com/wailsapp/wails/v3/internal/
    └── eventcreate.js     # 事件相关
```

---

## A.3 运行时问题

### 问题：`Proxy error: dial tcp4 127.0.0.1:9245: connect: connection refused`

**原因**：前端 dev server 还没启动完成，Go 应用就尝试连接了。

**解决方案**：

1. 这通常是时序问题，Wails 会自动重试连接。如果持续报错，检查 `vite.config.ts`：

```typescript
export default defineConfig({
  server: {
    host: '127.0.0.1',  // 必须是 127.0.0.1
    port: Number(process.env.WAILS_VITE_PORT) || 9245,
    strictPort: true,    // 必须严格使用指定端口
  },
})
```

2. 确保 `Taskfile.yml` 中的端口与 vite 配置一致。

---

### 问题：应用启动后立即退出

**原因**：可能是 Service 初始化失败，或窗口创建有问题。

**解决方案**：

1. 检查 `main.go` 中的错误处理：
```go
err := app.Run()
if err != nil {
    log.Fatal(err)  // 确保打印错误信息
}
```

2. 在 macOS 上确保设置了：
```go
Mac: application.MacOptions{
    ApplicationShouldTerminateAfterLastWindowClosed: true,
},
```

3. 检查 Service 的 `OnStartup()` 方法是否有 panic。

---

### 问题：热重载不生效

**原因**：`build/config.yml` 中的文件监听配置不正确。

**解决方案**：确保 `watched_extension` 包含你修改的文件类型：

```yaml
dev_mode:
  debounce: 1000  # 防抖时间（毫秒）
  ignore:
    dir:
      - node_modules
      - frontend  # 前端由 vite 自己处理热重载
    watched_extension:
      - "*.go"    # 监听 Go 文件变化
```

---

## A.4 调试技巧

### 后端调试（Go）

**方法 1：日志输出**

```go
import "log/slog"

func (s *MyService) DoSomething() {
    slog.Info("DoSomething called", "key", "value")
    slog.Error("Something went wrong", "err", err)
}
```

**方法 2：Delve 调试器**

```bash
# 先构建带调试信息的二进制
go build -gcflags="all=-N -l" -o bin/myapp

# 用 delve 启动
dlv exec ./bin/myapp
```

**方法 3：GoLand / VS Code 调试**

在 VS Code 中创建 `.vscode/launch.json`：

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Wails App",
      "type": "go",
      "request": "launch",
      "mode": "auto",
      "program": "${workspaceFolder}",
      "buildFlags": "-buildvcs=false"
    }
  ]
}
```

### 前端调试

**方法 1：打开 DevTools**

在开发模式下，Wails 窗口中右键 → Inspect Element，或在代码中启用：

```go
app.NewWebviewWindowWithOptions(application.WebviewWindowOptions{
    // ...
    DevToolsEnabled: true,
})
```

**方法 2：浏览器直接访问**

开发模式下，前端 dev server 运行在 `http://localhost:9245`，可以直接在浏览器中打开调试（注意：Go bindings 在浏览器中不可用）。

**方法 3：Console 日志**

```typescript
// 在前端代码中
console.log('Service result:', result)
console.error('Error:', err)
```

---

## A.5 性能优化建议

### 减少 bindings 调用频率

```typescript
// ❌ 不好：每次按键都调用后端
onChange={(e) => searchService.Search(e.target.value)}

// ✅ 好：使用防抖
const debouncedSearch = useMemo(
  () => debounce((query: string) => searchService.Search(query), 300),
  []
)
onChange={(e) => debouncedSearch(e.target.value)}
```

### 批量数据传输

```go
// ❌ 不好：多次小调用
func (s *Service) GetItem(id int) Item { ... }

// ✅ 好：一次获取多个
func (s *Service) GetItems(ids []int) []Item { ... }
```

### 事件节流

```go
// 对于高频事件（如系统监控），控制发送频率
ticker := time.NewTicker(2 * time.Second)  // 不要太频繁
```

---

## A.6 项目结构最佳实践

```
my-wails-app/
├── build/
│   ├── config.yml          # Wails 开发配置
│   └── Taskfile.yml        # 构建任务定义
├── frontend/
│   ├── bindings/           # 自动生成，不要手动修改
│   ├── src/
│   │   ├── components/     # React 组件
│   │   ├── hooks/          # 自定义 Hooks
│   │   ├── App.tsx         # 主组件
│   │   ├── main.tsx        # 入口
│   │   └── style.css       # 样式
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── internal/               # 内部包（可选）
│   ├── database/
│   └── utils/
├── main.go                 # 应用入口
├── *_service.go            # 各个 Service 文件
├── go.mod
├── go.sum
├── Taskfile.yml            # 顶层任务文件
└── README.md
```

---

## A.7 常用命令速查

| 命令 | 说明 |
|------|------|
| `wails3 dev` | 开发模式运行 |
| `wails3 build` | 构建生产版本 |
| `wails3 generate bindings` | 手动生成 bindings |
| `wails3 doctor` | 检查环境配置 |
| `wails3 version` | 查看版本信息 |
| `wails3 docs` | 打开文档 |
| `wails3 init -n myapp` | 创建新项目 |

---

**返回主目录**：[README](../README.md)
