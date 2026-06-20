import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ParsedRecipient } from '@/types'
import { Template } from '@prisma/client'
import { validateRecipientList } from '@/lib/validate'

interface CampaignDraftState {
  step: number;
  inputMode: 'paste' | 'table';
  name: string;
  templateId: string;
  accountIds: string[];
  recipientsText: string;
  parsedRecipients: ParsedRecipient[];
  validationErrors: Record<number, string[]>;
  isValid: boolean;
  globalError: string;
  sendWindowStart: number | null;
  sendWindowEnd: number | null;
  timezone: string;
  templateVariants: { name: string; body: string; splitPercent: number; subjectVariants: { name: string; subject: string; splitPercent: number }[] }[];
  sequenceSteps: { id?: string; stepIndex: number; delayDays: number; subject: string; body: string }[];
  scheduledAt: string | null;
  
  // Actions
  setStep: (step: number) => void;
  setInputMode: (mode: 'paste' | 'table') => void;
  setDetails: (name: string, templateId: string, accountIds: string[]) => void;
  setRecipientsText: (text: string, templates: Template[]) => void;
  setGlobalError: (error: string) => void;
  setTemplateVariants: (templateVariants: { name: string; body: string; splitPercent: number; subjectVariants: { name: string; subject: string; splitPercent: number }[] }[]) => void;
  setSequenceSteps: (sequenceSteps: { id?: string; stepIndex: number; delayDays: number; subject: string; body: string }[]) => void;
  setSchedule: (start: number | null, end: number | null, tz: string) => void;
  resetDraft: () => void;
  loadCampaign: (campaign: any, recipients: any[], templates: Template[]) => void;
  setScheduledAt: (date: string | null) => void;
}

export const useCampaignStore = create<CampaignDraftState>()(
  persist(
    (set, get) => ({
      step: 1,
      inputMode: 'table',
      name: '',
      templateId: '',
      accountIds: [],
      recipientsText: '',
      parsedRecipients: [],
      validationErrors: {},
      isValid: false,
      globalError: '',
      sendWindowStart: null,
      sendWindowEnd: null,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      templateVariants: [],
      sequenceSteps: [],
      scheduledAt: null,

      setStep: (step) => set({ step }),
      
      setInputMode: (inputMode) => set({ inputMode }),
      
      setDetails: (name, templateId, accountIds) => set({ name, templateId, accountIds }),
      
      setTemplateVariants: (templateVariants) => set({ templateVariants }),

      setSequenceSteps: (sequenceSteps) => set({ sequenceSteps }),
      
      setScheduledAt: (date) => set({ scheduledAt: date }),

      setSchedule: (start, end, tz) => set({ sendWindowStart: start, sendWindowEnd: end, timezone: tz }),
      
      setRecipientsText: (text, templates) => {
        set({ recipientsText: text });
        
        const state = get();
        if (!text.trim()) {
          set({ parsedRecipients: [], validationErrors: {}, isValid: false, globalError: '' });
          return;
        }

        let lines = text.split('\n').filter(l => l.trim() !== '');
        if (lines.length === 0) {
          set({ parsedRecipients: [], validationErrors: {}, isValid: false, globalError: '' });
          return;
        }

        if (lines[0].toLowerCase().startsWith('email')) {
          lines = lines.slice(1);
        }

        if (lines.length === 0) {
          set({ parsedRecipients: [], validationErrors: { '-1': ['Please paste at least one data row'] }, isValid: false, globalError: 'Please paste at least one data row' });
          return;
        }

        const delimiter = lines[0].includes('\t') ? '\t' : ',';
        const selectedTemplate = templates.find(t => t.id === state.templateId);
        const variables = selectedTemplate?.variables || [];
        const varsArray = Array.isArray(variables) ? (variables as string[]) : [];
        const requiredHeaders = ['email', ...varsArray];

        const rows = lines.map(line => {
          const vals = line.split(delimiter).map(v => v.trim());
          const obj = {} as ParsedRecipient;
          requiredHeaders.forEach((h, i) => {
            obj[h as string] = vals[i] || '';
          });
          return obj;
        });

        const { valid, errors } = validateRecipientList(rows, varsArray);
        
        let globalError = '';
        if (errors['-1']) {
          globalError = errors['-1'].join(', ');
        } else {
          const errCount = Object.keys(errors).length;
          globalError = errCount > 0 ? `${errCount} rows have errors` : '';
        }

        set({ parsedRecipients: rows, validationErrors: errors, isValid: valid, globalError });
      },

      setGlobalError: (error) => set({ globalError: error }),

      resetDraft: () => set({
        step: 1,
        inputMode: 'table',
        name: '',
        templateId: '',
        accountIds: [],
        recipientsText: '',
        parsedRecipients: [],
        validationErrors: {},
        isValid: false,
        globalError: '',
        sendWindowStart: null,
        sendWindowEnd: null,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        templateVariants: [],
        sequenceSteps: [],
        scheduledAt: null
      }),

      loadCampaign: (campaign, recipients, templates) => {
        const accountIds = campaign.emailAccounts?.map((a: any) => a.id) || [];
        
        let recipientsText = '';
        const selectedTemplate = templates.find((t: Template) => t.id === campaign.templateId);
        const requiredHeaders = selectedTemplate 
          ? ['email', ...((selectedTemplate.variables as string[]) || [])] 
          : ['email'];

        if (recipients && recipients.length > 0) {
          const rows = recipients.map((r: any) => {
            const vals = requiredHeaders.map(h => {
              if (h === 'email') return r.email;
              const vars = typeof r.dynamicData === 'string' ? JSON.parse(r.dynamicData || '{}') : (r.dynamicData || {});
              return vars[h] || '';
            });
            return vals.join('\t');
          });
          recipientsText = rows.join('\n');
        }

        const templateVariants = campaign.abTemplateVariants?.map((tv: any) => ({
          name: tv.name,
          body: tv.body,
          splitPercent: tv.splitPercent || 0,
          subjectVariants: tv.subjectVariants?.map((sv: any) => ({
            name: sv.name,
            subject: sv.subject,
            splitPercent: sv.splitPercent || 0
          })) || []
        })) || [];

        set({
          step: 1,
          name: campaign.name || '',
          templateId: campaign.templateId || '',
          accountIds,
          templateVariants,
          recipientsText,
          sendWindowStart: campaign.sendWindowStart,
          sendWindowEnd: campaign.sendWindowEnd,
          timezone: campaign.timezone || 'UTC',
          scheduledAt: campaign.scheduledAt ? new Date(campaign.scheduledAt).toISOString().slice(0, 16) : null
        });
        
        // This will trigger the validation logic to re-run and set parsedRecipients
        get().setRecipientsText(recipientsText, templates);
      }
    }),
    {
      name: 'campaign-draft-storage',
      partialize: (state) => ({ 
        step: state.step,
        inputMode: state.inputMode,
        name: state.name, 
        templateId: state.templateId, 
        accountIds: state.accountIds, 
        recipientsText: state.recipientsText,
        sendWindowStart: state.sendWindowStart,
        sendWindowEnd: state.sendWindowEnd,
        timezone: state.timezone
      }), // only persist form values, validation can be re-run
    }
  )
)
