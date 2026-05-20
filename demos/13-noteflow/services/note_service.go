package services

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"noteflow/models"

	"github.com/google/uuid"
)

// NoteService manages note CRUD operations.
type NoteService struct {
	db *sql.DB
}

// NewNoteService creates a new NoteService instance.
func NewNoteService() *NoteService {
	return &NoteService{}
}

// OnStartup initializes the database connection.
func (s *NoteService) OnStartup(ctx context.Context) error {
	db, err := GetDatabase()
	if err != nil {
		return fmt.Errorf("failed to initialize database: %w", err)
	}
	s.db = db
	return nil
}

// OnShutdown is called when the app exits. DB is shared, so no close here.
func (s *NoteService) OnShutdown() error {
	return nil
}

// Create creates a new note and returns it.
func (s *NoteService) Create(title, content string, folderID *string) (models.Note, error) {
	if title == "" {
		title = "Untitled"
	}

	id := uuid.New().String()
	now := time.Now()

	_, err := s.db.Exec(
		`INSERT INTO notes (id, title, content, folder_id, created_at, updated_at) 
		 VALUES (?, ?, ?, ?, ?, ?)`,
		id, title, content, folderID, now, now,
	)
	if err != nil {
		return models.Note{}, fmt.Errorf("failed to create note: %w", err)
	}

	return models.Note{
		ID:         id,
		Title:      title,
		Content:    content,
		FolderID:   folderID,
		IsPinned:   false,
		IsArchived: false,
		CreatedAt:  now,
		UpdatedAt:  now,
	}, nil
}

// GetAll returns all non-archived notes, optionally filtered by folder.
func (s *NoteService) GetAll(folderID *string) ([]models.Note, error) {
	var query string
	var args []interface{}

	if folderID != nil && *folderID != "" {
		query = `SELECT id, title, content, folder_id, is_pinned, is_archived, created_at, updated_at 
				 FROM notes WHERE is_archived = 0 AND folder_id = ? 
				 ORDER BY is_pinned DESC, updated_at DESC`
		args = append(args, *folderID)
	} else {
		query = `SELECT id, title, content, folder_id, is_pinned, is_archived, created_at, updated_at 
				 FROM notes WHERE is_archived = 0 
				 ORDER BY is_pinned DESC, updated_at DESC`
	}

	rows, err := s.db.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query notes: %w", err)
	}
	defer rows.Close()

	return s.scanNotes(rows)
}

// GetByID returns a single note by ID.
func (s *NoteService) GetByID(id string) (models.Note, error) {
	row := s.db.QueryRow(
		`SELECT id, title, content, folder_id, is_pinned, is_archived, created_at, updated_at 
		 FROM notes WHERE id = ?`, id,
	)

	note, err := s.scanNote(row)
	if err != nil {
		return models.Note{}, fmt.Errorf("note not found: %w", err)
	}
	return note, nil
}

// Update updates an existing note with the provided fields.
func (s *NoteService) Update(id string, title, content *string, folderID *string, isPinned, isArchived *bool) (models.Note, error) {
	now := time.Now()

	// Build dynamic update query
	var setClauses []string
	var args []interface{}

	setClauses = append(setClauses, "updated_at = ?")
	args = append(args, now)

	if title != nil {
		setClauses = append(setClauses, "title = ?")
		args = append(args, *title)
	}
	if content != nil {
		setClauses = append(setClauses, "content = ?")
		args = append(args, *content)
	}
	if folderID != nil {
		setClauses = append(setClauses, "folder_id = ?")
		args = append(args, *folderID)
	}
	if isPinned != nil {
		setClauses = append(setClauses, "is_pinned = ?")
		args = append(args, *isPinned)
	}
	if isArchived != nil {
		setClauses = append(setClauses, "is_archived = ?")
		args = append(args, *isArchived)
	}

	query := fmt.Sprintf("UPDATE notes SET %s WHERE id = ?", strings.Join(setClauses, ", "))
	args = append(args, id)

	_, err := s.db.Exec(query, args...)
	if err != nil {
		return models.Note{}, fmt.Errorf("failed to update note: %w", err)
	}

	return s.GetByID(id)
}

// Delete removes a note by ID.
func (s *NoteService) Delete(id string) error {
	result, err := s.db.Exec("DELETE FROM notes WHERE id = ?", id)
	if err != nil {
		return fmt.Errorf("failed to delete note: %w", err)
	}
	affected, _ := result.RowsAffected()
	if affected == 0 {
		return fmt.Errorf("note not found")
	}
	return nil
}

// Search searches notes by title or content using LIKE pattern matching.
func (s *NoteService) Search(query string) ([]models.Note, error) {
	if query == "" {
		return s.GetAll(nil)
	}

	pattern := fmt.Sprintf("%%%s%%", query)
	rows, err := s.db.Query(
		`SELECT id, title, content, folder_id, is_pinned, is_archived, created_at, updated_at 
		 FROM notes WHERE is_archived = 0 AND (title LIKE ? OR content LIKE ?) 
		 ORDER BY updated_at DESC LIMIT 50`,
		pattern, pattern,
	)
	if err != nil {
		return nil, fmt.Errorf("search failed: %w", err)
	}
	defer rows.Close()

	return s.scanNotes(rows)
}

// GetArchived returns all archived notes.
func (s *NoteService) GetArchived() ([]models.Note, error) {
	rows, err := s.db.Query(
		`SELECT id, title, content, folder_id, is_pinned, is_archived, created_at, updated_at 
		 FROM notes WHERE is_archived = 1 ORDER BY updated_at DESC`,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to query archived notes: %w", err)
	}
	defer rows.Close()

	return s.scanNotes(rows)
}

// GetStats returns note statistics.
func (s *NoteService) GetStats() (models.NoteStats, error) {
	var stats models.NoteStats

	err := s.db.QueryRow("SELECT COUNT(*) FROM notes").Scan(&stats.Total)
	if err != nil {
		return stats, err
	}

	err = s.db.QueryRow("SELECT COUNT(*) FROM notes WHERE is_pinned = 1").Scan(&stats.Pinned)
	if err != nil {
		return stats, err
	}

	err = s.db.QueryRow("SELECT COUNT(*) FROM notes WHERE is_archived = 1").Scan(&stats.Archived)
	if err != nil {
		return stats, err
	}

	stats.Active = stats.Total - stats.Archived
	return stats, nil
}

// scanNotes scans multiple rows into a slice of Note.
func (s *NoteService) scanNotes(rows *sql.Rows) ([]models.Note, error) {
	var notes []models.Note
	for rows.Next() {
		var n models.Note
		var isPinned, isArchived int
		err := rows.Scan(&n.ID, &n.Title, &n.Content, &n.FolderID,
			&isPinned, &isArchived, &n.CreatedAt, &n.UpdatedAt)
		if err != nil {
			return nil, err
		}
		n.IsPinned = isPinned != 0
		n.IsArchived = isArchived != 0
		notes = append(notes, n)
	}
	if notes == nil {
		notes = []models.Note{}
	}
	return notes, nil
}

// scanNote scans a single row into a Note.
func (s *NoteService) scanNote(row *sql.Row) (models.Note, error) {
	var n models.Note
	var isPinned, isArchived int
	err := row.Scan(&n.ID, &n.Title, &n.Content, &n.FolderID,
		&isPinned, &isArchived, &n.CreatedAt, &n.UpdatedAt)
	if err != nil {
		return models.Note{}, err
	}
	n.IsPinned = isPinned != 0
	n.IsArchived = isArchived != 0
	return n, nil
}
