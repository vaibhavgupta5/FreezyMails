import prisma from './prisma'

export async function computeHealthScore(accountId: string): Promise<number> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const campaigns = await prisma.campaign.findMany({
    where: { emailAccountId: accountId },
    select: { id: true }
  })
  const campaignIds = campaigns.map(c => c.id)

  if (campaignIds.length === 0) return 100

  const events = await prisma.mailEvent.findMany({
    where: {
      campaignId: { in: campaignIds },
      occurredAt: { gte: thirtyDaysAgo }
    }
  })

  let score = 100
  let totalSent = 0
  let bounces = 0
  let fails = 0

  events.forEach(e => {
    if (e.type === 'SENT') totalSent++
    else if (e.type === 'BOUNCED') {
      bounces++
      score -= 5
    }
    else if (e.type === 'FAILED') {
      fails++
      score -= 2
    }
  })

  // Cap penalties
  const bouncePenalty = bounces * 5
  if (bouncePenalty > 40) score += (bouncePenalty - 40)

  const failPenalty = fails * 2
  if (failPenalty > 20) score += (failPenalty - 20)

  if (totalSent > 0) {
    const bounceRate = bounces / totalSent
    if (bounceRate > 0.10) {
      score = 0
    }
  }

  return Math.max(0, Math.min(100, score))
}
