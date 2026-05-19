package main

import (
	"context"
	"embed"
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/wailsapp/wails/v3/pkg/application"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	app := application.New(application.Options{
		Name:        "Native Interactions",
		Description: "Demonstrates drag-drop, context menu, shortcuts, and notifications",
		Services: []application.Service{
			application.NewService(&InteractionService{}),
		},
		Assets: application.AssetOptions{
			Handler: application.AssetFileServerFS(assets),
		},
		Mac: application.MacOptions{
			ApplicationShouldTerminateAfterLastWindowClosed: true,
		},
	})

	// Setup keyboard shortcuts via KeyBinding manager
	app.KeyBinding.Add("CmdOrCtrl+O", func(_ application.Window) {
		app.Event.Emit("shortcut:open")
	})
	app.KeyBinding.Add("CmdOrCtrl+S", func(_ application.Window) {
		app.Event.Emit("shortcut:save")
	})
	app.KeyBinding.Add("CmdOrCtrl+Shift+N", func(_ application.Window) {
		app.Event.Emit("shortcut:new")
	})
	app.KeyBinding.Add("CmdOrCtrl+Shift+D", func(_ application.Window) {
		app.Event.Emit("shortcut:delete")
	})

	// Setup context menu
	ctxMenu := app.ContextMenu.New()
	ctxMenu.Add("Open File").OnClick(func(_ *application.Context) {
		app.Event.Emit("context:open")
	})
	ctxMenu.Add("Copy Path").OnClick(func(_ *application.Context) {
		app.Event.Emit("context:copy-path")
	})
	ctxMenu.AddSeparator()
	ctxMenu.Add("Delete").OnClick(func(_ *application.Context) {
		app.Event.Emit("context:delete")
	})
	app.ContextMenu.Add("file-menu", ctxMenu)

	app.Window.NewWithOptions(application.WebviewWindowOptions{
		Title:  "Native Interactions Demo",
		Width:  850,
		Height: 600,
		Mac: application.MacWindow{
			InvisibleTitleBarHeight: 50,
			Backdrop:                application.MacBackdropTranslucent,
			TitleBar:                application.MacTitleBarHiddenInset,
		},
		BackgroundColour: application.NewRGB(27, 38, 54),
		URL:              "/",
		EnableFileDrop:   true,
	})

	err := app.Run()
	if err != nil {
		log.Fatal(err)
	}
}

// InteractionService provides native interaction capabilities
type InteractionService struct {
	app *application.App
}

func (s *InteractionService) ServiceStartup(_ context.Context, _ application.ServiceOptions) error {
	s.app = application.Get()
	return nil
}

// ReadDroppedFile reads the content of a dropped file
func (s *InteractionService) ReadDroppedFile(path string) (map[string]string, error) {
	info, err := os.Stat(path)
	if err != nil {
		return nil, fmt.Errorf("cannot stat file: %w", err)
	}

	result := map[string]string{
		"path":  path,
		"name":  filepath.Base(path),
		"size":  fmt.Sprintf("%d", info.Size()),
		"isDir": fmt.Sprintf("%t", info.IsDir()),
	}

	// Read content for small text files
	if !info.IsDir() && info.Size() < 512*1024 {
		data, err := os.ReadFile(path)
		if err == nil {
			result["content"] = string(data)
		}
	}

	return result, nil
}

// GetFileInfo returns basic info about a file
func (s *InteractionService) GetFileInfo(path string) (map[string]string, error) {
	info, err := os.Stat(path)
	if err != nil {
		return nil, err
	}
	return map[string]string{
		"name":    info.Name(),
		"size":    fmt.Sprintf("%d", info.Size()),
		"modTime": info.ModTime().Format("2006-01-02 15:04:05"),
		"isDir":   fmt.Sprintf("%t", info.IsDir()),
	}, nil
}

// CopyToClipboard copies text to clipboard
func (s *InteractionService) CopyToClipboard(text string) bool {
	return s.app.Clipboard.SetText(text)
}

// ShowNotification emits a notification event (handled by frontend)
func (s *InteractionService) ShowNotification(title, message string) {
	s.app.Event.Emit("notification", map[string]string{
		"title":   title,
		"message": message,
	})
}
