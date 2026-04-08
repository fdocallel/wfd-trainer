import { useState, useEffect } from 'react'
import { getWeakestWords } from '../db'

export default function Words() {
  const [words, setWords] = useState([])

  useEffect(() => {
    getWeakestWords(30).then(setWords)
  }, [])

  if (words.length === 0) {
    return (
      <div className="empty-state">
        <div className="icon">📖</div>
        <p>Practice some audios to see your weakest words here</p>
      </div>
    )
  }

  return (
    <div>
      <div className="section-title">Hardest words</div>
      <div className="card">
        {words.map((w) => (
          <div key={w.word} className="weak-word-item">
            <span className="weak-word-text">{w.word}</span>
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
        ))}
      </div>
      <div style={{ padding: '8px 16px', fontSize: 12, color: 'var(--muted)' }}>
        % = fail rate. Only words with 3+ attempts.
      </div>
    </div>
  )
}
