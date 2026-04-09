import { useState, useEffect } from 'react'
import { getWeakestWords } from '../db'
import wordCatalog from '../data/word_catalog.json'

const LEVEL_STYLE = {
  common: { bg: 'var(--correct-bg)', color: 'var(--correct)' },
  intermediate: { bg: 'var(--close-bg)', color: 'var(--close)' },
  advanced: { bg: 'var(--wrong-bg)', color: 'var(--wrong)' },
}

export default function Words() {
  const [weakWords, setWeakWords] = useState([])
  const [view, setView] = useState('weak') // weak | catalog
  const [levelFilter, setLevelFilter] = useState('all')

  useEffect(() => {
    getWeakestWords(30).then(setWeakWords)
  }, [])

  // Build lookup for catalog
  const catalogMap = {}
  for (const w of wordCatalog) catalogMap[w.word] = w

  // Filter catalog
  const filteredCatalog = levelFilter === 'all'
    ? wordCatalog.slice(0, 100)
    : wordCatalog.filter((w) => w.level === levelFilter).slice(0, 100)

  // Stats summary
  const levels = { common: 0, intermediate: 0, advanced: 0 }
  for (const w of wordCatalog) levels[w.level]++

  return (
    <div>
      {/* View toggle */}
      <div className="mode-toggle" style={{ margin: '12px 16px 0' }}>
        <button
          className={`mode-btn ${view === 'weak' ? 'active' : ''}`}
          onClick={() => setView('weak')}
        >
          My weak words
        </button>
        <button
          className={`mode-btn ${view === 'catalog' ? 'active' : ''}`}
          onClick={() => setView('catalog')}
        >
          Word catalog
        </button>
      </div>

      {view === 'weak' && (
        <>
          {weakWords.length === 0 ? (
            <div className="empty-state">
              <div className="icon">📖</div>
              <p>Practice some audios to see your weakest words here</p>
            </div>
          ) : (
            <>
              <div className="section-title">Hardest words</div>
              <div className="card">
                {weakWords.map((w) => {
                  const cat = catalogMap[w.word]
                  return (
                    <div key={w.word} className="weak-word-item">
                      <span className="weak-word-text">
                        {w.word}
                        {cat && (
                          <span className="word-level-dot" style={{
                            background: LEVEL_STYLE[cat.level]?.color,
                          }} />
                        )}
                      </span>
                      <div className="weak-word-bar">
                        <div
                          className="weak-word-bar-fill"
                          style={{ width: `${Math.round(w.failRate * 100)}%` }}
                        />
                      </div>
                      <span className="weak-word-pct">
                        {Math.round(w.failRate * 100)}%
                      </span>
                    </div>
                  )
                })}
              </div>
              <div style={{ padding: '8px 16px', fontSize: 12, color: 'var(--muted)' }}>
                % = fail rate. Only words with 3+ attempts.
              </div>
            </>
          )}
        </>
      )}

      {view === 'catalog' && (
        <>
          {/* Level summary */}
          <div className="stat-grid" style={{ margin: '12px 16px' }}>
            <div className="stat-card" onClick={() => setLevelFilter('common')} style={{ cursor: 'pointer' }}>
              <div className="stat-value" style={{ color: 'var(--correct)' }}>{levels.common}</div>
              <div className="stat-label">Common</div>
            </div>
            <div className="stat-card" onClick={() => setLevelFilter('intermediate')} style={{ cursor: 'pointer' }}>
              <div className="stat-value" style={{ color: 'var(--close)' }}>{levels.intermediate}</div>
              <div className="stat-label">Intermediate</div>
            </div>
            <div className="stat-card" onClick={() => setLevelFilter('advanced')} style={{ cursor: 'pointer' }}>
              <div className="stat-value" style={{ color: 'var(--wrong)' }}>{levels.advanced}</div>
              <div className="stat-label">Advanced</div>
            </div>
            <div className="stat-card" onClick={() => setLevelFilter('all')} style={{ cursor: 'pointer' }}>
              <div className="stat-value">{wordCatalog.length}</div>
              <div className="stat-label">Total</div>
            </div>
          </div>

          <div className="section-title">
            {levelFilter === 'all' ? 'Most frequent words' : `${levelFilter} words`} (top 100)
          </div>
          <div className="card catalog-list">
            {filteredCatalog.map((w) => {
              const style = LEVEL_STYLE[w.level]
              return (
                <div key={w.word} className="catalog-item">
                  <span className="catalog-word">{w.word}</span>
                  <span className="catalog-level" style={{
                    background: style.bg,
                    color: style.color,
                  }}>
                    {w.level}
                  </span>
                  <span className="catalog-count">{w.count}x</span>
                  <span className="catalog-pct">{w.audioPct}%</span>
                </div>
              )
            })}
          </div>
          <div style={{ padding: '8px 16px', fontSize: 12, color: 'var(--muted)' }}>
            Count = appearances in corpus. % = percentage of audios containing this word.
          </div>
        </>
      )}
    </div>
  )
}
