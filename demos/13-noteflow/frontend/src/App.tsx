/**
 * App — Main application component.
 * Orchestrates all hooks and components with a three-panel desktop layout.
 */
import { useCallback } from 'react'
import { Sidebar } from './components/Sidebar'
import { NoteList } from './components/NoteList'
import { NoteEditor } from './components/NoteEditor'
import { useNotes } from './hooks/useNotes'
import { useFolders } from './hooks/useFolders'
import { useTheme } from './hooks/useTheme'
import { Note } from './services/noteApi'

function App() {
  const { resolvedTheme, setTheme } = useTheme()
  const {
    folders,
    activeFolder,
    setActiveFolder,
    createFolder,
    deleteFolder,
  } = useFolders()

  const {
    notes,
    activeNote,
    searchQuery,
    setActiveNote,
    searchNotes,
    createNote,
    updateNote,
    deleteNote,
    togglePin,
    archiveNote,
  } = useNotes(activeFolder)

  // --- Handlers ---

  const handleFolderSelect = useCallback(
    (folderId?: string) => {
      setActiveFolder(folderId)
    },
    [setActiveFolder]
  )

  const handleShowAll = useCallback(() => {
    setActiveFolder(undefined)
  }, [setActiveFolder])

  const handleNoteSelect = useCallback(
    (note: Note) => {
      setActiveNote(note)
    },
    [setActiveNote]
  )

  const handleCreateNote = useCallback(async () => {
    await createNote()
  }, [createNote])

  const handleCreateFolder = useCallback(
    (name: string) => {
      createFolder(name)
    },
    [createFolder]
  )

  const handleDeleteFolder = useCallback(
    (id: string) => {
      if (confirm('Delete this folder? Notes will be moved to "All Notes".')) {
        deleteFolder(id)
      }
    },
    [deleteFolder]
  )

  const handleDeleteNote = useCallback(
    (id: string) => {
      if (confirm('Delete this note permanently?')) {
        deleteNote(id)
      }
    },
    [deleteNote]
  )

  const handleSearch = useCallback(
    (query: string) => {
      searchNotes(query)
    },
    [searchNotes]
  )

  const handleToggleTheme = useCallback(() => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  }, [resolvedTheme, setTheme])

  // --- Render ---

  return (
    <div className="app-layout">
      <Sidebar
        folders={folders}
        activeFolder={activeFolder}
        onFolderSelect={handleFolderSelect}
        onCreateFolder={handleCreateFolder}
        onDeleteFolder={handleDeleteFolder}
        onShowAll={handleShowAll}
        resolvedTheme={resolvedTheme}
        onToggleTheme={handleToggleTheme}
      />

      <NoteList
        notes={notes}
        activeNoteId={activeNote?.id}
        searchQuery={searchQuery}
        onNoteSelect={handleNoteSelect}
        onSearch={handleSearch}
        onCreateNote={handleCreateNote}
      />

      <NoteEditor
        note={activeNote}
        onUpdate={updateNote}
        onDelete={handleDeleteNote}
        onTogglePin={togglePin}
        onArchive={archiveNote}
      />
    </div>
  )
}

export default App
