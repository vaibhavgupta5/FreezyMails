'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientBrowser } from '@/lib/supabase-client'
import { toast } from 'sonner'

import { EmailAccount, User } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

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
            <Input className="skeu-input" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <Input className="skeu-input bg-bg-subtle text-text-muted cursor-not-allowed opacity-70" value={user.email} disabled />
          </div>
        </div>
      </div>

      <div className="skeu-card">
        <h2 className="text-xl font-semibold mb-4">Default Sender</h2>
        <div className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium mb-1">Select Email Account</label>
            <Select value={defaultAccountId || "none"} onValueChange={val => setDefaultAccountId(val === "none" ? "" : val)}>
              <SelectTrigger className="skeu-select">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-xs text-text-muted mt-1">This account will be pre-selected when creating new campaigns.</p>
          </div>
          <Button variant="primary" className="mt-2" onClick={handleSaveProfile} isLoading={loading}>Save Settings</Button>
        </div>
      </div>

      <div className="skeu-card border-danger-text/20">
        <h2 className="text-xl font-semibold text-danger-text mb-4">Danger Zone</h2>
        
        <div className="space-y-6">
          <div className="p-4 border border-danger-text/20 rounded-lg bg-danger-bg">
            <h3 className="font-semibold text-danger-text mb-1">Delete all campaigns</h3>
            <p className="text-sm text-danger-text/80 mb-3">This will permanently delete all your campaigns, templates, and analytics.</p>
            <div className="flex flex-col sm:flex-row gap-2 max-w-md">
              <Input className="skeu-input border-danger-text/30" placeholder="Type CONFIRM" value={campaignConfirm} onChange={e => setCampaignConfirm(e.target.value)} />
              <Button variant="danger" className="whitespace-nowrap" onClick={handleDeleteCampaigns} isLoading={loading} disabled={campaignConfirm !== 'CONFIRM'}>Delete Campaigns</Button>
            </div>
          </div>

          <div className="p-4 border border-danger-text/20 rounded-lg bg-danger-bg">
            <h3 className="font-semibold text-danger-text mb-1">Delete account</h3>
            <p className="text-sm text-danger-text/80 mb-3">This will permanently delete your account and all associated data.</p>
            <div className="flex flex-col sm:flex-row gap-2 max-w-md">
              <Input className="skeu-input border-danger-text/30" placeholder={`Type ${user.email}`} value={accountConfirm} onChange={e => setAccountConfirm(e.target.value)} />
              <Button variant="danger" className="whitespace-nowrap" onClick={handleDeleteAccount} isLoading={loading} disabled={accountConfirm !== user.email}>Delete Account</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
