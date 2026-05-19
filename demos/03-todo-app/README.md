# Demo 03: Todo 应用

一个功能完整的 Todo 应用，演示 React + TypeScript 前端与 Wails v3 的集成。

## 功能特性

- 完整的 CRUD 操作（创建、读取、更新、删除）
- 按状态过滤（全部 / 进行中 / 已完成）
- 行内编辑
- 清除已完成项
- 统计信息展示
- 键盘快捷键（Enter 添加）

## 运行方式

```bash
cd frontend && npm install && cd ..
wails3 dev
```

## 核心概念

- TypeScript 接口与 Go struct 的类型映射
- `useCallback` 和 `useEffect` 实现数据获取
- 乐观 UI 更新
- 错误边界模式
- 使用 React Hooks 管理组件状态
