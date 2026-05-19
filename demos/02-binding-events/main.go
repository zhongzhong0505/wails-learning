package main

import (
	"embed"
	"log"
	"time"

	"github.com/wailsapp/wails/v3/pkg/application"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	app := application.New(application.Options{
		Name:        "Binding & Events Demo",
		Description: "Demonstrates Wails v3 service binding and event system",
		Services: []application.Service{
			application.NewService(&CounterService{}),
			application.NewService(&CalculatorService{}),
		},
		Assets: application.AssetOptions{
			Handler: application.AssetFileServerFS(assets),
		},
		Mac: application.MacOptions{
			ApplicationShouldTerminateAfterLastWindowClosed: true,
		},
	})

	app.Window.NewWithOptions(application.WebviewWindowOptions{
		Title: "Wails v3 - Binding & Events",
		Mac: application.MacWindow{
			InvisibleTitleBarHeight: 50,
			Backdrop:                application.MacBackdropTranslucent,
			TitleBar:                application.MacTitleBarHiddenInset,
		},
		BackgroundColour: application.NewRGB(27, 38, 54),
		URL:              "/",
	})

	// Start a goroutine that emits time events every second
	go func() {
		ticker := time.NewTicker(1 * time.Second)
		defer ticker.Stop()
		for range ticker.C {
			// Emit event to frontend with current time
			app.Event.Emit("time-tick", time.Now().Format("2006-01-02 15:04:05"))
		}
	}()

	err := app.Run()
	if err != nil {
		log.Fatal(err)
	}
}
