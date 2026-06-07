import { getUser } from '@/lib/supabase'
import Link from 'next/link'
import { Mail, Inbox, Server, BarChart2 } from 'lucide-react'

export default async function DashboardPage() {
  const user = await getUser()
  if (!user) return null

  const firstName = user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'there'

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-ice-600 from-ice-900 to-ice-900 p-8 sm:p-10 shadow-skeu-raised text-white">
        <div className="absolute top-0 right-0 -mt-16 -mr-16 opacity-20 pointer-events-none">
          <div className="w-64 h-64 bg-white rounded-full mix-blend-overlay filter blur-3xl animate-pulse"></div>
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Welcome back, {firstName}! ❄️
            </h1>
            <p className="text-ice-100 max-w-xl text-lg">
              {"Here's a quick overview of your workspace. Let's send some cold emails that actually get warm replies."}
            </p>
          </div>
          <div>
            <Link href="/campaigns/new" className="inline-flex items-center justify-center bg-white text-ice-900 px-6 py-3 rounded-xl font-bold shadow-skeu-raised hover:shadow-skeu-raised hover:-translate-y-0.5 transition-all duration-300 cursor-pointer">
              New Campaign
            </Link>
          </div>
        </div>
      </div>
      
      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link href="/campaigns" className="group relative bg-surface-100 rounded-2xl p-6 border border-surface-300 shadow-sm hover:shadow-skeu-raised hover:-translate-y-1 transition-all duration-300 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-ice-500/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-ice-500/20 transition-colors duration-500"></div>
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-ice-100 to-ice-200 flex items-center justify-center mb-6 shadow-sm border border-ice-300 group-hover:scale-110 transition-transform duration-500">
            <Mail size={28} className="text-ice-600" />
          </div>
          <h2 className="text-xl font-bold text-surface-900 mb-1 group-hover:text-ice-600 transition-colors">Campaigns</h2>
          <p className="text-surface-500 text-sm">Create and manage your outreach sequences.</p>
        </Link>
        
        <Link href="/inbox" className="group relative bg-surface-100 rounded-2xl p-6 border border-surface-300 shadow-sm hover:shadow-skeu-raised hover:-translate-y-1 transition-all duration-300 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-amber-500/20 transition-colors duration-500"></div>
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center mb-6 shadow-sm border border-amber-300 group-hover:scale-110 transition-transform duration-500">
            <Inbox size={28} className="text-amber-600" />
          </div>
          <h2 className="text-xl font-bold text-surface-900 mb-1 group-hover:text-amber-600 transition-colors">Unified Inbox</h2>
          <p className="text-surface-500 text-sm">Check replies and engage with your prospects.</p>
        </Link>

        <Link href="/analytics" className="group relative bg-surface-100 rounded-2xl p-6 border border-surface-300 shadow-sm hover:shadow-skeu-raised hover:-translate-y-1 transition-all duration-300 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-indigo-500/20 transition-colors duration-500"></div>
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center mb-6 shadow-sm border border-indigo-300 group-hover:scale-110 transition-transform duration-500">
            <BarChart2 size={28} className="text-indigo-600" />
          </div>
          <h2 className="text-xl font-bold text-surface-900 mb-1 group-hover:text-indigo-600 transition-colors">Analytics</h2>
          <p className="text-surface-500 text-sm">Track opens, clicks, and conversion rates.</p>
        </Link>
        
        <Link href="/accounts" className="group relative bg-surface-100 rounded-2xl p-6 border border-surface-300 shadow-sm hover:shadow-skeu-raised hover:-translate-y-1 transition-all duration-300 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-emerald-500/20 transition-colors duration-500"></div>
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center mb-6 shadow-sm border border-emerald-300 group-hover:scale-110 transition-transform duration-500">
            <Server size={28} className="text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-surface-900 mb-1 group-hover:text-emerald-600 transition-colors">Email Accounts</h2>
          <p className="text-surface-500 text-sm">Manage sender accounts and health scores.</p>
        </Link>
      </div>
    </div>
  )
}
