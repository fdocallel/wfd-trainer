import Dexie from 'dexie'

export const db = new Dexie('WFDTrainer')

db.version(1).stores({
  // Catálogo de audios con transcripción y metadatos
  audios: 'filename, *words',

  // Cada intento del usuario
  attempts: '++id, filename, date, score',

  // Tracking por palabra: aciertos/fallos acumulados
  wordStats: 'word, failCount, totalCount',

  // Sesiones diarias
  sessions: '++id, date, totalAttempts, avgScore',

  // Config y estado de descarga
  appState: 'key',
})

/**
 * Carga el catálogo de audios desde transcriptions.json (build-time)
 */
export async function loadCatalog(transcriptions) {
  const count = await db.audios.count()
  if (count > 0) return // ya cargado

  await db.audios.bulkPut(
    transcriptions.map((t) => ({
      filename: t.filename,
      text: t.text,
      words: t.text.toLowerCase().replace(/[^\w\s']/g, '').split(/\s+/),
      duration: t.duration,
    }))
  )
}

/**
 * Registra un intento y actualiza estadísticas de palabras
 */
export async function saveAttempt(filename, userInput, correctText, score, wordResults) {
  const date = new Date().toISOString().slice(0, 10)

  // Guardar intento
  await db.attempts.add({
    filename,
    date,
    userInput,
    correctText,
    score,
    wordResults, // [{word, correct, userWord}]
    timestamp: Date.now(),
  })

  // Actualizar stats por palabra
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

/**
 * Obtiene las N palabras más difíciles
 */
export async function getWeakestWords(limit = 20) {
  const all = await db.wordStats.where('totalCount').above(2).toArray()
  return all
    .map((w) => ({ ...w, failRate: w.failCount / w.totalCount }))
    .sort((a, b) => b.failRate - a.failRate)
    .slice(0, limit)
}

/**
 * Estadísticas generales
 */
export async function getStats() {
  const attempts = await db.attempts.toArray()
  const today = new Date().toISOString().slice(0, 10)
  const todayAttempts = attempts.filter((a) => a.date === today)

  const uniqueAudios = new Set(attempts.map((a) => a.filename)).size
  const totalAudios = await db.audios.count()

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
  }
}
