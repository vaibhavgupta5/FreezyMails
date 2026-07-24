import { Trash2, Plus } from "lucide-react";
import { useCampaignStore } from "@/stores/useCampaignStore";
import { Button } from "@/components/ui/button";
import { CampaignWizardTemplate } from "./Step1Details";
import {
  Attachment,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentContent,
  AttachmentTitle,
} from "@/components/ui/attachment";

const equalizeSplits = (count: number) => {
  if (count === 0) return [];
  const base = Math.floor(100 / count);
  let remainder = 100 % count;
  return Array.from({ length: count }, () => {
    if (remainder > 0) {
      remainder--;
      return base + 1;
    }
    return base;
  });
};

export default function Step3ABVariants({
  templates,
}: {
  templates: CampaignWizardTemplate[];
}) {
  const { step, setStep, templateId, templateVariants, setTemplateVariants } =
    useCampaignStore();

  const selectedTemplate = templates.find((t) => t.id === templateId);

  return (
    <div className="space-y-6">
      <div className="skeu-card">
        <h2 className="text-lg font-semibold mb-2">A/B Testing (Optional)</h2>
        <p className="text-sm text-text-muted mb-6">
          Create variants of your template to test different subject lines or
          body copy. Our system will distribute them evenly.
        </p>

        {templateVariants.length > 0 ? (
          <div className="space-y-6">
            {templateVariants.map((tv, i) => (
              <div
                key={i}
                className="p-5 border border-border-subtle rounded-xl bg-bg-subtle relative group shadow-sm hover:border-text-muted/30 transition-all duration-200"
              >
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-bold text-sm text-text-primary">
                    {tv.name}
                  </h3>
                  {templateVariants.length > 1 && (
                    <Button
                      variant="none"
                      onClick={() => {
                        const newTvs = templateVariants.filter(
                          (_, idx) => idx !== i,
                        );
                        const splits = equalizeSplits(newTvs.length);
                        newTvs.forEach(
                          (tv, idx) => (tv.splitPercent = splits[idx]),
                        );
                        setTemplateVariants(newTvs);
                      }}
                      className="text-text-muted hover:text-danger-text hover:bg-danger-bg/50 p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-pointer"
                    >
                      <Trash2 size={16} />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4 items-end">
                  {i === 0 ? (
                    <div className="md:col-span-10">
                      <p className="text-xs text-text-muted pb-2">
                        Uses the base template selected in Step 1 (uneditable)
                      </p>
                    </div>
                  ) : (
                    <div className="md:col-span-10">
                      <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1">
                        Load Existing
                      </label>
                      <select
                        className="skeu-select h-[38px] py-1.5 px-3 text-sm bg-bg-base"
                        value="none"
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "none") return;
                          const t = templates.find((temp) => temp.id === val);
                          if (t) {
                            const newTvs = [...templateVariants];
                            newTvs[i].body = t.body;
                            if (newTvs[i].subjectVariants.length > 0) {
                              newTvs[i].subjectVariants[0].subject = t.subject;
                            }
                            setTemplateVariants(newTvs);
                          }
                        }}
                      >
                        <option value="none">Select template...</option>
                        {templates.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1">
                      Split %
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        className="skeu-input py-1.5 px-3 pr-6 text-sm bg-bg-base"
                        value={tv.splitPercent}
                        onChange={(e) => {
                          const newTvs = [...templateVariants];
                          newTvs[i].splitPercent =
                            parseInt(e.target.value) || 0;
                          setTemplateVariants(newTvs);
                        }}
                      />
                      <span className="absolute right-3 top-2 text-text-muted text-xs font-semibold">
                        %
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1">
                    Body Text
                  </label>
                  <textarea
                    className="skeu-textarea text-sm bg-bg-base disabled:opacity-75 disabled:bg-bg-subtle"
                    rows={3}
                    value={tv.body}
                    disabled={i === 0}
                    onChange={(e) => {
                      const newTvs = [...templateVariants];
                      newTvs[i].body = e.target.value;
                      setTemplateVariants(newTvs);
                    }}
                    placeholder="Hi {{firstName}}, ..."
                  />
                </div>

                {selectedTemplate &&
                  Array.isArray(selectedTemplate.attachments) &&
                  selectedTemplate.attachments.length > 0 && (
                      <div className="mb-6">
                        <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
                          Attachments
                        </label>
                        <AttachmentGroup className="w-full">
                          {selectedTemplate.attachments.map(
                            (att, attIdx: number) => (
                              <Attachment key={attIdx} size="xs" orientation="horizontal">
                                <AttachmentMedia variant="icon" />
                                <AttachmentContent>
                                  <AttachmentTitle>{att.filename}</AttachmentTitle>
                                </AttachmentContent>
                              </Attachment>
                            ),
                          )}
                        </AttachmentGroup>
                      </div>
                  )}

                <div className="bg-bg-base p-4 rounded-xl border border-border-subtle shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-bold text-xs text-text-primary uppercase tracking-wider">
                      Subject Line Variants
                    </h4>
                    <Button
                      variant="none"
                      onClick={() => {
                        const newTvs = [...templateVariants];
                        newTvs[i].subjectVariants.push({
                          name: `Subject ${newTvs[i].subjectVariants.length + 1}`,
                          subject: "",
                          splitPercent: 0,
                        });
                        const splits = equalizeSplits(
                          newTvs[i].subjectVariants.length,
                        );
                        newTvs[i].subjectVariants.forEach(
                          (sv, idx) => (sv.splitPercent = splits[idx]),
                        );
                        setTemplateVariants(newTvs);
                      }}
                      className="text-xs font-semibold text-text-primary border border-border-subtle rounded-md px-2.5 py-1.5 hover:bg-bg-subtle active:scale-[0.98] transition-all cursor-pointer flex items-center gap-1"
                    >
                      <Plus size={14} /> Add Subject
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {tv.subjectVariants.map((sv, j) => (
                      <div key={j} className="flex gap-3 items-center group/sub">
                        <input
                          className="skeu-input py-1.5 px-3 text-sm flex-1 bg-bg-base disabled:opacity-75 disabled:bg-bg-subtle"
                          value={sv.subject}
                          disabled={i === 0 && j === 0}
                          onChange={(e) => {
                            const newTvs = [...templateVariants];
                            newTvs[i].subjectVariants[j].subject =
                              e.target.value;
                            setTemplateVariants(newTvs);
                          }}
                          placeholder="Quick question..."
                        />
                        <div className="w-24 relative shrink-0">
                          <input
                            type="number"
                            className="skeu-input py-1.5 px-3 pr-6 text-sm bg-bg-base"
                            value={sv.splitPercent}
                            onChange={(e) => {
                              const newTvs = [...templateVariants];
                              newTvs[i].subjectVariants[j].splitPercent =
                                parseInt(e.target.value) || 0;
                              setTemplateVariants(newTvs);
                            }}
                          />
                          <span className="absolute right-3 top-2 text-text-muted text-xs font-semibold">
                            %
                          </span>
                        </div>
                        {j > 0 && (
                          <Button
                            variant="none"
                            onClick={() => {
                              const newTvs = [...templateVariants];
                              newTvs[i].subjectVariants = newTvs[
                                i
                              ].subjectVariants.filter((_, sIdx) => sIdx !== j);
                              const splits = equalizeSplits(
                                newTvs[i].subjectVariants.length,
                              );
                              newTvs[i].subjectVariants.forEach(
                                (sv, idx) => (sv.splitPercent = splits[idx]),
                              );
                              setTemplateVariants(newTvs);
                            }}
                            className="text-text-muted hover:text-danger-text hover:bg-danger-bg/50 p-1.5 rounded-md opacity-0 group-hover/sub:opacity-100 transition-all duration-200 cursor-pointer shrink-0"
                          >
                            <Trash2 size={16} />
                          </Button>
                        )}
                      </div>
                    ))}
                    {tv.subjectVariants.length === 0 && (
                      <p className="text-xs text-danger-text font-medium">
                        You must add at least one subject line variant.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center border border-dashed border-border-subtle rounded-xl text-text-muted bg-bg-subtle/50">
            <p className="font-semibold text-text-primary mb-1">
              No variants added.
            </p>
            <p className="text-sm">
              The default template and subject line will be used for all
              recipients.
            </p>
          </div>
        )}

        <div className="mt-8 flex justify-center">
          <Button
            variant="none"
            onClick={() => {
              const newTvs = [
                ...templateVariants,
                {
                  name: `Variant ${String.fromCharCode(65 + templateVariants.length)}`,
                  body: selectedTemplate?.body || "",
                  splitPercent: 0,
                  subjectVariants: [
                    {
                      name: "Subject 1",
                      subject: selectedTemplate?.subject || "",
                      splitPercent: 100,
                    },
                  ],
                },
              ];
              const splits = equalizeSplits(newTvs.length);
              newTvs.forEach((tv, idx) => (tv.splitPercent = splits[idx]));
              setTemplateVariants(newTvs);
            }}
            className="skeu-btn-ghost flex items-center gap-1.5 font-medium px-4 py-2 border border-dashed border-border-subtle"
          >
            <Plus size={16} /> Add Template Variant
          </Button>
        </div>
      </div>

      <div className="flex justify-between mt-6">
        <Button variant="ghost" onClick={() => setStep(2)}>
          Back
        </Button>
        <Button variant="primary" onClick={() => setStep(4)}>
          Next Step
        </Button>
      </div>
    </div>
  );
}
