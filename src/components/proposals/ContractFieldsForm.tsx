import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getContractPartyLabel } from "@/lib/contractUtils";

export interface ContractFieldValues {
  title: string;
  subtitle: string;
  language: string;
  authorCopies: string;
  ifTwoAuthorCopies: string;
  ifThreeOrFourAuthorCopies: string;
  copiesSoldRevenue: number;
  secondaryRightsRevenue: number;
  publishingAgreement: string;
}

export function getDefaultContractFields(
  contractType: string,
  proposalTitle?: string,
  proposalSubtitle?: string
): ContractFieldValues {
  const partyLabel = getContractPartyLabel(contractType);
  return {
    title: proposalTitle || "",
    subtitle: proposalSubtitle || "",
    language: "in all languages",
    authorCopies: "two copies",
    ifTwoAuthorCopies: "two copies",
    ifThreeOrFourAuthorCopies: "one copy",
    copiesSoldRevenue: 10,
    secondaryRightsRevenue: 20,
    publishingAgreement: `This publishing agreement will run in perpetuity, unless agreed otherwise by both the Publisher and the ${partyLabel}.`,
  };
}

interface ContractFieldsFormProps {
  values: ContractFieldValues;
  onChange: (values: ContractFieldValues) => void;
  contractType: string;
  idPrefix?: string;
}

const ContractFieldsForm: React.FC<ContractFieldsFormProps> = ({
  values,
  onChange,
  contractType,
  idPrefix = "cf",
}) => {
  const update = (patch: Partial<ContractFieldValues>) =>
    onChange({ ...values, ...patch });

  // Auto-update the agreement text when contract type changes
  React.useEffect(() => {
    const partyLabel = getContractPartyLabel(contractType);
    const expectedSuffix = `the Publisher and the ${partyLabel}.`;
    if (!values.publishingAgreement.endsWith(expectedSuffix)) {
      const otherParty = contractType === "editor" ? "Author" : "Editor";
      const oldSuffix = `the Publisher and the ${otherParty}.`;
      if (values.publishingAgreement.endsWith(oldSuffix)) {
        update({
          publishingAgreement: values.publishingAgreement.replace(
            oldSuffix,
            expectedSuffix
          ),
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractType]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-title`}>Title</Label>
        <Input
          id={`${idPrefix}-title`}
          value={values.title}
          onChange={(e) => update({ title: e.target.value })}
          placeholder="Enter title"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-subtitle`}>Subtitle</Label>
        <Input
          id={`${idPrefix}-subtitle`}
          value={values.subtitle}
          onChange={(e) => update({ subtitle: e.target.value })}
          placeholder="Enter subtitle (optional)"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-language`}>Publication Language</Label>
        <Input
          id={`${idPrefix}-language`}
          value={values.language}
          onChange={(e) => update({ language: e.target.value })}
          placeholder="e.g. in all languages"
        />
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-copies`} className="text-xs">
            Complimentary Copies on Publication
          </Label>
          <Input
            id={`${idPrefix}-copies`}
            value={values.authorCopies}
            onChange={(e) =>
              update({ authorCopies: e.target.value })
            }
            placeholder="e.g. two copies"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-two-copies`} className="text-xs">
            Complimentary Copies Each - 2 Authors
          </Label>
          <Input
            id={`${idPrefix}-two-copies`}
            value={values.ifTwoAuthorCopies}
            onChange={(e) =>
              update({ ifTwoAuthorCopies: e.target.value })
            }
            placeholder="e.g. two copies"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-three-copies`} className="text-xs">
            Complimentary Copies Each - 3 or 4 Authors
          </Label>
          <Input
            id={`${idPrefix}-three-copies`}
            value={values.ifThreeOrFourAuthorCopies}
            onChange={(e) =>
              update({
                ifThreeOrFourAuthorCopies: e.target.value,
              })
            }
            placeholder="e.g. one copy"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-book-royalty`} className="text-xs">
            Author Royalty - Book Sales (%)
          </Label>
          <div className="relative">
            <Input
              id={`${idPrefix}-book-royalty`}
              type="number"
              min={0}
              max={100}
              value={values.copiesSoldRevenue}
              onChange={(e) =>
                update({
                  copiesSoldRevenue: parseFloat(e.target.value) || 0,
                })
              }
              className="pr-8"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">%</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-other-royalty`} className="text-xs">
            Author Royalty - Other Rights (%)
          </Label>
          <div className="relative">
            <Input
              id={`${idPrefix}-other-royalty`}
              type="number"
              min={0}
              max={100}
              value={values.secondaryRightsRevenue}
              onChange={(e) =>
                update({
                  secondaryRightsRevenue: parseFloat(e.target.value) || 0,
                })
              }
              className="pr-8"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">%</span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-agreement`}>Agreement Duration</Label>
        <Textarea
          id={`${idPrefix}-agreement`}
          value={values.publishingAgreement}
          onChange={(e) => update({ publishingAgreement: e.target.value })}
          rows={3}
          className="resize-none text-sm"
        />
      </div>
    </div>
  );
};

export default ContractFieldsForm;
