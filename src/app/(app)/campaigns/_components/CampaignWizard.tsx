"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCampaignStore } from "@/stores/useCampaignStore";
import { toast } from "sonner";
import PageSkeleton from "../../_components/PageSkeleton";
import type { EmailAccount } from "@prisma/client";
import { CampaignWizardTemplate } from "./wizard-steps/Step1Details";

// Import Extracted Steps
import Step1Details from "./wizard-steps/Step1Details";
import Step2Recipients from "./wizard-steps/Step2Recipients";
import Step3ABVariants from "./wizard-steps/Step3ABVariants";
import Step4Sequence from "./wizard-steps/Step4Sequence";

export default function CampaignWizard({
  campaignId,
}: {
  campaignId?: string;
}) {
  const router = useRouter();

  const {
    step,
    setStep,
    name,
    templateId,
    accountIds,
    parsedRecipients,
    isValid,
    templateVariants,
    pacingType,
    sequenceSteps,
    scheduledAt,
    resetDraft,
    status,
  } = useCampaignStore();

  const [templates, setTemplates] = useState<CampaignWizardTemplate[]>([]);
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [audienceLists, setAudienceLists] = useState<
    { id: string; name: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/templates").then((r) => r.json()),
      fetch("/api/accounts").then((r) => r.json()),
      fetch("/api/lists").then((r) => r.json()),
    ]).then(([tData, aData, lData]) => {
      setTemplates(tData || []);
      setAccounts(aData || []);
      setAudienceLists(Array.isArray(lData) ? lData : []);
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    if (
      !name ||
      !templateId ||
      !accountIds ||
      accountIds.length === 0 ||
      !isValid
    )
      return;

    setIsSaving(true);
    try {
      const url = campaignId
        ? `/api/campaigns/${campaignId}`
        : "/api/campaigns";
      const method = campaignId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          templateId,
          emailAccountIds: accountIds,
          recipients: parsedRecipients,
          templateVariants,
          scheduledAt,
          pacingType,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error ||
            `Failed to ${campaignId ? "update" : "create"} campaign`,
        );
      }

      const createdCampaignId = campaignId || data.id;

      // Handle sequence steps
      if (sequenceSteps && sequenceSteps.length > 0) {
        // If updating, delete existing steps first (simple approach)
        if (campaignId) {
          const existing = await fetch(
            `/api/campaigns/${createdCampaignId}/sequence`,
          ).then((r) => r.json());
          if (Array.isArray(existing)) {
            for (const step of existing) {
              await fetch(`/api/campaigns/${createdCampaignId}/sequence`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ stepId: step.id }),
              });
            }
          }
        }
        for (const step of sequenceSteps) {
          await fetch(`/api/campaigns/${createdCampaignId}/sequence`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(step),
          });
        }
      }

      if (!campaignId) resetDraft();
      toast.success(
        `Campaign ${campaignId ? "updated" : "created"} successfully!`,
      );
      router.push(`/campaigns/${createdCampaignId}`);
    } catch (_err: unknown) {
      const err = _err as Error;
      toast.error(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <PageSkeleton />;

  const isReadOnly =
    campaignId &&
    status &&
    status !== "DRAFT" &&
    status !== "DONE";

  return (
    <div className="w-full max-w-5xl mx-auto py-6 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">
          {campaignId ? "Edit Campaign" : "New Campaign"}
        </h1>
        {isReadOnly && (
          <div className="mt-4 p-4 border border-warning-bg bg-warning-bg/10 rounded-xl text-warning-text flex items-center gap-2">
            <p className="text-sm font-semibold">
              This campaign is currently active. Only DRAFT or DONE campaigns can
              be fully edited.
            </p>
          </div>
        )}
      </div>

      <div className="flex bg-bg-base border border-border-subtle rounded-xl overflow-hidden mb-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
        {[
          { num: 1, label: "Details" },
          { num: 2, label: "Recipients" },
          { num: 3, label: "A/B Variants" },
          { num: 4, label: "Sequence" },
        ].map((tab) => (
          <button
            key={tab.num}
            onClick={() => setStep(tab.num)}
            className={`flex-1 p-3 text-center border-b-2 font-medium transition-colors ${
              step === tab.num
                ? "border-primary-base text-primary-base bg-bg-subtle"
                : "border-transparent text-text-muted hover:bg-bg-subtle"
            }`}
          >
            <span className="hidden sm:inline">Step {tab.num}: </span>
            {tab.label}
          </button>
        ))}
      </div>

      <div className={isReadOnly ? "opacity-50 pointer-events-none" : ""}>
        {step === 1 && (
          <Step1Details accounts={accounts} templates={templates} />
        )}
        {step === 2 && (
          <Step2Recipients
            templates={templates}
            audienceLists={audienceLists}
          />
        )}
        {step === 3 && <Step3ABVariants templates={templates} />}
        {step === 4 && (
          <Step4Sequence
            campaignId={campaignId}
            isSaving={isSaving}
            handleSave={handleSave}
          />
        )}
      </div>
    </div>
  );
}
