package main

import (
	"context"
	"fmt"
	"time"

	"github.com/wailsapp/wails/v3/pkg/application"
)

// TrayService provides tray-related operations to the frontend
type TrayService struct {
	app       *application.App
	startTime time.Time
}

func (s *TrayService) ServiceStartup(_ context.Context, _ application.ServiceOptions) error {
	s.app = application.Get()
	s.startTime = time.Now()
	return nil
}

// GetUptime returns the application uptime
func (s *TrayService) GetUptime() string {
	elapsed := time.Since(s.startTime)
	hours := int(elapsed.Hours())
	minutes := int(elapsed.Minutes()) % 60
	seconds := int(elapsed.Seconds()) % 60
	return fmt.Sprintf("%02d:%02d:%02d", hours, minutes, seconds)
}

// GetStatus returns the current application status
func (s *TrayService) GetStatus() map[string]interface{} {
	return map[string]interface{}{
		"running":   true,
		"uptime":    s.GetUptime(),
		"startTime": s.startTime.Format(time.RFC3339),
		"pid":       fmt.Sprintf("%d", time.Now().UnixNano()),
	}
}

// MinimizeToTray hides the window (app keeps running in tray)
func (s *TrayService) MinimizeToTray() {
	if win := s.app.Window.Current(); win != nil {
		win.Hide()
	}
}

// SendTrayNotification emits a notification event
func (s *TrayService) SendTrayNotification(message string) {
	s.app.Event.Emit("tray:notification", message)
}
