import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUser } from '@/lib/supabase'
import boss, { JOB_SEND_EMAIL, startBoss } from '@/lib/queue'

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const campaign = await prisma.campaign.findUnique({
    where: { id: params.id, userId: user.id },
    include: { 
      recipients: { where: { status: 'PENDING' } },
      emailAccounts: true
    }
  })
  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const accounts = campaign.emailAccounts
  if (accounts.length === 0) {
    return NextResponse.json({ error: 'No email accounts associated with this campaign' }, { status: 400 })
  }

  try { await startBoss() } catch (_err: unknown) { const err = _err as Error; if (!err.message.includes('already started')) throw err }

  let accountIndex = 0

  const jobs = campaign.recipients.map(r => {
    const account = accounts[accountIndex]
    accountIndex = (accountIndex + 1) % accounts.length
    
    return {
      data: {
        recipientId: r.id,
        campaignId: campaign.id,
        accountId: account.id,
        templateVariantId: (r.dynamicData as Record<string, unknown>)?._templateVariantId as string | undefined || null,
        subjectVariantId: (r.dynamicData as Record<string, unknown>)?._subjectVariantId as string | undefined || null
      },
      options: {
        retryLimit: 3, 
        retryBackoff: true
      }
    }
  })

  await prisma.campaign.update({
    where: { id: campaign.id },
    data: { status: 'SENDING' }
  })

  if (jobs.length > 0) {
    await boss.createQueue(JOB_SEND_EMAIL)
    await boss.insert(JOB_SEND_EMAIL, jobs)
  }

  return NextResponse.json({ ok: true, queued: jobs.length })
}
