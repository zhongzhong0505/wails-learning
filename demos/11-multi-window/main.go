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
		Name:        "Multi Window",
		Description: "Demonstrates multi-window communication in Wails v3",
		Services: []application.Service{
			application.NewService(&WindowManagerService{}),
			application.NewService(&SharedDataService{}),
		},
		Assets: application.AssetOptions{
			Handler: application.AssetFileServerFS(assets),
		},
		Mac: application.MacOptions{
			ApplicationShouldTerminateAfterLastWindowClosed: true,
		},
	})

	// Main window
	app.Window.NewWithOptions(application.WebviewWindowOptions{
		Title:  "Main Window",
		Width:  800,
		Height: 500,
		Mac: application.MacWindow{
			InvisibleTitleBarHeight: 50,
			Backdrop:                application.MacBackdropTranslucent,
			TitleBar:                application.MacTitleBarHiddenInset,
		},
		BackgroundColour: application.NewRGB(27, 38, 54),
		URL:              "/?window=main",
	})

	err := app.Run()
	if err != nil {
		log.Fatal(err)
	}
}
