/**
 * Folders hook — manages folder state and operations.
 */
import { useState, useEffect, useCallback } from 'react'
import { folderApi, Folder } from '../services/folderApi'

export function useFolders() {
  const [folders, setFolders] = useState<Folder[]>([])
  const [activeFolder, setActiveFolder] = useState<string | undefined>(undefined)
  const [loading, setLoading] = useState(false)

  const loadFolders = useCallback(async () => {
    setLoading(true)
    try {
      const data = await folderApi.getAll()
      setFolders(data || [])
    } catch (err) {
      console.error('Failed to load folders:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const createFolder = useCallback(async (name: string) => {
    try {
      const folder = await folderApi.create(name)
      setFolders((prev) => [...prev, { ...folder, note_count: 0 }])
      return folder
    } catch (err) {
      console.error('Failed to create folder:', err)
      return null
    }
  }, [])

  const renameFolder = useCallback(async (id: string, name: string) => {
    try {
      await folderApi.rename(id, name)
      setFolders((prev) =>
        prev.map((f) => (f.id === id ? { ...f, name } : f))
      )
    } catch (err) {
      console.error('Failed to rename folder:', err)
    }
  }, [])

  const deleteFolder = useCallback(async (id: string) => {
    try {
      await folderApi.delete(id)
      setFolders((prev) => prev.filter((f) => f.id !== id))
      if (activeFolder === id) {
        setActiveFolder(undefined)
      }
    } catch (err) {
      console.error('Failed to delete folder:', err)
    }
  }, [activeFolder])

  useEffect(() => {
    loadFolders()
  }, [loadFolders])

  return {
    folders,
    activeFolder,
    loading,
    setActiveFolder,
    loadFolders,
    createFolder,
    renameFolder,
    deleteFolder,
  }
}
