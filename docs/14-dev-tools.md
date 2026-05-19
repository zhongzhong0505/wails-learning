# 附录F：开发工具链

> 本章介绍 Wails v3 开发中推荐的工具配置，提升开发效率。

## F.1 VS Code 配置

### 推荐插件

| 插件 | 用途 |
|------|------|
| Go (golang.go) | Go 语言支持 |
| ESLint | 前端代码检查 |
| Prettier | 代码格式化 |
| TypeScript Importer | 自动导入 |
| Error Lens | 内联显示错误 |
| GitLens | Git 增强 |
| Task Runner | Taskfile 支持 |

### settings.json

```json
{
  "go.lintTool": "golangci-lint",
  "go.lintFlags": ["--fast"],
  "go.testFlags": ["-v", "-race"],
  "go.formatTool": "goimports",
  "go.useLanguageServer": true,

  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[go]": {
    "editor.defaultFormatter": "golang.go",
    "editor.codeActionsOnSave": {
      "source.organizeImports": "explicit"
    }
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },

  "typescript.preferences.importModuleSpecifier": "relative",
  "files.exclude": {
    "**/node_modules": true,
    "**/bin": true,
    "**/.task": true
  }
}
```

### launch.json（调试配置）

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
      "buildFlags": "-buildvcs=false",
      "env": {
        "CGO_ENABLED": "1"
      },
      "args": []
    },
    {
      "name": "Debug Current Test",
      "type": "go",
      "request": "launch",
      "mode": "test",
      "program": "${fileDirname}",
      "buildFlags": "-buildvcs=false"
    },
    {
      "name": "Attach to Process",
      "type": "go",
      "request": "attach",
      "mode": "local",
      "processId": "${command:pickProcess}"
    }
  ]
}
```

### tasks.json

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Wails Dev",
      "type": "shell",
      "command": "wails3 dev",
      "group": "build",
      "isBackground": true,
      "problemMatcher": []
    },
    {
      "label": "Wails Build",
      "type": "shell",
      "command": "wails3 task common:build",
      "group": "build",
      "problemMatcher": ["$go"]
    },
    {
      "label": "Generate Bindings",
      "type": "shell",
      "command": "wails3 generate bindings",
      "group": "build",
      "problemMatcher": []
    },
    {
      "label": "Go Test",
      "type": "shell",
      "command": "go test -v ./...",
      "group": "test",
      "problemMatcher": ["$go"]
    },
    {
      "label": "Frontend Test",
      "type": "shell",
      "command": "cd frontend && npx vitest run",
      "group": "test",
      "problemMatcher": []
    }
  ]
}
```

## F.2 GoLand / IntelliJ 配置

### Run Configuration

1. **Go Build**：
   - Package path: 项目根目录
   - Build flags: `-buildvcs=false`
   - Environment: `CGO_ENABLED=1`

2. **Go Test**：
   - Test kind: Package
   - Package path: `./...`
   - Build flags: `-race -buildvcs=false`

### File Watchers

配置文件监听器，Go 文件保存时自动格式化：

- Program: `goimports`
- Arguments: `-w $FilePath$`
- Output paths: `$FilePath$`

## F.3 代码质量工具

### golangci-lint 配置

```yaml
# .golangci.yml
run:
  timeout: 5m

linters:
  enable:
    - errcheck
    - gosimple
    - govet
    - ineffassign
    - staticcheck
    - unused
    - gofmt
    - goimports
    - misspell

linters-settings:
  errcheck:
    check-type-assertions: true
  govet:
    check-shadowing: true

issues:
  exclude-rules:
    - path: _test\.go
      linters:
        - errcheck
```

### Prettier 配置

```json
// .prettierrc
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
```

### ESLint 配置

```json
// .eslintrc.json
{
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react-hooks/recommended"
  ],
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint", "react-hooks"],
  "rules": {
    "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
    "react-hooks/exhaustive-deps": "warn"
  }
}
```

## F.4 性能分析工具

### Go pprof

```go
import (
    "net/http"
    _ "net/http/pprof"
)

// Add to main.go for development builds
func init() {
    go func() {
        // Access at http://localhost:6060/debug/pprof/
        http.ListenAndServe("localhost:6060", nil)
    }()
}
```

使用方式：

```bash
# CPU profiling (30 seconds)
go tool pprof http://localhost:6060/debug/pprof/profile?seconds=30

# Memory profiling
go tool pprof http://localhost:6060/debug/pprof/heap

# Goroutine analysis
go tool pprof http://localhost:6060/debug/pprof/goroutine

# Web UI
go tool pprof -http=:8080 http://localhost:6060/debug/pprof/heap
```

### 前端 Chrome DevTools

在 Wails 开发模式下，可以使用 Chrome DevTools：

1. **Performance Tab**：录制性能时间线，分析渲染瓶颈
2. **Memory Tab**：检测内存泄漏
3. **Network Tab**：查看 IPC 调用（显示为 fetch 请求）
4. **Console**：查看日志和错误

### React DevTools

```bash
# Install React DevTools as standalone
npm install -g react-devtools

# Run standalone DevTools
react-devtools
```

在 Wails 应用中连接：

```html
<!-- Add to index.html in development -->
<script src="http://localhost:8097"></script>
```

## F.5 Git Hooks

### Husky + lint-staged

```bash
npm install -D husky lint-staged
npx husky init
```

```json
// package.json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{css,json,md}": ["prettier --write"]
  }
}
```

```bash
# .husky/pre-commit
cd frontend && npx lint-staged
```

### Go pre-commit

```bash
# .husky/pre-commit (append)
go vet ./...
go test -short ./...
```

## F.6 项目脚手架脚本

创建一个快速初始化新 demo 的脚本：

```bash
#!/bin/bash
# scripts/new-demo.sh
# Usage: ./scripts/new-demo.sh 09 my-demo-name

NUM=$1
NAME=$2

if [ -z "$NUM" ] || [ -z "$NAME" ]; then
  echo "Usage: $0 <number> <name>"
  echo "Example: $0 09 my-new-demo"
  exit 1
fi

DIR="demos/${NUM}-${NAME}"
mkdir -p "$DIR/frontend/src" "$DIR/build"

# Copy template files
cp demos/01-hello-world/Taskfile.yml "$DIR/"
cp demos/01-hello-world/build/Taskfile.yml "$DIR/build/"
cp demos/01-hello-world/build/config.yml "$DIR/build/"
cp demos/01-hello-world/frontend/vite.config.ts "$DIR/frontend/"
cp demos/01-hello-world/frontend/tsconfig.json "$DIR/frontend/"
cp demos/01-hello-world/frontend/index.html "$DIR/frontend/"
cp demos/01-hello-world/frontend/src/main.tsx "$DIR/frontend/src/"

# Update APP_NAME in Taskfile
sed -i '' "s/hello-world/${NAME}/g" "$DIR/Taskfile.yml"
sed -i '' "s/Hello World/${NAME}/g" "$DIR/build/config.yml"
sed -i '' "s/helloworld/${NAME//[-]//}/g" "$DIR/build/config.yml"

# Create go.mod
cat > "$DIR/go.mod" << EOF
module ${NAME}

go 1.25.0

require github.com/wailsapp/wails/v3 v3.0.0-alpha.93
EOF

# Create package.json
cat > "$DIR/frontend/package.json" << EOF
{
  "name": "${NAME}-frontend",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build:dev": "vite build --minify false --mode development",
    "build": "vite build --mode production",
    "preview": "vite preview"
  },
  "dependencies": {
    "@wailsio/runtime": "latest",
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "typescript": "^5.5.0",
    "vite": "^5.4.0"
  }
}
EOF

echo "✅ Created demo: $DIR"
echo "Next steps:"
echo "  1. Create main.go and service files"
echo "  2. Create frontend/src/App.tsx"
echo "  3. Run: cd $DIR && go mod tidy && cd frontend && npm install"
```

## F.7 推荐开发工作流

```
┌─────────────────────────────────────────────────┐
│              日常开发工作流                       │
├─────────────────────────────────────────────────┤
│                                                  │
│  1. 启动开发环境                                 │
│     $ wails3 dev                                │
│                                                  │
│  2. 编写 Go Service                             │
│     → 保存后自动重新编译                         │
│     → bindings 自动重新生成                      │
│                                                  │
│  3. 编写 React 前端                              │
│     → Vite HMR 即时更新                         │
│     → 导入生成的 bindings                        │
│                                                  │
│  4. 调试                                         │
│     → Go: VS Code 断点 / slog 日志              │
│     → 前端: DevTools / console.log              │
│                                                  │
│  5. 测试                                         │
│     $ go test ./...                             │
│     $ cd frontend && npx vitest                 │
│                                                  │
│  6. 构建                                         │
│     $ wails3 task common:build                  │
│                                                  │
└─────────────────────────────────────────────────┘
```

---

**返回主目录**：[README](../README.md)
