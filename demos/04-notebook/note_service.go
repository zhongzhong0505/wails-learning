package main

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"time"

	_ "modernc.org/sqlite"
)

// Note represents a single note entry
type Note struct {
	ID        int    `json:"id"`
	Title     string `json:"title"`
	Content   string `json:"content"`
	Category  string `json:"category"`
	CreatedAt string `json:"createdAt"`
	UpdatedAt string `json:"updatedAt"`
}

// NoteService manages notes with SQLite storage
type NoteService struct {
	db *sql.DB
}

// OnStartup initializes the database connection and creates tables
func (s *NoteService) OnStartup(ctx context.Context) error {
	// Create app data directory
	home, err := os.UserHomeDir()
	if err != nil {
		return err
	}
	dataDir := filepath.Join(home, ".wails-notebook")
	if err := os.MkdirAll(dataDir, 0755); err != nil {
		return err
	}

	// Open SQLite database
	dbPath := filepath.Join(dataDir, "notes.db")
	s.db, err = sql.Open("sqlite", dbPath)
	if err != nil {
		return err
	}

	// Create tables
	_, err = s.db.Exec(`
		CREATE TABLE IF NOT EXISTS notes (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			title TEXT NOT NULL DEFAULT 'Untitled',
			content TEXT DEFAULT '',
			category TEXT DEFAULT 'general',
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)
	`)
	if err != nil {
		return err
	}

	// Insert sample data if empty
	var count int
	s.db.QueryRow("SELECT COUNT(*) FROM notes").Scan(&count)
	if count == 0 {
		s.insertSampleData()
	}

	return nil
}

// OnShutdown closes the database connection
func (s *NoteService) OnShutdown() error {
	if s.db != nil {
		return s.db.Close()
	}
	return nil
}

func (s *NoteService) insertSampleData() {
	samples := []struct{ title, content, category string }{
		{"Welcome to Notebook", "This is your first note! You can edit, delete, and create new notes.", "general"},
		{"Wails v3 Tips", "- Use `wails3 dev` for hot reload\n- Services are auto-bound\n- Events enable real-time updates", "tech"},
		{"Shopping List", "- Milk\n- Bread\n- Eggs\n- Coffee", "personal"},
	}
	for _, s2 := range samples {
		s.db.Exec("INSERT INTO notes (title, content, category) VALUES (?, ?, ?)", s2.title, s2.content, s2.category)
	}
}

// GetAll returns all notes ordered by update time
func (s *NoteService) GetAll() ([]Note, error) {
	rows, err := s.db.Query(
		"SELECT id, title, content, category, created_at, updated_at FROM notes ORDER BY updated_at DESC",
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var notes []Note
	for rows.Next() {
		var n Note
		if err := rows.Scan(&n.ID, &n.Title, &n.Content, &n.Category, &n.CreatedAt, &n.UpdatedAt); err != nil {
			return nil, err
		}
		notes = append(notes, n)
	}
	return notes, nil
}

// GetByID returns a single note by ID
func (s *NoteService) GetByID(id int) (Note, error) {
	var n Note
	err := s.db.QueryRow(
		"SELECT id, title, content, category, created_at, updated_at FROM notes WHERE id = ?", id,
	).Scan(&n.ID, &n.Title, &n.Content, &n.Category, &n.CreatedAt, &n.UpdatedAt)

	if err == sql.ErrNoRows {
		return Note{}, errors.New("note not found")
	}
	return n, err
}

// Create creates a new note
func (s *NoteService) Create(title, content, category string) (Note, error) {
	if title == "" {
		title = "Untitled"
	}
	if category == "" {
		category = "general"
	}

	result, err := s.db.Exec(
		"INSERT INTO notes (title, content, category) VALUES (?, ?, ?)",
		title, content, category,
	)
	if err != nil {
		return Note{}, err
	}

	id, _ := result.LastInsertId()
	return s.GetByID(int(id))
}

// Update updates an existing note
func (s *NoteService) Update(id int, title, content, category string) (Note, error) {
	if title == "" {
		return Note{}, errors.New("title cannot be empty")
	}

	now := time.Now().Format("2006-01-02 15:04:05")
	_, err := s.db.Exec(
		"UPDATE notes SET title = ?, content = ?, category = ?, updated_at = ? WHERE id = ?",
		title, content, category, now, id,
	)
	if err != nil {
		return Note{}, err
	}
	return s.GetByID(id)
}

// Delete removes a note by ID
func (s *NoteService) Delete(id int) error {
	result, err := s.db.Exec("DELETE FROM notes WHERE id = ?", id)
	if err != nil {
		return err
	}
	affected, _ := result.RowsAffected()
	if affected == 0 {
		return errors.New("note not found")
	}
	return nil
}

// Search searches notes by title or content
func (s *NoteService) Search(query string) ([]Note, error) {
	if query == "" {
		return s.GetAll()
	}

	pattern := fmt.Sprintf("%%%s%%", query)
	rows, err := s.db.Query(
		"SELECT id, title, content, category, created_at, updated_at FROM notes WHERE title LIKE ? OR content LIKE ? ORDER BY updated_at DESC",
		pattern, pattern,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var notes []Note
	for rows.Next() {
		var n Note
		if err := rows.Scan(&n.ID, &n.Title, &n.Content, &n.Category, &n.CreatedAt, &n.UpdatedAt); err != nil {
			return nil, err
		}
		notes = append(notes, n)
	}
	return notes, nil
}

// GetCategories returns all unique categories
func (s *NoteService) GetCategories() ([]string, error) {
	rows, err := s.db.Query("SELECT DISTINCT category FROM notes ORDER BY category")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var categories []string
	for rows.Next() {
		var cat string
		if err := rows.Scan(&cat); err != nil {
			return nil, err
		}
		categories = append(categories, cat)
	}
	return categories, nil
}

// GetByCategory returns notes filtered by category
func (s *NoteService) GetByCategory(category string) ([]Note, error) {
	if category == "" || category == "all" {
		return s.GetAll()
	}

	rows, err := s.db.Query(
		"SELECT id, title, content, category, created_at, updated_at FROM notes WHERE category = ? ORDER BY updated_at DESC",
		category,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var notes []Note
	for rows.Next() {
		var n Note
		if err := rows.Scan(&n.ID, &n.Title, &n.Content, &n.Category, &n.CreatedAt, &n.UpdatedAt); err != nil {
			return nil, err
		}
		notes = append(notes, n)
	}
	return notes, nil
}
