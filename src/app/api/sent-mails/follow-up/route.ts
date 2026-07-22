import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUser } from '@/lib/supabase'
import { sendEmail } from '@/lib/mailer'
import { renderTemplate } from '@/lib/template-parser'
import { MailEventType } from '@prisma/client'

export async function POST(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { recipientId, accountId, subject, body: emailBody } = body

    if (!recipientId || !accountId || !subject || !emailBody) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const recipient = await prisma.recipient.findUnique({
      where: { id: recipientId },
      include: { campaign: true }
    })
    
    if (!recipient || recipient.campaign.userId !== user.id) {
      return NextResponse.json({ error: 'Recipient not found or unauthorized' }, { status: 404 })
    }

    const account = await prisma.emailAccount.findUnique({
      where: { id: accountId }
    })

    if (!account || account.userId !== user.id) {
      return NextResponse.json({ error: 'Email account not found or unauthorized' }, { status: 404 })
    }

    // Render any variables if user included them in manual follow-up
    const dynamicData = recipient.dynamicData as Record<string, string> || {}
    const renderedSubject = renderTemplate(subject, dynamicData)
    const renderedBody = renderTemplate(emailBody, dynamicData)

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
    const trackingPixelUrl = `${appUrl}/api/track/open/${recipient.id}`

    // Send the email synchronously
    const sendResult = await sendEmail(
      account,
      recipient.email,
      renderedSubject,
      renderedBody,
      trackingPixelUrl
    )

    // Log the sent email
    await prisma.mailEvent.create({
      data: {
        recipientId: recipient.id,
        campaignId: recipient.campaignId,
        type: MailEventType.SENT,
        metadata: {
          messageId: sendResult.messageId,
          accountId: account.id,
          subject: renderedSubject,
          body: renderedBody,
          isManualFollowUp: true
        }
      }
    })

    return NextResponse.json({ success: true, messageId: sendResult.messageId })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
