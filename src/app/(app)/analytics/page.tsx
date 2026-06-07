import prisma from '@/lib/prisma'
import { getUser } from '@/lib/supabase'
import CampaignStatsTable from './_components/CampaignStatsTable'
import OverviewChart from './_components/OverviewChart'
import { BarChart2 } from 'lucide-react'

export default async function AnalyticsPage() {
  const user = await getUser()
  if (!user) return null

  const campaigns = await prisma.campaign.findMany({
    where: { userId: user.id },
    include: {
      _count: {
        select: { replies: true }
      },
      recipients: {
        select: {
          status: true,
          mailEvents: {
            where: { type: 'OPENED' },
            select: { id: true }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  const stats = campaigns.map(c => {
    let sent = 0
    let failed = 0
    let opened = 0

    c.recipients.forEach(r => {
      if (r.status === 'SENT') sent++
      if (r.status === 'FAILED') failed++
      if (r.mailEvents.length > 0) opened++
    })

    const replied = c._count.replies
    const openRate = sent > 0 ? (opened / sent) * 100 : 0
    const replyRate = sent > 0 ? (replied / sent) * 100 : 0

    return {
      id: c.id,
      name: c.name,
      createdAt: c.createdAt.toISOString(),
      sent,
      failed,
      opened,
      replied,
      openRate,
      replyRate,
    }
  })

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold">Analytics</h1>
      
      {stats.length === 0 ? (
        <div className="skeu-card flex flex-col items-center justify-center min-h-[300px] text-center space-y-4">
          <BarChart2 size={64} className="text-surface-300" />
          <div>
            <h3 className="text-lg font-semibold text-surface-900">No data available</h3>
            <p className="text-surface-600 mt-1">Send your first campaign to see analytics.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="skeu-card">
            <h2 className="text-xl font-semibold mb-4">Overview</h2>
            <OverviewChart data={stats} />
          </div>

          <div className="skeu-card mt-6">
            <h2 className="text-xl font-semibold mb-4">Campaign Performance</h2>
            <CampaignStatsTable data={stats} />
          </div>
        </>
      )}
    </div>
  )
}
