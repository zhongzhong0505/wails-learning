package main

import (
	"errors"
	"sync"
	"time"
)

// Todo represents a single todo item
type Todo struct {
	ID        int    `json:"id"`
	Title     string `json:"title"`
	Completed bool   `json:"completed"`
	CreatedAt string `json:"createdAt"`
}

// TodoFilter represents filter options
type TodoFilter string

const (
	FilterAll       TodoFilter = "all"
	FilterActive    TodoFilter = "active"
	FilterCompleted TodoFilter = "completed"
)

// TodoService manages todo items in memory
type TodoService struct {
	mu     sync.RWMutex
	todos  []Todo
	nextID int
}

// NewTodoService creates a new TodoService with some sample data
func NewTodoService() *TodoService {
	return &TodoService{
		todos: []Todo{
			{ID: 1, Title: "Learn Wails v3 basics", Completed: true, CreatedAt: time.Now().Add(-2 * time.Hour).Format(time.RFC3339)},
			{ID: 2, Title: "Build a Todo app", Completed: false, CreatedAt: time.Now().Add(-1 * time.Hour).Format(time.RFC3339)},
			{ID: 3, Title: "Explore event system", Completed: false, CreatedAt: time.Now().Format(time.RFC3339)},
		},
		nextID: 4,
	}
}

// GetAll returns all todos
func (s *TodoService) GetAll() []Todo {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.todos
}

// GetFiltered returns todos filtered by status
func (s *TodoService) GetFiltered(filter string) []Todo {
	s.mu.RLock()
	defer s.mu.RUnlock()

	f := TodoFilter(filter)
	if f == FilterAll {
		return s.todos
	}

	var result []Todo
	for _, todo := range s.todos {
		if f == FilterCompleted && todo.Completed {
			result = append(result, todo)
		} else if f == FilterActive && !todo.Completed {
			result = append(result, todo)
		}
	}
	return result
}

// Add creates a new todo item
func (s *TodoService) Add(title string) (Todo, error) {
	if title == "" {
		return Todo{}, errors.New("title cannot be empty")
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	todo := Todo{
		ID:        s.nextID,
		Title:     title,
		Completed: false,
		CreatedAt: time.Now().Format(time.RFC3339),
	}
	s.nextID++
	s.todos = append(s.todos, todo)
	return todo, nil
}

// Toggle toggles the completed status of a todo
func (s *TodoService) Toggle(id int) (Todo, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	for i, todo := range s.todos {
		if todo.ID == id {
			s.todos[i].Completed = !s.todos[i].Completed
			return s.todos[i], nil
		}
	}
	return Todo{}, errors.New("todo not found")
}

// Delete removes a todo by ID
func (s *TodoService) Delete(id int) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	for i, todo := range s.todos {
		if todo.ID == id {
			s.todos = append(s.todos[:i], s.todos[i+1:]...)
			return nil
		}
	}
	return errors.New("todo not found")
}

// Update updates the title of a todo
func (s *TodoService) Update(id int, title string) (Todo, error) {
	if title == "" {
		return Todo{}, errors.New("title cannot be empty")
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	for i, todo := range s.todos {
		if todo.ID == id {
			s.todos[i].Title = title
			return s.todos[i], nil
		}
	}
	return Todo{}, errors.New("todo not found")
}

// ClearCompleted removes all completed todos
func (s *TodoService) ClearCompleted() []Todo {
	s.mu.Lock()
	defer s.mu.Unlock()

	var active []Todo
	for _, todo := range s.todos {
		if !todo.Completed {
			active = append(active, todo)
		}
	}
	s.todos = active
	return s.todos
}

// GetStats returns statistics about todos
func (s *TodoService) GetStats() map[string]int {
	s.mu.RLock()
	defer s.mu.RUnlock()

	total := len(s.todos)
	completed := 0
	for _, todo := range s.todos {
		if todo.Completed {
			completed++
		}
	}

	return map[string]int{
		"total":     total,
		"completed": completed,
		"active":    total - completed,
	}
}
