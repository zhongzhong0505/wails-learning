import { useState, useEffect } from 'react'
import { Events } from '@wailsio/runtime'

interface HTTPResponse {
  status: number
  statusText: string
  headers: Record<string, string>
  body: string
  duration: number
}

interface DownloadProgress {
  url: string
  downloaded: number
  total: number
  percent: number
  speed: string
  status: string
}

declare global {
  interface Window {
    go: {
      main: {
        HTTPService: {
          Get: (url: string) => Promise<HTTPResponse>
          Post: (url: string, body: string) => Promise<HTTPResponse>
          Put: (url: string, body: string) => Promise<HTTPResponse>
          Delete: (url: string) => Promise<HTTPResponse>
          FetchJSONPlaceholder: (endpoint: string) => Promise<HTTPResponse>
          FetchGitHubUser: (username: string) => Promise<HTTPResponse>
        }
        DownloadService: {
          StartDownload: (url: string) => Promise<void>
          CancelDownload: () => Promise<void>
        }
      }
    }
  }
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

function App() {
  const [method, setMethod] = useState<HttpMethod>('GET')
  const [url, setUrl] = useState('https://jsonplaceholder.typicode.com/posts/1')
  const [requestBody, setRequestBody] = useState('')
  const [response, setResponse] = useState<HTTPResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'request' | 'download'>('request')
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null)
  const [downloadUrl, setDownloadUrl] = useState('https://speed.hetzner.de/100MB.bin')

  // Listen for download progress events
  useEffect(() => {
    const cancel = Events.On('download-progress', (event: { data: DownloadProgress }) => {
      setDownloadProgress(event.data)
    })
    return () => { cancel() }
  }, [])

  const sendRequest = async () => {
    setLoading(true)
    setError(null)
    setResponse(null)

    try {
      let result: HTTPResponse
      switch (method) {
        case 'GET':
          result = await window.go.main.HTTPService.Get(url)
          break
        case 'POST':
          result = await window.go.main.HTTPService.Post(url, requestBody)
          break
        case 'PUT':
          result = await window.go.main.HTTPService.Put(url, requestBody)
          break
        case 'DELETE':
          result = await window.go.main.HTTPService.Delete(url)
          break
      }
      setResponse(result)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  const quickFetch = async (type: string) => {
    setLoading(true)
    setError(null)
    try {
      let result: HTTPResponse
      if (type === 'github') {
        result = await window.go.main.HTTPService.FetchGitHubUser('octocat')
      } else {
        result = await window.go.main.HTTPService.FetchJSONPlaceholder(type)
      }
      setResponse(result)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  const startDownload = async () => {
    setDownloadProgress(null)
    try {
      await window.go.main.DownloadService.StartDownload(downloadUrl)
    } catch (err) {
      setError(String(err))
    }
  }

  const cancelDownload = async () => {
    await window.go.main.DownloadService.CancelDownload()
  }

  return (
    <div className="app">
      <header className="header">
        <h1>🌐 HTTP Client</h1>
        <div className="tabs">
          <button
            className={activeTab === 'request' ? 'active' : ''}
            onClick={() => setActiveTab('request')}
          >
            API Requests
          </button>
          <button
            className={activeTab === 'download' ? 'active' : ''}
            onClick={() => setActiveTab('download')}
          >
            Download
          </button>
        </div>
      </header>

      {activeTab === 'request' && (
        <div className="request-panel">
          {/* Request builder */}
          <div className="request-builder">
            <select value={method} onChange={(e) => setMethod(e.target.value as HttpMethod)}>
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
            </select>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter URL..."
            />
            <button onClick={sendRequest} disabled={loading}>
              {loading ? '⏳' : '🚀'} Send
            </button>
          </div>

          {/* Request body for POST/PUT */}
          {(method === 'POST' || method === 'PUT') && (
            <div className="request-body">
              <label>Request Body (JSON):</label>
              <textarea
                value={requestBody}
                onChange={(e) => setRequestBody(e.target.value)}
                placeholder='{"key": "value"}'
                rows={4}
              />
            </div>
          )}

          {/* Quick actions */}
          <div className="quick-actions">
            <span>Quick:</span>
            <button onClick={() => quickFetch('posts/1')}>Posts</button>
            <button onClick={() => quickFetch('users')}>Users</button>
            <button onClick={() => quickFetch('todos?_limit=5')}>Todos</button>
            <button onClick={() => quickFetch('github')}>GitHub User</button>
          </div>

          {/* Error display */}
          {error && <div className="error-box">❌ {error}</div>}

          {/* Response display */}
          {response && (
            <div className="response-panel">
              <div className="response-meta">
                <span className={`status status-${Math.floor(response.status / 100)}xx`}>
                  {response.status} {response.statusText.split(' ').slice(1).join(' ')}
                </span>
                <span className="duration">⏱️ {response.duration}ms</span>
              </div>
              <div className="response-body">
                <pre>{response.body}</pre>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'download' && (
        <div className="download-panel">
          <div className="download-input">
            <input
              type="text"
              value={downloadUrl}
              onChange={(e) => setDownloadUrl(e.target.value)}
              placeholder="Enter download URL..."
            />
            <button onClick={startDownload}>⬇️ Download</button>
            <button onClick={cancelDownload} className="cancel-btn">✖ Cancel</button>
          </div>

          {downloadProgress && (
            <div className="progress-panel">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${downloadProgress.percent}%` }}
                />
              </div>
              <div className="progress-info">
                <span>Status: {downloadProgress.status}</span>
                <span>{downloadProgress.percent.toFixed(1)}%</span>
                <span>{downloadProgress.speed}</span>
                <span>
                  {formatBytes(downloadProgress.downloaded)}
                  {downloadProgress.total > 0 && ` / ${formatBytes(downloadProgress.total)}`}
                </span>
              </div>
            </div>
          )}

          <div className="download-note">
            <p>💡 This demo downloads data to memory (discarded after completion).</p>
            <p>It demonstrates Go backend HTTP requests with real-time progress events.</p>
          </div>
        </div>
      )}
    </div>
  )
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

export default App
