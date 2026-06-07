'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientBrowser } from '@/lib/supabase-client'
import toast from 'react-hot-toast'

import { EmailAccount, User } from '@prisma/client'

export default function SettingsForm({ user, accounts }: { user: User, accounts: EmailAccount[] }) {
  const router = useRouter()
  const [name, setName] = useState(user.name || '')
  const [defaultAccountId, setDefaultAccountId] = useState(user.defaultAccountId || '')
  
  const [campaignConfirm, setCampaignConfirm] = useState('')
  const [accountConfirm, setAccountConfirm] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSaveProfile = async () => {
    setLoading(true)
    const res = await fetch('/api/user', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, defaultAccountId })
    })
    if (res.ok) {
      toast.success('Settings saved successfully!')
    } else {
      toast.error('Failed to save settings')
    }
    setLoading(false)
  }

  const handleDeleteCampaigns = async () => {
    setLoading(true)
    const res = await fetch('/api/user', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_campaigns', confirmation: campaignConfirm })
    })
    if (res.ok) {
      setCampaignConfirm('')
      toast.success('All campaigns deleted')
    } else {
      toast.error('Failed to delete campaigns')
    }
    setLoading(false)
  }

  const handleDeleteAccount = async () => {
    setLoading(true)
    const res = await fetch('/api/user', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_account', confirmation: accountConfirm })
    })
    if (res.ok) {
      toast.success('Account deleted successfully')
      const supabase = createClientBrowser()
      await supabase.auth.signOut()
      router.push('/login')
    } else {
      toast.error('Failed to delete account')
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <div className="skeu-card">
        <h2 className="text-xl font-semibold mb-4">Profile</h2>
        <div className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input className="skeu-input" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input className="skeu-input bg-surface-100 text-surface-500 cursor-not-allowed" value={user.email} disabled />
          </div>
        </div>
      </div>

      <div className="skeu-card">
        <h2 className="text-xl font-semibold mb-4">Default Sender</h2>
        <div className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium mb-1">Select Email Account</label>
            <select className="skeu-select" value={defaultAccountId} onChange={e => setDefaultAccountId(e.target.value)}>
              <option value="">None</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
            </select>
            <p className="text-xs text-surface-600 mt-1">This account will be pre-selected when creating new campaigns.</p>
          </div>
          <button className="skeu-btn-primary mt-2" onClick={handleSaveProfile} disabled={loading}>Save Settings</button>
        </div>
      </div>

      <div className="skeu-card border-red-200">
        <h2 className="text-xl font-semibold text-red-600 mb-4">Danger Zone</h2>
        
        <div className="space-y-6">
          <div className="p-4 border border-red-200 rounded-lg bg-red-50">
            <h3 className="font-semibold text-red-900 mb-1">Delete all campaigns</h3>
            <p className="text-sm text-red-700 mb-3">This will permanently delete all your campaigns, templates, and analytics.</p>
            <div className="flex gap-2 max-w-md">
              <input className="skeu-input border-red-300" placeholder="Type CONFIRM" value={campaignConfirm} onChange={e => setCampaignConfirm(e.target.value)} />
              <button className="skeu-btn-danger whitespace-nowrap" onClick={handleDeleteCampaigns} disabled={loading || campaignConfirm !== 'CONFIRM'}>Delete Campaigns</button>
            </div>
          </div>

          <div className="p-4 border border-red-200 rounded-lg bg-red-50">
            <h3 className="font-semibold text-red-900 mb-1">Delete account</h3>
            <p className="text-sm text-red-700 mb-3">This will permanently delete your account and all associated data.</p>
            <div className="flex gap-2 max-w-md">
              <input className="skeu-input border-red-300" placeholder={`Type ${user.email}`} value={accountConfirm} onChange={e => setAccountConfirm(e.target.value)} />
              <button className="skeu-btn-danger whitespace-nowrap" onClick={handleDeleteAccount} disabled={loading || accountConfirm !== user.email}>Delete Account</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
