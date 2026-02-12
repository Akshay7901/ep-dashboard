// Helper to extract country from structured address string
// Supports formats like "... Country: Australia ;" or "... Country: Australia" (end of string)
export const extractCountry = (address?: string | null): string | null => {
  if (!address) return null;
  // Try "Country: <value> ;" first, then "Country: <value>" at end of string
  const match = address.match(/Country:\s*([^;]+)/i);
  const country = match?.[1]?.trim();
  if (country) return country;
  // Fallback: if the address is just a plain country name (no structured format)
  const trimmed = address.trim();
  if (trimmed && !trimmed.includes(':') && !trimmed.includes(';') && trimmed.length < 60) {
    return trimmed;
  }
  return null;
};
