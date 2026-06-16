'use client'

import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Sparkles, Loader2, Variable } from 'lucide-react'

const templateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Body is required'),
})

type TemplateFormData = z.infer<typeof templateSchema>

type TemplateFormProps = {
  initialData?: TemplateFormData & { id: string }
}

export default function TemplateForm({ initialData }: TemplateFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [aiGenerating, setAiGenerating] = useState(false)
  const [showAiConfig, setShowAiConfig] = useState(false)
  const [aiContext, setAiContext] = useState({ industry: '', goal: '', tone: 'professional' })

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: initialData ? {
      name: initialData.name,
      subject: initialData.subject,
      body: initialData.body,
    } : undefined
  })

  const bodyValue = watch('body') || ''
  const subjectValue = watch('subject') || ''

  // Extract variables
  const variables = useMemo(() => {
    const regex = /\{\{([^}]+)\}\}/g
    const matches = Array.from(bodyValue.matchAll(regex), m => m[1].trim())
    const subjectMatches = Array.from(subjectValue.matchAll(regex), m => m[1].trim())
    return Array.from(new Set([...matches, ...subjectMatches]))
  }, [bodyValue, subjectValue])

  const onSubmit = async (data: TemplateFormData) => {
    setSaving(true)
    setError(null)
    try {
      const url = initialData ? `/api/templates/${initialData.id}` : '/api/templates'
      const method = initialData ? 'PUT' : 'POST'
      
      // We also need to extract variables to send to the backend
      const payload = {
        ...data,
        variables
      }
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to save template')
      }
      toast.success(initialData ? 'Template updated successfully!' : 'Template created successfully!')
      router.push('/templates')
      router.refresh()
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save template'
      setError(errorMessage)
      toast.error(errorMessage)
      setSaving(false)
    }
  }

  const handleGenerateAI = async () => {
    setAiGenerating(true)
    try {
      const res = await fetch('/api/gemini/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aiContext)
      })
      if (!res.ok) throw new Error('AI generation failed')
      
      const data = await res.json()
      if (data.subject && data.body) {
        setValue('subject', data.subject)
        setValue('body', data.body)
        toast.success('Generated AI draft!')
        setShowAiConfig(false)
      } else {
        throw new Error('Invalid AI response')
      }
    } catch (_err: unknown) { const err = _err as Error;
      toast.error(err.message)
    } finally {
      setAiGenerating(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column: Form */}
        <div className="skeu-card p-6 space-y-4 shadow-skeu-base flex flex-col">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-50">Template Content</h2>
            <button
              type="button"
              onClick={() => setShowAiConfig(!showAiConfig)}
              className="flex items-center gap-2 text-sm text-ice-600 hover:text-ice-700 font-medium"
            >
              <Sparkles size={16} />
              AI Assist
            </button>
          </div>

          {showAiConfig && (
            <div className="p-4 bg-ice-50 dark:bg-ice-900/20 border border-ice-200 dark:border-ice-800 rounded-lg space-y-3 mb-4">
              <div className="grid grid-cols-2 gap-3">
                <input 
                  placeholder="Industry (e.g. SaaS)" 
                  value={aiContext.industry}
                  onChange={e => setAiContext({...aiContext, industry: e.target.value})}
                  className="p-2 border border-surface-300 dark:border-surface-600 rounded bg-white dark:bg-surface-800 text-sm"
                />
                <input 
                  placeholder="Goal (e.g. Book a meeting)" 
                  value={aiContext.goal}
                  onChange={e => setAiContext({...aiContext, goal: e.target.value})}
                  className="p-2 border border-surface-300 dark:border-surface-600 rounded bg-white dark:bg-surface-800 text-sm"
                />
              </div>
              <select 
                value={aiContext.tone}
                onChange={e => setAiContext({...aiContext, tone: e.target.value})}
                className="w-full p-2 border border-surface-300 dark:border-surface-600 rounded bg-white dark:bg-surface-800 text-sm"
              >
                <option value="professional">Professional</option>
                <option value="casual">Casual</option>
                <option value="bold">Bold & Direct</option>
              </select>
              <button
                type="button"
                onClick={handleGenerateAI}
                disabled={aiGenerating}
                className="w-full flex items-center justify-center gap-2 bg-ice-600 text-white p-2 rounded text-sm hover:bg-ice-700 transition"
              >
                {aiGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {aiGenerating ? 'Generating...' : 'Generate Draft'}
              </button>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">Template Name (Internal)</label>
            <input 
              {...register('name')} 
              className="mt-1 block w-full border border-surface-300 dark:border-surface-600 rounded p-3 shadow-inner bg-white dark:bg-surface-800 focus:ring-ice-500 focus:border-ice-500 text-surface-900 dark:text-surface-50" 
              placeholder="e.g. Follow-up Campaign Step 1"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">Subject Line</label>
            <input 
              {...register('subject')} 
              className="mt-1 block w-full border border-surface-300 dark:border-surface-600 rounded p-3 shadow-inner bg-white dark:bg-surface-800 focus:ring-ice-500 focus:border-ice-500 text-surface-900 dark:text-surface-50" 
              placeholder="e.g. Quick question regarding {{companyName}}"
            />
            {errors.subject && <p className="text-red-500 text-xs mt-1">{errors.subject.message}</p>}
          </div>

          <div className="flex-1 flex flex-col">
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">Email Body</label>
            <textarea 
              {...register('body')} 
              rows={12}
              className="mt-1 block w-full flex-1 border border-surface-300 dark:border-surface-600 rounded p-3 shadow-inner bg-white dark:bg-surface-800 font-mono text-sm focus:ring-ice-500 focus:border-ice-500 text-surface-900 dark:text-surface-50" 
              placeholder="Hi {{firstName}},&#10;&#10;I wanted to reach out because..."
            />
            {errors.body && <p className="text-red-500 text-xs mt-1">{errors.body.message}</p>}
            <p className="text-xs text-surface-500 mt-2">Use double curly braces for dynamic variables, e.g. {'{{firstName}}'}.</p>
          </div>
          
          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded border border-red-200">
              {error}
            </div>
          )}
        </div>

        {/* Right Column: Preview & Variables */}
        <div className="space-y-6 flex flex-col">
          <div className="skeu-card p-6 shadow-skeu-base">
            <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-50 flex items-center gap-2 mb-4">
              <Variable size={18} className="text-ice-500" />
              Detected Variables
            </h2>
            {variables.length === 0 ? (
              <p className="text-sm text-surface-500 italic">No variables detected yet. Type {'{{variableName}}'} to add one.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {variables.map(v => (
                  <span key={v} className="px-2 py-1 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded text-xs font-mono text-surface-700 dark:text-surface-300">
                    {v}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="skeu-card flex-1 p-0 shadow-skeu-base overflow-hidden flex flex-col">
            <div className="bg-surface-100 dark:bg-surface-800 border-b border-surface-200 dark:border-surface-700 p-4">
              <h2 className="text-sm font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider">Live Preview</h2>
            </div>
            <div className="p-6 flex-1 bg-white dark:bg-surface-900 overflow-y-auto prose dark:prose-invert prose-sm max-w-none">
              <div className="mb-4 pb-4 border-b border-surface-100 dark:border-surface-800">
                <p className="text-surface-900 dark:text-surface-50 text-lg font-medium">
                  {subjectValue ? subjectValue.replace(/\{\{([^}]+)\}\}/g, '<mark class="bg-ice-100 text-ice-800 px-1 rounded">$&</mark>') : <span className="text-surface-400 italic">No subject</span>}
                </p>
              </div>
              <div 
                className="whitespace-pre-wrap text-surface-800 dark:text-surface-200"
                dangerouslySetInnerHTML={{ 
                  __html: bodyValue 
                    ? bodyValue.replace(/\{\{([^}]+)\}\}/g, '<mark class="bg-ice-100 text-ice-800 px-1 rounded">$&</mark>') 
                    : '<span class="text-surface-400 italic">No body content</span>'
                }} 
              />
            </div>
          </div>
        </div>

      </div>

      <div className="flex justify-end gap-4">
        <button
          type="button"
          onClick={() => router.push('/templates')}
          className="px-6 py-2 bg-surface-200 text-surface-800 dark:bg-surface-700 dark:text-surface-200 rounded hover:bg-surface-300 dark:hover:bg-surface-600 font-medium transition-colors shadow"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="skeu-btn-primary px-8 py-2 font-medium"
        >
          {saving ? 'Saving...' : 'Save Template'}
        </button>
      </div>
    </form>
  )
}
