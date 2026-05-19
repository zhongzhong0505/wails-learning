import { useState, useEffect } from 'react'
import { MonitorService } from '../bindings/system-monitor'
import { Events } from '@wailsio/runtime'

interface SystemStats {
  cpuUsage: number
  memoryTotal: number
  memoryUsed: number
  memoryFree: number
  memoryUsage: number
  goRoutines: number
  numCPU: number
  os: string
  arch: string
  hostname: string
  uptime: string
  timestamp: string
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function ProgressBar({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="progress-bar-container">
      <div className="progress-bar-header">
        <span>{label}</span>
        <span>{value.toFixed(1)}%</span>
      </div>
      <div className="progress-bar-track">
        <div
          className="progress-bar-fill"
          style={{ width: `${Math.min(value, 100)}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

function App() {
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [memoryDetails, setMemoryDetails] = useState<Record<string, number> | null>(null)
  const [runtimeInfo, setRuntimeInfo] = useState<Record<string, string> | null>(null)
  const [history, setHistory] = useState<{ time: string; cpu: number; memory: number }[]>([])

  useEffect(() => {
    // Initial fetch
    MonitorService.GetSystemStats().then((s) => setStats(s as SystemStats))
    MonitorService.GetRuntimeInfo().then((r) => setRuntimeInfo(r as Record<string, string>))

    // Listen for real-time updates
    const cancel = Events.On('system-stats-update', (event: { data: unknown }) => {
      const newStats = event.data as SystemStats
      setStats(newStats)
      setHistory((prev) => {
        const entry = { time: newStats.timestamp, cpu: newStats.cpuUsage, memory: newStats.memoryUsage }
        const updated = [...prev, entry]
        return updated.slice(-30) // Keep last 30 entries
      })
    })

    return () => { cancel() }
  }, [])

  async function handleRefreshMemory(): Promise<void> {
    const details = await MonitorService.GetMemoryDetails()
    setMemoryDetails(details as Record<string, number>)
  }

  async function handleForceGC(): Promise<void> {
    await MonitorService.ForceGC()
    const newStats = await MonitorService.GetSystemStats()
    setStats(newStats as SystemStats)
    await handleRefreshMemory()
  }

  if (!stats) {
    return <div className="loading">Loading system stats...</div>
  }

  return (
    <div className="monitor">
      <header className="monitor-header">
        <h1>📊 System Monitor</h1>
        <div className="header-info">
          <span className="hostname">{stats.hostname}</span>
          <span className="uptime">Uptime: {stats.uptime}</span>
        </div>
      </header>

      <div className="dashboard">
        {/* System Overview */}
        <section className="card overview">
          <h2>System Overview</h2>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">OS</span>
              <span className="stat-value">{stats.os}/{stats.arch}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">CPUs</span>
              <span className="stat-value">{stats.numCPU}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Goroutines</span>
              <span className="stat-value">{stats.goRoutines}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Last Update</span>
              <span className="stat-value">{stats.timestamp}</span>
            </div>
          </div>
        </section>

        {/* CPU & Memory Gauges */}
        <section className="card gauges">
          <h2>Resource Usage</h2>
          <ProgressBar value={stats.cpuUsage} label="CPU Usage" color="#646cff" />
          <ProgressBar value={stats.memoryUsage} label="Memory Usage" color="#42b883" />
          <div className="memory-info">
            <span>Used: {formatBytes(stats.memoryUsed)}</span>
            <span>Free: {formatBytes(stats.memoryFree)}</span>
            <span>Total: {formatBytes(stats.memoryTotal)}</span>
          </div>
        </section>

        {/* History Chart (text-based) */}
        <section className="card history">
          <h2>Usage History (last 30 updates)</h2>
          <div className="chart">
            {history.map((entry, i) => (
              <div key={i} className="chart-bar" title={`CPU: ${entry.cpu.toFixed(1)}%`}>
                <div className="bar cpu-bar" style={{ height: `${entry.cpu}%` }} />
                <div className="bar mem-bar" style={{ height: `${entry.memory}%` }} />
              </div>
            ))}
          </div>
          <div className="chart-legend">
            <span className="legend-cpu">■ CPU</span>
            <span className="legend-mem">■ Memory</span>
          </div>
        </section>

        {/* Memory Details */}
        <section className="card memory-details">
          <h2>Memory Details</h2>
          <div className="actions">
            <button onClick={handleRefreshMemory}>Refresh Details</button>
            <button onClick={handleForceGC} className="gc-btn">Force GC</button>
          </div>
          {memoryDetails && (
            <div className="details-grid">
              {Object.entries(memoryDetails).map(([key, value]) => (
                <div key={key} className="detail-item">
                  <span className="detail-key">{key}</span>
                  <span className="detail-value">{formatBytes(value)}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Runtime Info */}
        {runtimeInfo && (
          <section className="card runtime">
            <h2>Go Runtime</h2>
            <div className="details-grid">
              {Object.entries(runtimeInfo).map(([key, value]) => (
                <div key={key} className="detail-item">
                  <span className="detail-key">{key}</span>
                  <span className="detail-value">{value}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

export default App
