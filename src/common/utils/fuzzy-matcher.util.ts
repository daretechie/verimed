import Fuse from 'fuse.js';

export class FuzzyMatcher {
  /**
   * Calculates the match score between an input name (from user) and a registry name (from API).
   * Returns a score between 0.0 (no match) and 1.0 (perfect match).
   *
   * @param inputName The name provided by the user (e.g. "Greg House")
   * @param registryName The name found in the registry (e.g. "Gregory House")
   * @param threshold The Fuse.js threshold (default 0.3)
   */
  static calculateNameMatch(
    inputName: string,
    registryName: string,
    threshold = 0.4,
  ): number {
    if (!inputName || !registryName) return 0.0;

    const options = { includeScore: true, threshold };
    const fuse = new Fuse([registryName], options);
    const result = fuse.search(inputName);

    if (result.length > 0 && result[0].score !== undefined) {
      // Fuse.js score is 0 (perfect) to 1 (bad). Invert it for our logic (1 = perfect).
      return 1.0 - result[0].score;
    }

    return 0.0;
  }

  /**
   * Helper to verify if a match is acceptable based on a minimum confidence.
   */
  static isMatch(
    inputName: string,
    registryName: string,
    minConfidence = 0.6, // Equivalent to Fuse.js score <= 0.4
  ): boolean {
    const score = this.calculateNameMatch(inputName, registryName);
    return score >= minConfidence;
  }
}
