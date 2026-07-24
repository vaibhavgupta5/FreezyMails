import { useRouter } from "next/navigation";
import type { EmailAccount, Template } from "@prisma/client";
import { useCampaignStore } from "@/stores/useCampaignStore";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TemplateAttachment {
  filename: string;
  content: string;
}

export type CampaignWizardTemplate = Template & {
  attachments?: TemplateAttachment[];
};

export default function Step1Details({
  accounts,
  templates,
}: {
  accounts: EmailAccount[];
  templates: CampaignWizardTemplate[];
}) {
  const router = useRouter();
  const {
    name,
    templateId,
    accountIds,
    setDetails,
    pacingType,
    setPacingType,
    setStep,
  } = useCampaignStore();

  return (
    <div className="skeu-card space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Campaign Name</label>
        <input
          className="skeu-input"
          value={name}
          onChange={(e) => setDetails(e.target.value, templateId, accountIds)}
          placeholder="Q3 Outreach"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">
          Email Account(s)
        </label>
        {accounts.length === 0 ? (
          <div className="p-4 text-center border border-dashed border-border-subtle rounded-lg bg-bg-subtle text-text-muted text-sm">
            No active email accounts found. Please connect an account first.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {accounts.map((a) => {
              const isSelected = accountIds.includes(a.id);
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => {
                    const newIds = isSelected
                      ? accountIds.filter((id) => id !== a.id)
                      : [...accountIds, a.id];
                    setDetails(name, templateId, newIds);
                  }}
                  className={`w-full flex items-center justify-between p-3 border rounded-lg text-left transition-all cursor-pointer ${
                    isSelected
                      ? "border-primary-base bg-bg-subtle ring-1 ring-primary-base"
                      : "border-border-subtle hover:border-text-muted bg-bg-base"
                  }`}
                >
                  <div>
                    <div className="font-semibold text-sm text-text-primary">
                      {a.label}
                    </div>
                    <div className="text-xs text-text-muted">{a.fromEmail}</div>
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                      isSelected
                        ? "border-primary-base bg-primary-base text-primary-text"
                        : "border-border-subtle"
                    }`}
                  >
                    {isSelected && (
                      <span className="text-[10px] font-bold">✓</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Template</label>
        {templates.length === 0 ? (
          <div className="p-4 text-center border border-dashed border-border-subtle rounded-lg bg-bg-subtle text-text-muted text-sm flex flex-col items-center gap-3">
            <span>
              No templates found. Please create a template first to start a
              campaign.
            </span>
            <Button
              variant="primary"
              type="button"
              onClick={() => router.push("/templates")}
            >
              Create Template
            </Button>
          </div>
        ) : (
          <Select
            value={templateId || "none"}
            onValueChange={(val) => {
              if (val === "create_new") {
                router.push("/templates/new");
                return;
              }
              setDetails(name, val === "none" ? "" : val, accountIds);
            }}
          >
            <SelectTrigger className="skeu-select bg-bg-base">
              <SelectValue placeholder="Select Template" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Select Template</SelectItem>
              {templates.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
              <SelectItem
                value="create_new"
                className="text-primary-base font-medium border-t mt-1 pt-1"
              >
                + Create new template
              </SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Sending Pacing */}
      <div>
        <h3 className="font-semibold text-sm mb-3">Sending Pacing</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setPacingType("SLOW")}
            className={`p-4 rounded-xl border text-left transition-all ${
              pacingType === "SLOW"
                ? "border-primary-base bg-primary-base/5 shadow-[0_0_10px_rgba(var(--primary-base),0.2)]"
                : "border-border-subtle bg-bg-base hover:border-border-strong"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  pacingType === "SLOW"
                    ? "border-primary-base"
                    : "border-border-strong"
                }`}
              >
                {pacingType === "SLOW" && (
                  <div className="w-2 h-2 rounded-full bg-primary-base" />
                )}
              </div>
              <span className="font-semibold text-sm text-text-primary">
                Slow Drip (Recommended)
              </span>
            </div>
            <p className="text-xs text-text-muted ml-6">
              Emails are randomly sent over a 4-hour period to mimic natural
              human behavior. Best for deliverability and avoiding spam filters.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setPacingType("FAST")}
            className={`p-4 rounded-xl border text-left transition-all ${
              pacingType === "FAST"
                ? "border-primary-base bg-primary-base/5 shadow-[0_0_10px_rgba(var(--primary-base),0.2)]"
                : "border-border-subtle bg-bg-base hover:border-border-strong"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  pacingType === "FAST"
                    ? "border-primary-base"
                    : "border-border-strong"
                }`}
              >
                {pacingType === "FAST" && (
                  <div className="w-2 h-2 rounded-full bg-primary-base" />
                )}
              </div>
              <span className="font-semibold text-sm text-text-primary">
                Fast Send
              </span>
            </div>
            <p className="text-xs text-text-muted ml-6">
              Sends emails instantly. Best for internal announcements or opted-in
              newsletters, but carries a higher risk of spam filtering for cold
              outreach.
            </p>
          </button>
        </div>
      </div>

      <div className="pt-4 flex justify-end">
        <Button
          variant="primary"
          onClick={() => setStep(2)}
          disabled={
            !name || !templateId || !accountIds || accountIds.length === 0
          }
        >
          Next Step
        </Button>
      </div>
    </div>
  );
}
