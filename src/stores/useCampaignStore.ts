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
  accountId: string;
  recipientsText: string;
  parsedRecipients: ParsedRecipient[];
  validationErrors: Record<number, string[]>;
  isValid: boolean;
  globalError: string;
  
  // Actions
  setStep: (step: number) => void;
  setInputMode: (mode: 'paste' | 'table') => void;
  setDetails: (name: string, templateId: string, accountId: string) => void;
  setRecipientsText: (text: string, templates: Template[]) => void;
  resetDraft: () => void;
}

export const useCampaignStore = create<CampaignDraftState>()(
  persist(
    (set, get) => ({
      step: 1,
      inputMode: 'table',
      name: '',
      templateId: '',
      accountId: '',
      recipientsText: '',
      parsedRecipients: [],
      validationErrors: {},
      isValid: false,
      globalError: '',

      setStep: (step) => set({ step }),
      
      setInputMode: (inputMode) => set({ inputMode }),
      
      setDetails: (name, templateId, accountId) => set({ name, templateId, accountId }),
      
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

      resetDraft: () => set({
        step: 1,
        inputMode: 'table',
        name: '',
        templateId: '',
        accountId: '',
        recipientsText: '',
        parsedRecipients: [],
        validationErrors: {},
        isValid: false,
        globalError: ''
      })
    }),
    {
      name: 'campaign-draft-storage',
      partialize: (state) => ({ 
        step: state.step,
        inputMode: state.inputMode,
        name: state.name, 
        templateId: state.templateId, 
        accountId: state.accountId, 
        recipientsText: state.recipientsText 
      }), // only persist form values, validation can be re-run
    }
  )
)
