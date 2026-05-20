package models

import "time"

// Note represents a single note entry.
type Note struct {
	ID         string    `json:"id"`
	Title      string    `json:"title"`
	Content    string    `json:"content"`
	FolderID   *string   `json:"folder_id"`
	IsPinned   bool      `json:"is_pinned"`
	IsArchived bool      `json:"is_archived"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

// CreateNoteParams holds parameters for creating a new note.
type CreateNoteParams struct {
	Title    string  `json:"title"`
	Content  string  `json:"content"`
	FolderID *string `json:"folder_id"`
}

// UpdateNoteParams holds parameters for updating an existing note.
type UpdateNoteParams struct {
	ID         string  `json:"id"`
	Title      *string `json:"title"`
	Content    *string `json:"content"`
	FolderID   *string `json:"folder_id"`
	IsPinned   *bool   `json:"is_pinned"`
	IsArchived *bool   `json:"is_archived"`
}
