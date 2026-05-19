# Demo 02: Binding & Events

Demonstrates Wails v3 service binding with state management, multiple parameters, error handling, and the event system.

## Features

- **Counter Service**: Stateful service with increment/decrement/reset
- **Calculator Service**: Methods with multiple params and error returns
- **Event System**: Real-time time-tick events from Go to frontend
- **Custom Events**: Frontend-to-backend event communication

## Run

```bash
cd frontend && npm install && cd ..
wails3 dev
```

## Key Concepts

- Stateful services (counter persists across calls)
- Error handling (divide by zero → rejected Promise)
- Complex return types (maps, structs)
- `window.EmitEvent()` for Go → Frontend events
- `wails.EventsOn()` for listening to events in frontend
- `wails.EventsEmit()` for Frontend → Go events

## Tabs

1. **Counter**: Demonstrates stateful service binding
2. **Calculator**: Demonstrates multi-param methods and error handling
3. **Events**: Demonstrates real-time event communication
