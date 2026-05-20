package models

import "time"

// Folder represents a folder that organizes notes.
type Folder struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Icon      string    `json:"icon"`
	ParentID  *string   `json:"parent_id"`
	SortOrder int       `json:"sort_order"`
	CreatedAt time.Time `json:"created_at"`
}

// FolderWithCount includes the note count for a folder.
type FolderWithCount struct {
	Folder
	NoteCount int `json:"note_count"`
}

// CreateFolderParams holds parameters for creating a new folder.
type CreateFolderParams struct {
	Name     string  `json:"name"`
	Icon     string  `json:"icon"`
	ParentID *string `json:"parent_id"`
}

// RenameFolderParams holds parameters for renaming a folder.
type RenameFolderParams struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}
