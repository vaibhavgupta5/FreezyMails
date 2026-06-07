'use client'

import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

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

  const { register, handleSubmit, formState: { errors } } = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: initialData ? {
      name: initialData.name,
      subject: initialData.subject,
      body: initialData.body,
    } : undefined
  })

  const onSubmit = async (data: TemplateFormData) => {
    setSaving(true)
    setError(null)
    try {
      const url = initialData ? `/api/templates/${initialData.id}` : '/api/templates'
      const method = initialData ? 'PUT' : 'POST'
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to save template')
      }
      router.push('/templates')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="skeu-card p-6 space-y-4 shadow-skeu-base">
        <div>
          <label className="block text-sm font-medium text-gray-700">Template Name (Internal)</label>
          <input 
            {...register('name')} 
            className="mt-1 block w-full border border-gray-300 rounded p-3 shadow-inner bg-white focus:ring-ice-500 focus:border-ice-500" 
            placeholder="e.g. Follow-up Campaign Step 1"
          />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Subject Line</label>
          <input 
            {...register('subject')} 
            className="mt-1 block w-full border border-gray-300 rounded p-3 shadow-inner bg-white focus:ring-ice-500 focus:border-ice-500" 
            placeholder="e.g. Quick question regarding {{companyName}}"
          />
          {errors.subject && <p className="text-red-500 text-xs mt-1">{errors.subject.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Email Body</label>
          <textarea 
            {...register('body')} 
            rows={10}
            className="mt-1 block w-full border border-gray-300 rounded p-3 shadow-inner bg-white font-mono text-sm focus:ring-ice-500 focus:border-ice-500" 
            placeholder="Hi {{firstName}},&#10;&#10;I wanted to reach out because..."
          />
          {errors.body && <p className="text-red-500 text-xs mt-1">{errors.body.message}</p>}
          <p className="text-xs text-gray-500 mt-2">Use double curly braces for dynamic variables, e.g. {'{{firstName}}'}. These will be automatically extracted and validated.</p>
        </div>
        
        {error && (
          <div className="p-3 bg-red-50 text-red-700 text-sm rounded border border-red-200">
            {error}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-4">
        <button
          type="button"
          onClick={() => router.push('/templates')}
          className="px-6 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 font-medium transition-colors shadow"
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
