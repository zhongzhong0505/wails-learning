package main

import "fmt"

// GreetService provides greeting functionality to the frontend
type GreetService struct{}

// Greet returns a greeting message for the given name.
// This method is automatically exposed to the frontend via Wails bindings.
func (s *GreetService) Greet(name string) string {
	if name == "" {
		return "Hello, World! Welcome to Wails v3!"
	}
	return fmt.Sprintf("Hello, %s! Welcome to Wails v3!", name)
}

// GetWailsInfo returns information about the Wails framework
func (s *GreetService) GetWailsInfo() map[string]string {
	return map[string]string{
		"version":  "v3",
		"backend":  "Go",
		"frontend": "Web (HTML/CSS/JS)",
		"renderer": "Native WebView",
	}
}
