package services

import (
	"database/sql"
	"os"
	"path/filepath"
	"sync"

	_ "modernc.org/sqlite"
)

var (
	sharedDB   *sql.DB
	dbOnce     sync.Once
	dbInitErr  error
)

// GetDatabase returns the shared database instance (singleton).
// Safe to call from multiple services concurrently.
func GetDatabase() (*sql.DB, error) {
	dbOnce.Do(func() {
		sharedDB, dbInitErr = openDatabase()
	})
	return sharedDB, dbInitErr
}

// openDatabase creates and initializes the SQLite database.
func openDatabase() (*sql.DB, error) {
	// Create app data directory
	home, err := os.UserHomeDir()
	if err != nil {
		return nil, err
	}
	dataDir := filepath.Join(home, ".noteflow")
	if err := os.MkdirAll(dataDir, 0755); err != nil {
		return nil, err
	}

	// Open SQLite database
	dbPath := filepath.Join(dataDir, "noteflow.db")
	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, err
	}

	// Verify connection works
	if err := db.Ping(); err != nil {
		return nil, err
	}

	// Enable WAL mode for better concurrency
	if _, err := db.Exec("PRAGMA journal_mode=WAL"); err != nil {
		return nil, err
	}

	// Run migrations
	if err := runMigrations(db); err != nil {
		return nil, err
	}

	return db, nil
}

// runMigrations creates all necessary tables and indexes.
func runMigrations(db *sql.DB) error {
	migrations := `
		CREATE TABLE IF NOT EXISTS folders (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			icon TEXT DEFAULT '',
			parent_id TEXT,
			sort_order INTEGER DEFAULT 0,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE SET NULL
		);

		CREATE TABLE IF NOT EXISTS notes (
			id TEXT PRIMARY KEY,
			title TEXT NOT NULL DEFAULT 'Untitled',
			content TEXT DEFAULT '',
			folder_id TEXT,
			is_pinned INTEGER NOT NULL DEFAULT 0,
			is_archived INTEGER NOT NULL DEFAULT 0,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
		);

		CREATE INDEX IF NOT EXISTS idx_notes_folder_id ON notes(folder_id);
		CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at DESC);
		CREATE INDEX IF NOT EXISTS idx_notes_is_pinned ON notes(is_pinned);
		CREATE INDEX IF NOT EXISTS idx_notes_is_archived ON notes(is_archived);
	`

	_, err := db.Exec(migrations)
	return err
}
