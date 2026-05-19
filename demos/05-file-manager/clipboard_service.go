package main

import (
	"context"

	"github.com/wailsapp/wails/v3/pkg/application"
)

// ClipboardService provides clipboard operations
type ClipboardService struct {
	app *application.App
}

// ServiceStartup is called when the service starts
func (s *ClipboardService) ServiceStartup(_ context.Context, _ application.ServiceOptions) error {
	s.app = application.Get()
	return nil
}

// CopyText copies text to the system clipboard
func (s *ClipboardService) CopyText(text string) bool {
	return s.app.Clipboard.SetText(text)
}

// PasteText reads text from the system clipboard
func (s *ClipboardService) PasteText() (string, bool) {
	return s.app.Clipboard.Text()
}