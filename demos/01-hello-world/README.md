# Demo 01: Hello World

A minimal Wails v3 application demonstrating the basic project structure and service binding.

## Features

- Basic window creation
- Simple service binding (GreetService)
- React + TypeScript frontend
- CSS styling

## Run

```bash
# Install frontend dependencies
cd frontend && npm install && cd ..

# Run in development mode
wails3 dev
```

## Key Concepts

- `main.go`: Application entry point with `application.New()` and `application.Options`
- `greet_service.go`: A Go struct with exported methods that are bound to the frontend
- `frontend/src/App.tsx`: React component calling Go methods via `window.go.main.GreetService`

## What You'll See

A window with:
1. An input field to enter your name
2. A "Greet" button that calls the Go backend
3. A "Get Wails Info" button showing framework details
