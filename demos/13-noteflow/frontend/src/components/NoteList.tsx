/**
 * NoteList component — displays list of notes with search.
 */
import { Note } from '../services/noteApi'

interface NoteListProps {
  notes: Note[]
  activeNoteId?: string
  searchQuery: string
  onNoteSelect: (note: Note) => void
  onSearch: (query: string) => void
  onCreateNote: () => void
}

export function NoteList({
  notes,
  activeNoteId,
  searchQuery,
  onNoteSelect,
  onSearch,
  onCreateNote,
}: NoteListProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days} days ago`
    return date.toLocaleDateString()
  }

  const getPreview = (content: string) => {
    return content.slice(0, 80) || 'No content'
  }

  return (
    <div className="note-list-panel">
      <div className="note-list-header">
        <h2>Notes ({notes.length})</h2>
        <button className="btn btn-primary" onClick={onCreateNote}>
          + New
        </button>
      </div>

      {/* Search */}
      <div className="search-container">
        <input
          className="search-input"
          type="text"
          placeholder="Search notes..."
          value={searchQuery}
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>

      {/* Note list */}
      <div className="note-list-content">
        {notes.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📝</div>
            <p>{searchQuery ? 'No notes found' : 'No notes yet'}</p>
            {!searchQuery && (
              <button className="btn btn-primary" onClick={onCreateNote}>
                Create your first note
              </button>
            )}
          </div>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              className={`note-item ${activeNoteId === note.id ? 'active' : ''}`}
              onClick={() => onNoteSelect(note)}
            >
              <div className="note-title">
                {note.is_pinned && <span className="pin-badge">📌 </span>}
                {note.title || 'Untitled'}
              </div>
              <div className="note-preview">{getPreview(note.content)}</div>
              <div className="note-date">{formatDate(note.updated_at)}</div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
