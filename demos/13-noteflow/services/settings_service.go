package services

import (
	"runtime"

	"noteflow/models"
)

const appVersion = "0.1.0"

// SettingsService provides app configuration and platform information.
type SettingsService struct{}

// NewSettingsService creates a new SettingsService instance.
func NewSettingsService() *SettingsService {
	return &SettingsService{}
}

// GetAppInfo returns application metadata and platform information.
func (s *SettingsService) GetAppInfo() models.AppInfo {
	return models.AppInfo{
		Version:  appVersion,
		Platform: runtime.GOOS,
		Arch:     runtime.GOARCH,
	}
}
