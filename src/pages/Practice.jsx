import { useState, useRef, useCallback, useEffect } from 'react'
import { db, saveAttempt } from '../db'
import { evaluateAttempt } from '../scoring'
import transcriptions from '../data/transcriptions.json'

const AUDIO_BASE_URL = import.meta.env.BASE_URL + 'audio/'

export default function Practice({ onAttempt }) {
  const [current, setCurrent] = useState(null)
  const [phase, setPhase] = useState('ready') // ready | listening | writing | result
  const [userInput, setUserInput] = useState('')
  const [result, setResult] = useState(null)
  const [playCount, setPlayCount] = useState(0)
  const audioRef = useRef(null)
  const textareaRef = useRef(null)

  // Seleccionar audio aleatorio
  const pickRandom = useCallback(() => {
    const idx = Math.floor(Math.random() * transcriptions.length)
    setCurrent(transcriptions[idx])
    setPhase('ready')
    setUserInput('')
    setResult(null)
    setPlayCount(0)
  }, [])

  useEffect(() => { pickRandom() }, [pickRandom])

  function handlePlay() {
    if (!current) return
    const audio = audioRef.current
    if (!audio) return

    audio.src = AUDIO_BASE_URL + current.filename
    audio.play()
    setPhase('listening')
    setPlayCount((c) => c + 1)

    audio.onended = () => {
      setPhase('writing')
      setTimeout(() => textareaRef.current?.focus(), 100)
    }
  }

  function handleSubmit() {
    if (!userInput.trim() || !current) return

    const res = evaluateAttempt(userInput, current.text)
    setResult(res)
    setPhase('result')

    // Guardar en DB
    saveAttempt(
      current.filename,
      userInput,
      current.text,
      res.score,
      res.wordResults
    )
    onAttempt?.()
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  if (!current) return null

  return (
    <div>
      <audio ref={audioRef} preload="none" />

      {/* Play button */}
      <button
        className={`play-btn ${phase === 'listening' ? 'playing' : ''}`}
        onClick={handlePlay}
        disabled={phase === 'result'}
      >
        {phase === 'listening' ? '🔊' : '▶'}
      </button>

      {playCount > 0 && phase !== 'result' && (
        <div className="replay-count">
          Reproducido {playCount}x {playCount > 2 ? '(intenta con menos replays)' : ''}
        </div>
      )}

      {phase === 'ready' && (
        <p className="audio-hint">Pulsa play para escuchar la frase</p>
      )}

      {/* Input */}
      {(phase === 'writing' || phase === 'listening') && (
        <div className="input-area">
          <textarea
            ref={textareaRef}
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe lo que has escuchado..."
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck="false"
          />
          <button
            className="submit-btn"
            onClick={handleSubmit}
            disabled={!userInput.trim()}
          >
            Comprobar
          </button>
        </div>
      )}

      {/* Results */}
      {phase === 'result' && result && (
        <div className="results">
          <div className="score-display">
            <div className="score-number">{result.score}%</div>
            <div className="score-label">{result.summary}</div>
          </div>

          <div className="card">
            <div style={{ marginBottom: 8 }}>
              {result.wordResults.map((wr, i) => (
                <span key={i} className={`word-result ${wr.status}`}>
                  {wr.word}
                  {wr.status === 'close' && wr.userWord && (
                    <span style={{ fontSize: 11, opacity: 0.7 }}> ({wr.userWord})</span>
                  )}
                </span>
              ))}
            </div>
          </div>

          <div className="correct-text">
            <strong>Frase correcta:</strong>
            {current.text}
          </div>

          {userInput && (
            <div className="correct-text" style={{ background: '#f1f5f9', marginTop: 8 }}>
              <strong>Tu respuesta:</strong>
              {userInput}
            </div>
          )}

          <button className="next-btn" onClick={pickRandom}>
            Siguiente ➜
          </button>
        </div>
      )}
    </div>
  )
}
