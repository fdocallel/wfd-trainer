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

export async function pickNextAudio(transcriptions, weakMode = false) {
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

  let pool = transcriptions

  // Weak mode: filter to audios containing weak words
  if (weakMode) {
    const weakWords = await getWeakestWords(50)
    if (weakWords.length > 0) {
      const weakSet = new Set(weakWords.map((w) => w.word))
      const filtered = transcriptions.filter((t) => {
        const words = t.text.toLowerCase().replace(/[^\w\s']/g, '').split(/\s+/)
        return words.some((w) => weakSet.has(w))
      })
      if (filtered.length > 0) pool = filtered
    }
  }

  // Score each audio for priority (lower = pick sooner)
  const scored = pool.map((t) => {
    const stats = audioMap[t.filename]
    if (!stats) {
      return { audio: t, priority: Math.random() * 10 }
    }
    const recency = (Date.now() - stats.lastSeen) / (1000 * 60 * 60)
    const mastery = stats.bestScore / 100
    const priority = 20
      + (mastery * 50)
      - (recency * 0.5)
      + (stats.count * 5)
      + (Math.random() * 15)
    return { audio: t, priority }
  })

  scored.sort((a, b) => a.priority - b.priority)

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

// ── Recent Attempts ──

export async function getRecentAttempts(limit = 30) {
  const all = await db.attempts.reverse().limit(limit).toArray()
  return all
}

// ── Daily History (last N days) ──

export async function getDailyHistory(days = 7) {
  const attempts = await db.attempts.toArray()
  const result = []

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().slice(0, 10)
    const dayAttempts = attempts.filter((a) => a.date === dateStr)
    result.push({
      date: dateStr,
      label: d.toLocaleDateString('en', { weekday: 'short' }),
      count: dayAttempts.length,
      avgScore: dayAttempts.length > 0
        ? Math.round(dayAttempts.reduce((s, a) => s + a.score, 0) / dayAttempts.length)
        : 0,
    })
  }
  return result
}

// ── Stats ──

export async function getStats() {
  const attempts = await db.attempts.toArray()
  const today = new Date().toISOString().slice(0, 10)
  const todayAttempts = attempts.filter((a) => a.date === today)

  const uniqueAudios = new Set(attempts.map((a) => a.filename)).size
  const totalAudios = await db.audios.count()

  // Streak
  const daysWithAttempts = new Set(attempts.map((a) => a.date))
  let streak = 0
  const d = new Date()
  while (true) {
    const dateStr = d.toISOString().slice(0, 10)
    if (daysWithAttempts.has(dateStr)) {
      streak++
      d.setDate(d.getDate() - 1)
    } else if (streak === 0) {
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

// ── Export / Import ──

export async function exportData() {
  const attempts = await db.attempts.toArray()
  const wordStats = await db.wordStats.toArray()
  const appState = await db.appState.toArray()
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    attempts,
    wordStats,
    appState,
  }
}

export async function importData(data) {
  if (!data?.version || !data.attempts) {
    throw new Error('Invalid backup file')
  }
  await db.attempts.clear()
  await db.wordStats.clear()
  await db.appState.clear()

  if (data.attempts.length) await db.attempts.bulkPut(data.attempts)
  if (data.wordStats?.length) await db.wordStats.bulkPut(data.wordStats)
  if (data.appState?.length) await db.appState.bulkPut(data.appState)
}
