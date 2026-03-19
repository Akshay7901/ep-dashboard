export interface FieldOption {
  key: string;
  label: string;
}

export interface Category {
  key: string;
  label: string;
  fields: FieldOption[];
}

export const CATEGORIES: Category[] = [
  {
    key: "author_information",
    label: "Author information",
    fields: [
      { key: "biography", label: "Biography" },
    ],
  },
  {
    key: "book_details",
    label: "Book details",
    fields: [
      { key: "word_count", label: "Word Count" },
      { key: "short_description", label: "Short Description" },
      { key: "detailed_description", label: "Detailed Description" },
      { key: "keywords", label: "Keywords" },
      { key: "table_of_contents", label: "Table of Contents" },
    ],
  },
  {
    key: "collaboration",
    label: "Collaboration",
    fields: [
      { key: "co_authors_editors", label: "Co-authors / Editors" },
      { key: "referees_reviewers", label: "Referees / Reviewers" },
    ],
  },
  {
    key: "additional_information",
    label: "Additional information",
    fields: [
      { key: "under_review_elsewhere", label: "Under Review Elsewhere" },
      { key: "permissions_required", label: "Permissions Required" },
      { key: "marketing_info", label: "Marketing Information" },
    ],
  },
  {
    key: "supporting_documents",
    label: "Supporting documents",
    fields: [
      { key: "cv", label: "CV" },
      { key: "sample_chapter", label: "Sample Chapter" },
      { key: "toc_doc", label: "Table of Contents Document" },
      { key: "permissions_docs", label: "Permission Documents" },
    ],
  },
];

export interface RevisionRow {
  id: string;
  category: string;
  field: string;
  reason: string;
}

export const emptyRevisionRow = (): RevisionRow => ({
  id: crypto.randomUUID(),
  category: "",
  field: "",
  reason: "",
});

export const getFieldsForCategory = (categoryKey: string): FieldOption[] => {
  return CATEGORIES.find((c) => c.key === categoryKey)?.fields || [];
};
