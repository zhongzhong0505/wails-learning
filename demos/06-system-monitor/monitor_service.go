package main

import (
	"fmt"
	"os"
	"runtime"
	"time"
)

// SystemStats holds current system statistics
type SystemStats struct {
	CPUUsage    float64   `json:"cpuUsage"`
	MemoryTotal uint64    `json:"memoryTotal"`
	MemoryUsed  uint64    `json:"memoryUsed"`
	MemoryFree  uint64    `json:"memoryFree"`
	MemoryUsage float64   `json:"memoryUsage"`
	GoRoutines  int       `json:"goRoutines"`
	NumCPU      int       `json:"numCPU"`
	OS          string    `json:"os"`
	Arch        string    `json:"arch"`
	Hostname    string    `json:"hostname"`
	Uptime      string    `json:"uptime"`
	Timestamp   string    `json:"timestamp"`
}

// ProcessInfo holds information about a running process
type ProcessInfo struct {
	PID    int     `json:"pid"`
	Name   string  `json:"name"`
	CPU    float64 `json:"cpu"`
	Memory float64 `json:"memory"`
}

// MonitorService provides system monitoring capabilities
type MonitorService struct {
	startTime time.Time
}

// OnStartup records the application start time
func (s *MonitorService) OnStartup() {
	s.startTime = time.Now()
}

// GetSystemStats returns current system statistics
func (s *MonitorService) GetSystemStats() SystemStats {
	var memStats runtime.MemStats
	runtime.ReadMemStats(&memStats)

	hostname, _ := os.Hostname()
	uptime := time.Since(s.startTime)

	return SystemStats{
		CPUUsage:    getCPUUsage(),
		MemoryTotal: memStats.Sys,
		MemoryUsed:  memStats.Alloc,
		MemoryFree:  memStats.Sys - memStats.Alloc,
		MemoryUsage: float64(memStats.Alloc) / float64(memStats.Sys) * 100,
		GoRoutines:  runtime.NumGoroutine(),
		NumCPU:      runtime.NumCPU(),
		OS:          runtime.GOOS,
		Arch:        runtime.GOARCH,
		Hostname:    hostname,
		Uptime:      formatDuration(uptime),
		Timestamp:   time.Now().Format("2006-01-02 15:04:05"),
	}
}

// GetMemoryDetails returns detailed memory information
func (s *MonitorService) GetMemoryDetails() map[string]uint64 {
	var m runtime.MemStats
	runtime.ReadMemStats(&m)

	return map[string]uint64{
		"alloc":      m.Alloc,
		"totalAlloc": m.TotalAlloc,
		"sys":        m.Sys,
		"numGC":      uint64(m.NumGC),
		"heapAlloc":  m.HeapAlloc,
		"heapSys":    m.HeapSys,
		"heapIdle":   m.HeapIdle,
		"heapInuse":  m.HeapInuse,
		"stackSys":   m.StackSys,
		"stackInuse": m.StackInuse,
	}
}

// GetRuntimeInfo returns Go runtime information
func (s *MonitorService) GetRuntimeInfo() map[string]string {
	return map[string]string{
		"goVersion": runtime.Version(),
		"os":        runtime.GOOS,
		"arch":      runtime.GOARCH,
		"numCPU":    fmt.Sprintf("%d", runtime.NumCPU()),
		"compiler":  runtime.Compiler,
	}
}

// ForceGC triggers garbage collection
func (s *MonitorService) ForceGC() {
	runtime.GC()
}

// getCPUUsage returns a simulated CPU usage percentage
// In production, use a library like gopsutil for real CPU metrics
func getCPUUsage() float64 {
	// Simplified: return goroutine-based estimation
	numGoroutines := runtime.NumGoroutine()
	numCPU := runtime.NumCPU()
	usage := float64(numGoroutines) / float64(numCPU*10) * 100
	if usage > 100 {
		usage = 100
	}
	return usage
}

func formatDuration(d time.Duration) string {
	hours := int(d.Hours())
	minutes := int(d.Minutes()) % 60
	seconds := int(d.Seconds()) % 60
	return fmt.Sprintf("%02d:%02d:%02d", hours, minutes, seconds)
}
