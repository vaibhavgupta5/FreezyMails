import prisma from '../lib/prisma'
import { renderTemplate } from '../lib/template-parser'
import { sendEmail } from '../lib/mailer'
import { MailEventType } from '@prisma/client'

export async function handleSendEmail(job: any) {
  const { recipientId, campaignId, accountId, variantId } = job.data as any
  
  try {
    // Load necessary data
    const recipient = await prisma.recipient.findUnique({ where: { id: recipientId } })
    const account = await prisma.emailAccount.findUnique({ where: { id: accountId } })
    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } })
    
    if (!recipient || !account || !campaign) {
      throw new Error('Missing associated records')
    }

    if (campaign.status !== 'SENDING') {
      throw new Error('Campaign is not currently SENDING, aborting job.')
    }

    let subject = ''
    let bodyTemplate = ''

    if (variantId) {
      const variant = await prisma.aBVariant.findUnique({ where: { id: variantId } })
      if (variant) {
        subject = variant.subject
        bodyTemplate = variant.body
      }
    } 
    
    if (!subject) {
      const template = await prisma.template.findUnique({ where: { id: campaign.templateId } })
      if (!template) throw new Error('Missing template')
      subject = template.subject
      bodyTemplate = template.body
    }

    // Render template
    const dynamicData = recipient.dynamicData as Record<string, string> || {}
    const renderedBody = renderTemplate(bodyTemplate, dynamicData)
    const renderedSubject = renderTemplate(subject, dynamicData)
    
    const pixelUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/track/open/${recipient.id}`
    
    // Send email
    const sendResult = await sendEmail(account, recipient.email, renderedSubject, renderedBody, pixelUrl)

    // Update recipient and create event
    await prisma.$transaction([
      prisma.recipient.update({
        where: { id: recipient.id },
        data: { status: 'SENT', sentAt: new Date() }
      }),
      prisma.mailEvent.create({
        data: {
          recipientId: recipient.id,
          campaignId: campaign.id,
          type: MailEventType.SENT,
          metadata: { messageId: sendResult.messageId }
        }
      })
    ])
    
    // Campaign completion check
    const pendingCount = await prisma.recipient.count({
      where: { campaignId, status: 'PENDING' }
    })
    if (pendingCount === 0) {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: 'DONE' }
      })
    }
    
  } catch (err: any) {
    await prisma.recipient.update({
      where: { id: recipientId },
      data: { status: 'FAILED', failReason: err.message }
    })
    
    // Campaign completion check
    const pendingCount = await prisma.recipient.count({
      where: { campaignId, status: 'PENDING' }
    })
    if (pendingCount === 0) {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: 'DONE' }
      })
    }

    throw err // Let pg-boss handle the retry backoff
  }
}
