package main

import (
	"context"
	"fmt"

	"github.com/wailsapp/wails/v3/pkg/application"
)

// WindowManagerService manages multiple windows
type WindowManagerService struct {
	app          *application.App
	windowCount  int
}

func (s *WindowManagerService) ServiceStartup(_ context.Context, _ application.ServiceOptions) error {
	s.app = application.Get()
	s.windowCount = 1 // Main window already exists
	return nil
}

// OpenSettingsWindow opens a settings window
func (s *WindowManagerService) OpenSettingsWindow() {
	s.windowCount++
	s.app.Window.NewWithOptions(application.WebviewWindowOptions{
		Title:  "Settings",
		Width:  500,
		Height: 400,
		Mac: application.MacWindow{
			InvisibleTitleBarHeight: 50,
			Backdrop:                application.MacBackdropTranslucent,
			TitleBar:                application.MacTitleBarHiddenInset,
		},
		BackgroundColour: application.NewRGB(30, 30, 46),
		URL:              "/?window=settings",
	})
}

// OpenChildWindow opens a new child window with a custom title
func (s *WindowManagerService) OpenChildWindow(title string) {
	s.windowCount++
	windowTitle := fmt.Sprintf("Window #%d - %s", s.windowCount, title)
	s.app.Window.NewWithOptions(application.WebviewWindowOptions{
		Title:  windowTitle,
		Width:  600,
		Height: 400,
		Mac: application.MacWindow{
			InvisibleTitleBarHeight: 50,
			Backdrop:                application.MacBackdropTranslucent,
			TitleBar:                application.MacTitleBarHiddenInset,
		},
		BackgroundColour: application.NewRGB(27, 38, 54),
		URL:              fmt.Sprintf("/?window=child&title=%s&id=%d", title, s.windowCount),
	})
}

// GetWindowCount returns the total number of windows created
func (s *WindowManagerService) GetWindowCount() int {
	return s.windowCount
}

// BroadcastMessage sends a message to all windows via events
func (s *WindowManagerService) BroadcastMessage(sender string, message string) {
	s.app.Event.Emit("broadcast-message", map[string]string{
		"sender":  sender,
		"message": message,
	})
}
