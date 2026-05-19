package main

import (
	"errors"
	"math"
)

// CalculatorService demonstrates methods with multiple parameters and error handling
type CalculatorService struct{}

// Add returns the sum of two numbers
func (s *CalculatorService) Add(a, b float64) float64 {
	return a + b
}

// Subtract returns the difference of two numbers
func (s *CalculatorService) Subtract(a, b float64) float64 {
	return a - b
}

// Multiply returns the product of two numbers
func (s *CalculatorService) Multiply(a, b float64) float64 {
	return a * b
}

// Divide returns the quotient of two numbers, returns error if dividing by zero
func (s *CalculatorService) Divide(a, b float64) (float64, error) {
	if b == 0 {
		return 0, errors.New("cannot divide by zero")
	}
	return a / b, nil
}

// Power returns a raised to the power of b
func (s *CalculatorService) Power(base, exponent float64) float64 {
	return math.Pow(base, exponent)
}

// Sqrt returns the square root of a number, returns error if negative
func (s *CalculatorService) Sqrt(n float64) (float64, error) {
	if n < 0 {
		return 0, errors.New("cannot calculate square root of negative number")
	}
	return math.Sqrt(n), nil
}

// BatchCalculate performs multiple operations and returns results
func (s *CalculatorService) BatchCalculate(a, b float64) map[string]float64 {
	results := map[string]float64{
		"add":      a + b,
		"subtract": a - b,
		"multiply": a * b,
	}
	if b != 0 {
		results["divide"] = a / b
	}
	return results
}
