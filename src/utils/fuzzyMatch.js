// Fuzzy matching utilities for peptide name similarity detection

/**
 * Calculate Levenshtein distance between two strings
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} - Distance (lower = more similar)
 */
export function levenshteinDistance(str1, str2) {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * Calculate similarity score between two strings (0-1, higher = more similar)
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} - Similarity score (0-1)
 */
export function calculateSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  const maxLength = Math.max(str1.length, str2.length);
  
  if (maxLength === 0) return 1;
  
  return 1 - (distance / maxLength);
}

/**
 * Normalize peptide name for comparison
 * @param {string} name - Peptide name
 * @returns {string} - Normalized name
 */
export function normalizePeptideName(name) {
  if (!name) return '';
  
  return name
    .toLowerCase()
    .replace(/[-\s_]/g, '') // Remove hyphens, spaces, underscores
    .replace(/[()]/g, '')   // Remove parentheses
    .replace(/\d+/g, '')    // Remove numbers for base comparison
    .trim();
}

/**
 * Check if two peptide names are likely the same compound
 * @param {string} name1 - First peptide name
 * @param {string} name2 - Second peptide name
 * @param {number} threshold - Similarity threshold (default: 0.7)
 * @returns {boolean} - Whether names are likely the same
 */
export function areLikelySamePeptide(name1, name2, threshold = 0.7) {
  if (!name1 || !name2) return false;
  
  // Direct comparison first
  if (name1.toLowerCase() === name2.toLowerCase()) return true;
  
  // Normalized comparison
  const normalized1 = normalizePeptideName(name1);
  const normalized2 = normalizePeptideName(name2);
  
  if (normalized1 === normalized2) return true;
  
  // Fuzzy matching
  const similarity = calculateSimilarity(normalized1, normalized2);
  return similarity >= threshold;
}

/**
 * Find potential duplicates in a list of peptide groups
 * @param {Array} groups - Array of peptide groups
 * @param {number} threshold - Similarity threshold (default: 0.7)
 * @returns {Array} - Array of duplicate pairs with similarity scores
 */
export function findPotentialDuplicates(groups, threshold = 0.7) {
  const duplicates = [];
  
  for (let i = 0; i < groups.length; i++) {
    for (let j = i + 1; j < groups.length; j++) {
      const group1 = groups[i];
      const group2 = groups[j];
      
      // Skip if same unit type (mg vs mL should be separate)
      if (group1.unit !== group2.unit) continue;
      
      const similarity = calculateSimilarity(
        normalizePeptideName(group1.name),
        normalizePeptideName(group2.name)
      );
      
      if (similarity >= threshold) {
        duplicates.push({
          group1,
          group2,
          similarity,
          confidence: getConfidenceLevel(similarity)
        });
      }
    }
  }
  
  // Sort by similarity (highest first)
  return duplicates.sort((a, b) => b.similarity - a.similarity);
}

/**
 * Get confidence level based on similarity score
 * @param {number} similarity - Similarity score (0-1)
 * @returns {string} - Confidence level
 */
export function getConfidenceLevel(similarity) {
  if (similarity >= 0.9) return 'high';
  if (similarity >= 0.8) return 'medium';
  if (similarity >= 0.7) return 'low';
  return 'very-low';
}

/**
 * Get confidence color for UI display
 * @param {string} confidence - Confidence level
 * @returns {string} - CSS color class
 */
export function getConfidenceColor(confidence) {
  switch (confidence) {
    case 'high': return 'text-green-600 bg-green-50 border-green-200';
    case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'low': return 'text-orange-600 bg-orange-50 border-orange-200';
    case 'very-low': return 'text-red-600 bg-red-50 border-red-200';
    default: return 'text-gray-600 bg-gray-50 border-gray-200';
  }
}

/**
 * Get confidence icon for UI display
 * @param {string} confidence - Confidence level
 * @returns {string} - Icon name
 */
export function getConfidenceIcon(confidence) {
  switch (confidence) {
    case 'high': return 'check-circle';
    case 'medium': return 'alert-triangle';
    case 'low': return 'alert-circle';
    case 'very-low': return 'x-circle';
    default: return 'help-circle';
  }
}
