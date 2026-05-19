package main

import (
	"errors"
	"os"
	"path/filepath"
	"strings"
)

// FileEntry represents a file or directory in the file tree
type FileEntry struct {
	Name     string      `json:"name"`
	Path     string      `json:"path"`
	IsDir    bool        `json:"isDir"`
	Children []FileEntry `json:"children,omitempty"`
}

// FileService handles file system operations
type FileService struct{}

// ReadFile reads the content of a file
func (s *FileService) ReadFile(path string) (string, error) {
	if path == "" {
		return "", errors.New("path cannot be empty")
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

// WriteFile writes content to a file
func (s *FileService) WriteFile(path, content string) error {
	if path == "" {
		return errors.New("path cannot be empty")
	}
	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return err
	}
	return os.WriteFile(path, []byte(content), 0644)
}

// ReadDirectory reads the contents of a directory recursively (markdown files only)
func (s *FileService) ReadDirectory(path string) ([]FileEntry, error) {
	if path == "" {
		return nil, errors.New("path cannot be empty")
	}

	entries, err := os.ReadDir(path)
	if err != nil {
		return nil, err
	}

	var result []FileEntry
	for _, entry := range entries {
		// Skip hidden files and node_modules
		name := entry.Name()
		if strings.HasPrefix(name, ".") || name == "node_modules" {
			continue
		}

		fullPath := filepath.Join(path, name)
		fe := FileEntry{
			Name:  name,
			Path:  fullPath,
			IsDir: entry.IsDir(),
		}

		if entry.IsDir() {
			// Recursively read subdirectories
			children, err := s.ReadDirectory(fullPath)
			if err == nil {
				fe.Children = children
			}
			// Only include directories that have markdown files
			if len(children) > 0 {
				result = append(result, fe)
			}
		} else {
			// Only include markdown files
			ext := strings.ToLower(filepath.Ext(name))
			if ext == ".md" || ext == ".markdown" || ext == ".txt" {
				result = append(result, fe)
			}
		}
	}
	return result, nil
}

// GetHomeDir returns the user's home directory
func (s *FileService) GetHomeDir() (string, error) {
	return os.UserHomeDir()
}

// CreateFile creates a new file with optional content
func (s *FileService) CreateFile(dirPath, filename, content string) (string, error) {
	if filename == "" {
		filename = "untitled.md"
	}
	if !strings.HasSuffix(filename, ".md") {
		filename += ".md"
	}

	fullPath := filepath.Join(dirPath, filename)

	// Check if file already exists
	if _, err := os.Stat(fullPath); err == nil {
		return "", errors.New("file already exists")
	}

	err := os.WriteFile(fullPath, []byte(content), 0644)
	if err != nil {
		return "", err
	}
	return fullPath, nil
}

// DeleteFile deletes a file
func (s *FileService) DeleteFile(path string) error {
	return os.Remove(path)
}

// RenameFile renames a file
func (s *FileService) RenameFile(oldPath, newName string) (string, error) {
	dir := filepath.Dir(oldPath)
	newPath := filepath.Join(dir, newName)
	err := os.Rename(oldPath, newPath)
	return newPath, err
}
