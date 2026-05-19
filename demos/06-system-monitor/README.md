# Demo 06: System Monitor

A real-time system monitoring dashboard demonstrating advanced event communication and live data updates.

## Features

- Real-time CPU and memory usage display
- Progress bar visualizations
- Usage history chart (text-based)
- Detailed memory breakdown
- Go runtime information
- Force garbage collection
- Dark theme dashboard

## Run

```bash
cd frontend && npm install && cd ..
wails3 dev
```

## Key Concepts

- Goroutine with `time.Ticker` for periodic data emission
- `window.EmitEvent()` for real-time data push
- `runtime.ReadMemStats()` for Go memory statistics
- `runtime.NumGoroutine()` for goroutine count
- Event cleanup with cancel functions
- CSS Grid dashboard layout
- History state management (sliding window)

## Architecture

```
Go Backend (goroutine)
    │ every 2 seconds
    ▼
EmitEvent("system-stats-update", stats)
    │
    ▼
Frontend (EventsOn listener)
    │
    ▼
Update React state → Re-render UI
```
