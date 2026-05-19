import { useState, useEffect, useCallback, useRef } from 'react'
import { MarkdownService, FileService, ConfigService } from '../bindings/markdown-editor'

// Types
interface FileEntry {
  name: string
  path: string
  isDir: boolean
  children?: FileEntry[]
}

interface Config {
  theme: string
  fontSize: number
  autoSave: boolean
  lastFolder: string
  lastFile: string
}

function App() {
  const [content, setContent] = useState<string>('# Welcome to Markdown Editor\n\nStart writing your markdown here...\n\n## Features\n\n- **Real-time preview**\n- File tree navigation\n- Theme switching (light/dark)\n- Auto-save support\n\n## Code Example\n\n```typescript\nconst greeting = "Hello, Wails v3!"\nconsole.log(greeting)\n```\n\n## Table\n\n| Feature | Status |\n|---------|--------|\n| Editor | ✅ |\n| Preview | ✅ |\n| File Tree | ✅ |\n| Themes | ✅ |\n')
  const [html, setHtml] = useState<string>('')
  const [files, setFiles] = useState<FileEntry[]>([])
  const [currentFile, setCurrentFile] = useState<string>('')
  const [currentFolder, setCurrentFolder] = useState<string>('')
  const [config, setConfig] = useState<Config>({ theme: 'light', fontSize: 14, autoSave: true, lastFolder: '', lastFile: '' })
  const [isDirty, setIsDirty] = useState<boolean>(false)
  const [showSidebar, setShowSidebar] = useState<boolean>(true)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  // Load config on startup
  useEffect(() => {
    ConfigService.GetConfig().then((cfg) => {
      const c = cfg as Config
      setConfig(c)
      document.documentElement.setAttribute('data-theme', c.theme)
      if (c.lastFolder) {
        loadDirectory(c.lastFolder)
      }
    })
  }, [])

  // Debounced markdown rendering
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const rendered = await MarkdownService.Render(content)
        setHtml(rendered as string)
      } catch (err) {
        console.error('Render error:', err)
      }
    }, 150)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [content])

  const loadDirectory = useCallback(async (path: string) => {
    try {
      const entries = await FileService.ReadDirectory(path)
      setFiles((entries as FileEntry[]) || [])
      setCurrentFolder(path)
      await ConfigService.SetLastFolder(path)
    } catch (err) {
      console.error('Failed to load directory:', err)
    }
  }, [])

  async function openFile(path: string): Promise<void> {
    try {
      const fileContent = await FileService.ReadFile(path)
      setContent(fileContent as string)
      setCurrentFile(path)
      setIsDirty(false)
      await ConfigService.SetLastFile(path)
    } catch (err) {
      console.error('Failed to open file:', err)
    }
  }

  async function saveFile(): Promise<void> {
    if (!currentFile) return
    try {
      await FileService.WriteFile(currentFile, content)
      setIsDirty(false)
    } catch (err) {
      console.error('Failed to save:', err)
    }
  }

  async function handleNewFile(): Promise<void> {
    if (!currentFolder) return
    const filename = prompt('Enter filename:', 'new-note.md')
    if (!filename) return
    try {
      const path = await FileService.CreateFile(currentFolder, filename, '# ' + filename.replace('.md', '') + '\n\n')
      await loadDirectory(currentFolder)
      await openFile(path as string)
    } catch (err) {
      alert(String(err))
    }
  }

  function handleContentChange(newContent: string): void {
    setContent(newContent)
    setIsDirty(true)
  }

  async function toggleTheme(): Promise<void> {
    const newTheme = config.theme === 'light' ? 'dark' : 'light'
    setConfig({ ...config, theme: newTheme })
    document.documentElement.setAttribute('data-theme', newTheme)
    await ConfigService.SetTheme(newTheme)
  }

  async function openFolder(): Promise<void> {
    const home = await FileService.GetHomeDir()
    const path = prompt('Enter folder path:', home as string)
    if (path) {
      await loadDirectory(path)
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        saveFile()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  })

  function renderFileTree(entries: FileEntry[]): JSX.Element[] {
    return entries.map((entry) => (
      <div key={entry.path} className="tree-item">
        {entry.isDir ? (
          <details open>
            <summary className="tree-folder">📁 {entry.name}</summary>
            <div className="tree-children">
              {entry.children && renderFileTree(entry.children)}
            </div>
          </details>
        ) : (
          <div
            className={`tree-file ${currentFile === entry.path ? 'active' : ''}`}
            onClick={() => openFile(entry.path)}
          >
            📄 {entry.name}
          </div>
        )}
      </div>
    ))
  }

  return (
    <div className="editor-app">
      {/* Toolbar */}
      <div className="toolbar">
        <div className="toolbar-left">
          <button onClick={() => setShowSidebar(!showSidebar)} title="Toggle Sidebar">
            ☰
          </button>
          <button onClick={openFolder} title="Open Folder">📂 Open</button>
          <button onClick={handleNewFile} title="New File">📝 New</button>
          <button onClick={saveFile} disabled={!isDirty} title="Save (Cmd+S)">
            💾 Save
          </button>
        </div>
        <div className="toolbar-center">
          {currentFile && (
            <span className="filename">
              {currentFile.split('/').pop()}
              {isDirty && ' •'}
            </span>
          )}
        </div>
        <div className="toolbar-right">
          <button onClick={toggleTheme} title="Toggle Theme">
            {config.theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>
      </div>

      <div className="main-content">
        {/* Sidebar */}
        {showSidebar && (
          <aside className="sidebar">
            <div className="sidebar-header">
              <h3>Files</h3>
            </div>
            <div className="file-tree">
              {files.length > 0 ? renderFileTree(files) : (
                <p className="empty-tree">Open a folder to see files</p>
              )}
            </div>
          </aside>
        )}

        {/* Editor */}
        <div className="editor-panel">
          <textarea
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            style={{ fontSize: `${config.fontSize}px` }}
            placeholder="Write markdown here..."
            spellCheck={false}
          />
        </div>

        {/* Preview */}
        <div className="preview-panel">
          <div
            className="markdown-body"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </div>

      {/* Status Bar */}
      <div className="status-bar">
        <span>Lines: {content.split('\n').length}</span>
        <span>Chars: {content.length}</span>
        <span>Theme: {config.theme}</span>
        {currentFolder && <span>Folder: {currentFolder}</span>}
      </div>
    </div>
  )
}

export default App
