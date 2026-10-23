/**
 * Levenshtein Distance & Name Normalisation Implementation
 * Conforms to Section 6.1 of the case study.
 */

export function levenshteinDistance(s1: string, s2: string): number {
  if (s1 === s2) return 0;
  if (s1.length === 0) return s2.length;
  if (s2.length === 0) return s1.length;

  let previousRow = Array.from({ length: s2.length + 1 }, (_, i) => i);

  for (let i = 0; i < s1.length; i++) {
    const currentRow = [i + 1];
    for (let j = 0; j < s2.length; j++) {
      const insertions = previousRow[j + 1] + 1;
      const deletions = currentRow[j] + 1;
      const substitutions = previousRow[j] + (s1[i] !== s2[j] ? 1 : 0);
      currentRow.push(Math.min(insertions, deletions, substitutions));
    }
    previousRow = currentRow;
  }

  return previousRow[s2.length];
}

/**
 * Normalise a name according to Section 6.1:
 * - Upper case
 * - Replace '.' and '-' with space
 * - Remove every character other than A-Z and space
 * - Drop title tokens: MR, MRS, MS, MISS, DR, SHRI, SMT, KUMARI (or configured list)
 * - Collapse spaces
 * - Sort tokens alphabetically and join with one space
 */
export function normaliseName(name: string | undefined | null, titleTokens: string[] = [
  'MR', 'MRS', 'MS', 'MISS', 'DR', 'SHRI', 'SMT', 'KUMARI'
]): string {
  if (!name) return '';
  const upper = name.toUpperCase().replace(/[.-]/g, ' ');
  const cleaned = upper.replace(/[^A-Z\s]/g, '');
  const tokenSet = new Set(titleTokens.map((t) => t.toUpperCase()));
  const tokens = cleaned
    .split(/\s+/)
    .filter((t) => t.length > 0 && !tokenSet.has(t))
    .sort();

  return tokens.join(' ');
}

/**
 * Similarity = 1 - (Levenshtein distance / length of the longer normalised string)
 * Returns 1.0 when both normalised strings are empty.
 */
export function calculateNameSimilarity(
  name1: string | undefined | null,
  name2: string | undefined | null,
  titleTokens?: string[]
): number {
  const norm1 = normaliseName(name1, titleTokens);
  const norm2 = normaliseName(name2, titleTokens);

  if (!norm1 && !norm2) return 1.0;
  const maxLen = Math.max(norm1.length, norm2.length);
  if (maxLen === 0) return 1.0;

  const dist = levenshteinDistance(norm1, norm2);
  return 1.0 - dist / maxLen;
}
