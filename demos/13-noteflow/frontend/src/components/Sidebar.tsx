/**
 * Sidebar component — displays folders and navigation.
 */
import { useState } from 'react'
import { Folder } from '../services/folderApi'

interface SidebarProps {
  folders: Folder[]
  activeFolder?: string
  onFolderSelect: (folderId?: string) => void
  onCreateFolder: (name: string) => void
  onDeleteFolder: (id: string) => void
  onShowAll: () => void
  resolvedTheme: 'light' | 'dark'
  onToggleTheme: () => void
}

export function Sidebar({
  folders,
  activeFolder,
  onFolderSelect,
  onCreateFolder,
  onDeleteFolder,
  onShowAll,
  resolvedTheme,
  onToggleTheme,
}: SidebarProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')

  const handleCreate = () => {
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim())
      setNewFolderName('')
      setIsCreating(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCreate()
    if (e.key === 'Escape') setIsCreating(false)
  }

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h1>📝 NoteFlow</h1>
        <button
          className="btn btn-ghost btn-icon"
          onClick={() => setIsCreating(true)}
          title="New Folder"
        >
          +
        </button>
      </div>

      <div className="sidebar-content">
        {/* All Notes */}
        <div
          className={`folder-item ${activeFolder === undefined ? 'active' : ''}`}
          onClick={onShowAll}
        >
          <span className="icon">📋</span>
          <span className="name">All Notes</span>
        </div>

        {/* Folder list */}
        {folders.map((folder) => (
          <div
            key={folder.id}
            className={`folder-item ${activeFolder === folder.id ? 'active' : ''}`}
            onClick={() => onFolderSelect(folder.id)}
          >
            <span className="icon">{folder.icon || '📁'}</span>
            <span className="name">{folder.name}</span>
            <span className="count">{folder.note_count}</span>
            <button
              className="btn btn-ghost btn-icon"
              onClick={(e) => {
                e.stopPropagation()
                onDeleteFolder(folder.id)
              }}
              style={{ width: 24, height: 24, fontSize: 12, opacity: 0.5 }}
            >
              ×
            </button>
          </div>
        ))}

        {/* Create folder input */}
        {isCreating && (
          <div className="folder-item" style={{ padding: '4px 12px' }}>
            <span className="icon">📁</span>
            <input
              autoFocus
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => setIsCreating(false)}
              placeholder="Folder name..."
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                background: 'transparent',
                color: 'var(--text-primary)',
                fontSize: 14,
              }}
            />
          </div>
        )}
      </div>

      <div className="sidebar-footer">
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {folders.length} folders
        </div>
        <button className="theme-toggle" onClick={onToggleTheme} title="Toggle theme">
          {resolvedTheme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>
    </div>
  )
}
