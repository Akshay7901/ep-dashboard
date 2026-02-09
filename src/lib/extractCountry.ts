// Helper to extract country from structured address string (e.g. "... Country: Australia ;")
export const extractCountry = (address?: string | null): string | null => {
  if (!address) return null;
  const match = address.match(/Country:\s*([^;]+)/i);
  const country = match?.[1]?.trim();
  return country || null;
};
