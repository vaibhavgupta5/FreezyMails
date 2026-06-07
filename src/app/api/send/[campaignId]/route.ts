import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUser } from '@/lib/supabase'
import boss, { JOB_SEND_EMAIL } from '@/lib/queue'

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
    try {
      await boss.start()
    } catch (err: any) {
      if (!err.message.includes('already started')) throw err
    }

    // Rate limiting logic
    const isGmail = campaign.emailAccount.smtpPort === 587 || campaign.emailAccount.smtpPort === 465
    let delaySeconds = 0

    const jobs = campaign.recipients.map((recipient) => {
      const payload = {
        recipientId: recipient.id,
        campaignId: campaign.id,
        accountId: campaign.emailAccountId,
        variantId: (recipient.dynamicData as any)?._variantId || null
      }
      
      const jobSpec: any = { name: JOB_SEND_EMAIL, data: payload, options: { retryLimit: 3, retryBackoff: true } }
      
      if (isGmail) {
        jobSpec.options.startAfter = delaySeconds
        delaySeconds += 2 // Stagger by 2 seconds
      }

      return jobSpec
    })

    await boss.insert(jobs)

    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'SENDING' }
    })

    return NextResponse.json({ queued: jobs.length })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
