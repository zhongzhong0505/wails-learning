# Demo 03: Todo App

A full-featured Todo application demonstrating React + TypeScript frontend integration with Wails v3.

## Features

- Full CRUD operations (Create, Read, Update, Delete)
- Filter by status (All / Active / Completed)
- Inline editing with double-click
- Clear completed todos
- Statistics display
- Keyboard shortcuts (Enter to add)

## Run

```bash
cd frontend && npm install && cd ..
wails3 dev
```

## Key Concepts

- TypeScript interfaces matching Go structs
- `useCallback` and `useEffect` for data fetching
- Optimistic UI updates
- Error boundary pattern
- Component state management with React hooks
