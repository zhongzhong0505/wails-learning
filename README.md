
# Wails v3 系统学习教程

> 基于 Wails v3 的完整学习教程，从入门到实战，循序渐进掌握 Go + Web 桌面应用开发。

## 📋 教程导航

### 主线章节

| 章节 | 主题 | Demo |
|------|------|------|
| [第一章](./docs/01-getting-started.md) | 认识 Wails v3 — 入门与环境搭建 | [hello-world](./demos/01-hello-world/) |
| [第二章](./docs/02-architecture.md) | 核心原理 — 架构与通信机制 | [binding-events](./demos/02-binding-events/) |
| [第三章](./docs/03-frontend-integration.md) | 前端集成 — React + TypeScript | [todo-app](./demos/03-todo-app/) |
| [第四章](./docs/04-backend-development.md) | Go 后端开发 — 服务与数据 | [notebook](./demos/04-notebook/) |
| [第五章](./docs/05-native-features.md) | 系统能力 — 原生功能调用 | [file-manager](./demos/05-file-manager/) |
| [第六章](./docs/06-advanced.md) | 高级特性 — 进阶开发 | [system-monitor](./demos/06-system-monitor/) |
| [第七章](./docs/07-build-and-deploy.md) | 构建与发布 — 打包部署 | [http-client](./demos/07-http-client/) |
| [第八章](./docs/08-real-project.md) | 实战项目 — Markdown 编辑器 | [markdown-editor](./demos/08-markdown-editor/) |
| [第九章](./docs/18-full-project.md) | 大型实战 — NoteFlow 跨平台笔记应用 | [noteflow](./demos/13-noteflow/) |

### 附录与进阶

| 附录 | 主题 | Demo |
|------|------|------|
| [附录A](./docs/09-faq-and-debugging.md) | 调试技巧与常见问题排查（FAQ） | — |
| [附录B](./docs/10-testing.md) | 测试专题 — 单元测试与集成测试 | — |
| [附录C](./docs/11-cross-platform.md) | 跨平台适配指南 | — |
| [附录D](./docs/12-security.md) | 安全性最佳实践 | — |
| [附录E](./docs/13-state-management.md) | 状态管理进阶 | — |
| [附录F](./docs/14-dev-tools.md) | 开发工具链 | — |
| [附录G](./docs/15-logging.md) | 日志系统完整方案 | — |
| [附录H](./docs/16-plugin-architecture.md) | 插件化架构设计 | — |
| [附录I](./docs/17-native-interactions.md) | 系统通知/拖放/快捷键/Deep Link/自动更新/i18n | — |

### 进阶 Demo

| Demo | 主题 | 核心知识点 |
|------|------|-----------|
| [custom-window](./demos/09-custom-window/) | 自定义无边框窗口 | Frameless、CSS drag region、平台适配 |
| [system-tray](./demos/10-system-tray/) | 系统托盘 | 托盘图标/菜单、后台运行、窗口切换 |
| [multi-window](./demos/11-multi-window/) | 多窗口通信 | 动态创建窗口、广播事件、共享数据同步 |
| [native-interactions](./demos/12-native-interactions/) | 原生交互综合 | 拖放文件、快捷键、右键菜单、通知 |
| [noteflow](./demos/13-noteflow/) | **大型完整项目** | 模块化架构、SQLite、Service分层、主题切换 |

## 🚀 快速开始

### 环境要求

- Go 1.22.4+
- Node.js 20+
- Wails v3 CLI
- TypeScript 5.5+

### 安装 Wails v3 CLI

```bash
# Install Wails v3 CLI
go install github.com/wailsapp/wails/v3/cmd/wails3@latest
```

### 运行 Demo

```bash
# Enter any demo directory
cd demos/01-hello-world

# Run in dev mode
wails3 dev
```

## 📐 学习路径

```
第1章 环境搭建 → 第2章 核心原理 → 第3章 前端集成
                                          ↓
第8章 实战项目 ← 第7章 构建发布 ← 第6章 高级特性 ← 第5章 系统能力 ← 第4章 后端开发
```

- **快速入门**：第1章 → 第2章 → 第3章（约 1 天）
- **完整学习**：第1章 → 第9章 顺序学习（约 1-2 周）
- **实战优先**：第1章 → 第2章 → 第9章 → 按需回看
- **大型项目**：第9章 NoteFlow（模块化架构 + Service 分层）

## ⚠️ 版本说明

本教程全部基于 **Wails v3** 编写。Wails v3 相比 v2 有重大架构变化：

- 新的应用生命周期管理（`application.New()`）
- 原生多窗口支持
- 全新的 Service 绑定机制（替代 v2 的 Bind）
- 系统托盘原生支持
- 新的事件系统
- 改进的构建系统

官方仓库：https://github.com/wailsapp/wails
