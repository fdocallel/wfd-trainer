import { useState, useEffect } from 'react'
import { loadCatalog, getStats } from './db'
import Practice from './pages/Practice'
import Stats from './pages/Stats'
import Words from './pages/Words'
import transcriptions from './data/transcriptions.json'
import './index.css'

const TABS = [
  { id: 'practice', label: 'Practice' },
  { id: 'stats', label: 'Progress' },
  { id: 'words', label: 'Words' },
]

export default function App() {
  const [tab, setTab] = useState('practice')
  const [ready, setReady] = useState(false)
  const [stats, setStats] = useState(null)

  useEffect(() => {
    loadCatalog(transcriptions).then(() => {
      setReady(true)
      refreshStats()
    })
  }, [])

  async function refreshStats() {
    setStats(await getStats())
  }

  if (!ready) {
    return (
      <div className="app">
        <div className="empty-state">
          <div className="icon">🎧</div>
          <p>Loading catalog...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="header">
        <h1>WFD Trainer</h1>
        {stats && (
          <span className="header-stats">
            {stats.todayAttempts} today · {stats.coverage}% covered
          </span>
        )}
      </header>

      <nav className="nav">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? 'active' : ''}
            onClick={() => { setTab(t.id); refreshStats() }}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="page-content">
        {tab === 'practice' && <Practice onAttempt={refreshStats} />}
        {tab === 'stats' && <Stats stats={stats} />}
        {tab === 'words' && <Words />}
      </div>
    </div>
  )
}
