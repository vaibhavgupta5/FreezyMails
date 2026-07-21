import prisma from '@/lib/prisma'
import { getUser } from '@/lib/supabase'
import CampaignList from './_components/CampaignList'

export default async function CampaignsPage() {
  const user = await getUser()
  if (!user) return null

  const campaignsData = await prisma.campaign.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      recipients: {
        select: { status: true }
      },
      mailEvents: {
        select: { type: true, occurredAt: true }
      }
    }
  })

  // Pre-calculate stats on the server
  const calculatedCampaigns = campaignsData.map(c => {
    let sent = 0
    let opens = 0
    let replies = 0
    let lastSentAt: Date | null = null

    c.recipients.forEach(r => {
      if (r.status === 'SENT') sent++
    })

    c.mailEvents.forEach(e => {
      if (e.type === 'OPENED') opens++
      if (e.type === 'REPLIED') replies++
      if (e.type === 'SENT') {
        sent++ // count SENT events as well for accuracy
        if (!lastSentAt || e.occurredAt > lastSentAt) {
          lastSentAt = e.occurredAt
        }
      }
    })

    // Remove duplicates if a recipient was both SENT status and has a SENT event
    const uniqueSent = c.recipients.filter(r => r.status === 'SENT').length
    const finalSent = Math.max(uniqueSent, c.mailEvents.filter(e => e.type === 'SENT').length)

    return {
      id: c.id,
      name: c.name,
      status: c.status,
      dailyLimit: c.dailyLimit,
      createdAt: c.createdAt.toISOString(),
      stats: {
        sent: finalSent,
        opens,
        replies,
        lastSentAt: lastSentAt ? (lastSentAt as Date).toISOString() : null
      }
    }
  })

  return (
    <div className="skeu-page">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        <CampaignList initialCampaigns={calculatedCampaigns} />
      </div>
    </div>
  )
}
