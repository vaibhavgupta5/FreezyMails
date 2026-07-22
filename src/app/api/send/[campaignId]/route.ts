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
        emailAccounts: true,
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
    const accounts = campaign.emailAccounts
    if (accounts.length === 0) {
      return NextResponse.json({ error: 'No email accounts associated with this campaign' }, { status: 400 })
    }

    const now = new Date()
    
    // Calculate quota for each account
    const accountQuotas = accounts.map(account => {
      let currentSentCount = account.dailySentCount
      const lastReset = account.dailySentResetAt
      if (!lastReset || now.getDate() !== lastReset.getDate() || now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
        currentSentCount = 0
      }

      const defaultLimit = account.provider === 'google' ? 50 : 200
      const limit = campaign.dailyLimit || Math.min(defaultLimit, account.warmupDay * 25)
      
      return {
        ...account,
        currentSentCount,
        availableQuota: Math.max(0, limit - currentSentCount),
        jobsAssigned: 0,
        isGmail: account.provider === 'google',
        delaySeconds: 0
      }
    })

    const totalQuota = accountQuotas.reduce((sum, a) => sum + a.availableQuota, 0)
    
    if (totalQuota <= 0) {
      return NextResponse.json({ error: 'Daily send limit reached for all selected accounts. Try again tomorrow.' }, { status: 429 })
    }

    // Only process up to totalQuota recipients
    const recipientsToProcess = campaign.recipients.slice(0, totalQuota)
    
    const jobs = []
    let accountIndex = 0

    for (const recipient of recipientsToProcess) {
      // Find next available account
      let account = accountQuotas[accountIndex]
      let loopCount = 0
      while (account.availableQuota <= 0 && loopCount < accountQuotas.length) {
        accountIndex = (accountIndex + 1) % accountQuotas.length
        account = accountQuotas[accountIndex]
        loopCount++
      }

      if (account.availableQuota <= 0) break // Should not happen given totalQuota check

      const payload = {
        recipientId: recipient.id,
        campaignId: campaign.id,
        accountId: account.id,
        templateVariantId: (recipient.dynamicData as Record<string, unknown>)?._templateVariantId as string | undefined || null,
        subjectVariantId: (recipient.dynamicData as Record<string, unknown>)?._subjectVariantId as string | undefined || null
      }
      
      const jobSpec: { data: typeof payload; options: { retryLimit: number; retryBackoff: boolean; startAfter?: number } } = { data: payload, options: { retryLimit: 3, retryBackoff: true } }
      
      if (account.isGmail) {
        jobSpec.options.startAfter = account.delaySeconds
        account.delaySeconds += 2 // Stagger by 2 seconds per account
      }

      jobs.push(jobSpec)
      account.availableQuota--
      account.jobsAssigned++
      
      accountIndex = (accountIndex + 1) % accountQuotas.length
    }

    await prisma.$transaction([
      prisma.campaign.update({
        where: { id: campaignId },
        data: { status: 'SENDING' }
      }),
      ...accountQuotas.filter(a => a.jobsAssigned > 0).map(account => 
        prisma.emailAccount.update({
          where: { id: account.id },
          data: {
            dailySentCount: account.currentSentCount + account.jobsAssigned,
            dailySentResetAt: now
          }
        })
      )
    ])

    await boss.insert(JOB_SEND_EMAIL, jobs)

    return NextResponse.json({ queued: jobs.length })
  } catch (_err: unknown) { const err = _err as Error;
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}


export const dynamic = 'force-dynamic'
