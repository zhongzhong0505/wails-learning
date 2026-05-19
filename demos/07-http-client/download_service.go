package main

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"sync"
	"time"

	"github.com/wailsapp/wails/v3/pkg/application"
)

// DownloadProgress represents the progress of a download
type DownloadProgress struct {
	URL        string  `json:"url"`
	Downloaded int64   `json:"downloaded"`
	Total      int64   `json:"total"`
	Percent    float64 `json:"percent"`
	Speed      string  `json:"speed"`
	Status     string  `json:"status"` // "downloading", "completed", "error"
}

// DownloadService handles file downloads with progress reporting
type DownloadService struct {
	app    *application.App
	mu     sync.Mutex
	cancel context.CancelFunc
}

// ServiceStartup initializes the download service
func (s *DownloadService) ServiceStartup(_ interface{}, _ interface{}) error {
	s.app = application.Get()
	return nil
}

// StartDownload begins downloading a URL and reports progress via events
func (s *DownloadService) StartDownload(url string) error {
	s.mu.Lock()
	// Cancel any existing download
	if s.cancel != nil {
		s.cancel()
	}
	ctx, cancel := context.WithCancel(context.Background())
	s.cancel = cancel
	s.mu.Unlock()

	go func() {
		defer cancel()
		s.downloadWithProgress(ctx, url)
	}()

	return nil
}

// CancelDownload cancels the current download
func (s *DownloadService) CancelDownload() {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.cancel != nil {
		s.cancel()
		s.cancel = nil
	}
}

func (s *DownloadService) downloadWithProgress(ctx context.Context, url string) {
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		s.emitProgress(DownloadProgress{URL: url, Status: "error"})
		return
	}

	client := &http.Client{Timeout: 5 * time.Minute}
	resp, err := client.Do(req)
	if err != nil {
		if ctx.Err() != nil {
			s.emitProgress(DownloadProgress{URL: url, Status: "cancelled"})
		} else {
			s.emitProgress(DownloadProgress{URL: url, Status: "error"})
		}
		return
	}
	defer resp.Body.Close()

	total := resp.ContentLength
	var downloaded int64
	buf := make([]byte, 32*1024) // 32KB buffer
	startTime := time.Now()
	lastReport := time.Now()

	for {
		select {
		case <-ctx.Done():
			s.emitProgress(DownloadProgress{URL: url, Status: "cancelled"})
			return
		default:
		}

		n, err := resp.Body.Read(buf)
		if n > 0 {
			downloaded += int64(n)

			// Report progress every 100ms
			if time.Since(lastReport) > 100*time.Millisecond {
				elapsed := time.Since(startTime).Seconds()
				speed := float64(downloaded) / elapsed

				var percent float64
				if total > 0 {
					percent = float64(downloaded) / float64(total) * 100
				}

				s.emitProgress(DownloadProgress{
					URL:        url,
					Downloaded: downloaded,
					Total:      total,
					Percent:    percent,
					Speed:      formatSpeed(speed),
					Status:     "downloading",
				})
				lastReport = time.Now()
			}
		}

		if err == io.EOF {
			break
		}
		if err != nil {
			s.emitProgress(DownloadProgress{URL: url, Status: "error"})
			return
		}
	}

	s.emitProgress(DownloadProgress{
		URL:        url,
		Downloaded: downloaded,
		Total:      total,
		Percent:    100,
		Status:     "completed",
	})
}

func (s *DownloadService) emitProgress(progress DownloadProgress) {
	if s.app != nil {
		s.app.Event.Emit("download-progress", progress)
	}
}

func formatSpeed(bytesPerSec float64) string {
	if bytesPerSec < 1024 {
		return fmt.Sprintf("%.0f B/s", bytesPerSec)
	} else if bytesPerSec < 1024*1024 {
		return fmt.Sprintf("%.1f KB/s", bytesPerSec/1024)
	} else {
		return fmt.Sprintf("%.1f MB/s", bytesPerSec/1024/1024)
	}
}
