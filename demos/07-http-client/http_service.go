package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// HTTPResponse represents a simplified HTTP response for the frontend
type HTTPResponse struct {
	Status     int               `json:"status"`
	StatusText string            `json:"statusText"`
	Headers    map[string]string `json:"headers"`
	Body       string            `json:"body"`
	Duration   int64             `json:"duration"` // milliseconds
}

// HTTPService provides HTTP request capabilities
type HTTPService struct {
	client *http.Client
}

// ServiceStartup initializes the HTTP client
func (s *HTTPService) ServiceStartup(_ interface{}, _ interface{}) error {
	s.client = &http.Client{
		Timeout: 30 * time.Second,
	}
	return nil
}

// Get performs a GET request
func (s *HTTPService) Get(url string) (*HTTPResponse, error) {
	return s.doRequest("GET", url, "", nil)
}

// Post performs a POST request with JSON body
func (s *HTTPService) Post(url string, body string) (*HTTPResponse, error) {
	headers := map[string]string{"Content-Type": "application/json"}
	return s.doRequest("POST", url, body, headers)
}

// Put performs a PUT request with JSON body
func (s *HTTPService) Put(url string, body string) (*HTTPResponse, error) {
	headers := map[string]string{"Content-Type": "application/json"}
	return s.doRequest("PUT", url, body, headers)
}

// Delete performs a DELETE request
func (s *HTTPService) Delete(url string) (*HTTPResponse, error) {
	return s.doRequest("DELETE", url, "", nil)
}

// FetchJSONPlaceholder fetches sample data from JSONPlaceholder API
func (s *HTTPService) FetchJSONPlaceholder(endpoint string) (*HTTPResponse, error) {
	url := "https://jsonplaceholder.typicode.com/" + endpoint
	return s.Get(url)
}

// FetchGitHubUser fetches a GitHub user's public profile
func (s *HTTPService) FetchGitHubUser(username string) (*HTTPResponse, error) {
	url := "https://api.github.com/users/" + username
	return s.doRequest("GET", url, "", map[string]string{
		"Accept": "application/vnd.github.v3+json",
	})
}

// doRequest performs the actual HTTP request
func (s *HTTPService) doRequest(method, url, body string, headers map[string]string) (*HTTPResponse, error) {
	if s.client == nil {
		s.client = &http.Client{Timeout: 30 * time.Second}
	}

	var bodyReader io.Reader
	if body != "" {
		bodyReader = strings.NewReader(body)
	}

	req, err := http.NewRequest(method, url, bodyReader)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Set headers
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	req.Header.Set("User-Agent", "Wails-HTTP-Client/1.0")

	// Execute request and measure time
	start := time.Now()
	resp, err := s.client.Do(req)
	duration := time.Since(start).Milliseconds()

	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	// Read response body (limit to 1MB)
	respBody, err := io.ReadAll(io.LimitReader(resp.Body, 1024*1024))
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	// Collect response headers
	respHeaders := make(map[string]string)
	for k, v := range resp.Header {
		respHeaders[k] = strings.Join(v, ", ")
	}

	// Try to pretty-print JSON
	bodyStr := string(respBody)
	var jsonObj interface{}
	if json.Unmarshal(respBody, &jsonObj) == nil {
		pretty, err := json.MarshalIndent(jsonObj, "", "  ")
		if err == nil {
			bodyStr = string(pretty)
		}
	}

	return &HTTPResponse{
		Status:     resp.StatusCode,
		StatusText: resp.Status,
		Headers:    respHeaders,
		Body:       bodyStr,
		Duration:   duration,
	}, nil
}
