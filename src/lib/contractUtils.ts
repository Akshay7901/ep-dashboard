export type ContractType = "author" | "editor";

/**
 * Determines the default contract type based on the book type.
 * - Monograph / Authored, Adapted PhD Thesis → "author"
 * - Edited Collection, Adapted Conference Collection → "editor"
 * - Fallback → "author"
 */
export function getDefaultContractType(bookType?: string | null): ContractType {
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

export function normalizeContractType(contractType?: string | null): ContractType {
  return contractType === "editor" ? "editor" : "author";
}

export function getContractPartyLabel(contractType?: string | null): "Author" | "Editor" {
  return normalizeContractType(contractType) === "editor" ? "Editor" : "Author";
}

export interface ContractSendFields {
  contractType?: string | null;
  title?: string;
  subtitle?: string;
  expiryDays?: number;
  notes?: string;
  language?: string;
  authorCopies?: number;
  ifTwoAuthorCopies?: number;
  ifThreeOrFourAuthorCopies?: number;
  copiesSoldRevenue?: number;
  secondaryRightsRevenue?: number;
  publishingAgreement?: string;
}

export function buildContractSendPayload(fields: ContractSendFields) {
  const normalizedContractType = normalizeContractType(fields.contractType);

  return {
    contract_type: normalizedContractType,
    ...(fields.title !== undefined ? { title: fields.title } : {}),
    ...(fields.subtitle !== undefined ? { subtitle: fields.subtitle } : {}),
    language: fields.language ?? "in all languages",
    author_copies: fields.authorCopies ?? 2,
    if_two_author_copies: fields.ifTwoAuthorCopies ?? 2,
    if_three_or_four_author_copies: fields.ifThreeOrFourAuthorCopies ?? 1,
    copies_sold_revenue: fields.copiesSoldRevenue ?? 10,
    secondary_rights_revenue: fields.secondaryRightsRevenue ?? 20,
    publishing_agreement: fields.publishingAgreement ?? `This publishing agreement will run in perpetuity, unless agreed otherwise by both the Publisher and the ${getContractPartyLabel(normalizedContractType)}.`,
    ...(typeof fields.expiryDays === "number" ? { expiry_days: fields.expiryDays } : {}),
    ...(fields.notes?.trim() ? { notes: fields.notes.trim() } : {}),
  };
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
