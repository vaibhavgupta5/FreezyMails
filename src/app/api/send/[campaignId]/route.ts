import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUser } from '@/lib/supabase'
import boss, { JOB_SEND_EMAIL, startBoss } from '@/lib/queue'

export async function POST(request: Request, props: { params: Promise<{ campaignId: string }> }) {
  const params = await props.params;
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const campaignId = params.campaignId

  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId, userId: user.id },
      include: {
        recipients: { where: { status: 'PENDING' } },
        emailAccount: true,
      }
    })

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    if (campaign.recipients.length === 0) {
      return NextResponse.json({ queued: 0 })
    }

    // Start pg-boss
    await startBoss()

    // Rate limiting logic
    const account = campaign.emailAccount
    const now = new Date()
    let currentSentCount = account.dailySentCount
    
    // Check if daily reset is needed
    const lastReset = account.dailySentResetAt
    if (!lastReset || now.getDate() !== lastReset.getDate() || now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
      currentSentCount = 0
    }

    const defaultLimit = account.provider === 'google' ? 50 : 200
    const limit = campaign.dailyLimit || Math.min(defaultLimit, account.warmupDay * 5)
    
    const availableQuota = limit - currentSentCount
    
    if (availableQuota <= 0) {
      return NextResponse.json({ error: 'Daily send limit reached for this account. Try again tomorrow.' }, { status: 429 })
    }

    // Only process up to availableQuota recipients
    const recipientsToProcess = campaign.recipients.slice(0, availableQuota)

    const isGmail = account.provider === 'google'
    let delaySeconds = 0

    const jobs = recipientsToProcess.map((recipient) => {
      const payload = {
        recipientId: recipient.id,
        campaignId: campaign.id,
        accountId: campaign.emailAccountId,
        variantId: (recipient.dynamicData as Record<string, unknown>)?._variantId as string | undefined || null
      }
      
      const jobSpec: Record<string, unknown> = { data: payload, options: { retryLimit: 3, retryBackoff: true } }
      
      if (isGmail) {
        jobSpec.options.startAfter = delaySeconds
        delaySeconds += 2 // Stagger by 2 seconds
      }

      return jobSpec
    })

    await boss.insert(JOB_SEND_EMAIL, jobs)

    await prisma.$transaction([
      prisma.campaign.update({
        where: { id: campaignId },
        data: { status: 'SENDING' }
      }),
      prisma.emailAccount.update({
        where: { id: account.id },
        data: {
          dailySentCount: currentSentCount + jobs.length,
          dailySentResetAt: now
        }
      })
    ])

    return NextResponse.json({ queued: jobs.length })
  } catch (_err: unknown) { const err = _err as Error;
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
