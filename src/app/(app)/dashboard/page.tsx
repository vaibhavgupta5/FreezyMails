import { getUser } from '@/lib/supabase'
import Link from 'next/link'
import { Mail, Inbox, Server, BarChart2 } from 'lucide-react'

export default async function DashboardPage() {
  const user = await getUser()
  if (!user) return null

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Welcome, {user.user_metadata?.full_name || user.email}!</h1>
      <p className="text-surface-600">Here's a quick overview of your workspace. Select an option below to get started.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
        <Link href="/campaigns" className="skeu-card hover:-translate-y-1 transition-transform flex flex-col items-center justify-center p-8 text-center border-t-4 border-t-ice-500">
          <Mail size={48} className="text-ice-500 mb-4" />
          <h2 className="font-bold text-lg">Campaigns</h2>
          <p className="text-sm text-surface-500 mt-2">Manage outreach</p>
        </Link>
        
        <Link href="/inbox" className="skeu-card hover:-translate-y-1 transition-transform flex flex-col items-center justify-center p-8 text-center border-t-4 border-t-amber-500">
          <Inbox size={48} className="text-amber-500 mb-4" />
          <h2 className="font-bold text-lg">Inbox</h2>
          <p className="text-sm text-surface-500 mt-2">Check replies</p>
        </Link>

        <Link href="/analytics" className="skeu-card hover:-translate-y-1 transition-transform flex flex-col items-center justify-center p-8 text-center border-t-4 border-t-indigo-500">
          <BarChart2 size={48} className="text-indigo-500 mb-4" />
          <h2 className="font-bold text-lg">Analytics</h2>
          <p className="text-sm text-surface-500 mt-2">View performance</p>
        </Link>
        
        <Link href="/accounts" className="skeu-card hover:-translate-y-1 transition-transform flex flex-col items-center justify-center p-8 text-center border-t-4 border-t-emerald-500">
          <Server size={48} className="text-emerald-500 mb-4" />
          <h2 className="font-bold text-lg">Accounts</h2>
          <p className="text-sm text-surface-500 mt-2">Manage senders</p>
        </Link>
      </div>
    </div>
  )
}
