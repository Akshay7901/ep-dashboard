// Helper to extract country from address string
// Supports: "Country: Australia ;" structured format OR comma-separated where last part is country
export const extractCountry = (address?: string | null): string | null => {
  if (!address) return null;
  const trimmed = address.trim();
  if (!trimmed) return null;

  // Try structured "Country: <value>" format first
  const match = trimmed.match(/Country:\s*([^;]+)/i);
  if (match?.[1]?.trim()) return match[1].trim();

  // Comma-separated: last segment is the country
  const parts = trimmed.split(',').map(p => p.trim()).filter(Boolean);
  if (parts.length > 0) return parts[parts.length - 1];

  return null;
};
