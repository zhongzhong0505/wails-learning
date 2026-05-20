package models

// NoteStats holds statistics about notes.
type NoteStats struct {
	Total    int `json:"total"`
	Pinned   int `json:"pinned"`
	Archived int `json:"archived"`
	Active   int `json:"active"`
}

// AppInfo holds application metadata and platform information.
type AppInfo struct {
	Version  string `json:"version"`
	Platform string `json:"platform"`
	Arch     string `json:"arch"`
}
