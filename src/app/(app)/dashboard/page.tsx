import { getUser } from '@/lib/supabase'
import Link from 'next/link'
import prisma from '@/lib/prisma'
import { Mail, Inbox, Server, BarChart2, Plus, Clock, CheckCircle2, Play } from 'lucide-react'

export default async function DashboardPage() {
  const user = await getUser()
  if (!user) return null

  const firstName = user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'there'

  // Fetch KPI data
  const [activeCampaigns, totalAccounts, recentCampaigns] = await Promise.all([
    prisma.campaign.count({
      where: { userId: user.id, status: 'SENDING' }
    }),
    prisma.emailAccount.count({
      where: { userId: user.id, isActive: true }
    }),
    prisma.campaign.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 4,
      include: {
        _count: { select: { recipients: true, replies: true } }
      }
    })
  ])

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
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
          <div className="flex gap-3">
            <Link href="/campaigns/new" className="inline-flex items-center gap-2 justify-center bg-white text-ice-900 px-6 py-3 rounded-xl font-bold shadow-skeu-raised hover:shadow-skeu-raised hover:-translate-y-0.5 transition-all duration-300">
              <Plus size={20} />
              New Campaign
            </Link>
          </div>
        </div>
      </div>
      
      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="skeu-card shadow-skeu-base border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider mb-1">Active Campaigns</p>
              <h3 className="text-3xl font-bold text-surface-900 dark:text-surface-50">{activeCampaigns}</h3>
            </div>
            <div className="p-2 bg-ice-50 dark:bg-ice-900/40 rounded-lg">
              <Play size={24} className="text-ice-600 dark:text-ice-400" />
            </div>
          </div>
        </div>
        
        <div className="skeu-card shadow-skeu-base border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider mb-1">Active Accounts</p>
              <h3 className="text-3xl font-bold text-surface-900 dark:text-surface-50">{totalAccounts}</h3>
            </div>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/40 rounded-lg">
              <Server size={24} className="text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
        </div>

        {/* Quick Links in KPI style */}
        <Link href="/inbox" className="skeu-card shadow-skeu-base border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 hover:border-amber-300 hover:shadow-skeu-raised transition-all group">
          <div className="flex items-center gap-4 h-full">
            <div className="p-3 bg-amber-50 dark:bg-amber-900/40 rounded-xl group-hover:scale-110 transition-transform">
              <Inbox size={28} className="text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="font-bold text-surface-900 dark:text-surface-50">Unified Inbox</h3>
              <p className="text-sm text-surface-500 dark:text-surface-400">Check new replies</p>
            </div>
          </div>
        </Link>
        
        <Link href="/analytics" className="skeu-card shadow-skeu-base border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 hover:border-indigo-300 hover:shadow-skeu-raised transition-all group">
          <div className="flex items-center gap-4 h-full">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/40 rounded-xl group-hover:scale-110 transition-transform">
              <BarChart2 size={28} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h3 className="font-bold text-surface-900 dark:text-surface-50">Analytics</h3>
              <p className="text-sm text-surface-500 dark:text-surface-400">View performance</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Recent Activity / Campaigns */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-surface-900 dark:text-surface-50">Recent Campaigns</h2>
            <Link href="/campaigns" className="text-sm font-semibold text-ice-600 hover:text-ice-700">View All &rarr;</Link>
          </div>
          
          <div className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-2xl shadow-skeu-base overflow-hidden">
            {recentCampaigns.length === 0 ? (
              <div className="p-8 text-center text-surface-500">
                <Clock size={48} className="mx-auto mb-4 text-surface-300 dark:text-surface-600" />
                <p>No campaigns created yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-surface-200 dark:divide-surface-700">
                {recentCampaigns.map(campaign => (
                  <Link key={campaign.id} href={`/campaigns/${campaign.id}`} className="block p-5 hover:bg-surface-50 dark:hover:bg-surface-700/50 transition">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-3">
                        <h3 className="font-bold text-surface-900 dark:text-surface-50">{campaign.name}</h3>
                        <span className={`px-2 py-0.5 text-xs font-bold rounded-full uppercase tracking-wider
                          ${campaign.status === 'DONE' ? 'bg-emerald-100 text-emerald-800' : 
                            campaign.status === 'SENDING' ? 'bg-ice-100 text-ice-800' : 
                            'bg-surface-100 text-surface-600'}`}>
                          {campaign.status}
                        </span>
                      </div>
                      <span className="text-xs text-surface-400 font-medium">{new Date(campaign.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex gap-6 text-sm text-surface-600 dark:text-surface-400">
                      <div className="flex items-center gap-1">
                        <Mail size={14} /> {campaign._count.recipients} Recipients
                      </div>
                      <div className="flex items-center gap-1">
                        <Inbox size={14} /> {campaign._count.replies} Replies
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Setup Guide / Quick Actions */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-surface-900 dark:text-surface-50">Quick Actions</h2>
          <div className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-2xl shadow-skeu-base p-6 space-y-4">
            <Link href="/templates" className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-50 dark:hover:bg-surface-700 transition group">
              <div className="w-10 h-10 rounded-lg bg-surface-100 dark:bg-surface-700 flex items-center justify-center text-surface-600 dark:text-surface-400 group-hover:bg-white group-hover:shadow-sm transition">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <h4 className="font-semibold text-surface-900 dark:text-surface-50">Create Templates</h4>
                <p className="text-xs text-surface-500">Draft AI-powered templates</p>
              </div>
            </Link>
            
            <Link href="/accounts" className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-50 dark:hover:bg-surface-700 transition group">
              <div className="w-10 h-10 rounded-lg bg-surface-100 dark:bg-surface-700 flex items-center justify-center text-surface-600 dark:text-surface-400 group-hover:bg-white group-hover:shadow-sm transition">
                <Server size={20} />
              </div>
              <div>
                <h4 className="font-semibold text-surface-900 dark:text-surface-50">Connect Accounts</h4>
                <p className="text-xs text-surface-500">Add sending domains & Gmail</p>
              </div>
            </Link>

            <div className="pt-4 mt-2 border-t border-surface-200 dark:border-surface-700">
              <div className="p-4 bg-ice-50 dark:bg-ice-900/20 rounded-xl border border-ice-100 dark:border-ice-800">
                <h4 className="font-bold text-ice-800 dark:text-ice-200 mb-1 flex items-center gap-1">
                  <Play size={16} /> Deliverability Tips
                </h4>
                <p className="text-xs text-ice-700 dark:text-ice-300 leading-relaxed">
                  Keep your daily sending volume under 50 emails per account initially to protect your domain reputation.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
