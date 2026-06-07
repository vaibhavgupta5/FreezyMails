import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUser } from '@/lib/supabase'
import boss, { JOB_SEND_EMAIL } from '@/lib/queue'

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const campaign = await prisma.campaign.findUnique({
    where: { id: params.id, userId: user.id },
    include: { recipients: { where: { status: 'PENDING' } } }
  })
  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try { await boss.start() } catch (err: any) { if (!err.message.includes('already started')) throw err }

  const jobs = campaign.recipients.map(r => ({
    data: {
      recipientId: r.id,
      campaignId: campaign.id,
      accountId: campaign.emailAccountId,
      variantId: (r.dynamicData as any)?._variantId || null
    },
    retryLimit: 3, 
    retryBackoff: true
  }))

  if (jobs.length > 0) {
    await boss.createQueue(JOB_SEND_EMAIL)
    await boss.insert(JOB_SEND_EMAIL, jobs)
  }

  await prisma.campaign.update({
    where: { id: campaign.id },
    data: { status: 'SENDING' }
  })

  return NextResponse.json({ ok: true, queued: jobs.length })
}
