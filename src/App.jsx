import { useState, useEffect } from 'react'
import { loadCatalog, getStats, getDailyGoal } from './db'
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
  const [dailyGoal, setDailyGoalState] = useState(20)
  const [weakMode, setWeakMode] = useState(false)

  useEffect(() => {
    loadCatalog(transcriptions).then(async () => {
      setReady(true)
      setDailyGoalState(await getDailyGoal())
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

  const goalProgress = stats ? Math.min(stats.todayAttempts / dailyGoal, 1) : 0
  const goalDone = stats && stats.todayAttempts >= dailyGoal

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>WFD Trainer</h1>
          {stats && (
            <span className="header-stats">
              {stats.todayAttempts}/{dailyGoal} today · {stats.coverage}% covered
            </span>
          )}
        </div>
        {stats && stats.streak > 0 && (
          <div className="streak-badge">
            <span className="streak-fire">🔥</span>
            <span className="streak-num">{stats.streak}</span>
          </div>
        )}
      </header>

      {/* Daily goal progress bar */}
      <div className="goal-bar">
        <div
          className={`goal-bar-fill ${goalDone ? 'done' : ''}`}
          style={{ width: `${goalProgress * 100}%` }}
        />
      </div>

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
        {tab === 'practice' && (
          <>
            <div className="mode-toggle">
              <button
                className={`mode-btn ${!weakMode ? 'active' : ''}`}
                onClick={() => setWeakMode(false)}
              >
                All audios
              </button>
              <button
                className={`mode-btn ${weakMode ? 'active' : ''}`}
                onClick={() => setWeakMode(true)}
              >
                Weak words
              </button>
            </div>
            <Practice onAttempt={refreshStats} weakMode={weakMode} />
          </>
        )}
        {tab === 'stats' && <Stats stats={stats} dailyGoal={dailyGoal} />}
        {tab === 'words' && <Words />}
      </div>
    </div>
  )
}
