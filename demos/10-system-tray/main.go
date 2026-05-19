package main

import (
	"embed"
	"fmt"
	"log"
	"time"

	"github.com/wailsapp/wails/v3/pkg/application"
)

//go:embed all:frontend/dist
var assets embed.FS

//go:embed tray_icon.png
var trayIcon []byte

func main() {
	app := application.New(application.Options{
		Name:        "System Tray Demo",
		Description: "Demonstrates system tray functionality in Wails v3",
		Services: []application.Service{
			application.NewService(&TrayService{}),
		},
		Assets: application.AssetOptions{
			Handler: application.AssetFileServerFS(assets),
		},
		Mac: application.MacOptions{
			ApplicationShouldTerminateAfterLastWindowClosed: false, // Keep running in tray
		},
	})

	// Create main window
	mainWindow := app.Window.NewWithOptions(application.WebviewWindowOptions{
		Title:  "System Tray Demo",
		Width:  700,
		Height: 500,
		Mac: application.MacWindow{
			InvisibleTitleBarHeight: 50,
			Backdrop:                application.MacBackdropTranslucent,
			TitleBar:                application.MacTitleBarHiddenInset,
		},
		BackgroundColour: application.NewRGB(27, 38, 54),
		URL:              "/",
	})

	// Create system tray
	tray := app.SystemTray.New()
	tray.SetIcon(trayIcon)
	tray.SetTooltip("Wails Tray Demo - Running")

	// Create tray menu
	trayMenu := app.Menu.New()
	trayMenu.Add("Show Window").OnClick(func(_ *application.Context) {
		mainWindow.Show()
		mainWindow.Focus()
	})
	trayMenu.Add("Hide Window").OnClick(func(_ *application.Context) {
		mainWindow.Hide()
	})
	trayMenu.AddSeparator()

	// Status submenu
	statusMenu := trayMenu.AddSubmenu("Status")
	statusMenu.Add("Running ✓").SetEnabled(false)
	statusMenu.Add("Uptime: 0s").SetEnabled(false)

	trayMenu.AddSeparator()
	trayMenu.Add("Send Notification").OnClick(func(_ *application.Context) {
		app.Event.Emit("tray:notification", "Hello from system tray!")
	})
	trayMenu.AddSeparator()
	trayMenu.Add("Quit").OnClick(func(_ *application.Context) {
		app.Quit()
	})

	tray.SetMenu(trayMenu)

	// Click tray icon to toggle window
	tray.OnClick(func() {
		if mainWindow.IsVisible() {
			mainWindow.Hide()
		} else {
			mainWindow.Show()
			mainWindow.Focus()
		}
	})

	// Background goroutine to update tray tooltip
	go func() {
		start := time.Now()
		ticker := time.NewTicker(10 * time.Second)
		defer ticker.Stop()
		for range ticker.C {
			elapsed := time.Since(start).Round(time.Second)
			tray.SetTooltip(fmt.Sprintf("Wails Tray Demo - Uptime: %s", elapsed))
		}
	}()

	err := app.Run()
	if err != nil {
		log.Fatal(err)
	}
}
