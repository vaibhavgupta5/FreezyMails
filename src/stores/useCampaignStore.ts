import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ParsedRecipient } from "@/types";
import { Template } from "@prisma/client";
import { validateRecipientList } from "@/lib/validate";

interface CampaignDraftState {
  step: number;
  inputMode: "paste" | "table";
  name: string;
  templateId: string;
  accountIds: string[];
  recipientsText: string;
  parsedRecipients: ParsedRecipient[];
  validationErrors: Record<number, string[]>;
  isValid: boolean;
  globalError: string;
  pacingType: "SLOW" | "FAST";
  dailyLimit: number | null;
  timezone: string;
  templateVariants: {
    name: string;
    body: string;
    splitPercent: number;
    subjectVariants: { name: string; subject: string; splitPercent: number }[];
  }[];
  sequenceSteps: {
    id?: string;
    stepIndex: number;
    delayDays: number;
    subject: string;
    body: string;
  }[];
  scheduledAt: string | null;
  status?: string;
  lastUpdated?: number;

  // Actions
  setStep: (step: number) => void;
  setInputMode: (mode: "paste" | "table") => void;
  setDetails: (name: string, templateId: string, accountIds: string[]) => void;
  setRecipientsText: (text: string, templates: Template[]) => void;
  setGlobalError: (error: string) => void;
  setTemplateVariants: (
    templateVariants: {
      name: string;
      body: string;
      splitPercent: number;
      subjectVariants: {
        name: string;
        subject: string;
        splitPercent: number;
      }[];
    }[],
  ) => void;
  setSequenceSteps: (
    sequenceSteps: {
      id?: string;
      stepIndex: number;
      delayDays: number;
      subject: string;
      body: string;
    }[],
  ) => void;
  setDailyLimit: (limit: number | null) => void;
  setPacingType: (type: "SLOW" | "FAST") => void;
  resetDraft: () => void;
  loadCampaign: (
    campaign: {
      name?: string;
      templateId?: string;
      emailAccounts?: { id: string }[];
      abTemplateVariants?: {
        name: string;
        body: string;
        splitPercent?: number;
        subjectVariants?: {
          name: string;
          subject: string;
          splitPercent?: number;
        }[];
      }[];
      timezone?: string;
      scheduledAt?: string | Date | null;
      dailyLimit?: number | null;
      pacingType?: "SLOW" | "FAST";
      status?: string;
    },
    recipients: {
      email: string;
      dynamicData?: string | Record<string, string>;
    }[],
    templates: Template[],
  ) => void;
  setScheduledAt: (date: string | null) => void;
}

export const useCampaignStore = create<CampaignDraftState>()(
  persist(
    (set, get) => ({
      step: 1,
      inputMode: "table",
      name: "",
      templateId: "",
      accountIds: [],
      recipientsText: "",
      parsedRecipients: [],
      validationErrors: {},
      isValid: false,
      globalError: "",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      templateVariants: [],
      sequenceSteps: [],
      scheduledAt: null,
      dailyLimit: null,
      pacingType: "SLOW",

      setStep: (step) => set({ step }),

      setInputMode: (inputMode) => set({ inputMode }),

      setDetails: (name, templateId, accountIds) =>
        set({ name, templateId, accountIds }),

      setTemplateVariants: (templateVariants) => set({ templateVariants }),

      setSequenceSteps: (sequenceSteps) => set({ sequenceSteps }),

      setDailyLimit: (dailyLimit) => set({ dailyLimit }),

      setPacingType: (pacingType) => set({ pacingType }),

      setScheduledAt: (date) => set({ scheduledAt: date }),

      setRecipientsText: (text, templates) => {
        set({ recipientsText: text });

        const state = get();
        if (!text.trim()) {
          set({
            parsedRecipients: [],
            validationErrors: {},
            isValid: false,
            globalError: "",
          });
          return;
        }

        let lines = text.split("\n").filter((l) => l.trim() !== "");
        if (lines.length === 0) {
          set({
            parsedRecipients: [],
            validationErrors: {},
            isValid: false,
            globalError: "",
          });
          return;
        }

        if (lines[0].toLowerCase().startsWith("email")) {
          lines = lines.slice(1);
        }

        if (lines.length === 0) {
          set({
            parsedRecipients: [],
            validationErrors: { "-1": ["Please paste at least one data row"] },
            isValid: false,
            globalError: "Please paste at least one data row",
          });
          return;
        }

        const delimiter = lines[0].includes("\t") ? "\t" : ",";
        const selectedTemplate = templates.find(
          (t) => t.id === state.templateId,
        );
        const variables = selectedTemplate?.variables || [];
        const varsArray = Array.isArray(variables)
          ? variables.map((v) =>
              typeof v === "object" && v !== null && "name" in v
                ? (v as { name: string }).name
                : (v as string),
            )
          : [];
        const requiredHeaders = ["email", ...varsArray];

        const rows = lines.map((line) => {
          const vals = line.split(delimiter).map((v) => v.trim());
          const obj = {} as ParsedRecipient;
          requiredHeaders.forEach((h, i) => {
            obj[h as string] = vals[i] || "";
          });
          return obj;
        });

        const varsToValidate = Array.isArray(variables)
          ? variables
              .filter((v) => {
                if (typeof v === "string") return true;
                if (typeof v === "object" && v !== null) {
                  const fallback = (v as { fallback?: string }).fallback;
                  return !fallback || fallback.trim() === "";
                }
                return true;
              })
              .map((v) =>
                typeof v === "object" && v !== null && "name" in v
                  ? (v as { name: string }).name
                  : (v as string),
              )
          : [];

        const { valid, errors } = validateRecipientList(rows, varsToValidate);

        let globalError = "";
        if (errors["-1"]) {
          globalError = errors["-1"].join(", ");
        } else {
          const errCount = Object.keys(errors).length;
          globalError = errCount > 0 ? `${errCount} rows have errors` : "";
        }

        set({
          parsedRecipients: rows,
          validationErrors: errors,
          isValid: valid,
          globalError,
        });
      },

      setGlobalError: (error) => set({ globalError: error }),

      resetDraft: () =>
        set({
          step: 1,
          inputMode: "table",
          name: "",
          templateId: "",
          accountIds: [],
          recipientsText: "",
          parsedRecipients: [],
          validationErrors: {},
          isValid: false,
          globalError: "",
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          templateVariants: [],
          sequenceSteps: [],
          scheduledAt: null,
          dailyLimit: null,
          pacingType: "SLOW",
        }),

      loadCampaign: (campaign, recipients, templates) => {
        const accountIds =
          campaign.emailAccounts?.map((a: { id: string }) => a.id) || [];

        let recipientsText = "";
        const selectedTemplate = templates.find(
          (t: Template) => t.id === campaign.templateId,
        );
        let varsArray: string[] = [];
        if (selectedTemplate && Array.isArray(selectedTemplate.variables)) {
          varsArray = selectedTemplate.variables.map((v) =>
            typeof v === "object" && v !== null && "name" in v
              ? (v as { name: string }).name
              : (v as string),
          );
        }
        const requiredHeaders = ["email", ...varsArray];

        if (recipients && recipients.length > 0) {
          const rows = recipients.map(
            (r: {
              email: string;
              dynamicData?: string | Record<string, string>;
            }) => {
              const vals = requiredHeaders.map((h) => {
                if (h === "email") return r.email;
                const vars = (
                  typeof r.dynamicData === "string"
                    ? JSON.parse(r.dynamicData || "{}")
                    : r.dynamicData || {}
                ) as Record<string, string>;
                return vars[h] || "";
              });
              return vals.join("\t");
            },
          );
          recipientsText = rows.join("\n");
        }

        const templateVariants =
          campaign.abTemplateVariants?.map(
            (tv: {
              name: string;
              body: string;
              splitPercent?: number;
              subjectVariants?: {
                name: string;
                subject: string;
                splitPercent?: number;
              }[];
            }) => ({
              name: tv.name,
              body: tv.body,
              splitPercent: tv.splitPercent || 0,
              subjectVariants:
                tv.subjectVariants?.map(
                  (sv: {
                    name: string;
                    subject: string;
                    splitPercent?: number;
                  }) => ({
                    name: sv.name,
                    subject: sv.subject,
                    splitPercent: sv.splitPercent || 0,
                  }),
                ) || [],
            }),
          ) || [];

        set({
          step: 1,
          name: campaign.name || "",
          templateId: campaign.templateId || "",
          accountIds,
          templateVariants,
          recipientsText,
          timezone: campaign.timezone || "UTC",
          scheduledAt: campaign.scheduledAt
            ? new Date(campaign.scheduledAt).toISOString().slice(0, 16)
            : null,
          dailyLimit: campaign.dailyLimit ?? null,
          pacingType: campaign.pacingType || "SLOW",
          status: campaign.status
        });

        get().setRecipientsText(recipientsText, templates);
      },
    }),
    {
      name: "campaign-draft-storage",
      partialize: (state) => ({
        step: state.step,
        inputMode: state.inputMode,
        name: state.name,
        templateId: state.templateId,
        accountIds: state.accountIds,
        recipientsText: state.recipientsText,
        timezone: state.timezone,
        dailyLimit: state.dailyLimit,
        pacingType: state.pacingType,
        lastUpdated: Date.now(),
      }),
      onRehydrateStorage: () => (state) => {
        if (state && state.lastUpdated) {
          const isExpired = Date.now() - state.lastUpdated > 5 * 60 * 1000;
          if (isExpired && state.status !== 'DONE' && state.status !== 'ACTIVE') {
            state.resetDraft();
          }
        }
      },
    },
  ),
);
