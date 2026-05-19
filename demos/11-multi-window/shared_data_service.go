package main

import (
	"context"
	"sync"
	"time"

	"github.com/wailsapp/wails/v3/pkg/application"
)

// SharedItem represents a shared data item
type SharedItem struct {
	ID        int    `json:"id"`
	Text      string `json:"text"`
	CreatedBy string `json:"createdBy"`
	CreatedAt string `json:"createdAt"`
}

// SharedDataService manages data shared between windows
type SharedDataService struct {
	app    *application.App
	mu     sync.RWMutex
	items  []SharedItem
	nextID int
}

func (s *SharedDataService) ServiceStartup(_ context.Context, _ application.ServiceOptions) error {
	s.app = application.Get()
	s.items = make([]SharedItem, 0)
	s.nextID = 1
	return nil
}

// GetItems returns all shared items
func (s *SharedDataService) GetItems() []SharedItem {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.items
}

// AddItem adds a new item and notifies all windows
func (s *SharedDataService) AddItem(text string, createdBy string) SharedItem {
	s.mu.Lock()
	item := SharedItem{
		ID:        s.nextID,
		Text:      text,
		CreatedBy: createdBy,
		CreatedAt: time.Now().Format(time.RFC3339),
	}
	s.nextID++
	s.items = append(s.items, item)
	s.mu.Unlock()

	// Notify all windows about the new item
	s.app.Event.Emit("shared-data-changed", map[string]interface{}{
		"action": "add",
		"item":   item,
	})

	return item
}

// RemoveItem removes an item and notifies all windows
func (s *SharedDataService) RemoveItem(id int) {
	s.mu.Lock()
	for i, item := range s.items {
		if item.ID == id {
			s.items = append(s.items[:i], s.items[i+1:]...)
			break
		}
	}
	s.mu.Unlock()

	// Notify all windows
	s.app.Event.Emit("shared-data-changed", map[string]interface{}{
		"action": "remove",
		"id":     id,
	})
}
