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
	monitorService := &MonitorService{}

	app := application.New(application.Options{
		Name:        "System Monitor",
		Description: "Real-time system monitoring with Wails v3",
		Services: []application.Service{
			application.NewService(monitorService),
		},
		Assets: application.AssetOptions{
			Handler: application.AssetFileServerFS(assets),
		},
		Mac: application.MacOptions{
			ApplicationShouldTerminateAfterLastWindowClosed: true,
		},
	})

	app.Window.NewWithOptions(application.WebviewWindowOptions{
		Title: "Wails v3 - System Monitor",
		Mac: application.MacWindow{
			InvisibleTitleBarHeight: 50,
			Backdrop:                application.MacBackdropTranslucent,
			TitleBar:                application.MacTitleBarHiddenInset,
		},
		BackgroundColour: application.NewRGB(27, 38, 54),
		URL:              "/",
	})

	// Start real-time monitoring goroutine
	go func() {
		ticker := time.NewTicker(2 * time.Second)
		defer ticker.Stop()
		for range ticker.C {
			stats := monitorService.GetSystemStats()
			app.Event.Emit("system-stats-update", stats)
		}
	}()

	err := app.Run()
	if err != nil {
		log.Fatal(err)
	}
}
