/**
 * NoteEditor component — edits note title and content with auto-save.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { Note } from '../services/noteApi'

interface NoteEditorProps {
  note: Note | null
  onUpdate: (id: string, title?: string, content?: string, isPinned?: boolean, isArchived?: boolean) => void
  onDelete: (id: string) => void
  onTogglePin: (id: string) => void
  onArchive: (id: string) => void
}

export function NoteEditor({
  note,
  onUpdate,
  onDelete,
  onTogglePin,
  onArchive,
}: NoteEditorProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const noteIdRef = useRef<string | null>(null)

  // Sync state when note changes
  useEffect(() => {
    if (note) {
      setTitle(note.title)
      setContent(note.content)
      noteIdRef.current = note.id
    }
  }, [note?.id])

  // Auto-save with debounce
  const debouncedSave = useCallback(
    (newTitle: string, newContent: string) => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }
      saveTimerRef.current = setTimeout(() => {
        if (noteIdRef.current) {
          onUpdate(noteIdRef.current, newTitle, newContent)
        }
      }, 500)
    },
    [onUpdate]
  )

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }
    }
  }, [])

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value
    setTitle(newTitle)
    debouncedSave(newTitle, content)
  }

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value
    setContent(newContent)
    debouncedSave(title, newContent)
  }

  // Keyboard shortcut: Cmd+S to force save
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        if (noteIdRef.current) {
          onUpdate(noteIdRef.current, title, content)
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [title, content, onUpdate])

  if (!note) {
    return (
      <div className="editor-panel">
        <div className="empty-state">
          <div className="icon">✍️</div>
          <p>Select a note to start editing</p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Or create a new note from the list
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="editor-panel">
      {/* Editor header */}
      <div className="editor-header">
        <input
          className="editor-title-input"
          value={title}
          onChange={handleTitleChange}
          placeholder="Note title..."
        />
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => onTogglePin(note.id)}
            title={note.is_pinned ? 'Unpin' : 'Pin'}
          >
            {note.is_pinned ? '📌' : '📍'}
          </button>
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => onArchive(note.id)}
            title="Archive"
          >
            🗄️
          </button>
          <button
            className="btn btn-danger btn-icon"
            onClick={() => onDelete(note.id)}
            title="Delete"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Editor body */}
      <div className="editor-body">
        <textarea
          className="editor-textarea"
          value={content}
          onChange={handleContentChange}
          placeholder="Start writing..."
        />
      </div>
    </div>
  )
}
