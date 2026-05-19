# Demo 04: Notebook

A notebook application with SQLite persistence, demonstrating Go backend development patterns.

## Features

- SQLite database for persistent storage
- Full CRUD for notes
- Search functionality
- Category filtering
- Service lifecycle hooks (OnStartup/OnShutdown)
- Sidebar + content layout

## Run

```bash
cd frontend && npm install && cd ..
wails3 dev
```

## Key Concepts

- `modernc.org/sqlite` for pure-Go SQLite
- `OnStartup()` for database initialization
- `OnShutdown()` for cleanup
- `sync.RWMutex` for thread-safe operations
- Parameterized SQL queries
- Error handling with `sql.ErrNoRows`

## Data Storage

Notes are stored in `~/.wails-notebook/notes.db` (SQLite database).
