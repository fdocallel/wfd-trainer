import { useState, useEffect } from 'react'
import { getDailyHistory, getRecentAttempts, exportData, importData } from '../db'

export default function Stats({ stats, dailyGoal }) {
  const [history, setHistory] = useState([])
  const [recent, setRecent] = useState([])

  useEffect(() => {
    getDailyHistory(7).then(setHistory)
    getRecentAttempts(20).then(setRecent)
  }, [stats])

  if (!stats) return null

  const maxCount = Math.max(...history.map((h) => h.count), 1)

  async function handleExport() {
    const data = await exportData()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `wfd-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleImport() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = e.target.files[0]
      if (!file) return
      const text = await file.text()
      try {
        const data = JSON.parse(text)
        await importData(data)
        window.location.reload()
      } catch {
        alert('Invalid backup file')
      }
    }
    input.click()
  }

  return (
    <div>
      {/* Today */}
      <div className="section-title">Today</div>
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.todayAttempts}<span className="stat-of">/{dailyGoal}</span></div>
          <div className="stat-label">Daily goal</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.todayAvgScore}%</div>
          <div className="stat-label">Today avg</div>
        </div>
      </div>

      {/* 7-day chart */}
      <div className="section-title">Last 7 days</div>
      <div className="card">
        <div className="day-chart">
          {history.map((h) => (
            <div key={h.date} className="day-col">
              <div className="day-score">{h.count > 0 ? `${h.avgScore}%` : ''}</div>
              <div className="day-bar-track">
                <div
                  className="day-bar-fill"
                  style={{
                    height: `${(h.count / maxCount) * 100}%`,
                    background: h.count === 0 ? 'var(--border)' :
                      h.avgScore >= 80 ? 'var(--correct)' :
                      h.avgScore >= 50 ? 'var(--close)' : 'var(--primary)',
                  }}
                />
              </div>
              <div className="day-label">{h.label}</div>
              <div className="day-count">{h.count}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Overall */}
      <div className="section-title">Overall</div>
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.streak}</div>
          <div className="stat-label">Day streak 🔥</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.avgScore}%</div>
          <div className="stat-label">Overall avg</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.totalAttempts}</div>
          <div className="stat-label">Total attempts</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.uniqueAudios}</div>
          <div className="stat-label">Audios practiced</div>
        </div>
        <div className="stat-card wide">
          <div className="stat-value">{stats.coverage}%</div>
          <div className="stat-label">Coverage ({stats.uniqueAudios} / {stats.totalAudios})</div>
        </div>
      </div>

      {/* Recent attempts */}
      {recent.length > 0 && (
        <>
          <div className="section-title">Recent attempts</div>
          <div className="card recent-list">
            {recent.map((a) => (
              <div key={a.id} className="recent-item">
                <div className="recent-score" style={{
                  color: a.score >= 80 ? 'var(--correct)' :
                    a.score >= 50 ? 'var(--close)' : 'var(--wrong)'
                }}>
                  {a.score}%
                </div>
                <div className="recent-text">{a.correctText}</div>
                <div className="recent-time">
                  {new Date(a.timestamp).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Export / Import */}
      <div className="section-title">Data</div>
      <div className="card" style={{ display: 'flex', gap: 8 }}>
        <button className="export-btn" onClick={handleExport}>Export backup</button>
        <button className="export-btn secondary" onClick={handleImport}>Import backup</button>
      </div>
    </div>
  )
}
