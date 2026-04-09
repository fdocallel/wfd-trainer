import { useState, useRef, useCallback, useEffect } from 'react'
import { saveAttempt, pickNextAudio } from '../db'
import { evaluateAttempt } from '../scoring'
import transcriptions from '../data/transcriptions.json'

const AUDIO_BASE_URL = import.meta.env.BASE_URL + 'audio/'

function scoreColor(score) {
  if (score >= 80) return 'var(--correct)'
  if (score >= 50) return 'var(--close)'
  return 'var(--wrong)'
}

function haptic(type) {
  if (navigator.vibrate) {
    if (type === 'success') navigator.vibrate(50)
    else if (type === 'error') navigator.vibrate([30, 50, 30])
  }
}

// Extract audio number from filename: WFD_AC_0001.mp3 → 1
function audioNum(filename) {
  const m = filename.match(/(\d+)\.mp3$/)
  return m ? parseInt(m[1], 10) : 0
}

export default function Practice({ onAttempt, weakMode }) {
  const [current, setCurrent] = useState(null)
  const [phase, setPhase] = useState('ready') // ready | loading | listening | writing | result
  const [userInput, setUserInput] = useState('')
  const [result, setResult] = useState(null)
  const [playCount, setPlayCount] = useState(0)
  const [fading, setFading] = useState(false)
  const audioRef = useRef(null)
  const textareaRef = useRef(null)

  const loadNext = useCallback(async () => {
    setFading(true)
    setTimeout(async () => {
      const next = await pickNextAudio(transcriptions, weakMode)
      setCurrent(next)
      setPhase('ready')
      setUserInput('')
      setResult(null)
      setPlayCount(0)
      setFading(false)
    }, 150)
  }, [weakMode])

  useEffect(() => { loadNext() }, [loadNext])

  // Keyboard: Space/Enter on result → next
  useEffect(() => {
    function handleGlobalKey(e) {
      if (phase === 'result' && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault()
        loadNext()
      }
    }
    window.addEventListener('keydown', handleGlobalKey)
    return () => window.removeEventListener('keydown', handleGlobalKey)
  }, [phase, loadNext])

  function handlePlay() {
    if (!current) return
    const audio = audioRef.current
    if (!audio) return

    if (phase !== 'listening' && phase !== 'writing') {
      setPhase('loading')
    }

    audio.src = AUDIO_BASE_URL + current.filename

    audio.oncanplaythrough = () => {
      audio.oncanplaythrough = null
      audio.play()
      setPhase('listening')
      setPlayCount((c) => c + 1)
    }

    audio.onended = () => {
      if (phase !== 'result') {
        setPhase('writing')
        setTimeout(() => textareaRef.current?.focus(), 100)
      }
    }

    audio.onerror = () => {
      setPhase('writing')
    }

    audio.load()
  }

  function handleReplay() {
    const audio = audioRef.current
    if (!audio || !current) return
    audio.currentTime = 0
    audio.play()
    setPlayCount((c) => c + 1)
  }

  function handleSubmit() {
    if (!userInput.trim() || !current) return

    const res = evaluateAttempt(userInput, current.text)
    setResult(res)
    setPhase('result')

    // Haptic
    if (res.score >= 80) haptic('success')
    else haptic('error')

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
    <div className={`practice-container ${fading ? 'fade-out' : 'fade-in'}`}>
      <audio ref={audioRef} preload="none" />

      {/* Audio indicator */}
      <div className="audio-indicator">
        #{audioNum(current.filename)} of {transcriptions.length}
        {weakMode && <span className="weak-mode-badge">Weak words</span>}
      </div>

      {/* Play button */}
      <button
        className={`play-btn ${phase === 'listening' ? 'playing' : ''} ${phase === 'loading' ? 'loading' : ''}`}
        onClick={phase === 'result' ? handleReplay : handlePlay}
      >
        {phase === 'loading' ? '...' : phase === 'listening' ? '🔊' : phase === 'result' ? '🔄' : '▶'}
      </button>

      {playCount > 0 && phase !== 'result' && (
        <div className="replay-count">
          Played {playCount}x {playCount > 2 ? '(try with fewer replays)' : ''}
        </div>
      )}

      {phase === 'result' && (
        <div className="replay-count">Tap to replay</div>
      )}

      {phase === 'ready' && (
        <p className="audio-hint">Tap play to listen to the sentence</p>
      )}

      {phase === 'loading' && (
        <p className="audio-hint">Loading audio...</p>
      )}

      {/* Input */}
      {(phase === 'writing' || phase === 'listening') && (
        <div className="input-area">
          <textarea
            ref={textareaRef}
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type what you heard..."
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck="false"
          />
          <div className="input-actions">
            <button className="replay-small-btn" onClick={handlePlay} type="button">
              🔊 Replay
            </button>
            <button className="skip-btn" onClick={loadNext} type="button">
              Skip
            </button>
            <button
              className="submit-btn"
              onClick={handleSubmit}
              disabled={!userInput.trim()}
            >
              Check
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {phase === 'result' && result && (
        <div className="results fade-in">
          <div className="score-display">
            <div className="score-number" style={{ color: scoreColor(result.score) }}>
              {result.score}%
            </div>
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
            <strong>Correct sentence:</strong>
            {current.text}
          </div>

          {userInput && (
            <div className="correct-text" style={{ background: '#f1f5f9', marginTop: 8 }}>
              <strong>Your answer:</strong>
              {userInput}
            </div>
          )}

          <button className="next-btn" onClick={loadNext}>
            Next ➜
          </button>
        </div>
      )}
    </div>
  )
}
