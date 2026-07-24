import { useRouter } from "next/navigation";
import type { EmailAccount, Template } from "@prisma/client";
import { useCampaignStore } from "@/stores/useCampaignStore";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { useState } from "react";

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

  const [templateOpen, setTemplateOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTemplates = templates.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          <Popover open={templateOpen} onOpenChange={setTemplateOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={templateOpen}
                className="skeu-input w-full flex justify-between items-center px-4 font-normal"
              >
                <span className="truncate">
                  {templateId && templateId !== "none"
                    ? templates.find((t) => t.id === templateId)?.name || "Select Template"
                    : "Select Template"}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 border border-border-subtle bg-bg-base shadow-lg" align="start">
              <div className="flex items-center border-b border-border-subtle px-3">
                <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                <input
                  className="flex h-11 w-full bg-transparent py-3 text-sm outline-none placeholder:text-text-muted text-text-primary"
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="max-h-[300px] overflow-y-auto p-1">
                {filteredTemplates.length === 0 ? (
                  <div className="py-6 text-center text-sm text-text-muted">No template found.</div>
                ) : (
                  filteredTemplates.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => {
                        setDetails(name, t.id, accountIds);
                        setTemplateOpen(false);
                      }}
                      className={`relative flex cursor-pointer select-none items-center justify-between rounded-md px-3 py-2.5 text-sm outline-none transition-colors ${
                        templateId === t.id
                          ? "bg-primary-base/10 text-primary-base font-medium"
                          : "hover:bg-bg-subtle text-text-primary"
                      }`}
                    >
                      <span className="truncate pr-2">{t.name}</span>
                      {templateId === t.id && (
                        <Check className="h-4 w-4 shrink-0 text-primary-base" />
                      )}
                    </div>
                  ))
                )}
                <div className="h-px bg-border-subtle my-1 mx-2" />
                <div
                  onClick={() => router.push("/templates/new")}
                  className="relative flex cursor-pointer select-none items-center rounded-md px-3 py-2.5 text-sm font-medium text-primary-base outline-none hover:bg-primary-base/5"
                >
                  <span className="text-lg leading-none mr-2">+</span>
                  Create new template
                </div>
              </div>
            </PopoverContent>
          </Popover>
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
