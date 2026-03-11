/**
 * Input sanitization utilities to prevent XSS and injection attacks.
 */

/**
 * Strip all HTML tags from a string to prevent stored XSS.
 * Also collapses extra whitespace and trims.
 */
export function stripHtml(input: string): string {
  return input
    .replace(/<[^>]*>/g, '')   // Remove HTML tags
    .replace(/&lt;/g, '<')     // Decode common entities so we can re-strip
    .replace(/&gt;/g, '>')
    .replace(/<[^>]*>/g, '')   // Second pass after decoding
    .replace(/[<>]/g, '')      // Remove any remaining angle brackets
    .replace(/\s+/g, ' ')     // Collapse whitespace
    .trim();
}

/**
 * Escape HTML entities for safe display (use when you need to preserve text content).
 */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}
