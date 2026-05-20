package main

import (
	"embed"
	"log"

	"noteflow/services"

	"github.com/wailsapp/wails/v3/pkg/application"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	// Initialize services
	noteService := services.NewNoteService()
	folderService := services.NewFolderService()
	settingsService := services.NewSettingsService()

	app := application.New(application.Options{
		Name:        "NoteFlow",
		Description: "A cross-platform note-taking application built with Wails v3",
		Services: []application.Service{
			application.NewService(noteService),
			application.NewService(folderService),
			application.NewService(settingsService),
		},
		Assets: application.AssetOptions{
			Handler: application.AssetFileServerFS(assets),
		},
		Mac: application.MacOptions{
			ApplicationShouldTerminateAfterLastWindowClosed: true,
		},
	})

	// Create main window
	app.Window.NewWithOptions(application.WebviewWindowOptions{
		Title:  "NoteFlow",
		Width:  1200,
		Height: 800,
		Mac: application.MacWindow{
			InvisibleTitleBarHeight: 50,
			Backdrop:               application.MacBackdropTranslucent,
			TitleBar:               application.MacTitleBarHiddenInset,
		},
		BackgroundColour: application.NewRGB(27, 38, 54),
		URL:              "/",
		MinWidth:         800,
		MinHeight:        600,
	})

	err := app.Run()
	if err != nil {
		log.Fatal(err)
	}
}
