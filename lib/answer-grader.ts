/**
 * Calculates the Levenshtein distance between two strings.
 * @param str1 - First string
 * @param str2 - Second string
 * @returns The Levenshtein distance (number of edits needed to transform str1 into str2)
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }

  return matrix[len1][len2];
}

/**
 * Calculates the similarity between two strings using Levenshtein distance.
 * Returns a value between 0 (no similarity) and 1 (perfect match).
 * @param str1 - First string
 * @param str2 - Second string
 * @returns Similarity score between 0 and 1
 */
export function calculateLevenshteinSimilarity(
  str1: string,
  str2: string,
): number {
  if (str1 === str2) {
    return 1;
  }

  if (str1.length === 0 || str2.length === 0) {
    return 0;
  }

  const distance = levenshteinDistance(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);

  return 1 - distance / maxLength;
}

/**
 * Grades a short answer by comparing it to the correct answer.
 * Normalizes both strings (lowercase, trim) and calculates similarity using Levenshtein distance.
 *
 * Supports multiple acceptable correct answers by allowing the `correctAnswer`
 * string to contain alternatives separated by the `|` character, e.g.:
 *   "list|dict|set"
 *
 * For very short answers (<= 5 characters), requires exact match or very high
 * similarity (>= 0.95). For longer answers, uses a more lenient threshold (>= 0.7).
 *
 * @param userAnswer - The user's answer
 * @param correctAnswer - The correct answer or pipe-separated list of answers
 * @returns Object containing isCorrect (true if similarity meets threshold) and similarityScore (0-100)
 */
export function gradeShortAnswer(
  userAnswer: string,
  correctAnswer: string,
): { isCorrect: boolean; similarityScore: number } {
  const normalizedUserAnswer = userAnswer.toLowerCase().trim();
  const rawCorrect = correctAnswer.toLowerCase().trim();

  if (!normalizedUserAnswer || !rawCorrect) {
    return { isCorrect: false, similarityScore: 0 };
  }

  // Split into multiple possible correct answers if provided
  const candidates = rawCorrect
    .split("|")
    .map((c) => c.trim())
    .filter((c) => c.length > 0);

  let bestSimilarity = 0;
  let isCorrect = false;

  for (const candidate of candidates) {
    // Exact match (case-insensitive)
    if (normalizedUserAnswer === candidate) {
      bestSimilarity = 1;
      isCorrect = true;
      break;
    }

    const similarity = calculateLevenshteinSimilarity(
      normalizedUserAnswer,
      candidate,
    );

    // For very short answers (like "O(1)", "list", "dict"), require high similarity
    const isShortAnswer = candidate.length <= 5;
    const threshold = isShortAnswer ? 0.95 : 0.7;

    if (similarity >= threshold) {
      isCorrect = true;
    }

    if (similarity > bestSimilarity) {
      bestSimilarity = similarity;
    }
  }

  const similarityScore = Math.round(bestSimilarity * 100);

  return {
    isCorrect,
    similarityScore,
  };
}
