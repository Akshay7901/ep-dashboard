/**
 * Determines the default contract type based on the book type.
 * - Monograph / Authored, Adapted PhD Thesis → "author"
 * - Edited Collection, Adapted Conference Collection → "editor"
 * - Fallback → "author"
 */
export function getDefaultContractType(bookType?: string | null): "author" | "editor" {
  if (!bookType) return "author";
  const normalized = bookType.trim().toLowerCase();

  const editorTypes = [
    "edited collection",
    "adapted conference collection",
  ];

  if (editorTypes.some((t) => normalized.includes(t))) {
    return "editor";
  }

  return "author";
}

/**
 * Returns a warning message when the selected contract type doesn't match
 * the expected type for the given book type. Returns null if they match.
 */
export function getContractMismatchWarning(
  bookType: string | undefined | null,
  selectedContractType: string
): string | null {
  const expected = getDefaultContractType(bookType);
  if (selectedContractType === expected) return null;

  const expectedLabel = expected === "editor" ? "Editor" : "Author";
  const selectedLabel = selectedContractType === "editor" ? "Editor" : "Author";

  return `The book type "${bookType || "Unknown"}" typically requires an ${expectedLabel} Contract, but you have selected an ${selectedLabel} Contract. Are you sure you want to proceed?`;
}
