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
		Name:        "File Manager",
		Description: "A Wails v3 File Manager demonstrating native features",
		Services: []application.Service{
			application.NewService(&FileManagerService{}),
			application.NewService(&ClipboardService{}),
		},
		Assets: application.AssetOptions{
			Handler: application.AssetFileServerFS(assets),
		},
		Mac: application.MacOptions{
			ApplicationShouldTerminateAfterLastWindowClosed: true,
		},
	})

	// Create application menu
	menu := app.Menu.New()

	fileMenu := menu.AddSubmenu("File")
	fileMenu.Add("Open File...").
		SetAccelerator("CmdOrCtrl+O").
		OnClick(func(_ *application.Context) {
			app.Event.Emit("menu:open-file")
		})
	fileMenu.Add("Open Folder...").
		SetAccelerator("CmdOrCtrl+Shift+O").
		OnClick(func(_ *application.Context) {
			app.Event.Emit("menu:open-folder")
		})
	fileMenu.Add("Save As...").
		SetAccelerator("CmdOrCtrl+S").
		OnClick(func(_ *application.Context) {
			app.Event.Emit("menu:save-file")
		})
	fileMenu.AddSeparator()
	fileMenu.Add("Quit").
		SetAccelerator("CmdOrCtrl+Q").
		OnClick(func(_ *application.Context) {
			app.Quit()
		})

	editMenu := menu.AddSubmenu("Edit")
	editMenu.Add("Copy Path").
		SetAccelerator("CmdOrCtrl+C").
		OnClick(func(_ *application.Context) {
			app.Event.Emit("menu:copy-path")
		})

	app.Menu.SetApplicationMenu(menu)

	app.Window.NewWithOptions(application.WebviewWindowOptions{
		Title:  "File Manager - Wails v3 Native Features",
		Width:  900,
		Height: 650,
		Mac: application.MacWindow{
			InvisibleTitleBarHeight: 50,
			Backdrop:                application.MacBackdropTranslucent,
			TitleBar:                application.MacTitleBarHiddenInset,
		},
		BackgroundColour: application.NewRGB(27, 38, 54),
		URL:              "/",
	})

	err := app.Run()
	if err != nil {
		log.Fatal(err)
	}
}
