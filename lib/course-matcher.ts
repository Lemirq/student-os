/**
 * Calculates the Levenshtein distance between two strings.
 * Used for fuzzy string matching of course codes.
 * @param str1 - First string
 * @param str2 - Second string
 * @returns The Levenshtein distance (number of edits needed to transform str1 into str2)
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  // Initialize matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Calculate distances
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost, // substitution
      );
    }
  }

  return matrix[len1][len2];
}

/**
 * Removes campus code suffix from course code.
 * Example: "CSC108H5" -> "CSC108", "CSC108" -> "CSC108"
 * @param code - Course code
 * @returns Course code without campus suffix
 */
function removeCampusCode(code: string): string {
  // Remove trailing letter and digit (e.g., H5, S1, F1, Y1)
  return code.replace(/[A-Z]\d$/, "");
}

/**
 * Calculates a match score between an ICS course code and a database course code.
 * Higher scores indicate better matches.
 * @param icsCode - Course code from ICS file
 * @param dbCode - Course code from database
 * @returns Match score (0-100)
 */
function calculateMatchScore(icsCode: string, dbCode: string): number {
  // Exact match
  if (icsCode === dbCode) {
    return 100;
  }

  // Match without campus code (CSC108H5 -> CSC108)
  const icsWithoutCampus = removeCampusCode(icsCode);
  const dbWithoutCampus = removeCampusCode(dbCode);

  if (icsWithoutCampus === dbWithoutCampus) {
    return 90;
  }

  // Case-insensitive exact match
  if (icsCode.toLowerCase() === dbCode.toLowerCase()) {
    return 85;
  }

  // Case-insensitive match without campus code
  if (icsWithoutCampus.toLowerCase() === dbWithoutCampus.toLowerCase()) {
    return 80;
  }

  // Levenshtein distance matching (for typos/variations)
  const distance = levenshteinDistance(
    icsCode.toLowerCase(),
    dbCode.toLowerCase(),
  );

  if (distance === 1) {
    return 70;
  } else if (distance === 2) {
    return 60;
  } else if (distance === 3) {
    return 50;
  }

  // Check if one contains the other (substring match)
  if (
    icsCode.toLowerCase().includes(dbCode.toLowerCase()) ||
    dbCode.toLowerCase().includes(icsCode.toLowerCase())
  ) {
    return 40;
  }

  return 0;
}

type CourseWithSemester = {
  id: string;
  code: string;
  name: string | null;
  semester?: { id: string; name: string } | null;
};

/**
 * Finds the best matching courses from the database for a given ICS course code.
 * Returns courses sorted by match score (highest first).
 * @param icsCode - Course code from ICS file (e.g., "CSC108H5")
 * @param courses - Array of courses from the database with their semesters
 * @returns Array of courses with their match scores, sorted by score descending
 */
export function findBestCourseMatches(
  icsCode: string,
  courses: CourseWithSemester[],
): Array<{ course: CourseWithSemester; score: number }> {
  const matches = courses
    .map((course) => ({
      course,
      score: calculateMatchScore(icsCode, course.code),
    }))
    .filter((match) => match.score > 0) // Only return courses with some match
    .sort((a, b) => b.score - a.score); // Sort by score descending

  return matches;
}

/**
 * Finds the single best matching course for an ICS course code.
 * Returns null if no good match is found (score < 50).
 * @param icsCode - Course code from ICS file
 * @param courses - Array of courses from the database
 * @returns The best matching course or null
 */
export function findBestCourseMatch(
  icsCode: string,
  courses: CourseWithSemester[],
): CourseWithSemester | null {
  const matches = findBestCourseMatches(icsCode, courses);

  if (matches.length === 0) {
    return null;
  }

  const bestMatch = matches[0];

  // Only return if the match is reasonably good (score >= 50)
  return bestMatch.score >= 50 ? bestMatch.course : null;
}
