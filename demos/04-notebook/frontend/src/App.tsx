import { useState, useEffect, useCallback } from 'react'
import { NoteService } from '../bindings/notebook'

// Types matching Go backend
interface Note {
  id: number
  title: string
  content: string
  category: string
  createdAt: string
  updatedAt: string
}

function App() {
  const [notes, setNotes] = useState<Note[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [isEditing, setIsEditing] = useState<boolean>(false)
  const [editTitle, setEditTitle] = useState<string>('')
  const [editContent, setEditContent] = useState<string>('')
  const [editCategory, setEditCategory] = useState<string>('general')
  const [error, setError] = useState<string>('')

  const loadNotes = useCallback(async () => {
    try {
      let result: Note[]
      if (searchQuery) {
        result = (await NoteService.Search(searchQuery)) as Note[]
      } else if (selectedCategory !== 'all') {
        result = (await NoteService.GetByCategory(selectedCategory)) as Note[]
      } else {
        result = (await NoteService.GetAll()) as Note[]
      }
      setNotes(result || [])
      setError('')
    } catch (err) {
      setError(String(err))
    }
  }, [searchQuery, selectedCategory])

  const loadCategories = useCallback(async () => {
    try {
      const cats = (await NoteService.GetCategories()) as string[]
      setCategories(cats || [])
    } catch (err) {
      console.error('Failed to load categories:', err)
    }
  }, [])

  useEffect(() => {
    loadNotes()
    loadCategories()
  }, [loadNotes, loadCategories])

  async function handleCreate(): Promise<void> {
    try {
      const note = (await NoteService.Create('Untitled', '', 'general')) as Note
      setSelectedNote(note)
      setIsEditing(true)
      setEditTitle(note.title)
      setEditContent(note.content)
      setEditCategory(note.category)
      await loadNotes()
      await loadCategories()
    } catch (err) {
      setError(String(err))
    }
  }

  async function handleSave(): Promise<void> {
    if (!selectedNote) return
    try {
      const updated = (await NoteService.Update(
        selectedNote.id, editTitle, editContent, editCategory
      )) as Note
      setSelectedNote(updated)
      setIsEditing(false)
      await loadNotes()
      await loadCategories()
    } catch (err) {
      setError(String(err))
    }
  }

  async function handleDelete(id: number): Promise<void> {
    try {
      await NoteService.Delete(id)
      if (selectedNote?.id === id) {
        setSelectedNote(null)
        setIsEditing(false)
      }
      await loadNotes()
      await loadCategories()
    } catch (err) {
      setError(String(err))
    }
  }

  function selectNote(note: Note): void {
    setSelectedNote(note)
    setIsEditing(false)
    setEditTitle(note.title)
    setEditContent(note.content)
    setEditCategory(note.category)
  }

  function startEditing(): void {
    if (!selectedNote) return
    setIsEditing(true)
    setEditTitle(selectedNote.title)
    setEditContent(selectedNote.content)
    setEditCategory(selectedNote.category)
  }

  return (
    <div className="notebook">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>📓 Notebook</h1>
          <button onClick={handleCreate} className="btn-new">+ New</button>
        </div>

        <div className="search-box">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes..."
          />
        </div>

        <div className="category-filter">
          <button
            className={selectedCategory === 'all' ? 'active' : ''}
            onClick={() => setSelectedCategory('all')}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              className={selectedCategory === cat ? 'active' : ''}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        <ul className="note-list">
          {notes.map((note) => (
            <li
              key={note.id}
              className={`note-item ${selectedNote?.id === note.id ? 'selected' : ''}`}
              onClick={() => selectNote(note)}
            >
              <span className="note-item-title">{note.title}</span>
              <span className="note-item-category">{note.category}</span>
              <button
                className="note-item-delete"
                onClick={(e) => { e.stopPropagation(); handleDelete(note.id) }}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {/* Main content */}
      <main className="content">
        {selectedNote ? (
          isEditing ? (
            <div className="editor">
              <div className="editor-header">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="edit-title"
                  placeholder="Note title"
                />
                <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)}>
                  <option value="general">general</option>
                  <option value="tech">tech</option>
                  <option value="personal">personal</option>
                  <option value="work">work</option>
                  <option value="ideas">ideas</option>
                </select>
              </div>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="edit-content"
                placeholder="Write your note here..."
              />
              <div className="editor-actions">
                <button onClick={handleSave} className="btn-save">Save</button>
                <button onClick={() => setIsEditing(false)} className="btn-cancel">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="note-view">
              <div className="note-view-header">
                <h2>{selectedNote.title}</h2>
                <div className="note-meta">
                  <span className="badge">{selectedNote.category}</span>
                  <span className="date">Updated: {new Date(selectedNote.updatedAt).toLocaleString()}</span>
                </div>
              </div>
              <div className="note-view-content">
                {selectedNote.content || <em className="empty-content">No content yet. Click Edit to add content.</em>}
              </div>
              <button onClick={startEditing} className="btn-edit">✏️ Edit</button>
            </div>
          )
        ) : (
          <div className="empty-state">
            <h2>📝 Select a note</h2>
            <p>Choose a note from the sidebar or create a new one</p>
          </div>
        )}

        {error && <div className="error">{error}</div>}
      </main>
    </div>
  )
}

export default App
