package main

import (
	"bytes"

	"github.com/yuin/goldmark"
	"github.com/yuin/goldmark/extension"
	"github.com/yuin/goldmark/parser"
	"github.com/yuin/goldmark/renderer/html"
)

// MarkdownService handles markdown rendering
type MarkdownService struct {
	md goldmark.Markdown
}

// NewMarkdownService creates a new MarkdownService with GFM support
func NewMarkdownService() *MarkdownService {
	md := goldmark.New(
		goldmark.WithExtensions(
			extension.GFM,
			extension.Table,
			extension.Strikethrough,
			extension.TaskList,
		),
		goldmark.WithParserOptions(
			parser.WithAutoHeadingID(),
		),
		goldmark.WithRendererOptions(
			html.WithHardWraps(),
			html.WithXHTML(),
			html.WithUnsafe(),
		),
	)
	return &MarkdownService{md: md}
}

// Render converts markdown text to HTML
func (s *MarkdownService) Render(markdown string) (string, error) {
	var buf bytes.Buffer
	err := s.md.Convert([]byte(markdown), &buf)
	if err != nil {
		return "", err
	}
	return buf.String(), nil
}

// RenderWithTOC renders markdown and extracts table of contents
func (s *MarkdownService) RenderWithTOC(markdown string) (map[string]string, error) {
	var buf bytes.Buffer
	err := s.md.Convert([]byte(markdown), &buf)
	if err != nil {
		return nil, err
	}

	return map[string]string{
		"html": buf.String(),
	}, nil
}
