import Dexie from 'dexie'

export const db = new Dexie('WFDTrainer')

db.version(2).stores({
  audios: 'filename, *words',
  attempts: '++id, filename, date, score',
  wordStats: 'word, failCount, totalCount',
  appState: 'key',
})

// ── Catalog ──

export async function loadCatalog(transcriptions) {
  const count = await db.audios.count()
  if (count > 0) return

  await db.audios.bulkPut(
    transcriptions.map((t) => ({
      filename: t.filename,
      text: t.text,
      words: t.text.toLowerCase().replace(/[^\w\s']/g, '').split(/\s+/),
      duration: t.duration,
    }))
  )
}

// ── Smart Queue ──

export async function pickNextAudio(transcriptions) {
  const attempts = await db.attempts.toArray()

  // Build map: filename → { count, bestScore, lastSeen }
  const audioMap = {}
  for (const a of attempts) {
    if (!audioMap[a.filename]) {
      audioMap[a.filename] = { count: 0, bestScore: 0, lastSeen: 0 }
    }
    const m = audioMap[a.filename]
    m.count++
    m.bestScore = Math.max(m.bestScore, a.score)
    m.lastSeen = Math.max(m.lastSeen, a.timestamp || 0)
  }

  // Score each audio for priority (lower = pick sooner)
  const scored = transcriptions.map((t) => {
    const stats = audioMap[t.filename]
    if (!stats) {
      // Never seen → highest priority + random jitter
      return { audio: t, priority: Math.random() * 10 }
    }
    // Seen but low score → high priority
    // Seen and mastered (>90%) → low priority
    // Recently seen → lower priority (avoid immediate repeats)
    const recency = (Date.now() - stats.lastSeen) / (1000 * 60 * 60) // hours ago
    const mastery = stats.bestScore / 100
    const priority = 20
      + (mastery * 50)           // mastered → deprioritize
      - (recency * 0.5)         // older → slightly boost
      + (stats.count * 5)       // seen many times → deprioritize
      + (Math.random() * 15)    // jitter to avoid predictability
    return { audio: t, priority }
  })

  scored.sort((a, b) => a.priority - b.priority)

  // Pick from top 5 candidates randomly for variety
  const top = scored.slice(0, 5)
  return top[Math.floor(Math.random() * top.length)].audio
}

// ── Save Attempt ──

export async function saveAttempt(filename, userInput, correctText, score, wordResults) {
  const date = new Date().toISOString().slice(0, 10)

  await db.attempts.add({
    filename,
    date,
    userInput,
    correctText,
    score,
    wordResults,
    timestamp: Date.now(),
  })

  for (const wr of wordResults) {
    const existing = await db.wordStats.get(wr.word)
    if (existing) {
      await db.wordStats.update(wr.word, {
        totalCount: existing.totalCount + 1,
        failCount: existing.failCount + (wr.correct ? 0 : 1),
        lastSeen: Date.now(),
      })
    } else {
      await db.wordStats.put({
        word: wr.word,
        totalCount: 1,
        failCount: wr.correct ? 0 : 1,
        lastSeen: Date.now(),
      })
    }
  }
}

// ── Weakest Words ──

export async function getWeakestWords(limit = 20) {
  const all = await db.wordStats.where('totalCount').above(2).toArray()
  return all
    .map((w) => ({ ...w, failRate: w.failCount / w.totalCount }))
    .sort((a, b) => b.failRate - a.failRate)
    .slice(0, limit)
}

// ── Stats ──

export async function getStats() {
  const attempts = await db.attempts.toArray()
  const today = new Date().toISOString().slice(0, 10)
  const todayAttempts = attempts.filter((a) => a.date === today)

  const uniqueAudios = new Set(attempts.map((a) => a.filename)).size
  const totalAudios = await db.audios.count()

  // Streak: count consecutive days with attempts (including today)
  const daysWithAttempts = new Set(attempts.map((a) => a.date))
  let streak = 0
  const d = new Date()
  while (true) {
    const dateStr = d.toISOString().slice(0, 10)
    if (daysWithAttempts.has(dateStr)) {
      streak++
      d.setDate(d.getDate() - 1)
    } else if (streak === 0) {
      // Today might not have attempts yet — check yesterday
      d.setDate(d.getDate() - 1)
      const yesterday = d.toISOString().slice(0, 10)
      if (daysWithAttempts.has(yesterday)) {
        streak++
        d.setDate(d.getDate() - 1)
      } else {
        break
      }
    } else {
      break
    }
  }

  return {
    totalAttempts: attempts.length,
    todayAttempts: todayAttempts.length,
    avgScore: attempts.length > 0
      ? Math.round(attempts.reduce((s, a) => s + a.score, 0) / attempts.length)
      : 0,
    todayAvgScore: todayAttempts.length > 0
      ? Math.round(todayAttempts.reduce((s, a) => s + a.score, 0) / todayAttempts.length)
      : 0,
    uniqueAudios,
    totalAudios,
    coverage: totalAudios > 0 ? Math.round((uniqueAudios / totalAudios) * 100) : 0,
    streak,
  }
}

// ── Daily Goal ──

const DEFAULT_DAILY_GOAL = 20

export async function getDailyGoal() {
  const stored = await db.appState.get('dailyGoal')
  return stored ? stored.value : DEFAULT_DAILY_GOAL
}

export async function setDailyGoal(value) {
  await db.appState.put({ key: 'dailyGoal', value })
}
