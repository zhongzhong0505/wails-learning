package main

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
)

// Config holds application configuration
type Config struct {
	Theme      string `json:"theme"`
	FontSize   int    `json:"fontSize"`
	AutoSave   bool   `json:"autoSave"`
	LastFolder string `json:"lastFolder"`
	LastFile   string `json:"lastFile"`
}

// ConfigService manages application configuration
type ConfigService struct {
	config     Config
	configPath string
}

// OnStartup loads configuration from disk
func (s *ConfigService) OnStartup(ctx context.Context) error {
	home, err := os.UserHomeDir()
	if err != nil {
		return err
	}

	configDir := filepath.Join(home, ".wails-markdown-editor")
	if err := os.MkdirAll(configDir, 0755); err != nil {
		return err
	}

	s.configPath = filepath.Join(configDir, "config.json")
	return s.load()
}

func (s *ConfigService) load() error {
	data, err := os.ReadFile(s.configPath)
	if err != nil {
		// Default config
		s.config = Config{
			Theme:    "light",
			FontSize: 14,
			AutoSave: true,
		}
		return nil
	}
	return json.Unmarshal(data, &s.config)
}

func (s *ConfigService) save() error {
	data, err := json.MarshalIndent(s.config, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(s.configPath, data, 0644)
}

// GetConfig returns the current configuration
func (s *ConfigService) GetConfig() Config {
	return s.config
}

// SetTheme updates the theme setting
func (s *ConfigService) SetTheme(theme string) error {
	s.config.Theme = theme
	return s.save()
}

// SetFontSize updates the font size setting
func (s *ConfigService) SetFontSize(size int) error {
	if size < 10 || size > 30 {
		size = 14
	}
	s.config.FontSize = size
	return s.save()
}

// SetAutoSave updates the auto-save setting
func (s *ConfigService) SetAutoSave(enabled bool) error {
	s.config.AutoSave = enabled
	return s.save()
}

// SetLastFolder remembers the last opened folder
func (s *ConfigService) SetLastFolder(path string) error {
	s.config.LastFolder = path
	return s.save()
}

// SetLastFile remembers the last opened file
func (s *ConfigService) SetLastFile(path string) error {
	s.config.LastFile = path
	return s.save()
}
