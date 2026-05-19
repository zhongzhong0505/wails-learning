import { useState, useEffect, useCallback } from 'react'
import { Events } from '@wailsio/runtime'

// Types matching Go structs
interface FileInfo {
  name: string
  path: string
  isDir: boolean
  size: number
  modTime: string
}

declare global {
  interface Window {
    go: {
      main: {
        FileManagerService: {
          OpenFileDialog: () => Promise<Record<string, string> | null>
          OpenFolderDialog: () => Promise<string>
          SaveFileDialog: (content: string) => Promise<string>
          ReadDirectory: (path: string) => Promise<FileInfo[]>
          ReadFileContent: (path: string) => Promise<string>
          GetHomeDir: () => Promise<string>
          ShowMessageDialog: (title: string, message: string) => Promise<void>
        }
        ClipboardService: {
          CopyText: (text: string) => Promise<void>
          PasteText: () => Promise<string>
        }
      }
    }
  }
}

function App() {
  const [currentPath, setCurrentPath] = useState<string>('')
  const [files, setFiles] = useState<FileInfo[]>([])
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null)
  const [fileContent, setFileContent] = useState<string>('')
  const [statusMessage, setStatusMessage] = useState<string>('Ready')
  const [clipboardText, setClipboardText] = useState<string>('')

  // Load home directory on mount
  useEffect(() => {
    window.go.main.FileManagerService.GetHomeDir().then((home) => {
      setCurrentPath(home)
      loadDirectory(home)
    })
  }, [])

  // Listen for menu events
  useEffect(() => {
    const cancelOpen = Events.On('menu:open-file', () => {
      handleOpenFile()
    })
    const cancelFolder = Events.On('menu:open-folder', () => {
      handleOpenFolder()
    })
    const cancelSave = Events.On('menu:save-file', () => {
      handleSaveFile()
    })
    const cancelCopy = Events.On('menu:copy-path', () => {
      if (selectedFile) {
        handleCopyPath(selectedFile.path)
      }
    })

    return () => {
      cancelOpen()
      cancelFolder()
      cancelSave()
      cancelCopy()
    }
  }, [selectedFile, fileContent])

  const loadDirectory = useCallback(async (path: string) => {
    try {
      const entries = await window.go.main.FileManagerService.ReadDirectory(path)
      setFiles(entries || [])
      setCurrentPath(path)
      setStatusMessage(`Loaded: ${path}`)
    } catch (err) {
      setStatusMessage(`Error: ${err}`)
    }
  }, [])

  const handleFileClick = useCallback(async (file: FileInfo) => {
    if (file.isDir) {
      loadDirectory(file.path)
    } else {
      setSelectedFile(file)
      try {
        const content = await window.go.main.FileManagerService.ReadFileContent(file.path)
        setFileContent(content)
        setStatusMessage(`Opened: ${file.name} (${formatSize(file.size)})`)
      } catch (err) {
        setStatusMessage(`Error reading file: ${err}`)
      }
    }
  }, [loadDirectory])

  const handleOpenFile = useCallback(async () => {
    try {
      const result = await window.go.main.FileManagerService.OpenFileDialog()
      if (result) {
        setFileContent(result.content)
        setSelectedFile({ name: result.name, path: result.path, isDir: false, size: 0, modTime: '' })
        setStatusMessage(`Opened via dialog: ${result.name}`)
      }
    } catch (err) {
      setStatusMessage(`Error: ${err}`)
    }
  }, [])

  const handleOpenFolder = useCallback(async () => {
    try {
      const path = await window.go.main.FileManagerService.OpenFolderDialog()
      if (path) {
        loadDirectory(path)
      }
    } catch (err) {
      setStatusMessage(`Error: ${err}`)
    }
  }, [loadDirectory])

  const handleSaveFile = useCallback(async () => {
    try {
      const path = await window.go.main.FileManagerService.SaveFileDialog(fileContent)
      if (path) {
        setStatusMessage(`Saved: ${path}`)
        await window.go.main.FileManagerService.ShowMessageDialog('Success', `File saved to: ${path}`)
      }
    } catch (err) {
      setStatusMessage(`Error saving: ${err}`)
    }
  }, [fileContent])

  const handleCopyPath = useCallback(async (path: string) => {
    try {
      await window.go.main.ClipboardService.CopyText(path)
      setClipboardText(path)
      setStatusMessage(`Copied to clipboard: ${path}`)
    } catch (err) {
      setStatusMessage(`Clipboard error: ${err}`)
    }
  }, [])

  const handlePaste = useCallback(async () => {
    try {
      const text = await window.go.main.ClipboardService.PasteText()
      setClipboardText(text)
      setStatusMessage(`Clipboard content: ${text.substring(0, 50)}...`)
    } catch (err) {
      setStatusMessage(`Clipboard error: ${err}`)
    }
  }, [])

  const navigateUp = useCallback(() => {
    const parent = currentPath.split('/').slice(0, -1).join('/')
    if (parent) {
      loadDirectory(parent)
    }
  }, [currentPath, loadDirectory])

  return (
    <div className="app">
      {/* Toolbar */}
      <div className="toolbar">
        <button onClick={navigateUp} title="Go up">⬆️ Up</button>
        <button onClick={handleOpenFile} title="Open file dialog">📂 Open File</button>
        <button onClick={handleOpenFolder} title="Open folder dialog">📁 Open Folder</button>
        <button onClick={handleSaveFile} title="Save file dialog">💾 Save</button>
        <button onClick={handlePaste} title="Read clipboard">📋 Paste</button>
        <span className="path-display">{currentPath}</span>
      </div>

      {/* Main content */}
      <div className="main-content">
        {/* File list */}
        <div className="file-list">
          <h3>Files</h3>
          <div className="file-entries">
            {files.map((file) => (
              <div
                key={file.path}
                className={`file-entry ${selectedFile?.path === file.path ? 'selected' : ''}`}
                onClick={() => handleFileClick(file)}
                onDoubleClick={() => file.isDir && loadDirectory(file.path)}
              >
                <span className="file-icon">{file.isDir ? '📁' : '📄'}</span>
                <span className="file-name">{file.name}</span>
                <span className="file-size">{file.isDir ? '' : formatSize(file.size)}</span>
                <button
                  className="copy-btn"
                  onClick={(e) => { e.stopPropagation(); handleCopyPath(file.path) }}
                  title="Copy path"
                >
                  📋
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* File preview */}
        <div className="file-preview">
          <h3>{selectedFile ? selectedFile.name : 'Preview'}</h3>
          {fileContent ? (
            <pre className="content-area">{fileContent}</pre>
          ) : (
            <div className="empty-state">Select a file to preview its content</div>
          )}
        </div>
      </div>

      {/* Clipboard section */}
      {clipboardText && (
        <div className="clipboard-bar">
          <strong>Clipboard:</strong> {clipboardText.substring(0, 100)}
          {clipboardText.length > 100 ? '...' : ''}
        </div>
      )}

      {/* Status bar */}
      <div className="status-bar">
        <span>{statusMessage}</span>
        <span>{files.length} items</span>
      </div>
    </div>
  )
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

export default App
