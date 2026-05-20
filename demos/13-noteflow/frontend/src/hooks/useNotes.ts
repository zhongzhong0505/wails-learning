/**
 * Notes hook — manages note state and operations.
 */
import { useState, useEffect, useCallback } from 'react'
import { noteApi, Note } from '../services/noteApi'

export function useNotes(folderId?: string) {
  const [notes, setNotes] = useState<Note[]>([])
  const [activeNote, setActiveNote] = useState<Note | null>(null)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Load notes
  const loadNotes = useCallback(async () => {
    setLoading(true)
    try {
      const data = await noteApi.getAll(folderId)
      setNotes(data || [])
    } catch (err) {
      console.error('Failed to load notes:', err)
    } finally {
      setLoading(false)
    }
  }, [folderId])

  // Search notes
  const searchNotes = useCallback(async (query: string) => {
    setSearchQuery(query)
    if (!query.trim()) {
      loadNotes()
      return
    }
    try {
      const results = await noteApi.search(query)
      setNotes(results || [])
    } catch (err) {
      console.error('Search failed:', err)
    }
  }, [loadNotes])

  // Create note
  const createNote = useCallback(async () => {
    try {
      const note = await noteApi.create('Untitled', '', folderId)
      setNotes((prev) => [note, ...prev])
      setActiveNote(note)
      return note
    } catch (err) {
      console.error('Failed to create note:', err)
      return null
    }
  }, [folderId])

  // Update note
  const updateNote = useCallback(async (
    id: string,
    title?: string,
    content?: string,
    isPinned?: boolean,
    isArchived?: boolean
  ) => {
    try {
      const updated = await noteApi.update(id, title, content, undefined, isPinned, isArchived)
      setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)))
      if (activeNote?.id === updated.id) {
        setActiveNote(updated)
      }
      return updated
    } catch (err) {
      console.error('Failed to update note:', err)
      return null
    }
  }, [activeNote])

  // Delete note
  const deleteNote = useCallback(async (id: string) => {
    try {
      await noteApi.delete(id)
      setNotes((prev) => prev.filter((n) => n.id !== id))
      if (activeNote?.id === id) {
        setActiveNote(null)
      }
    } catch (err) {
      console.error('Failed to delete note:', err)
    }
  }, [activeNote])

  // Toggle pin
  const togglePin = useCallback(async (id: string) => {
    const note = notes.find((n) => n.id === id)
    if (note) {
      await updateNote(id, undefined, undefined, !note.is_pinned)
    }
  }, [notes, updateNote])

  // Archive note
  const archiveNote = useCallback(async (id: string) => {
    await updateNote(id, undefined, undefined, undefined, true)
    setNotes((prev) => prev.filter((n) => n.id !== id))
    if (activeNote?.id === id) {
      setActiveNote(null)
    }
  }, [updateNote, activeNote])

  // Load on mount and folder change
  useEffect(() => {
    if (!searchQuery) {
      loadNotes()
    }
  }, [loadNotes, searchQuery])

  return {
    notes,
    activeNote,
    loading,
    searchQuery,
    setActiveNote,
    loadNotes,
    searchNotes,
    createNote,
    updateNote,
    deleteNote,
    togglePin,
    archiveNote,
  }
}
