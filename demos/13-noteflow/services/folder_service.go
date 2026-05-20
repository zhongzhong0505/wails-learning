package services

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"noteflow/models"

	"github.com/google/uuid"
	"github.com/wailsapp/wails/v3/pkg/application"
)

// FolderService manages folder CRUD operations.
type FolderService struct {
	db *sql.DB
}

// NewFolderService creates a new FolderService instance.
func NewFolderService() *FolderService {
	return &FolderService{}
}

// ServiceStartup is called when the service starts (Wails v3 lifecycle).
func (s *FolderService) ServiceStartup(_ context.Context, _ application.ServiceOptions) error {
	db, err := GetDatabase()
	if err != nil {
		return fmt.Errorf("failed to initialize database: %w", err)
	}
	s.db = db
	return nil
}

// ServiceShutdown is called when the app exits. DB is shared, so no close here.
func (s *FolderService) ServiceShutdown() error {
	return nil
}

// Create creates a new folder.
func (s *FolderService) Create(name, icon string, parentID *string) (models.Folder, error) {
	if name == "" {
		return models.Folder{}, fmt.Errorf("folder name cannot be empty")
	}
	if icon == "" {
		icon = "📁"
	}

	id := uuid.New().String()
	now := time.Now()

	// Get next sort order
	var maxOrder int
	s.db.QueryRow("SELECT COALESCE(MAX(sort_order), 0) FROM folders").Scan(&maxOrder)

	_, err := s.db.Exec(
		`INSERT INTO folders (id, name, icon, parent_id, sort_order, created_at) 
		 VALUES (?, ?, ?, ?, ?, ?)`,
		id, name, icon, parentID, maxOrder+1, now,
	)
	if err != nil {
		return models.Folder{}, fmt.Errorf("failed to create folder: %w", err)
	}

	return models.Folder{
		ID:        id,
		Name:      name,
		Icon:      icon,
		ParentID:  parentID,
		SortOrder: maxOrder + 1,
		CreatedAt: now,
	}, nil
}

// GetAll returns all folders with note counts.
func (s *FolderService) GetAll() ([]models.FolderWithCount, error) {
	rows, err := s.db.Query(
		`SELECT f.id, f.name, f.icon, f.parent_id, f.sort_order, f.created_at,
		        COALESCE(cnt.note_count, 0) as note_count
		 FROM folders f
		 LEFT JOIN (
		     SELECT folder_id, COUNT(*) as note_count 
		     FROM notes WHERE is_archived = 0 AND folder_id IS NOT NULL
		     GROUP BY folder_id
		 ) cnt ON f.id = cnt.folder_id
		 ORDER BY f.sort_order ASC`,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to query folders: %w", err)
	}
	defer rows.Close()

	var folders []models.FolderWithCount
	for rows.Next() {
		var f models.FolderWithCount
		err := rows.Scan(&f.ID, &f.Name, &f.Icon, &f.ParentID,
			&f.SortOrder, &f.CreatedAt, &f.NoteCount)
		if err != nil {
			return nil, err
		}
		folders = append(folders, f)
	}
	if folders == nil {
		folders = []models.FolderWithCount{}
	}
	return folders, nil
}

// Rename renames a folder.
func (s *FolderService) Rename(id, name string) error {
	if name == "" {
		return fmt.Errorf("folder name cannot be empty")
	}

	result, err := s.db.Exec("UPDATE folders SET name = ? WHERE id = ?", name, id)
	if err != nil {
		return fmt.Errorf("failed to rename folder: %w", err)
	}
	affected, _ := result.RowsAffected()
	if affected == 0 {
		return fmt.Errorf("folder not found")
	}
	return nil
}

// Delete removes a folder and moves its notes to "All Notes".
func (s *FolderService) Delete(id string) error {
	// Move notes out of folder
	_, err := s.db.Exec("UPDATE notes SET folder_id = NULL WHERE folder_id = ?", id)
	if err != nil {
		return fmt.Errorf("failed to move notes: %w", err)
	}

	// Delete the folder
	result, err := s.db.Exec("DELETE FROM folders WHERE id = ?", id)
	if err != nil {
		return fmt.Errorf("failed to delete folder: %w", err)
	}
	affected, _ := result.RowsAffected()
	if affected == 0 {
		return fmt.Errorf("folder not found")
	}
	return nil
}
