/**
 * Normalize a display status string to a snake_case key for comparison.
 * E.g., "In Review" -> "in_review", "New" -> "new", "Pending" -> "pending"
 */
export const normalizeStatus = (status: string): string =>
  status.trim().toLowerCase().replace(/\s+/g, '_');

/**
 * Check if a status matches one or more expected normalized keys.
 * Handles both raw API display text ("In Review") and snake_case ("in_review").
 */
export const statusIs = (status: string, ...keys: string[]): boolean => {
  const normalized = normalizeStatus(status);
  return keys.some((k) => normalized === k);
};
