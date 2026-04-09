/**
 * Scoring engine v2 — order-independent matching
 *
 * Statuses:
 *   correct   — right word, right position (green)
 *   misplaced — right word, wrong position (yellow)
 *   close     — typo attempt at right position, Levenshtein ≤ 2 (orange)
 *   close-misplaced — typo but matches a word elsewhere (orange-yellow)
 *   wrong     — doesn't match anything (red)
 *   missing   — user didn't write this word (grey)
 *
 * Points: correct=1, misplaced=0.75, close=0.5, close-misplaced=0.25
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

function isClose(a, b) {
  if (a.length <= 2 || b.length <= 2) return a === b
  return levenshtein(a, b) <= 2
}

function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s']/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function evaluateAttempt(userInput, correctText) {
  const correctWords = normalize(correctText).split(' ')
  const userWords = normalize(userInput).split(' ').filter(Boolean)

  // Result array: one entry per correct word
  const wordResults = correctWords.map((w) => ({
    word: w,
    status: 'missing',
    userWord: null,
    correct: false,
    points: 0,
  }))

  // Track which user words and correct words have been matched
  const usedUser = new Array(userWords.length).fill(false)
  const usedCorrect = new Array(correctWords.length).fill(false)

  // Pass 1: exact matches at same position (correct — green)
  for (let i = 0; i < correctWords.length; i++) {
    if (i < userWords.length && correctWords[i] === userWords[i]) {
      wordResults[i] = {
        word: correctWords[i],
        status: 'correct',
        userWord: userWords[i],
        correct: true,
        points: 1,
      }
      usedCorrect[i] = true
      usedUser[i] = true
    }
  }

  // Pass 2: exact matches at different position (misplaced — yellow)
  for (let i = 0; i < correctWords.length; i++) {
    if (usedCorrect[i]) continue
    for (let j = 0; j < userWords.length; j++) {
      if (usedUser[j]) continue
      if (correctWords[i] === userWords[j]) {
        wordResults[i] = {
          word: correctWords[i],
          status: 'misplaced',
          userWord: userWords[j],
          correct: true,
          points: 0.75,
        }
        usedCorrect[i] = true
        usedUser[j] = true
        break
      }
    }
  }

  // Pass 3: close matches at same position (close — orange, typo in place)
  for (let i = 0; i < correctWords.length; i++) {
    if (usedCorrect[i]) continue
    if (i < userWords.length && !usedUser[i] && isClose(correctWords[i], userWords[i])) {
      wordResults[i] = {
        word: correctWords[i],
        status: 'close',
        userWord: userWords[i],
        correct: false,
        points: 0.5,
      }
      usedCorrect[i] = true
      usedUser[i] = true
    }
  }

  // Pass 4: close matches at different position (close-misplaced — typo + wrong order)
  for (let i = 0; i < correctWords.length; i++) {
    if (usedCorrect[i]) continue
    for (let j = 0; j < userWords.length; j++) {
      if (usedUser[j]) continue
      if (isClose(correctWords[i], userWords[j])) {
        wordResults[i] = {
          word: correctWords[i],
          status: 'close-misplaced',
          userWord: userWords[j],
          correct: false,
          points: 0.25,
        }
        usedCorrect[i] = true
        usedUser[j] = true
        break
      }
    }
  }

  // Pass 5: remaining unmatched user words → find closest wrong match for display
  for (let i = 0; i < correctWords.length; i++) {
    if (usedCorrect[i]) continue
    // Find first unmatched user word to show as the "wrong" attempt
    for (let j = 0; j < userWords.length; j++) {
      if (usedUser[j]) continue
      wordResults[i] = {
        word: correctWords[i],
        status: 'wrong',
        userWord: userWords[j],
        correct: false,
        points: 0,
      }
      usedUser[j] = true
      break
    }
    // If no unmatched user word left, stays as 'missing'
  }

  // Extra words the user wrote that matched nothing
  const extraWords = userWords.filter((_, j) => !usedUser[j])

  const points = wordResults.reduce((s, r) => s + r.points, 0)
  const maxPoints = correctWords.length
  const score = Math.round((points / maxPoints) * 100)

  return {
    score,
    points,
    maxPoints,
    wordResults,
    extraWords,
    summary: `${points.toFixed(1)}/${maxPoints} words (${score}%)`,
  }
}
