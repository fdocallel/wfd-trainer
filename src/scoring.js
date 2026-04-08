/**
 * Motor de scoring — comparación fuzzy palabra a palabra
 *
 * Scoring rules (inspirado en PTE WFD):
 * - Cada palabra correcta suma 1 punto
 * - Palabras "casi correctas" (Levenshtein ≤ 2) suman 0.5
 * - Orden importa pero se permite cierta flexibilidad
 * - Score final = (puntos / total palabras correctas) * 100
 */

/**
 * Distancia de Levenshtein entre dos strings
 */
function levenshtein(a, b) {
  const m = a.length, n = b.length
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))

  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

/**
 * Normaliza texto para comparación: minúsculas, sin puntuación, trim
 */
function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s']/g, '') // mantener apóstrofes (don't, it's)
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Compara input del usuario contra texto correcto
 * Retorna { score, wordResults, summary }
 */
export function evaluateAttempt(userInput, correctText) {
  const correctWords = normalize(correctText).split(' ')
  const userWords = normalize(userInput).split(' ').filter(Boolean)

  const wordResults = []
  let points = 0

  // Matching con alineación flexible (permite palabras extra o faltantes)
  let userIdx = 0
  for (let i = 0; i < correctWords.length; i++) {
    const correct = correctWords[i]

    if (userIdx >= userWords.length) {
      // Palabra faltante
      wordResults.push({
        word: correct,
        status: 'missing',   // no la escribió
        userWord: null,
        correct: false,
      })
      continue
    }

    // Buscar la mejor coincidencia en las próximas 3 palabras del usuario
    let bestMatch = { idx: -1, dist: Infinity }
    for (let j = userIdx; j < Math.min(userIdx + 3, userWords.length); j++) {
      const dist = levenshtein(correct, userWords[j])
      if (dist < bestMatch.dist) {
        bestMatch = { idx: j, dist }
      }
    }

    if (bestMatch.dist === 0) {
      // Exacta
      wordResults.push({
        word: correct,
        status: 'correct',
        userWord: userWords[bestMatch.idx],
        correct: true,
      })
      points += 1
      userIdx = bestMatch.idx + 1
    } else if (bestMatch.dist <= 2 && correct.length > 3) {
      // Casi correcta (typo menor)
      wordResults.push({
        word: correct,
        status: 'close',
        userWord: userWords[bestMatch.idx],
        correct: false,
      })
      points += 0.5
      userIdx = bestMatch.idx + 1
    } else {
      // Incorrecta o faltante
      wordResults.push({
        word: correct,
        status: 'wrong',
        userWord: userWords[userIdx] || null,
        correct: false,
      })
      userIdx++
    }
  }

  // Palabras extra que el usuario escribió de más
  const extraWords = userWords.slice(userIdx)

  const maxPoints = correctWords.length
  const score = Math.round((points / maxPoints) * 100)

  return {
    score,
    points,
    maxPoints,
    wordResults,
    extraWords,
    summary: `${Math.round(points)}/${maxPoints} words (${score}%)`,
  }
}
