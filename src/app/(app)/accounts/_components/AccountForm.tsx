'use client'

import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

const accountSchema = z.object({
  label: z.string().min(1, 'Label is required'),
  fromName: z.string().min(1, 'From Name is required'),
  fromEmail: z.string().email('Invalid email'),
  smtpHost: z.string().min(1, 'SMTP Host is required'),
  smtpPort: z.number().min(1),
  smtpUser: z.string().min(1, 'SMTP User is required'),
  smtpPass: z.string().min(1, 'SMTP Pass is required'),
  imapHost: z.string().min(1, 'IMAP Host is required'),
  imapPort: z.number().min(1),
  imapUser: z.string().min(1, 'IMAP User is required'),
  imapPass: z.string().min(1, 'IMAP Pass is required'),
})

type AccountFormData = z.infer<typeof accountSchema>

export default function AccountForm() {
  const router = useRouter()
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean, error?: string } | null>(null)

  const { register, handleSubmit, formState: { errors }, getValues } = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      smtpPort: 465,
      imapPort: 993,
    }
  })

  const onTest = async () => {
    setTesting(true)
    setTestResult(null)
    const values = getValues()
    try {
      const res = await fetch('/api/accounts/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const data = await res.json()
      setTestResult(data)
    } catch (err: unknown) {
      setTestResult({ ok: false, error: err instanceof Error ? err.message : 'Unknown error' })
    } finally {
      setTesting(false)
    }
  }

  const onSubmit = async (data: AccountFormData) => {
    setSaving(true)
    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to save account')
      toast.success('Account connected successfully!')
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save account')
    } finally {
      setSaving(false)
    }
  }

  const [showManual, setShowManual] = useState(false)

  return (
    <div className="space-y-6">
      <div className="p-6 bg-surface-50 rounded-xl border border-surface-300 flex flex-col items-center text-center space-y-4 shadow-skeu-inset">
        <h3 className="text-lg font-bold text-surface-900">Connect Your Account</h3>
        <p className="text-surface-600 text-sm max-w-md">The easiest and most secure way to send emails. Connect your Google Workspace or Gmail account in one click.</p>
        <button 
          onClick={() => window.location.href = '/api/auth/google/login'}
          className="skeu-btn-primary flex items-center gap-2 px-6 py-3 text-lg font-medium shadow-lg"
        >
          <svg className="w-5 h-5 bg-white rounded-full p-0.5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Connect with Google
        </button>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-surface-300"></div>
        </div>
        <div className="relative flex justify-center">
          <button 
            onClick={() => setShowManual(!showManual)}
            className="bg-surface-100 px-4 text-sm text-surface-500 font-medium hover:text-surface-900 transition-colors rounded-full"
          >
            {showManual ? 'Hide Advanced Configuration' : 'Show Advanced Configuration (SMTP/IMAP)'}
          </button>
        </div>
      </div>

      {showManual && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 skeu-card shadow-skeu-base">
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">Label (e.g. Work Email)</label>
            <input {...register('label')} className="mt-1 block w-full border border-surface-300 dark:border-surface-600 rounded p-2 shadow-inner bg-white dark:bg-surface-800 focus:ring-ice-500 focus:border-ice-500 text-surface-900 dark:text-surface-50" />
            {errors.label && <p className="text-red-500 text-xs mt-1">{errors.label.message}</p>}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">From Name</label>
              <input {...register('fromName')} className="mt-1 block w-full border border-surface-300 dark:border-surface-600 rounded p-2 shadow-inner bg-white dark:bg-surface-800 focus:ring-ice-500 focus:border-ice-500 text-surface-900 dark:text-surface-50" />
              {errors.fromName && <p className="text-red-500 text-xs mt-1">{errors.fromName.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">From Email</label>
              <input {...register('fromEmail')} className="mt-1 block w-full border border-surface-300 dark:border-surface-600 rounded p-2 shadow-inner bg-white dark:bg-surface-800 focus:ring-ice-500 focus:border-ice-500 text-surface-900 dark:text-surface-50" />
              {errors.fromEmail && <p className="text-red-500 text-xs mt-1">{errors.fromEmail.message}</p>}
            </div>
          </div>

          <div className="border-t border-surface-200 dark:border-surface-700 pt-4">
            <h3 className="font-semibold mb-2 text-surface-900 dark:text-surface-50">SMTP Settings (Sending)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">Host</label>
                <input {...register('smtpHost')} className="mt-1 block w-full border border-surface-300 dark:border-surface-600 rounded p-2 shadow-inner bg-white dark:bg-surface-800 focus:ring-ice-500 focus:border-ice-500 text-surface-900 dark:text-surface-50" />
                {errors.smtpHost && <p className="text-red-500 text-xs mt-1">{errors.smtpHost.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">Port</label>
                <input type="number" {...register('smtpPort', { valueAsNumber: true })} className="mt-1 block w-full border border-surface-300 dark:border-surface-600 rounded p-2 shadow-inner bg-white dark:bg-surface-800 focus:ring-ice-500 focus:border-ice-500 text-surface-900 dark:text-surface-50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">User</label>
                <input {...register('smtpUser')} className="mt-1 block w-full border border-surface-300 dark:border-surface-600 rounded p-2 shadow-inner bg-white dark:bg-surface-800 focus:ring-ice-500 focus:border-ice-500 text-surface-900 dark:text-surface-50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">Password</label>
                <input type="password" {...register('smtpPass')} className="mt-1 block w-full border border-surface-300 dark:border-surface-600 rounded p-2 shadow-inner bg-white dark:bg-surface-800 focus:ring-ice-500 focus:border-ice-500 text-surface-900 dark:text-surface-50" />
              </div>
            </div>
          </div>

          <div className="border-t border-surface-200 dark:border-surface-700 pt-4">
            <h3 className="font-semibold mb-2 text-surface-900 dark:text-surface-50">IMAP Settings (Receiving/Tracking replies)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">Host</label>
                <input {...register('imapHost')} className="mt-1 block w-full border border-surface-300 dark:border-surface-600 rounded p-2 shadow-inner bg-white dark:bg-surface-800 focus:ring-ice-500 focus:border-ice-500 text-surface-900 dark:text-surface-50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">Port</label>
                <input type="number" {...register('imapPort', { valueAsNumber: true })} className="mt-1 block w-full border border-surface-300 dark:border-surface-600 rounded p-2 shadow-inner bg-white dark:bg-surface-800 focus:ring-ice-500 focus:border-ice-500 text-surface-900 dark:text-surface-50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">User</label>
                <input {...register('imapUser')} className="mt-1 block w-full border border-surface-300 dark:border-surface-600 rounded p-2 shadow-inner bg-white dark:bg-surface-800 focus:ring-ice-500 focus:border-ice-500 text-surface-900 dark:text-surface-50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">Password</label>
                <input type="password" {...register('imapPass')} className="mt-1 block w-full border border-surface-300 dark:border-surface-600 rounded p-2 shadow-inner bg-white dark:bg-surface-800 focus:ring-ice-500 focus:border-ice-500 text-surface-900 dark:text-surface-50" />
              </div>
            </div>
          </div>

          {testResult && (
            <div className={`p-3 rounded text-sm ${testResult.ok ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'}`}>
              {testResult.ok ? 'Connection successful!' : `Connection failed: ${testResult.error}`}
            </div>
          )}

          <div className="flex justify-end gap-4 pt-4 border-t border-surface-200 dark:border-surface-700">
            <button
              type="button"
              onClick={onTest}
              disabled={testing}
              className="px-4 py-2 bg-surface-200 text-surface-800 dark:bg-surface-700 dark:text-surface-200 rounded hover:bg-surface-300 dark:hover:bg-surface-600 disabled:opacity-50 font-medium"
            >
              {testing ? 'Testing...' : 'Test Connection'}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="skeu-btn-primary px-6 py-2"
            >
              {saving ? 'Saving...' : 'Save Account'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
