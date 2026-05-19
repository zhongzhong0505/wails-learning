package main

import "fmt"

// CounterService demonstrates basic state management with service binding
type CounterService struct {
	count int
}

// GetCount returns the current counter value
func (s *CounterService) GetCount() int {
	return s.count
}

// Increment increases the counter by 1 and returns the new value
func (s *CounterService) Increment() int {
	s.count++
	return s.count
}

// Decrement decreases the counter by 1 and returns the new value
func (s *CounterService) Decrement() int {
	s.count--
	return s.count
}

// Reset sets the counter back to 0
func (s *CounterService) Reset() int {
	s.count = 0
	return s.count
}

// IncrementBy increases the counter by a specified amount
func (s *CounterService) IncrementBy(amount int) int {
	s.count += amount
	return s.count
}

// GetCounterInfo returns detailed information about the counter
func (s *CounterService) GetCounterInfo() map[string]interface{} {
	return map[string]interface{}{
		"value":      s.count,
		"isPositive": s.count > 0,
		"isNegative": s.count < 0,
		"isZero":     s.count == 0,
		"message":    fmt.Sprintf("Current count is %d", s.count),
	}
}
