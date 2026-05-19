package main

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"time"

	"github.com/wailsapp/wails/v3/pkg/application"
)

// FileInfo represents a file or directory entry
type FileInfo struct {
	Name    string `json:"name"`
	Path    string `json:"path"`
	IsDir   bool   `json:"isDir"`
	Size    int64  `json:"size"`
	ModTime string `json:"modTime"`
}

// FileManagerService provides file system operations with native dialogs
type FileManagerService struct {
	app *application.App
}

// ServiceStartup is called when the service starts
func (s *FileManagerService) ServiceStartup(_ context.Context, _ application.ServiceOptions) error {
	s.app = application.Get()
	return nil
}

// OpenFileDialog opens a native file selection dialog and returns the file content
func (s *FileManagerService) OpenFileDialog() (map[string]string, error) {
	dialog := s.app.Dialog.OpenFile()
	dialog.SetTitle("Open File")
	dialog.AddFilter("Text Files", "*.txt;*.md;*.json;*.go;*.js;*.ts;*.html;*.css")
	dialog.AddFilter("All Files", "*.*")

	path, err := dialog.PromptForSingleSelection()
	if err != nil {
		return nil, err
	}
	if path == "" {
		return nil, nil // User cancelled
	}

	content, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("failed to read file: %w", err)
	}

	return map[string]string{
		"path":    path,
		"name":    filepath.Base(path),
		"content": string(content),
	}, nil
}

// OpenFolderDialog opens a native folder selection dialog
func (s *FileManagerService) OpenFolderDialog() (string, error) {
	dialog := s.app.Dialog.OpenFile()
	dialog.SetTitle("Open Folder")
	dialog.CanChooseDirectories(true)
	dialog.CanChooseFiles(false)

	path, err := dialog.PromptForSingleSelection()
	if err != nil {
		return "", err
	}
	return path, nil
}

// SaveFileDialog opens a native save dialog and writes content
func (s *FileManagerService) SaveFileDialog(content string) (string, error) {
	dialog := s.app.Dialog.SaveFile()
	dialog.SetMessage("Save File")
	dialog.SetFilename("untitled.txt")
	dialog.AddFilter("Text Files", "*.txt")
	dialog.AddFilter("Markdown", "*.md")
	dialog.AddFilter("All Files", "*.*")

	path, err := dialog.PromptForSingleSelection()
	if err != nil {
		return "", err
	}
	if path == "" {
		return "", nil // User cancelled
	}

	err = os.WriteFile(path, []byte(content), 0644)
	if err != nil {
		return "", fmt.Errorf("failed to write file: %w", err)
	}

	return path, nil
}

// ReadDirectory reads the contents of a directory
func (s *FileManagerService) ReadDirectory(dirPath string) ([]FileInfo, error) {
	entries, err := os.ReadDir(dirPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read directory: %w", err)
	}

	var files []FileInfo
	for _, entry := range entries {
		// Skip hidden files
		if entry.Name()[0] == '.' {
			continue
		}

		info, err := entry.Info()
		if err != nil {
			continue
		}

		files = append(files, FileInfo{
			Name:    entry.Name(),
			Path:    filepath.Join(dirPath, entry.Name()),
			IsDir:   entry.IsDir(),
			Size:    info.Size(),
			ModTime: info.ModTime().Format(time.RFC3339),
		})
	}

	// Sort: directories first, then files alphabetically
	sort.Slice(files, func(i, j int) bool {
		if files[i].IsDir != files[j].IsDir {
			return files[i].IsDir
		}
		return files[i].Name < files[j].Name
	})

	return files, nil
}

// ReadFileContent reads and returns the content of a file
func (s *FileManagerService) ReadFileContent(path string) (string, error) {
	content, err := os.ReadFile(path)
	if err != nil {
		return "", fmt.Errorf("failed to read file: %w", err)
	}
	return string(content), nil
}

// GetHomeDir returns the user's home directory
func (s *FileManagerService) GetHomeDir() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	return home, nil
}

// ShowMessageDialog shows a native message dialog
func (s *FileManagerService) ShowMessageDialog(title, message string) {
	dialog := s.app.Dialog.Info()
	dialog.SetTitle(title)
	dialog.SetMessage(message)
	dialog.Show()
}