package main

import (
	"embed"
	"log"

	"github.com/wailsapp/wails/v3/pkg/application"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	app := application.New(application.Options{
		Name:        "Custom Window",
		Description: "Demonstrates custom frameless window with drag regions",
		Services: []application.Service{
			application.NewService(&WindowService{}),
		},
		Assets: application.AssetOptions{
			Handler: application.AssetFileServerFS(assets),
		},
		Mac: application.MacOptions{
			ApplicationShouldTerminateAfterLastWindowClosed: true,
		},
	})

	// Main window - frameless with custom titlebar
	app.Window.NewWithOptions(application.WebviewWindowOptions{
		Title:     "Custom Window Demo",
		Width:     800,
		Height:    550,
		Frameless: true,
		Mac: application.MacWindow{
			InvisibleTitleBarHeight: 0,
			Backdrop:                application.MacBackdropTranslucent,
		},
		BackgroundColour: application.NewRGB(30, 30, 46),
		URL:              "/",
	})

	err := app.Run()
	if err != nil {
		log.Fatal(err)
	}
}
