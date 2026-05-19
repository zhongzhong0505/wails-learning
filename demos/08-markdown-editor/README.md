# Demo 08: Markdown Editor

A full-featured Markdown editor desktop application — the capstone project of this tutorial.

## Features

- **Split-pane editor**: Side-by-side editing and preview
- **Real-time rendering**: Debounced markdown-to-HTML conversion
- **File tree**: Navigate and open markdown files
- **Theme switching**: Light and dark themes with CSS variables
- **Keyboard shortcuts**: Cmd+S to save
- **Auto-save**: Configurable auto-save support
- **Status bar**: Line count, character count, theme info
- **GFM support**: Tables, task lists, strikethrough, code blocks

## Run

```bash
cd frontend && npm install && cd ..
wails3 dev
```

## Architecture

```
┌─────────────────────────────────────────┐
│              Frontend (React)            │
├──────────┬──────────────┬───────────────┤
│ FileTree │   Editor     │   Preview     │
│          │  (textarea)  │   (HTML)      │
└────┬─────┴──────┬───────┴───────┬───────┘
     │            │               │
     ▼            ▼               ▼
┌──────────┬──────────────┬───────────────┐
│FileService│MarkdownService│ConfigService │
└──────────┴──────────────┴───────────────┘
```

## Services

- **MarkdownService**: Renders markdown to HTML using goldmark (GFM, tables, task lists)
- **FileService**: File CRUD, directory tree reading, file creation/deletion
- **ConfigService**: Persistent config (theme, font size, last folder)

## Config Storage

Configuration is stored in `~/.wails-markdown-editor/config.json`.

## Key Concepts

- Multiple services working together
- Debounced rendering for performance
- CSS Variables for theming
- Keyboard event handling
- Persistent user preferences
- File system integration
- Split-pane responsive layout
