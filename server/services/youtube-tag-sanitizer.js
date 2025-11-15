/**
 * YouTube Tag Sanitizer
 * 
 * Ensures all tags comply with YouTube's strict requirements:
 * - Max 30 characters per tag
 * - No emojis, special characters, or hashtags
 * - Only letters, numbers, and spaces
 * - No duplicates
 * - Safe count (10-15 tags)
 */

/**
 * Sanitize tags for YouTube upload
 * @param {Array<string>} tags - Raw tags from AI or user input
 * @returns {Array<string>} - Sanitized, YouTube-compliant tags
 */
function sanitizeYouTubeTags(tags) {
  // Handle invalid input
  if (!Array.isArray(tags)) {
    console.warn('[TagSanitizer] Invalid input: tags is not an array');
    return [];
  }

  console.log(`[TagSanitizer] Input tags (${tags.length}):`, tags);

  const sanitized = tags
    // Convert to string and trim whitespace
    .map(t => {
      if (typeof t !== 'string') {
        console.warn('[TagSanitizer] Non-string tag detected:', t);
        return String(t || '');
      }
      return t.trim();
    })
    // Remove empty strings
    .filter(t => t.length > 0)
    // Step 1: Keep only allowed characters (letters, numbers, spaces, hyphens)
    // This removes emojis, special chars, everything else in one go
    .map(t => t.replace(/[^A-Za-z0-9\s-]/g, ''))
    // Step 2: Normalize whitespace (tabs, multiple spaces, etc.)
    .map(t => t.replace(/\s+/g, ' ').trim())
    // Step 3: Remove empty strings after cleaning
    .filter(t => t.length > 0)
    // Step 4: Remove tags that are only hyphens or spaces
    .filter(t => t.replace(/[-\s]/g, '').length > 0)
    // Step 5: Enforce max length rule (30 characters)
    .filter(t => {
      if (t.length > 30) {
        console.warn(`[TagSanitizer] Tag too long (${t.length} chars): "${t}"`);
        return false;
      }
      return true;
    })
    // Step 6: Remove duplicates (case-insensitive)
    .filter((t, i, arr) => {
      const lowerTags = arr.map(tag => tag.toLowerCase());
      return lowerTags.indexOf(t.toLowerCase()) === i;
    })
    // Step 7: Limit to safe count (15 tags max)
    .slice(0, 15);

  console.log(`[TagSanitizer] Output tags (${sanitized.length}):`, sanitized);
  
  // Log removed tags for debugging
  const removedCount = tags.length - sanitized.length;
  if (removedCount > 0) {
    console.log(`[TagSanitizer] Removed ${removedCount} invalid tags`);
  }

  return sanitized;
}

/**
 * Validate if a single tag is YouTube-compliant
 * @param {string} tag - Tag to validate
 * @returns {boolean} - True if valid
 */
function isValidYouTubeTag(tag) {
  if (typeof tag !== 'string') return false;
  if (tag.length === 0 || tag.length > 30) return false;
  if (!/^[A-Za-z0-9\s-]+$/.test(tag)) return false;
  return true;
}

/**
 * Get total character count of all tags (for YouTube's 500 char limit)
 * @param {Array<string>} tags - Tags array
 * @returns {number} - Total character count
 */
function getTotalTagLength(tags) {
  if (!Array.isArray(tags)) return 0;
  return tags.join(',').length;
}

// Export functions
module.exports = {
  sanitizeYouTubeTags,
  isValidYouTubeTag,
  getTotalTagLength
};
