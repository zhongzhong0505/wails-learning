# Demo 01: Hello World

一个最小化的 Wails v3 应用，演示基本的项目结构和服务绑定。

## 功能特性

- 基本窗口创建
- 简单的服务绑定（GreetService）
- React + TypeScript 前端
- CSS 样式

## 运行方式

```bash
# 安装前端依赖
cd frontend && npm install && cd ..

# 以开发模式运行
wails3 dev
```

## 核心概念

- `main.go`：应用入口，使用 `application.New()` 和 `application.Options` 配置应用
- `greet_service.go`：一个 Go struct，其导出方法会自动绑定到前端
- `frontend/src/App.tsx`：React 组件，通过自动生成的 bindings 调用 Go 方法

## 运行效果

一个窗口，包含：
1. 一个输入框，用于输入你的名字
2. 一个 "Greet" 按钮，调用 Go 后端返回问候语
3. 一个 "Get Wails Info" 按钮，展示框架信息
