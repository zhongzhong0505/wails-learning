package main

import (
	"context"
	"runtime"

	"github.com/wailsapp/wails/v3/pkg/application"
)

// WindowService provides window control operations
type WindowService struct {
	app *application.App
}

func (s *WindowService) ServiceStartup(_ context.Context, _ application.ServiceOptions) error {
	s.app = application.Get()
	return nil
}

// Minimize minimizes the current window
func (s *WindowService) Minimize() {
	if win := s.app.Window.Current(); win != nil {
		win.Minimise()
	}
}

// Maximize toggles maximize state
func (s *WindowService) Maximize() {
	if win := s.app.Window.Current(); win != nil {
		if win.IsMaximised() {
			win.UnMaximise()
		} else {
			win.Maximise()
		}
	}
}

// Close closes the current window
func (s *WindowService) Close() {
	if win := s.app.Window.Current(); win != nil {
		win.Close()
	}
}

// IsMaximized returns whether the window is maximized
func (s *WindowService) IsMaximized() bool {
	if win := s.app.Window.Current(); win != nil {
		return win.IsMaximised()
	}
	return false
}

// GetPlatform returns the current platform
func (s *WindowService) GetPlatform() string {
	return runtime.GOOS
}
